import axios from 'axios';

// TravelPlatform — 인증(Auth) + 채팅(Chat) 서버
const API_BASE_URL = 'https://travel-platform.fly.dev';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

export default api;
