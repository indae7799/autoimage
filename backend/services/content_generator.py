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
        """프롬프트 생성 - 20대 여성 타겟 마켓팅 톤 앤 매너 최적화"""
        prompt = f"""
# ROLE: 대한민국 20대 여성을 타겟으로 하는 프리미엄 뷰티/코스메틱 이커머스 상세페이지 전문 톱 카피라이터

# 고유 지시사항 (반드시 준수할 것)
1. **타겟 페르소나**: 올리브영 랭킹템이나 인스타 감성 뷰티템을 좋아하는 트렌디한 20대 여성이 타겟입니다. "대박", "미쳤다", "~거든요", "~해요", "말해 뭐해" 같은 구어체를 아주 세련되게 섞어주세요. 
2. **후킹(Hooking) 중심**: 보는 순간 사고 싶게 만드는 첫 문장에서 승부하세요. 뻔한 설명은 버리고 공감을 사는 문구를 쓰세요.
3. **히어로 섹션 구조 (필수)**: 
   - `mainBrandName`: 반드시 **ENGLISH ONLY** (영어 대문자 권장). 제품을 상징하는 멋진 영문 브랜드/제품명. (예: GLOWING PEELING PAD)
   - `subProductName`: 반드시 **한글만**. 위 영문의 뜻을 그대로 살리면서 매력적인 한글 이름. (예: 속광 뿜뿜 필링 패드)
4. **성분 추출 최소 3개**: `ingredients` -> `items` 배열에 반드시 이 제품의 실질적인 핵심 활성 성분(Active Ingredients)을 **최소 3개** 이상 추출하여 상세히 설명하세요.
5. **자연스러운 줄바꿈 (\\n)**: 텍스트가 조금이라도 길어지면(10자 이상) 가독성을 위해 반드시 `\\n`을 사용하여 2줄 이상으로 구성하세요. 호흡이 자연스러워야 합니다.
6. **이모지(Emoji) 절대 금지**: 본문 전체에 단 하나의 이모지도 넣지 마세요. 디자인 깨짐 방지 목적입니다.

제품 정보:
- 제품명: {product_info.get('productName', 'Unknown')}
- 분석 키워드: {', '.join(product_info.get('features', []))}
- 브랜드/카테고리: {product_info.get('brandName', 'Unknown')} / {product_info.get('category', 'Beauty')}

추가 검색 데이터: 
{json.dumps(search_info, ensure_ascii=False) if search_info else "정보 없음"}

# 응답 JSON 형식 (반드시 이 구조 유지)
{{
    "header": {{
        "eyebrow": "20대 여성이 공감할 짧은 한마디 (한글)",
        "mainBrandName": "영어만 사용. 히어로 메인 타이틀. 가독성 있게 \\n 포함 필수.",
        "subProductName": "한글만 사용. 위 영어의 매력적인 번역 및 한글 제품명. \\n 포함 필수.",
        "hookText": "인스타 감성 돋는 핵심 후킹 문구 2줄 (\\n 사용 필수).",
        "sectionBg": "제품 로고/패키지 색상과 어울리는 파스텔톤 또는 세련된 컬러 배경 (#hex)",
        "image_prompt": "Midjourney prompt: Professional hero shot of the product, premium cosmetic photography, aesthetic layout with soft shadows and botanical elements. --ar 3:4"
    }},
    "points": [
        {{
            "title": "20대 감성으로 쓴 핵심 포인트 제목 1 (예: 겉보속촉 아이콘!)",
            "content": "공감을 부르는 상세 설명 (2줄 이상, \\n 사용). 구어체 적극 활용.",
            "image_prompt": "Detailed product usage shot, high-end cosmetic style. --ar 16:9"
        }},
        {{ "title": "포인트 제목 2", "content": "상세 설명 (\\n 사용)", "image_prompt": "..." }},
        {{ "title": "포인트 제목 3", "content": "상세 설명 (\\n 사용)", "image_prompt": "..." }}
    ],
    "ingredients": {{
        "title": "핵심 성분, 놓칠 수 없죠!",
        "description": "성분 함량과 효과에 대한 매력적인 소개",
        "items": [
            {{ "name": "성분명 1 (실제 성분)", "description": "20대도 이해하기 쉬운 효과 위주의 설명", "image_prompt": "..." }},
            {{ "name": "성분명 2", "description": "...", "image_prompt": "..." }},
            {{ "name": "성분명 3 (필수 포함)", "description": "...", "image_prompt": "..." }}
        ],
        "style": {{ "backgroundColor": "#F5F9F6", "color": "#2d3436" }}
    }},
    "comparison": {{
        "title": "이렇게 달라져요!",
        "before": "문제 상황 (간결하게)",
        "after": "해결된 효과 (극찬하듯)",
        "percentage": "수치 (예: 98.7% 만족)",
        "style": {{ "backgroundColor": "#FAFBFF", "color": "#1a1a2e" }}
    }},
    "review": {{
        "title": "언니들의 찐후기",
        "items": [
            {{ "title": "핵심 요약 한줄", "content": "실제 유저가 쓴 것 같은 리얼한 후기 톤. (\\n 사용)" }},
            {{ "title": "후기 2", "content": "..." }},
            {{ "title": "후기 3", "content": "..." }}
        ]
    }},
    "texture": {{
        "title": "이 제형, 진짜 미쳤어요 (텍스처)",
        "content": "감각적이고 상세한 텍스처 묘사 (2줄, \\n 사용)",
        "style": {{ "backgroundColor": "#1a1a2e", "color": "#ffffff" }}
    }},
    "product_info": {{
        "full_ingredients": "전성분을 실제 화장품 패키지처럼 상세히 리스트업 (영어/한글 병기 무관)",
        "style": {{ "backgroundColor": "#F9FAFB", "color": "#475569" }}
    }}
}}

# 가이드:
- 모든 텍스트 내 이모지 금지.
- 줄바꿈 (\\n)을 적극적으로 사용해 한 문장이 너무 길어지지 않게 할 것.
- JSON 파싱에 오류가 없도록 유효한 구조만 반환하세요.
- 친절하면서도 전문적인 '뷰티 서포터' 느낌의 말투를 유지하세요.
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
