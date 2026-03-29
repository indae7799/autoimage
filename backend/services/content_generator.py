"""
콘텐츠 생성 서비스
AI를 사용하여 헤더, 후킹문구, 성분, 설명, 사용법 생성
"""
import os
import json
import re
from typing import Dict, Any
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

class ContentGenerator:
    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY가 설정되지 않았습니다")
        genai.configure(api_key=api_key, transport="rest")
        self.model = genai.GenerativeModel('gemini-1.5-pro') # 전문가급 최상위 티어 모델 사용
    
    def generate_content(self, product_info: Dict[str, Any], search_info: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        제품 정보를 바탕으로 상세페이지 콘텐츠 생성
        
        Args:
            product_info: 제품 정보
            search_info: 구글 검색 결과 (선택)
        
        Returns:
            생성된 콘텐츠
        """
        prompt = self._build_prompt(product_info, search_info)
        
        try:
            response = self.model.generate_content(
                prompt,
                generation_config=genai.GenerationConfig(
                    response_mime_type="application/json",
                    temperature=0.8,
                )
            )
            content = self._parse_response(response.text)
            return content
        except Exception as e:
            print(f"콘텐츠 생성 실패: {e}")
            import traceback
            traceback.print_exc()
            return self._get_default_content()
    
    def _build_prompt(self, product_info: Dict[str, Any], search_info: Dict[str, Any] = None) -> str:
        """프롬프트 생성 - 디자인 스타일 객체 복원 + 20대 여성 타겟 마켓팅 톤 최적화"""
        # 제품 정보 문자열 구성
        features_str = ', '.join(product_info.get('features', []))
        brand = product_info.get('brandName', 'Unknown')
        name = product_info.get('productName', 'Product')
        category = product_info.get('category', 'Beauty')

        prompt = f"""
# ROLE: 대한민국 20대 여성을 타겟으로 하는 프리미엄 뷰티/코스메틱 이커머스 상세페이지 전문 톱 카피라이터 및 UI/UX 디자이너

# 제품 데이터
- 브랜드: {brand}
- 제품명: {name}
- 카테고리: {category}
- 주요 특징: {features_str}
- 추가 정보: {json.dumps(search_info, ensure_ascii=False) if search_info else "검색 결과 없음"}

# 디자인 및 카피라이팅 가이드라인 (필수 준수)
1. **타겟 페르소나**: 올리브영 랭킹템이나 인스타 감성 뷰티템을 좋아하는 트렌디한 20대 여성이 타겟입니다. "대박", "미쳤다", "~거든요", "~해요", "말해 뭐해" 같은 구어체를 아주 세련되게 섞어주세요.
2. **히어로 섹션 (Hero Section) 구조**:
   - `mainBrandName`: 반드시 **ENGLISH ONLY** (영어 대문자 권장). 제품을 상징하는 멋진 영문 브랜드/제품명.
   - `subProductName`: 반드시 **한글만**. 위 영문 제목의 뜻을 그대로 살리면서 매력적인 한글 이름.
3. **핵심 성분 추출 (최소 3개)**: 제품 정보와 검색 데이터에서 실질적인 활성 성분(Active Ingredients)을 **최소 3개 이상** 찾아내어 `ingredients` -> `items` 배열에 상세히 기술하세요.
4. **자연스러운 줄바꿈 (\\n)**: 텍스트가 조금이라도 길어지거나 호흡이 필요한 곳엔 반드시 `\\n`을 사용하여 2줄 이상으로 가독성 있게 구성하세요.
5. **디자인 스타일 객체 (Style Objects)**: 프론트엔드 렌더링에 필요한 폰트, 크기, 색상, 그림자(textShadow) 값을 JSON 안에 직접 지정하세요.
6. **이모지(Emoji) 절대 금지**: 본문 전체에 단 하나의 이모지도 넣지 마세요.

# 응답 JSON 구조 (이 형식을 엄격히 따를 것)
{{
    "header": {{
        "eyebrow": "20대 공감 한줄 요약 (한글)",
        "eyebrowStyle": {{ "fontFamily": "Pretendard", "fontSize": 20, "fontWeight": 400, "color": "#888", "letterSpacing": 2 }},
        "mainBrandName": "ENGLISH ONLY 메인 제목 (영어, \\n 포함 필수)",
        "mainBrandNameStyle": {{ "fontFamily": "'Playfair Display', serif", "fontSize": 96, "fontWeight": 900, "color": "#1a2e22", "letterSpacing": 0, "textShadow": "0 2px 15px rgba(0,0,0,0.1)" }},
        "subProductName": "한글만 사용하는 영문 제목의 번역 및 제품명 (\\n 포함 필수)",
        "subProductNameStyle": {{ "fontFamily": "Pretendard", "fontSize": 36, "fontWeight": 400, "color": "#1a2e22", "letterSpacing": 2, "textShadow": "0 1px 10px rgba(0,0,0,0.1)" }},
        "hookText": "인스타 감성 후킹 문구 (2줄, \\n 사용)",
        "hookTextStyle": {{ "fontFamily": "Pretendard", "fontSize": 20, "fontWeight": 500, "color": "#666" }},
        "sectionBg": "제품 패키지톤과 어울리는 프리미엄 배경색 (#hex)",
        "image_prompt": "Midjourney prompt: Professional hero shot... --ar 3:4"
    }},
    "points": [
        {{
            "title": "20대 감성 핵심 포인트 제목 (\\n 사용 가능)",
            "content": "공감 유도 상세 설명 (구어체, \\n 사용 필수)",
            "image_prompt": "Midjourney prompt: ... --ar 16:9"
        }}
        // 최소 3개 포인트 필수
    ],
    "ingredients": {{
        "title": "필수 구성! 핵심 성분 (3개 이상 추출)",
        "description": "성분에 대한 감각적인 요약",
        "items": [
            {{ "name": "실제 성분명 1", "description": "20대 타겟 눈높이 설명", "image_prompt": "..." }},
            {{ "name": "실제 성분명 2", "description": "...", "image_prompt": "..." }},
            {{ "name": "실제 성분명 3 (필수)", "description": "...", "image_prompt": "..." }}
        ],
        "style": {{ "backgroundColor": "#F5F9F6", "color": "#2d3436" }}
    }},
    "comparison": {{
        "title": "달라진 내 모습, 확인해볼까요?",
        "before": "사용 전 고민 한줄 (\\n 사용)",
        "after": "사용 후 만족감 한줄 (\\n 사용)",
        "percentage": "확실한 개선 수치 (예: 99%)",
        "style": {{ "backgroundColor": "#FAFBFF", "color": "#1a1a2e" }}
    }},
    "review": {{
        "title": "언니들의 리얼 극찬 후기",
        "items": [
            {{ "title": "한줄 요약", "content": "실제 사용자가 쓴 듯한 찐 후기 톤 (\\n 사용)" }}
        ]
    }},
    "texture": {{
        "title": "진짜 미친 제형 감촉 (텍스처)",
        "content": "감각적인 제형 묘사 (\\n 사용)",
        "style": {{ "backgroundColor": "#1a1a2e", "color": "#ffffff" }}
    }},
    "product_info": {{
        "full_ingredients": "전성분을 실제 패키지처럼 상세히 기재 (콤마 구분)",
        "style": {{ "backgroundColor": "#F9FAFB", "color": "#475569" }}
    }}
}}

# 가이드:
- 모든 필드에 디자인 스타일 객체(Style Object)를 포함하여 프론트엔드가 정확한 디자인으로 출력하게 하세요.
- 문체는 반드시 20대 여성이 선호하는 세련되고 트렌디한 구어체여야 합니다. 
- JSON 응답에 주석을 포함하지 마세요.
"""
        return prompt

    
    def _parse_response(self, text: str) -> Dict[str, Any]:
        """AI 응답 파싱 - 중첩 중괄호 추적 방식으로 견고하게 추출"""
        try:
            # 1차: 직접 JSON 파싱 시도 (response_mime_type이 작동한 경우)
            try:
                return json.loads(text)
            except json.JSONDecodeError:
                pass
            
            # 2차: 중첩 중괄호 깊이를 추적하여 최외곽 JSON 객체 추출
            start = text.find('{')
            if start == -1:
                raise ValueError("JSON 시작점을 찾을 수 없음")
            
            depth = 0
            in_string = False
            escape_next = False
            end = start
            
            for i in range(start, len(text)):
                ch = text[i]
                if escape_next:
                    escape_next = False
                    continue
                if ch == '\\':
                    escape_next = True
                    continue
                if ch == '"':
                    in_string = not in_string
                    continue
                if in_string:
                    continue
                if ch == '{':
                    depth += 1
                elif ch == '}':
                    depth -= 1
                    if depth == 0:
                        end = i
                        break
            
            content = text[start:end + 1]
            # 트레일링 콤마 제거
            content = re.sub(r',\s*([}\]])', r'\1', content)
            # JS 스타일 주석 제거
            content = re.sub(r'//.*?(?=\n|$)', '', content)
            return json.loads(content)
        except Exception as e:
            print(f"응답 파싱 실패: {e}")
            print(f"원본 텍스트 (앞 500자): {text[:500]}")
        
        return self._get_default_content()
    
    def _get_default_content(self) -> Dict[str, Any]:
        """기본 콘텐츠 반환"""
        return {
            "header": {
                "mainTitle": "프리미엄 제품",
                "subTitle": "당신의 일상을 바꾸는",
                "hookText": "지금 바로 경험해보세요",
                "image_prompt": "premium product photography, minimal background, studio lighting, 8k resolution"
            },
            "ingredients": {
                "title": "핵심 성분",
                "items": [
                    {
                        "name": "주요 성분",
                        "description": "효과적인 성분으로 제품의 품질을 보장합니다",
                        "image_prompt": "natural ingredients, fresh water splash, macro photography, soft lighting"
                    }
                ],
                "image_prompt": "natural ingredients, fresh water splash, macro photography, soft lighting"
            },
            "description": {
                "title": "제품 소개",
                "content": "고품질의 제품으로 여러분의 일상을 더욱 풍요롭게 만들어드립니다.",
                "image_prompt": "lifestyle photography, elegant atmosphere, soft natural light, product in use"
            },
            "usage": {
                "title": "사용법",
                "steps": [
                    "1단계: 제품을 준비합니다",
                    "2단계: 적절히 사용합니다",
                    "3단계: 효과를 확인합니다"
                ],
                "image_prompt": "step by step product usage illustration, clean background, instructional style"
            },
            "brand": {
                "title": "브랜드 소개",
                "content": "신뢰할 수 있는 브랜드 철학을 경험해보세요.",
                "image_prompt": "brand lifestyle photography, professional, clean"
            },
            "product_info": {
                "full_ingredients": "Water, Glycerin, Propylene Glycol, Alcohol, Fragrance",
                "style": { "backgroundColor": "#F9FAFB", "color": "#475569" }
            }
        }
