# PlangoApp

AI 기반 여행 플래너 React Native 앱입니다.
사용자가 채팅으로 여행 관련 질문을 하면, Laravel 백엔드를 통해 OpenAI GPT-4o-mini가 응답합니다.

---

## 기술 스택

| 분류 | 기술 |
|------|------|
| 모바일 | React Native 0.84 (CLI), TypeScript |
| 스타일링 | NativeWind v4 (Tailwind CSS) |
| HTTP 클라이언트 | Axios |
| 백엔드 | Laravel (Sail, Docker) |
| AI | OpenAI GPT-4o-mini |
| 패키지 매니저 | npm |

---

## 프로젝트 구조

```
PlangoApp/
├── src/
│   ├── components/       # 공통 컴포넌트
│   ├── screens/
│   │   └── ChatScreen.js # 채팅 화면
│   ├── hooks/            # 커스텀 훅
│   └── services/
│       └── api.js        # Axios 인스턴스 (API 설정)
├── App.tsx               # 앱 진입점
├── global.css            # Tailwind 디렉티브
├── tailwind.config.js    # NativeWind 설정
├── babel.config.js       # Babel 설정
└── metro.config.js       # Metro 번들러 설정
```

---

## 시작하기

### 요구사항

- Node.js >= 22.11.0
- JDK 17 (Temurin 권장)
- Android SDK (NDK 27.1.12297006)
- Laravel 백엔드 서버 실행 중

### 설치

```bash
npm install
```

### API 서버 주소 설정

`src/services/api.js`에서 PC의 내부 IP를 설정합니다.

```js
const API_BASE_URL = 'http://<내_PC_IP주소>';
```

> **내부 IP 확인:** macOS/Linux → `ifconfig | grep "inet "` / Windows → `ipconfig`
> 모바일 기기와 PC가 **동일한 Wi-Fi**에 연결되어 있어야 합니다.

### 실행

**Metro 서버 시작**

```bash
npx react-native start
```

**Android 빌드 및 실행**

```bash
npx react-native run-android
```

---

## 주요 기능

### 채팅 화면 (`ChatScreen.js`)

- 사용자 메시지 입력 및 전송
- AI 응답 말풍선 표시 (좌/우 구분)
- 응답 대기 중 로딩 인디케이터
- Android 하단 내비게이션 바 대응 (`useSafeAreaInsets`)
- 키보드 표시 시 입력창 자동 이동 (`KeyboardAvoidingView`)

### API 연동 (`api.js`)

- `POST /api/chat` — 메시지 전송 및 AI 응답 수신
- 요청 타임아웃: 30초
- Laravel 응답 구조: `{ success, message, data: { reply } }`

---

## Laravel 백엔드 연동

백엔드는 Laravel (TravelPlatform) 프로젝트를 사용합니다.

### 서버 실행 (Laravel Sail)

```bash
./vendor/bin/sail up -d
```

### 채팅 API

```
POST /api/chat
Content-Type: application/json

{ "message": "제주도 2박 3일 일정 짜줘" }
```

```json
{
  "success": true,
  "message": "응답 성공",
  "data": {
    "reply": "안녕하세요! 제주도 여행 일정을 도와드릴게요. ..."
  }
}
```

---

## 환경 설정 참고

### NativeWind v4 설정

`babel.config.js`

```js
module.exports = {
  presets: ['module:@react-native/babel-preset', 'nativewind/babel'],
};
```

`metro.config.js`

```js
const { withNativeWind } = require('nativewind/metro');
module.exports = withNativeWind(mergeConfig(getDefaultConfig(__dirname), config), {
  input: './global.css',
});
```

### Android 환경 변수 (`~/.zshrc`)

```bash
export JAVA_HOME=$(/usr/libexec/java_home -v 17)
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools
```
