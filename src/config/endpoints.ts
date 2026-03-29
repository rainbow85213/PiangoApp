// API 엔드포인트 상수
// 환경별 URL 변경 시 이 파일만 수정하면 됩니다.

/** TravelPlatform — 인증(Auth) + 채팅(Chat) 메인 백엔드 */
export const TRAVEL_PLATFORM_BASE_URL = 'https://travel-platform.fly.dev';

/**
 * TourCast — 여행 일정 서버
 * 앱에서 직접 호출하지 않습니다. TravelPlatform 프록시를 통해 간접 호출합니다.
 * TravelPlatform 팀이 프록시 구현 시 참고용으로 보존합니다.
 */
export const TOUR_CAST_BASE_URL = 'https://tour-cast.fly.dev';
