# CLAUDE.md — PlangoApp

## 1. Ecosystem Context

PlangoApp은 Travel-Ecosystem-Hub의 React Native 모바일 클라이언트입니다.

```
TravelPlatform (https://travel-platform.fly.dev)
│
│  REST API + Sanctum Bearer Token
▼
PlangoApp  ← 현재 프로젝트 (React Native 모바일 앱)
│
│  REST API (직접 호출 — 현재 아키텍처 이슈 존재, 섹션 11 참조)
▼
TourCast (https://tour-cast.fly.dev)
```

- PlangoApp은 TravelPlatform의 **유일한 모바일 클라이언트**입니다.
- **TourCast 데이터는 원칙적으로 TravelPlatform(`/api/places`)을 통해 간접 수신해야 합니다.**
- 단, 현재 코드에서는 `src/services/tourCastApi.ts`가 TourCast를 직접 호출하고 있습니다 (Known Issue — 섹션 11 참조).

---

## 2. Tech Stack

**React Native CLI (Expo 아님)**

| 항목 | 버전 |
|------|------|
| React Native | 0.84.1 |
| React | 19.2.3 |
| TypeScript | ^5.8.3 |
| Node.js | >= 22.11.0 |

**주요 라이브러리**

| 역할 | 라이브러리 | 버전 |
|------|-----------|------|
| 네비게이션 | `@react-navigation/native` + `@react-navigation/native-stack` | ^7.x |
| HTTP 클라이언트 | `axios` | ^1.13.6 |
| 토큰 저장소 | `@react-native-async-storage/async-storage` | ^1.23.1 |
| UI 스타일링 | `nativewind` | ^4.2.2 |
| Tailwind CSS | `tailwindcss` | ^3.4.19 |
| 지도 | `react-native-maps` | ^1.27.1 |
| 제스처 | `react-native-gesture-handler` | ^2.30.0 |
| 애니메이션 | `react-native-reanimated` | ^4.2.2 |
| Bottom Sheet | `@gorhom/bottom-sheet` | ^5.2.8 |
| Push 알림 | `@notifee/react-native` | ^9.1.8 |
| Firebase | `@react-native-firebase/app`, `@react-native-firebase/messaging` | ^23.8.6 |
| 아이콘 | `react-native-vector-icons` | ^10.3.0 |
| 테스트 | `jest` + `react-test-renderer` | ^29.6.3 |

> **네비게이션 방식 주의**: `@react-navigation/native-stack`이 설치되어 있으나, 현재 App.tsx는
> React Navigation Stack을 사용하지 않고 **상태(state) 기반 커스텀 네비게이션**으로 구현되어 있습니다.

---

## 3. Project Structure

```
PlangoApp/
├── App.tsx                     # 루트 컴포넌트 (앱 전역 상태, 네비게이션, FCM 초기화)
├── index.js                    # 엔트리포인트 (FCM Background 핸들러, AppRegistry)
├── global.css                  # NativeWind 전역 CSS (Metro에서 Tailwind 처리)
├── tailwind.config.js          # Tailwind 설정 (NativeWind preset 적용)
├── babel.config.js             # Babel 설정 (nativewind/babel, reanimated/plugin)
├── metro.config.js             # Metro 번들러 (withNativeWind 래핑)
├── tsconfig.json               # TypeScript 설정
├── .env.example                # 환경변수 예시
│
├── src/
│   ├── config/                 # 설정 상수
│   │   └── endpoints.ts        # API Base URL 상수 (URL 변경 시 이 파일만 수정)
│   │
│   ├── components/             # 재사용 UI 컴포넌트
│   │   ├── NotificationBanner.tsx   # 인앱 알림 배너 (모든 화면 위에 표시)
│   │   └── ScheduleMarker.tsx       # 지도 일정 마커
│   │
│   ├── contexts/               # React Context
│   │   └── NotificationContext.tsx  # 알림 전역 상태 (읽음/미읽음, 목록)
│   │
│   ├── hooks/                  # 커스텀 훅
│   │   └── useAuth.ts          # 인증 상태 관리 (로그인/로그아웃/토큰 복원/401 자동 로그아웃)
│   │
│   ├── screens/                # 화면 컴포넌트
│   │   ├── LoginScreen.js           # 로그인
│   │   ├── RegisterScreen.js        # 회원가입
│   │   ├── ChatScreen.js            # AI 챗봇 채팅 (메인 화면)
│   │   ├── MapScreen.tsx            # 여행 지도 (일정 마커, 경로, 히트맵)
│   │   ├── ScheduleDetailScreen.tsx # 일정 상세
│   │   ├── NotificationScreen.tsx   # 알림 목록
│   │   └── ApiTestScreen.tsx        # API 연동 테스트 (개발용)
│   │
│   ├── services/               # API 클라이언트
│   │   ├── api.js              # TravelPlatform axios 인스턴스 (인증 헤더·401 인터셉터)
│   │   ├── tourCastApi.ts      # TourCast axios 인스턴스 (직접 호출 — Known Issue)
│   │   └── navigationService.ts # 네비게이션 유틸리티
│   │
│   └── types/                  # TypeScript 타입 정의
│       └── schedule.ts         # ScheduleItem, RouteResponse, HeatmapPoint 등
│
├── ios/                        # iOS 네이티브 프로젝트
│   ├── PlangoApp/
│   │   └── GoogleService-Info.plist  # Firebase 설정 (gitignore됨)
│   └── Podfile                 # iOS 네이티브 의존성
│
└── android/                    # Android 네이티브 프로젝트
    └── app/build.gradle        # minSdk 24, targetSdk 36
```

---

## 4. Authentication Flow

### 로그인 흐름

```
1. LoginScreen → useAuth.login(email, password)
2. POST /api/auth/login → { success, data: { token, user } }
3. AsyncStorage.setItem('@plango_token', token)
   AsyncStorage.setItem('@plango_user', JSON.stringify(user))
4. api.defaults.headers.common.Authorization = `Bearer ${token}`
5. App.tsx에서 token 상태 변경 → 인증 화면으로 전환
```

### 앱 재시작 시 토큰 복원

```
useAuth 마운트 시:
  AsyncStorage.getItem('@plango_token')
  → 저장된 토큰 있으면 → api.defaults.headers.common.Authorization 즉시 설정
  → isLoading = false → 인증 화면 표시
```

### API 요청 헤더

`src/services/api.js`의 axios 인스턴스에 `Authorization` 헤더가 직접 설정됩니다.
인터셉터 방식이 아니라 `api.defaults.headers.common.Authorization` 를 useAuth에서 직접 변경합니다.

```js
// 로그인/복원 시 설정
api.defaults.headers.common.Authorization = `Bearer ${token}`;

// 로그아웃 시 제거
delete api.defaults.headers.common.Authorization;
```

### 토큰 만료 처리

- 토큰 유효기간: **30일** (SANCTUM_TOKEN_EXPIRATION, 갱신 없음)
- 만료 시 자동 갱신 로직 없음
- **401 수신 시 axios 인터셉터가 자동으로 로그아웃 처리합니다** (`src/services/api.js`)

```
401 응답 수신
  → api.js interceptor
  → unauthorizedHandler() 호출  ← useAuth.ts가 등록한 logout()
  → AsyncStorage 초기화 + Authorization 헤더 제거 + 상태 null
  → App.tsx에서 token === null → 로그인 화면 전환
```

> **구현 방식**: axios 인터셉터는 React 훅에 접근할 수 없으므로,
> `setUnauthorizedHandler(fn)` 콜백 패턴으로 연결합니다.
> `useAuth.ts` 마운트 시 `logout` 함수를 등록하고, 언마운트 시 해제합니다.
> `/api/auth/logout` 요청 자체의 401은 무시하여 무한 루프를 방지합니다.

---

## 5. API Integration

### TravelPlatform 연동

**Base URL**: `TRAVEL_PLATFORM_BASE_URL` (`src/config/endpoints.ts`)

```js
// src/services/api.js
import {TRAVEL_PLATFORM_BASE_URL} from '../config/endpoints';

const api = axios.create({
  baseURL: TRAVEL_PLATFORM_BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
});
```

**표준 응답 형식 처리**

```js
// 성공 응답: { success: true, message: "...", data: { ... } }
const result = response.data?.data;

// 에러 응답: { success: false, message: "...", data: null, errors: { ... } }
const serverMsg = error?.response?.data?.message ?? error?.response?.data?.error;
```

**실제 사용 중인 엔드포인트**

| 메서드 | 경로 | 용도 | 구현 위치 |
|--------|------|------|-----------|
| POST | `/api/auth/login` | 로그인 | `useAuth.ts` |
| POST | `/api/auth/register` | 회원가입 | `useAuth.ts` |
| POST | `/api/auth/logout` | 로그아웃 | `useAuth.ts` |
| POST | `/api/chat` | 챗봇 메시지 전송 | `ChatScreen.js` |
| GET | `/api/chat/history` | 대화 기록 조회 | `App.tsx` |

### TourCast 직접 연동 (현재 아키텍처 — Known Issue)

**Base URL**: `TOUR_CAST_BASE_URL` (`src/config/endpoints.ts`)

사용 중인 TourCast 엔드포인트:

| 메서드 | 경로 | 용도 |
|--------|------|------|
| GET | `/api/schedule/map` | 지도용 일정 조회 |
| GET | `/api/schedule/route` | 경로 데이터 |
| GET | `/api/schedule/heatmap` | 히트맵 데이터 |
| POST | `/api/schedule` | 일정 아이템 저장 |
| GET | `/api/schedule/list` | 일정 목록 |
| PATCH | `/api/schedule/item/:id` | 일정 상태 업데이트 |
| POST | `/api/user/device-token` | FCM 디바이스 토큰 등록 |

> **원칙**: TourCast는 TravelPlatform을 통해 간접 호출해야 합니다.
> 현재 직접 호출 구조는 추후 TravelPlatform 프록시로 전환 예정입니다.

---

## 6. Environment Variables

`.env.example` 참조:

```env
# TravelPlatform API (메인 백엔드)
TRAVEL_PLATFORM_API_URL=https://travel-platform.fly.dev

# TourCast API (여행 일정 서버)
TOUR_CAST_API_URL=https://tour-cast.fly.dev
```

> **현재 상태**: API URL은 `src/config/endpoints.ts`에서 상수로 관리합니다.
> `.env` 기반 관리가 필요하면 `react-native-config`를 도입해 해당 파일만 수정하면 됩니다.

**gitignore 적용 항목** (민감 정보 커밋 금지):
- `ios/GoogleService-Info.plist` — Firebase iOS 설정
- `google-services.json` — Firebase Android 설정
- `.env`, `.env.local` — 환경변수 파일

---

## 7. Styling Convention

### NativeWind + Tailwind CSS

- **NativeWind v4** (`nativewind/preset`)를 사용합니다.
- 스타일은 `className` prop으로 Tailwind 유틸리티 클래스를 적용합니다.
- `global.css`가 NativeWind의 엔트리포인트입니다 (Metro에서 `withNativeWind`로 처리).

```js
// App.tsx에서 최상단 import
import './global.css';

// metro.config.js
module.exports = withNativeWind(mergeConfig(getDefaultConfig(__dirname), config), {
  input: './global.css',
});
```

### Tailwind 설정 (`tailwind.config.js`)

```js
content: [
  './App.{js,jsx,ts,tsx}',
  './index.{js,jsx,ts,tsx}',
  './src/**/*.{js,jsx,ts,tsx}',
],
presets: [require('nativewind/preset')],
theme: { extend: {} }, // 커스텀 색상/폰트 없음 (기본 팔레트 사용)
```

### 현재 사용 중인 주요 색상 클래스

| 용도 | 클래스 |
|------|--------|
| 브랜드 색상 | `indigo-500` (#6366f1) |
| 배경 | `bg-gray-50`, `bg-gray-100` |
| 카드/컴포넌트 | `bg-white` |
| 에러 | `bg-red-100`, `text-red-600` |
| 성공 | `bg-green-50` |

### NativeWind 미적용 케이스

NativeWind로 표현하기 어려운 동적 스타일(애니메이션, `position: absolute` 오버레이)은
`StyleSheet.create()` 또는 인라인 `style` prop을 사용합니다.

---

## 8. Cross-Repo Rules

### TravelPlatform API 스펙 변경 시 업데이트 필요 파일

| TravelPlatform 변경 사항 | PlangoApp 업데이트 위치 |
|--------------------------|------------------------|
| 로그인 응답 구조 변경 | `src/hooks/useAuth.ts` (`login`, `register`) |
| 채팅 응답 구조 변경 | `src/screens/ChatScreen.js` (`sendMessage`) |
| 채팅 기록 응답 구조 변경 | `App.tsx` (`loadHistory`) |
| 새 인증 엔드포인트 추가 | `src/services/api.js` + `src/hooks/useAuth.ts` |
| 에러 응답 포맷 변경 | 모든 `catch` 블록의 `error?.response?.data?.message` 참조 부분 |
| Base URL 변경 | `src/config/endpoints.ts`의 `TRAVEL_PLATFORM_BASE_URL` |

### TourCast API 스펙 변경 시 업데이트 필요 파일

| TourCast 변경 사항 | PlangoApp 업데이트 위치 |
|--------------------|------------------------|
| 일정 응답 구조 변경 | `src/services/tourCastApi.ts` + `src/screens/MapScreen.tsx` |
| 타입 변경 | `src/types/schedule.ts` |
| Base URL 변경 | `src/config/endpoints.ts`의 `TOUR_CAST_BASE_URL` |

### 절대 규칙

- **TourCast를 직접 호출하는 신규 코드를 추가하지 마세요.**
  TourCast 데이터가 필요한 경우 TravelPlatform `/api/places` 또는 관련 프록시 엔드포인트를 사용하거나,
  TravelPlatform 팀에 프록시 엔드포인트 추가를 요청하세요.
- TravelPlatform API 응답은 항상 `{ success, message, data, errors }` 구조로 처리하세요.
  `response.data` 직접 접근이 아닌 `response.data?.data`에서 실제 데이터를 추출하세요.

---

## 9. Build & Run

### 사전 준비

```bash
# 의존성 설치
npm install

# iOS CocoaPods 설치
cd ios && pod install && cd ..
```

### Metro 번들러 실행

```bash
npm start
# 또는
react-native start
```

### iOS 빌드

```bash
# 시뮬레이터 (기본)
npm run ios
# 또는
react-native run-ios

# 특정 시뮬레이터 지정
react-native run-ios --simulator="iPhone 16"

# 실기기 빌드 (Xcode에서 직접 또는)
react-native run-ios --device
```

> **iOS 실기기 Push 알림**: `aps-environment` entitlement가 필요합니다.
> 무료 Apple 계정에서는 Push 알림이 동작하지 않습니다 (FCM 초기화 실패 시 경고 로그만 출력하고 계속 진행).

### Android 빌드

```bash
npm run android
# 또는
react-native run-android
```

> **Android 요구사항**: minSdkVersion 24, targetSdkVersion 36

### 테스트 실행

```bash
npm test
# 또는
jest
```

### Lint

```bash
npm run lint
# 또는
eslint .
```

### 서버 워밍업

앱 시작 시 `App.tsx`의 `warmupServers()`가 자동 실행됩니다.
Fly.dev 무료 플랜의 sleep 상태를 해제하여 첫 API 요청 지연을 방지합니다.

---

## 10. Commit Convention

```
[PlangoApp] Type: 내용 요약
```

**Type 목록**

| Type | 용도 |
|------|------|
| `Feat` | 새로운 기능 추가 |
| `Fix` | 버그 수정 |
| `Refactor` | 기능 변경 없는 코드 개선 |
| `Docs` | 문서 작성/수정 |
| `Test` | 테스트 코드 추가/수정 |
| `Chore` | 빌드, 의존성, 설정 변경 |
| `Style` | 코드 스타일/포맷 변경 (로직 무관) |

**예시**

```
[PlangoApp] Feat: 여행 일정 상세 화면 구현
[PlangoApp] Fix: 로그인 토큰 만료 시 재인증 미처리 버그 수정
[PlangoApp] Refactor: TourCast 직접 호출을 TravelPlatform 프록시로 전환
[PlangoApp] Chore: CLAUDE.md 초기 작성
```

---

## 11. Known Issues

### 1. TourCast 직접 호출 (아키텍처 위반)

- **파일**: `src/services/tourCastApi.ts`
- **내용**: 에코시스템 설계 원칙과 달리 TourCast를 직접 호출하고 있습니다.
- **영향**: TourCast 인증 방식 변경 시 프론트엔드도 동시 수정 필요.
- **해결 방향**: TravelPlatform에 일정 관련 프록시 엔드포인트 추가 후 `tourCastApi.ts` 제거.

### 2. MapScreen 더미 데이터

- **파일**: `src/screens/MapScreen.tsx:119`
- **내용**: `DUMMY_ITEMS` 배열(도쿄 여행 더미)이 TourCast `/api/schedule/map` 응답이 비어 있을 때 폴백으로 사용됩니다.
- **해결 방향**: 백엔드 `/api/schedule/map` 안정화 후 더미 데이터 제거.

### 3. 혼재된 JS/TS 파일 (일부 잔존)

- **내용**: `ChatScreen.js`, `LoginScreen.js`, `RegisterScreen.js`가 TypeScript로 작성되지 않았습니다.
  (`useAuth.js`는 `useAuth.ts`로 마이그레이션 완료)
- **해결 방향**: `.tsx`로 마이그레이션하여 타입 안정성 확보.

---

### 해결된 이슈 (2026-03-29)

| 이슈 | 해결 내용 |
|------|----------|
| ~~#2 401 인터셉터 미구현~~ | `api.js`에 response interceptor 추가. `setUnauthorizedHandler` 콜백으로 `useAuth.logout()` 연결 |
| ~~#4 API URL 하드코딩~~ | `src/config/endpoints.ts` 신설. `api.js`·`tourCastApi.ts`·`App.tsx` URL 통합 관리 |
| ~~#5 useAuth.js~~ | `useAuth.ts`로 마이그레이션. `User`·`UseAuthReturn` 타입 추가 |
| ~~#6 일정 저장 로컬 폴백~~ | API 실패 시 로컬 폴백 제거. `Alert.alert`로 사용자에게 명확히 안내 |
