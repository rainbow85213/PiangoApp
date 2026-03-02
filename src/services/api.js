import axios from 'axios';

/**
 * ✅ 아래 IP 주소를 본인 PC의 내부 IP로 변경하세요.
 *
 * 확인 방법:
 *   - macOS / Linux : 터미널에서 `ifconfig | grep "inet "` 실행
 *   - Windows       : 명령 프롬프트에서 `ipconfig` 실행 → IPv4 주소 확인
 *
 * 환경별 주의사항:
 *   - Android 에뮬레이터 : localhost 대신 반드시 PC의 실제 내부 IP 사용 (10.0.2.2 는 에뮬레이터 자체 localhost)
 *   - iOS 시뮬레이터     : localhost 사용 가능하나 실제 IP 권장
 *   - 실제 기기          : PC와 같은 Wi-Fi에 연결된 상태에서 PC의 내부 IP 사용
 */
const API_BASE_URL = 'http://192.168.45.115'; // Laravel Sail (port 80)

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

export default api;
