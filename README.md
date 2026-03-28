# PlangoApp

AI 기반 여행 플래너 React Native 앱입니다.
채팅으로 여행 일정을 생성하고, 지도에서 확인·관리할 수 있습니다.

---

## 아키텍처

```
TravelPlatform (https://travel-platform.fly.dev)
│  REST API + Laravel Sanctum Bearer Token
▼
PlangoApp  ← 이 앱 (React Native CLI)
│  REST API (직접 호출 — 추후 TravelPlatform 프록시로 전환 예정)
▼
TourCast (https://tour-cast.fly.dev)
```

---

## 기술 스택

| 분류 | 기술 |
|------|------|
| 모바일 | React Native 0.84.1 (CLI), TypeScript 5.x |
| 스타일링 | NativeWind v4 (Tailwind CSS) |
| HTTP 클라이언트 | axios ^1.13.6 |
| 인증 | Laravel Sanctum (Bearer Token, 30일 유효) |
| 로컬 저장소 | AsyncStorage |
| 지도 | react-native-maps |
| Push 알림 | @notifee/react-native + @react-native-firebase |
| 패키지 매니저 | npm |

---

## 프로젝트 구조

```
PlangoApp/
├── src/
│   ├── config/
│   │   └── endpoints.ts        # API URL 상수 (URL 변경 시 이 파일만 수정)
│   ├── components/
│   │   ├── NotificationBanner.tsx
│   │   └── ScheduleMarker.tsx
│   ├── contexts/
│   │   └── NotificationContext.tsx
│   ├── hooks/
│   │   └── useAuth.ts          # 인증 상태 관리 (로그인/로그아웃/401 자동 처리)
│   ├── screens/
│   │   ├── ChatScreen.js       # AI 챗봇 채팅 (메인)
│   │   ├── LoginScreen.js
│   │   ├── RegisterScreen.js
│   │   ├── MapScreen.tsx       # 여행 지도 (마커·경로·히트맵)
│   │   ├── ScheduleDetailScreen.tsx
│   │   ├── NotificationScreen.tsx
│   │   └── ApiTestScreen.tsx   # 개발용
│   ├── services/
│   │   ├── api.js              # TravelPlatform axios 인스턴스
│   │   └── tourCastApi.ts      # TourCast axios 인스턴스
│   └── types/
│       └── schedule.ts
├── App.tsx                     # 루트 (전역 상태·네비게이션·FCM 초기화)
├── index.js                    # 엔트리포인트
├── global.css                  # NativeWind 엔트리포인트
└── ...
```

---

## 시작하기

### 요구사항

- Node.js >= 22.11.0
- iOS: Xcode + CocoaPods
- Android: JDK 17, Android SDK (minSdk 24)

### 설치 및 실행

```bash
# 의존성 설치
npm install

# iOS CocoaPods
cd ios && pod install && cd ..

# Metro 번들러
npm start

# iOS 실행
npm run ios

# Android 실행
npm run android
```

---

## 주요 기능

### 인증

- 이메일/비밀번호 로그인·회원가입 (Laravel Sanctum Bearer Token)
- 앱 재시작 시 AsyncStorage에서 토큰 자동 복원
- **토큰 만료(401) 시 axios 인터셉터가 자동으로 로그아웃 처리** → 로그인 화면으로 전환

### 채팅 (AI 일정 생성)

- AI 챗봇과 대화로 여행 일정 생성
- 생성된 일정을 TourCast 서버에 저장, 지도 화면으로 연결
- 서버 저장 실패 시 사용자에게 Alert로 명확히 안내

### 지도

- 일정 마커·이동 경로·방문 히트맵 표시
- `@gorhom/bottom-sheet` 기반 일정 목록 패널

### Push 알림 (FCM)

- Firebase Cloud Messaging 연동
- 앱 포그라운드·백그라운드·종료 상태 모두 지원
- 알림 탭 시 해당 일정 상세 화면으로 이동

---

## API 엔드포인트 설정

URL은 `src/config/endpoints.ts` 한 곳에서 관리합니다.

```ts
export const TRAVEL_PLATFORM_BASE_URL = 'https://travel-platform.fly.dev';
export const TOUR_CAST_BASE_URL       = 'https://tour-cast.fly.dev';
```

URL을 변경해야 할 경우 이 파일만 수정하면 `api.js`, `tourCastApi.ts`, `App.tsx`에 모두 반영됩니다.

---

## 환경 파일

gitignore 처리된 민감 정보:

```
ios/GoogleService-Info.plist   ← Firebase iOS 설정
google-services.json           ← Firebase Android 설정
.env, .env.local
```

`.env.example`에서 필요한 환경변수 목록을 확인하세요.

---

## 개선 이력

### 2026-03-29

| 항목 | 내용 |
|------|------|
| 401 인터셉터 구현 | 토큰 만료 시 자동 로그아웃. `setUnauthorizedHandler` 콜백 패턴으로 axios ↔ React 훅 연결 |
| URL 상수 분리 | `src/config/endpoints.ts` 신설. `api.js`·`tourCastApi.ts`·`App.tsx`의 URL 하드코딩 제거 |
| `useAuth` TS 마이그레이션 | `useAuth.js` → `useAuth.ts`. `User`·`UseAuthReturn` 인터페이스 추가 |
| 일정 저장 실패 처리 | API 실패 시 로컬 폴백 제거, `Alert.alert`로 사용자에게 명확히 안내 |

---

## 개발 가이드

자세한 아키텍처·인증 흐름·API 스펙·커밋 컨벤션·Known Issues는 **`CLAUDE.md`** 를 참조하세요.
