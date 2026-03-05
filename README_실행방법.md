# 🚀 실행 방법 (간단 버전)

## 더블클릭으로 실행하기

**`실행하기.bat`** 파일을 더블클릭하면:

1. ✅ 백엔드 서버 자동 실행
2. ✅ 프론트엔드 서버 자동 실행  
3. ✅ 브라우저 자동 오픈 (http://localhost:5173)

**끝!** 그냥 더블클릭하면 됩니다! 🎉

---

## ⚠️ 처음 실행 전에 해야 할 일

### 1. 환경 변수 설정 (필수!)

`backend` 폴더에 `.env` 파일을 만들어야 합니다:

1. `backend` 폴더 열기
2. 새 파일 만들기 → 이름: `.env`
3. 다음 내용 입력:

```
GEMINI_API_KEY=여기에_API_키_입력
```

**Gemini API 키 발급:**
- https://makersuite.google.com/app/apikey 접속
- Google 계정 로그인
- "Create API Key" 클릭
- 생성된 키 복사해서 `.env` 파일에 붙여넣기

---

## 📍 접속 주소

- **웹사이트**: http://localhost:5173 (자동으로 열림)
- **API 문서**: http://localhost:8000/docs

---

## ❓ 문제 해결

### Python이 없다고 나오면
- Python 설치: https://www.python.org/downloads/
- 설치 시 "Add Python to PATH" 체크!

### npm이 없다고 나오면
- Node.js 설치: https://nodejs.org/

### 브라우저가 안 열리면
- 수동으로 http://localhost:5173 접속

### 서버가 실행되지 않으면
- 각 서버 창의 에러 메시지 확인
- `.env` 파일이 제대로 설정되었는지 확인

---

## 💡 팁

- 서버를 종료하려면 각 창에서 **Ctrl+C** 누르기
- 두 개의 명령 프롬프트 창이 열립니다 (백엔드, 프론트엔드)
- 브라우저는 자동으로 열리지만, 서버가 완전히 시작되기까지 5-10초 정도 걸릴 수 있습니다
