"""
이미지 분석 서비스
이미지에서 색상 추출 및 제품 정보 분석
"""
import io
import logging
from typing import Dict, List, Any
from PIL import Image
import google.generativeai as genai
import os
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

load_dotenv()

class ImageAnalyzer:
    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY가 설정되지 않았습니다")
        genai.configure(api_key=api_key, transport="rest")
        self.model = genai.GenerativeModel('gemini-2.0-flash') # 차세대 초고속 분석 모델 적용    
    def analyze_images(self, image_files: List[bytes]) -> Dict[str, Any]:
        """
        이미지들을 분석하여 제품 정보와 색상 팔레트 추출
        
        Args:
            image_files: 이미지 바이트 데이터 리스트
        
        Returns:
            {
                "productInfo": {...},
                "colorPalette": {...},
                "images": [...]
            }
        """
        # PIL Image로 변환 및 리사이즈 (Gemini 전송 시 타임아웃/메모리 초과 방지)
        pil_images = []
        for i, img_bytes in enumerate(image_files):
            try:
                img = Image.open(io.BytesIO(img_bytes))
                # 최대 해상도 800x800으로 리사이즈 (Render 타임아웃 방지 및 속도 향상)
                img.thumbnail((800, 800), Image.Resampling.LANCZOS)
                # 알파 채널 제거하여 용량과 호환성 개선
                if img.mode != 'RGB':
                    bg = Image.new('RGB', img.size, (255, 255, 255))
                    # RGBA인 경우 배경과 합성
                    if img.mode == 'RGBA':
                        bg.paste(img, mask=img.split()[3])
                        img = bg
                    else:
                        img = img.convert('RGB')
                pil_images.append(img)
            except Exception as e:
                print(f"이미지 {i+1} 로드 실패: {e}")
                continue
        
        if not pil_images:
            raise ValueError("처리가 가능한 유효한 이미지가 없습니다. 모든 이미지가 손상되었거나 지원하지 않는 형식입니다.")

        # 메인 이미지에서 색상 추출
        main_image = pil_images[0] if pil_images else None
        color_palette = self._extract_color_palette(main_image) if main_image else {}
        
        # AI로 제품 정보 분석
        product_info = self._analyze_product_info(pil_images)
        
        # 이미지 역할 분류
        image_roles = self._classify_image_roles(pil_images)
        
        return {
            "productInfo": product_info,
            "colorPalette": color_palette,
            "images": image_roles
        }
    
    def _extract_color_palette(self, image: Image.Image) -> Dict[str, str]:
        """이미지에서 주요 색상 추출"""
        # 이미지 리사이즈 (성능 향상)
        image = image.resize((150, 150))
        
        # 색상 추출 (간단한 방법)
        colors = image.getcolors(maxcolors=256*256*256)
        if not colors:
            return {
                "primary": "#7A9E8A",
                "secondary": "#B8D4C2",
                "accent": "#4E7A62"
            }
        
        # 가장 많이 나타나는 색상들 정렬
        colors.sort(key=lambda x: x[0], reverse=True)
        
        # RGB를 HEX로 변환
        def rgb_to_hex(rgb):
            if len(rgb) == 4:  # RGBA
                rgb = rgb[:3]
            return f"#{rgb[0]:02x}{rgb[1]:02x}{rgb[2]:02x}"
        
        # 흰색/검은색/회색 필터링 (배경색 제외)
        def is_background_color(rgb):
            if len(rgb) == 4:
                rgb = rgb[:3]
            r, g, b = rgb
            # 순백 근처 (240+) 또는 순흑 근처 (15-) 또는 무채색 (r≈g≈b, 밝기 200+)
            if r > 240 and g > 240 and b > 240:
                return True
            if r < 15 and g < 15 and b < 15:
                return True
            if abs(r - g) < 10 and abs(g - b) < 10 and r > 200:
                return True
            return False
        
        # 배경색 제외한 색상들
        filtered = [c for c in colors if not is_background_color(c[1])]
        if len(filtered) < 3:
            filtered = colors  # 필터링 후 너무 적으면 원본 사용
        
        # 상위 3개 색상 추출
        top_colors = [rgb_to_hex(color[1]) for color in filtered[:3]]
        
        return {
            "primary": top_colors[0] if len(top_colors) > 0 else "#7A9E8A",
            "secondary": top_colors[1] if len(top_colors) > 1 else "#B8D4C2",
            "accent": top_colors[2] if len(top_colors) > 2 else "#4E7A62"
        }
    
    def _analyze_product_info(self, images: List[Image.Image]) -> Dict[str, Any]:
        """AI를 사용하여 제품 정보 분석"""
        prompt = """
        다음 제품 이미지를 분석하여 제품 정보를 추출해주세요.
        
        다음 정보를 JSON 형식으로 반환해주세요. 만약 이미지에서 찾을 수 없는 정보라면 적절히 추론하거나 빈 문자열("")로 남겨주세요:
        {
            "brandName": "브랜드명",
            "productName": "제품명",
            "category": "카테고리",
            "features": ["특징1", "특징2", "특징3"],
            "targetAudience": "타겟 고객층",
            "tone": "톤앤매너",
            "manufacturer": "제조국 또는 제조업체명",
            "volume": "용량 (예: 50ml, 100g)"
        }
        
        한국어로 응답해주세요.
        """
        
        try:
            # 타임아웃 및 세이프티 필터로 인한 실패 방지 설정
            safety_settings = [
                { "category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE" },
                { "category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE" },
                { "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE" },
                { "category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE" },
            ]
            
            response = self.model.generate_content(
                [prompt] + images,
                safety_settings=safety_settings
            )
            import json
            import re
            
            # JSON 추출
            text = response.text
            json_match = re.search(r'\{.*\}', text, re.DOTALL)
            if json_match:
                return json.loads(json_match.group(0))
            else:
                logger.error(f"AI 응답에서 JSON을 찾을 수 없습니다: {text}")
        except Exception as e:
            logger.error(f"제품 정보 분석 실패 (상세): {str(e)}")
            import traceback
            traceback.print_exc()
        
        return {
            "brandName": "Unknown",
            "productName": "Product",
            "category": "General",
            "features": [],
            "targetAudience": "General",
            "tone": "Neutral",
            "manufacturer": "제조국/제조업체를 입력하세요",
            "volume": "용량을 입력하세요 (예: 50ml)"
        }
    
    def _classify_image_roles(self, images: List[Image.Image]) -> List[Dict[str, Any]]:
        """이미지 역할 분류"""
        roles = []
        for idx, img in enumerate(images):
            role = "Main" if idx == 0 else "Additional"
            roles.append({
                "index": idx,
                "role": role,
                "desc": f"Image {idx + 1}"
            })
        return roles
