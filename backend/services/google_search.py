"""
구글 검색 서비스
제품 정보 보강을 위한 구글 검색 연동
"""
import os
import httpx
from typing import Dict, List, Any
from dotenv import load_dotenv

load_dotenv()

class GoogleSearchService:
    def __init__(self):
        # Google Custom Search API 사용
        self.api_key = os.getenv("GOOGLE_SEARCH_API_KEY")
        self.search_engine_id = os.getenv("GOOGLE_SEARCH_ENGINE_ID")
        
        # SerpAPI 대안 (선택사항)
        self.serpapi_key = os.getenv("SERPAPI_KEY")
    
    def search_product_info(self, product_name: str, brand_name: str = "") -> Dict[str, Any]:
        """
        제품 정보 검색
        
        Args:
            product_name: 제품명
            brand_name: 브랜드명 (선택)
        
        Returns:
            검색 결과 정보
        """
        query = f"{brand_name} {product_name}" if brand_name else product_name
        
        # Google Custom Search API 사용
        if self.api_key and self.search_engine_id:
            return self._search_custom_search(query)
        
        # SerpAPI 사용 (대안)
        if self.serpapi_key:
            return self._search_serpapi(query)
        
        # 검색 API가 없으면 빈 결과 반환
        return {
            "ingredients": [],
            "benefits": [],
            "usage": [],
            "description": ""
        }
    
    def _search_custom_search(self, query: str) -> Dict[str, Any]:
        """Google Custom Search API 사용"""
        url = "https://www.googleapis.com/customsearch/v1"
        params = {
            "key": self.api_key,
            "cx": self.search_engine_id,
            "q": query,
            "num": 5
        }
        
        try:
            with httpx.Client() as client:
                response = client.get(url, params=params, timeout=10.0)
                if response.status_code == 200:
                    data = response.json()
                    return self._parse_search_results(data)
        except Exception as e:
            print(f"구글 검색 실패: {e}")
        
        return {
            "ingredients": [],
            "benefits": [],
            "usage": [],
            "description": ""
        }
    
    def _search_serpapi(self, query: str) -> Dict[str, Any]:
        """SerpAPI 사용 (대안)"""
        url = "https://serpapi.com/search"
        params = {
            "api_key": self.serpapi_key,
            "q": query,
            "engine": "google",
            "hl": "ko"
        }
        
        try:
            with httpx.Client() as client:
                response = client.get(url, params=params, timeout=10.0)
                if response.status_code == 200:
                    data = response.json()
                    return self._parse_search_results(data)
        except Exception as e:
            print(f"SerpAPI 검색 실패: {e}")
        
        return {
            "ingredients": [],
            "benefits": [],
            "usage": [],
            "description": ""
        }
    
    def _parse_search_results(self, data: Dict) -> Dict[str, Any]:
        """검색 결과 파싱"""
        # 간단한 파싱 (실제로는 더 정교한 파싱 필요)
        items = data.get("items", [])
        snippets = [item.get("snippet", "") for item in items[:3]]
        
        return {
            "ingredients": [],
            "benefits": [],
            "usage": [],
            "description": " ".join(snippets[:200])  # 처음 200자만
        }
