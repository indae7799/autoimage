"""
상세페이지 자동화 서비스 - 백엔드 API
"""
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

load_dotenv()

app = FastAPI(title="상세페이지 자동화 API")

# CORS 설정
origins = [
    "http://localhost:5172",
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
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
        
        # 2. 이미지 분석
        analysis_result = image_analyzer.analyze_images(image_bytes_list)
        product_info = analysis_result["productInfo"]
        color_palette = analysis_result["colorPalette"]
        
        # 제품명/브랜드명이 제공되면 사용
        if product_name:
            product_info["productName"] = product_name
        if brand_name:
            product_info["brandName"] = brand_name
        
        # 3. 구글 검색 (제품 정보 보강)
        search_info = search_service.search_product_info(
            product_info.get("productName", ""),
            product_info.get("brandName", "")
        )
        
        # 4. 콘텐츠 생성
        generated_content = content_generator.generate_content(product_info, search_info)
        
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
    """이미지 기반 AI 프롬프트 생성"""
    try:
        image_bytes = await file.read()
        
        # Use image analyzer to get product info
        analysis = image_analyzer.analyze_images([image_bytes])
        product_info = analysis.get("productInfo", {})
        
        # Generate a studio-quality image prompt
        product_name = product_info.get("productName", "Premium Product")
        category = product_info.get("category", "beauty")
        
        prompt = (
            f"Studio product photography of {product_name}, "
            f"minimalist white background, soft natural lighting, "
            f"8K resolution, professional commercial shot, "
            f"slight shadow for depth, clean composition, "
            f"magazine cover quality, {category} editorial style"
        )
        
        return {"prompt": prompt, "productInfo": product_info}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"프롬프트 생성 실패: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
