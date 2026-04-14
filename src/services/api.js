import axios from 'axios';
import {TRAVEL_PLATFORM_BASE_URL} from '../config/endpoints';

const api = axios.create({
  baseURL: TRAVEL_PLATFORM_BASE_URL,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// ── 401 자동 로그아웃 ──────────────────────────────────────────────────────
// useAuth가 마운트될 때 logout 함수를 등록합니다.
// 인터셉터는 React 훅에 접근할 수 없으므로 콜백 방식으로 연결합니다.
let unauthorizedHandler = null;

export const setUnauthorizedHandler = handler => {
  unauthorizedHandler = handler;
};

api.interceptors.response.use(
  response => response,
  error => {
    const status = error.response?.status;
    const requestUrl = error.config?.url ?? '';
    // 로그아웃 요청 자체의 401은 무시 (무한 루프 방지)
    if (
      status === 401 &&
      !requestUrl.includes('/api/auth/logout') &&
      unauthorizedHandler
    ) {
      unauthorizedHandler();
    }
    return Promise.reject(error);
  },
);

export default api;
