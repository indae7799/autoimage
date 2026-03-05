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
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-flash-latest')
    
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
            response = self.model.generate_content(prompt)
            content = self._parse_response(response.text)
            return content
        except Exception as e:
            print(f"콘텐츠 생성 실패: {e}")
            return self._get_default_content()
    
    def _build_prompt(self, product_info: Dict[str, Any], search_info: Dict[str, Any] = None) -> str:
        """프롬프트 생성"""
        prompt = f"""
당신은 한국 뷰티/코스메틱 이커머스 상세페이지 전문 최고 카피라이터입니다.
**20대 여성 타겟으로, 인스타그램이나 올리브영에서 볼 법한 트렌디하고 자연스러운 톤**으로 작성해주세요.
과하지 않은 감성적이고 힙한 문체를 사용하세요. "~해요", "~거든요", "피부결 완전 미쳤죠" 같은 구어체를 매우 자연스럽게 섞어주세요. 딱딱한 설명문은 절대 금지합니다.

제품 정보:
- 브랜드: {product_info.get('brandName', 'Unknown')}
- 제품명: {product_info.get('productName', 'Product')}
- 카테고리: {product_info.get('category', 'General')}
- 특징: {', '.join(product_info.get('features', []))}
- 타겟 고객: 20대 여성
- 톤앤매너: 친근하고 자연스러운, 트렌디한 뷰티 감성, 솔직하고 후킹(Hooking)되는 문구
"""
        
        if search_info:
            prompt += f"""
추가 정보:
- 설명: {search_info.get('description', '')}
"""
        
        prompt += """
다음 형식의 JSON으로 응답해주세요. 

**색상 규칙 (매우 중요)**:
1. "sectionBg" (섹션 배경색)를 먼저 결정하세요. 제품 이미지 색상팔레트와 어울리는 톤으로.
2. "color" (텍스트 색상)는 반드시 sectionBg와 대비가 명확하게 보이는 색으로 설정하세요.
   - 밝은 배경 → 어두운 텍스트 (#1a1a2e, #2d3436 등)
   - 어두운 배경 → 밝은 텍스트 (#ffffff, #f8f9fa 등)
3. 제목(mainTitle)과 부제목(subTitle)에는 반드시 "textShadow" 스타일을 포함하세요. 
   예: "textShadow": "0 2px 10px rgba(0,0,0,0.2)" (입체감 부여)

사용 가능한 서체(fontFamily):
- "Pretendard" (기본, 모던)
- "Nanum Myeongjo" (우아함, 프리미엄)
- "Black Han Sans" (강렬함, 타이틀)
- "Nanum Gothic" (깔끔함, 가독성)

**중요: 줄바꿈 규칙**
- mainTitle, hookText, 각 포인트 content 등 텍스트가 길어지면 반드시 \\n (줄바꿈)으로 2줄 구성하세요.
- 예시: "단순한 클렌징은 이제 그만!\\n'진짜' 스킨케어의 시작!"

**중요: 타이포그래피 규칙**
- eyebrow: 한글 고딕 (Pretendard), fontSize 18, fontWeight 400
- mainBrandName: 영문 명조 (Playfair Display), fontSize 64, fontWeight 900 (명조체는 볼드 허용) 
- subProductName: 영문 고딕 (Inter), fontSize 36, fontWeight 400
- hookText: fontWeight 500, fontSize 22
- 각 포인트 title: fontWeight 500, fontSize 20
- 각 포인트 content: fontWeight 400, fontSize 15
- 성분/비교 섹션 title: fontWeight 500, fontSize 28

응답 JSON 형식:
{
    "header": {
        "eyebrow": "제품소구점 한줄 요약 (한글, 예: 하루의 시작, 깨끗한 자신감!)",
        "eyebrowStyle": { "fontFamily": "Pretendard", "fontSize": 20, "fontWeight": 400, "color": "#888", "letterSpacing": 2 },
        "mainBrandName": "ENGLISH ONLY. 제품을 상징하는 영문 이름. 히어로 섹션의 메인 타이틀이 됩니다. 4단어 이상이면 자연스럽게 \\n으로 2줄 구성. 한글 절대 금지. 예: 'GLOWING VITAL\\nSERUM ESSENCE'",
        "mainBrandNameStyle": { "fontFamily": "'Playfair Display', serif", "fontSize": 96, "fontWeight": 900, "color": "#1a2e22", "letterSpacing": 0, "textShadow": "0 2px 15px rgba(0,0,0,0.1)" },
        "subProductName": "한글만. 위 영문(mainBrandName)의 직관적이고 매력적인 한글 번역. 메인 타이틀 바로 아래에 들어갑니다. 영문 절대 금지. 예: '글로잉 바이탈\\n세럼 에센스'",
        "subProductNameStyle": { "fontFamily": "Pretendard", "fontSize": 36, "fontWeight": 400, "color": "#1a2e22", "letterSpacing": 2, "textShadow": "0 1px 10px rgba(0,0,0,0.1)" },
        "hookText": "20대 여성의 공감을 확 끌어내는 후킹 문구 2줄. (\\n 사용, 올리브영/인스타 감성, '이거 하나면 끝!' 같은 느낌으로)",
        "hookTextStyle": { "fontFamily": "Pretendard", "fontSize": 20, "fontWeight": 500, "color": "#666" },
        "sectionBg": "#fdf2f0",
        "image_prompt": "Exact MJ/DALL-E prompt: Product hero shot with soft pink or neutral background, decorative botanical line illustrations overlaid on edges (peony, magnolia, tulip sketches), product centered with subtle shadows, premium Korean cosmetic styling, editorial lighting. Include the product brand name and visual identity. --ar 3:4 --style raw"
    },
    "points": [
        {
            "title": "핵심 포인트 1 제목 (뷰티 감성으로)",
            "content": "상세 설명 (20대 여성 톤, 2-3문장. '스며들거든요', '보이시나요?' 같은 구어체 섞기)",
            "image_prompt": "Photorealistic: Two elegant female hands gently holding/presenting the [제품 이름] product box/container against a soft gradient background. Hands should be clean and well-manicured. Soft studio lighting with subtle sparkle/bubble effects around the product. Focus on premium unboxing moment. Korean beauty style photography. --ar 16:9 --style raw"
        },
        {
            "title": "핵심 포인트 2 제목",
            "content": "상세 설명",
            "image_prompt": "Product-in-use scene: The [제품 이름] applied on skin/face/body showing the actual texture. Soft natural bathroom or vanity lighting. Water droplets or foam if cleansing product. Show the product being actively used on real skin. Close-up angle showing application technique. --ar 16:9 --style raw"
        },
        {
            "title": "핵심 포인트 3 제목",
            "content": "상세 설명",
            "image_prompt": "Product packaging detail: The [제품 이름] with lid/cap removed, showing the contents inside. Dramatic close-up perspective from slightly above. Premium studio lighting emphasizing color and texture of the product formula. Scattered ingredients or botanicals around the product. --ar 16:9 --style raw"
        }
    ],
    "points_title": "포인트 섹션 제목",
    "points_image_prompt": "Overall lifestyle shot: [제품 이름] placed in an elegant bathroom/vanity setting with towels, candles, plants. Soft morning light through window. Lifestyle editorial photography. --ar 4:3 --style raw",
    "ingredients": {
        "title": "핵심 성분 섹션 제목",
        "description": "성분 섹션 설명 한줄",
        "items": [
            {
                "name": "성분명 1 (예: Glutathione, Hyaluronic Acid 등 실제 성분)",
                "description": "성분 설명 (20대가 이해하기 쉽게)",
                "image_prompt": "Macro photograph of [성분 1 원물] - e.g. water droplet on skin for hyaluronic acid, orange slices with powder for vitamin C, gold liquid serum for glutathione. Clean circular crop composition. Soft gradient background. Scientific yet beautiful. --ar 1:1"
            },
            {
                "name": "성분명 2",
                "description": "성분 설명",
                "image_prompt": "Macro photograph of [성분 2 원물] - different ingredient visual. High-contrast studio photography showing the raw ingredient in its most visually appealing form. Clean circular crop. Scientific cosmetic feel. --ar 1:1"
            },
            {
                "name": "성분명 3",
                "description": "성분 설명",
                "image_prompt": "Macro photograph of [성분 3 원물]. Vibrant colors. Can show molecular structure diagram subtly overlaid. Clean minimal background. Korean cosmetic ingredient photography style. --ar 1:1"
            }
        ],
        "style": { "backgroundColor": "#F5F9F6", "color": "#2d3436" },
        "image_prompt": "Flat lay of all key ingredients arranged beautifully around the product. Top-down studio photography with soft even lighting. Clean white or light marble surface. Korean beauty editorial style."
    },
    "comparison": {
        "title": "비교 섹션 제목 (사용 전/후 느낌)",
        "before": "사용 전 상태 묘사 (1문장)",
        "after": "사용 후 변화 묘사 (1문장)",
        "percentage": "개선율 (예: 221%)",
        "style": { "backgroundColor": "#FAFBFF", "color": "#1a1a2e" },
        "before_image_prompt": "Close-up skin texture showing dull, rough, or problematic skin condition. Slightly desaturated color palette. Medical/clinical photography style with even lighting. The skin should show visible concerns (enlarged pores, uneven tone, dryness). --ar 1:1 --style raw",
        "after_image_prompt": "Close-up glowing, smooth, healthy skin after using the product. Bright, radiant, even-toned complexion. Dewy fresh look with soft natural light highlighting the skin glow. Same angle as before image. --ar 1:1 --style raw"
    },
    "review": {
        "title": "이런 분들께 추천합니다",
        "items": [
            { "title": "리뷰 제목 1 (한줄 요약)", "content": "리뷰 상세 (실사용 후기 톤, 2-3문장)" },
            { "title": "리뷰 제목 2", "content": "리뷰 상세" },
            { "title": "리뷰 제목 3", "content": "리뷰 상세" }
        ],
        "style": { "backgroundColor": "#FFFFFF", "color": "#2d3436" },
        "image_prompt": "Lifestyle scene: Young Korean woman in her 20s holding the [제품 이름] product with a satisfied expression. Soft natural lighting in a modern Korean apartment. Casual, relatable, Instagram-worthy mood. Should feel authentic, not overly posed. --ar 3:4 --style raw"
    },
    "texture": {
        "title": "텍스처 섹션 제목",
        "content": "제형/텍스처 묘사 (감각적으로, 2문장)",
        "style": { "backgroundColor": "#1a1a2e", "color": "#ffffff" },
        "image_prompt": "Extreme macro photography of the product texture/formula. Show the cream, gel, foam, or liquid texture in ultra close-up detail. Bubbles, droplets, or swirl patterns visible. Dramatic lighting creating depth and dimension. Dark moody background to make the texture pop. Cosmetic texture photography. --ar 3:4 --style raw"
    },
    "description": {
        "title": "제품 설명 섹션 제목",
        "content": "제품 상세 설명 (친근한 톤, 구어체 섞어서)",
        "style": { "backgroundColor": "#FFFFFF", "color": "#1a1a2e" },
        "image_prompt": "Elegant product still life: The [제품 이름] on a marble or textured surface with scattered flower petals, green leaves, and natural elements. Soft diffused natural light from the side. Premium editorial beauty photography. --ar 3:4 --style raw"
    },
    "usage": {
        "title": "사용법 섹션 제목",
        "steps": [
            "1단계 (이모지+짧고 명확하게)",
            "2단계",
            "3단계"
        ],
        "style": { "backgroundColor": "#F0F4FF", "color": "#2d3436" },
        "image_prompt": "Step-by-step product usage photo sequence: Hands demonstrating the use of [제품 이름]. Clean minimal background. Studio lighting. Focus on the action of pumping/scooping/applying the product. --ar 16:9 --style raw"
    },
    "product_info": {
        "full_ingredients": "제품 카테고리에 맞는 전성분을 예측하여 영어로 작성 (예: Water, Glycerin, Niacinamide, ...). 실제 전성분 리스트처럼 콤마로 구분하여 상세하게.",
        "style": { "backgroundColor": "#F9FAFB", "color": "#475569" }
    }
}

한국어로만 응답하세요. 20대 감성의 친근하고 자연스러운 마케팅 톤으로 작성하되 과대광고는 피해주세요.
배경색과 텍스트색의 대비를 반드시 확인하세요. 제목에는 반드시 textShadow를 넣어 입체감을 살려주세요.
image_prompt는 반드시 영어로 작성하세요. Midjourney나 DALL-E에서 바로 사용 가능한 구체적이고 전문적인 프롬프트로 작성하세요.

[핵심 성분(ingredients) 작성 시 주의사항]
- 반드시 제품의 *진짜 메인 활성 성분*만 3~4개 추출해서 JSON 배열로 기재하세요. 
- 보조 성분이나 정제수 같은 일반적인 원료는 제외하세요. 
- JSON 응답 안에는 절대로 // 등 어떠한 주석도 넣지 마세요.
"""
        return prompt
    
    def _parse_response(self, text: str) -> Dict[str, Any]:
        """AI 응답 파싱"""
        try:
            # JSON 추출
            json_match = re.search(r'\{.*\}', text, re.DOTALL)
            if json_match:
                content = json_match.group(0)
                # 트레일링 콤마 제거
                content = re.sub(r',\s*([}\]])', r'\1', content)
                return json.loads(content)
        except Exception as e:
            print(f"응답 파싱 실패: {e}")
        
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
            "product_info": {
                "full_ingredients": "Water, Glycerin, Propylene Glycol, Alcohol, Fragrance",
                "style": { "backgroundColor": "#F9FAFB", "color": "#475569" }
            }
        }
