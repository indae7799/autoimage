# 상세페이지 자동화 서비스

쿠팡/네이버 등 이커머스 플랫폼에 제품을 등록하고 상세페이지를 자동으로 생성하는 서비스입니다.

## 주요 기능

1. **템플릿 시스템**: 미리 정의된 템플릿 선택
2. **이미지 색상 분석**: 업로드된 이미지에서 색상 추출 및 템플릿 색상 자동 매칭
3. **제품 정보 추출**: AI를 통한 이미지 분석 및 구글 검색 연동
4. **콘텐츠 자동 생성**: 헤더, 후킹문구, 핵심성분, 설명, 사용법 자동 생성
5. **드래그 앤 드롭 편집**: 이미지를 섹션 프레임에 드래그하여 배치
6. **텍스트 편집**: 클릭하여 텍스트 직접 편집
7. **이미지 다운로드**: 섹션별 PNG 이미지로 다운로드

## 설치 및 실행

### 백엔드

```bash
cd backend
pip install -r requirements.txt

# .env 파일 생성 및 설정
# GEMINI_API_KEY=your_api_key
# GOOGLE_SEARCH_API_KEY=your_api_key (선택사항)
# GOOGLE_SEARCH_ENGINE_ID=your_engine_id (선택사항)

uvicorn main:app --reload
```

서버 주소: http://127.0.0.1:8000

### 프론트엔드

```bash
cd frontend
npm install
npm run dev
```

웹사이트: http://localhost:5173

## 사용 방법

1. **템플릿 선택**: 사용할 템플릿 선택
2. **이미지 업로드**: 제품 이미지 업로드 (드래그 앤 드롭 지원)
3. **자동 생성**: 이미지 분석 및 콘텐츠 자동 생성
4. **편집**: 텍스트 클릭하여 편집, 이미지 드래그하여 배치
5. **다운로드**: 완성된 상세페이지를 이미지 파일로 다운로드

## 프로젝트 구조

```
.
├── backend/
│   ├── main.py                 # FastAPI 메인 서버
│   ├── services/
│   │   ├── template_service.py  # 템플릿 관리
│   │   ├── image_analyzer.py    # 이미지 분석
│   │   ├── google_search.py     # 구글 검색 연동
│   │   └── content_generator.py # 콘텐츠 생성
│   └── templates/
│       └── default_template.json # 기본 템플릿
├── frontend/
│   ├── src/
│   │   ├── App.jsx              # 메인 앱
│   │   ├── components/
│   │   │   ├── TemplateSelector.jsx
│   │   │   ├── ImageUploader.jsx
│   │   │   └── Editor.jsx
│   │   └── services/
│   │       └── api.js
│   └── package.json
└── README.md
```

## 환경 변수 설정

`.env` 파일에 다음 변수들을 설정하세요:

```env
# 필수
GEMINI_API_KEY=your_gemini_api_key

# 선택사항 (구글 검색 기능 사용 시)
GOOGLE_SEARCH_API_KEY=your_google_search_api_key
GOOGLE_SEARCH_ENGINE_ID=your_search_engine_id

# 또는 SerpAPI 사용 시
SERPAPI_KEY=your_serpapi_key
```

## 템플릿 커스터마이징

`backend/templates/` 디렉토리에 JSON 형식으로 템플릿을 추가할 수 있습니다.

템플릿 구조:
- `sections`: 섹션 배열
- `fields`: 각 섹션의 필드 (텍스트/이미지)
- `colorVariables`: 색상 변수 정의
- `colorMapping`: 이미지 색상 → 템플릿 색상 매핑 규칙

## 라이선스

MIT
