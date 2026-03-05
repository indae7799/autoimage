# 🚀 가장 간단한 실행 방법

## 방법 1: 더블클릭 (가장 간단)

**`시작.bat`** 파일을 더블클릭하세요!

그러면:
1. 백엔드 서버 자동 실행
2. 프론트엔드 서버 자동 실행
3. 브라우저 자동 오픈

---

## 방법 2: 수동 실행 (가장 확실함)

### 1단계: 명령 프롬프트 열기
- **Windows 키 + R**
- `cmd` 입력 후 Enter

### 2단계: 백엔드 실행
첫 번째 명령 프롬프트에서:

```cmd
cd C:\Users\jungindae\Downloads\상세페이지\backend
pip install -r requirements.txt
uvicorn main:app --reload
```

**이 창은 그대로 두세요!**

### 3단계: 프론트엔드 실행
**새로운 명령 프롬프트 창**을 열고:

```cmd
cd C:\Users\jungindae\Downloads\상세페이지\frontend
npm install
npm run dev
```

### 4단계: 브라우저 열기
브라우저에서 **http://localhost:5173** 접속

---

## ⚠️ 실행 전 필수 체크

### 1. Python 설치 확인
```cmd
python --version
```
Python이 없다면: https://www.python.org/downloads/

### 2. Node.js 설치 확인
```cmd
node --version
npm --version
```
Node.js가 없다면: https://nodejs.org/

### 3. .env 파일 설정
`backend` 폴더에 `.env` 파일 만들기:
```
GEMINI_API_KEY=여기에_API_키_입력
```

---

## ❓ 문제가 생겼다면?

### 어떤 에러가 나오나요?

**"Python이 설치되어 있지 않습니다"**
→ Python 설치 필요

**"npm이 인식되지 않습니다"**
→ Node.js 설치 필요

**"포트가 이미 사용 중입니다"**
→ 다른 프로그램 종료 또는 컴퓨터 재시작

**"모듈을 찾을 수 없습니다"**
→ 수동으로 설치:
```cmd
cd backend
pip install -r requirements.txt

cd ..\frontend
npm install
```

**브라우저가 안 열림**
→ 수동으로 http://localhost:5173 접속

---

## 💡 추천 방법

**가장 확실한 방법은 수동 실행입니다!**

1. 명령 프롬프트 2개 열기
2. 각각에서 위 명령어 실행
3. 브라우저에서 접속

이 방법이 가장 안정적입니다!
