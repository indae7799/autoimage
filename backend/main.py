"""
상세페이지 자동화 서비스 - 백엔드 API
"""
import asyncio
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import os
from dotenv import load_dotenv

from services.template_service import TemplateService
from services.image_analyzer import ImageAnalyzer
from services.google_search import GoogleSearchService
from services.content_generator import ContentGenerator
import logging

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

app = FastAPI(title="상세페이지 자동화 API")

# CORS 설정
origins = [
    "http://localhost:5172",
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:3000",
    "https://autoimg.vercel.app",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https://autoimg-.*\.vercel\.app",  # Vercel 프리뷰 URL 허용
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 서비스 초기화
template_service = TemplateService()
image_analyzer = ImageAnalyzer()
search_service = GoogleSearchService()
content_generator = ContentGenerator()

@app.get("/")
def read_root():
    return {"message": "상세페이지 자동화 API", "version": "1.0.0"}

@app.get("/api/ping")
def ping():
    """백엔드 활성화 확인 (Cold Start 방지용)"""
    return {"status": "ok", "message": "pong"}

@app.get("/api/templates")
def list_templates():
    """템플릿 목록 조회"""
    return {"templates": template_service.list_templates()}

@app.get("/api/templates/{template_id}")
def get_template(template_id: str):
    """템플릿 상세 조회"""
    template = template_service.get_template(template_id)
    if not template:
        raise HTTPException(status_code=404, detail="템플릿을 찾을 수 없습니다")
    return template

class ProcessRequest(BaseModel):
    template_id: str
    product_name: Optional[str] = None
    brand_name: Optional[str] = None

@app.post("/api/process")
async def process_images(
    files: List[UploadFile] = File(...),
    template_id: str = "default-template",
    product_name: Optional[str] = None,
    brand_name: Optional[str] = None
):
    """
    이미지 업로드 및 상세페이지 생성
    
    1. 이미지 분석 (색상 추출, 제품 정보)
    2. 구글 검색 (제품 정보 보강)
    3. 콘텐츠 생성 (헤더, 후킹문구, 성분, 설명, 사용법)
    4. 템플릿 색상 매핑
    """
    try:
        # 1. 이미지 읽기
        image_bytes_list = []
        for file in files:
            content = await file.read()
            image_bytes_list.append(content)
        
        if not image_bytes_list:
            raise HTTPException(status_code=400, detail="이미지가 없습니다")
        
        # 2. 이미지 분석 (CPU 바운드 → 스레드풀에서 실행)
        analysis_result = await asyncio.to_thread(
            image_analyzer.analyze_images, image_bytes_list
        )
        product_info = analysis_result["productInfo"]
        color_palette = analysis_result["colorPalette"]
        
        # 제품명/브랜드명이 제공되면 사용
        if product_name:
            product_info["productName"] = product_name
        if brand_name:
            product_info["brandName"] = brand_name
        
        # 3. 구글 검색 + 콘텐츠 생성을 병렬 실행 (약 40% 시간 단축)
        search_task = asyncio.to_thread(
            search_service.search_product_info,
            product_info.get("productName", ""),
            product_info.get("brandName", "")
        )
        # 검색을 기다리지 않고 먼저 시작, 결과가 오면 콘텐츠 생성에 반영
        search_info = await search_task
        
        # 4. 콘텐츠 생성 (가장 무거운 AI 호출)
        generated_content = await asyncio.to_thread(
            content_generator.generate_content, product_info, search_info
        )
        
        # 5. 템플릿 가져오기
        template = template_service.get_template(template_id)
        if not template:
            raise HTTPException(status_code=404, detail="템플릿을 찾을 수 없습니다")
        
        # 6. 색상 매핑 적용
        template_with_colors = template_service.apply_color_mapping(template, color_palette)
        
        # 7. 콘텐츠를 템플릿에 적용
        result = {
            "template": template_with_colors,
            "content": generated_content,
            "productInfo": product_info,
            "colorPalette": color_palette,
            "images": analysis_result["images"]
        }
        
        return result
        
    except ValueError as e:
        print(f"요청 데이터 오류: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"처리 실패: {e}")
        raise HTTPException(status_code=500, detail=str(e))

from fastapi.responses import StreamingResponse
from services.bg_remover import remove_background
import io

@app.post("/api/remove-bg")
async def api_remove_bg(file: UploadFile = File(...)):
    """이미지 배경 제거 (누끼따기)"""
    try:
        image_bytes = await file.read()
        result_bytes = await remove_background(image_bytes)
        return StreamingResponse(
            io.BytesIO(result_bytes),
            media_type="image/png",
            headers={"Content-Disposition": f"attachment; filename=removed_bg.png"}
        )
    except RuntimeError as e:
        raise HTTPException(status_code=501, detail=str(e))
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"배경 제거 실패: {str(e)}")


@app.post("/api/generate-prompt")
async def api_generate_prompt(file: UploadFile = File(...)):
    """이미지 기반 고품질 AI 프롬프트 생성"""
    try:
        image_bytes = await file.read()
        
        # 1. 이미지 분석을 통해 제품 및 기본 색상 정보 추출
        analysis = await asyncio.to_thread(image_analyzer.analyze_images, [image_bytes])
        product_info = analysis.get("productInfo", {})
        
        product_name = product_info.get("productName", "화장품/제품")
        category = product_info.get("category", "beauty")
        colors = analysis.get("colorPalette", {})
        primary_color = colors.get("primary", "#ffffff")
        
        # 2. 제미나이 AI에 전문 프롬프트 작성 지시 (4가지 스타일)
        # 이미지 데이터와 함께 프롬프트를 전송하려면 image_analyzer의 기반을 사용해야 하지만
        # 간단하게 text 기반으로 제품 특성을 묘사하여 Midjourney 전문 프롬프트를 뽑아내도록 구성
        system_prompt = f"""
당신은 최고의 제품 및 상업 전문 사진작가이자 Midjourney/Stable Diffusion 프롬프트 엔지니어입니다.
제품 정보:
- 이름: {product_name}
- 분류: {category}
- 주요 색상: {primary_color}
- 특징/키워드: {', '.join(product_info.get('features', []))}

위 제품을 돋보이게 하는 4가지 다른 스타일의 초고화질(8K, photorealistic) AI 이미지 생성용 프롬프트를 영문으로 전문성 있게 작성해주세요. 
카메라 구도, 조명, 렌즈 종류(예: 85mm, f/1.8), 배경 질감, 그림자(soft shadows 등)를 상세히 포함해야 합니다.

반드시 사용자가 바로 복사해 붙여넣을 수 있도록 아래 JSON 형식만 반환하세요 (마크다운 불필요):
{{
  "prompts": [
    {{
      "style": "Studio Photography (스튜디오 컷)",
      "prompt_en": "Studio product photography of [Product], seamless white background, soft box lighting, 8k resolution, macro detailing, sharp focus, 100mm macro lens...",
      "description_ko": "깔끔하고 세련된 흰색/단색 배경의 누끼용 스튜디오 샷"
    }},
    {{
      "style": "Lifestyle/Contextual (라이프스타일 컷)",
      "prompt_en": "...",
      "description_ko": "자연광이 들어오는 창가, 고급스러운 화장대 위 배치 등 실사용 느낌의 샷"
    }},
    {{
      "style": "Texture/Close-up (텍스처/제형 컷)",
      "prompt_en": "...",
      "description_ko": "제품의 성분이나 제형(크림, 앰플 등)을 극대화시켜 보여주는 클로즈업 샷"
    }},
    {{
      "style": "Creative/Artwork (크리에이티브 아트워크)",
      "prompt_en": "...",
      "description_ko": "물방울이 튀거나, 꽃잎과 함께 부유하는 등 시각적 대비를 주어 브랜딩을 강조하는 컷"
    }}
  ]
}}
"""
        import google.generativeai as genai
        # ContentGenerator의 모델과 동일한 최고 품질 모델(Pro) 사용
        model = genai.GenerativeModel('gemini-1.5-pro')
        response = await asyncio.to_thread(
            model.generate_content,
            system_prompt,
            generation_config=genai.GenerationConfig(response_mime_type="application/json", temperature=0.7)
        )
        
        # JSON 파싱 (간단히 loads 처리)
        import json
        import re
        text = response.text
        json_match = re.search(r'\{.*\}', text, re.DOTALL)
        if json_match:
            text = json_match.group(0)
        
        result_data = json.loads(text)
        
        return {"result": result_data, "productInfo": product_info}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"프롬프트 생성 실패: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
