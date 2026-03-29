/**
 * 일정 관련 API — TravelPlatform 프록시 경유
 *
 * TravelPlatform이 아래 경로들을 TourCast에 프록시해야 합니다.
 * 경로 미구현 시 TravelPlatform 팀에 추가 요청이 필요합니다.
 *
 * TODO(TravelPlatform): 아래 경로들을 TourCast 프록시로 구현 필요
 *   GET  /api/schedule/map
 *   GET  /api/schedule/route
 *   GET  /api/schedule/heatmap
 *   POST /api/schedule
 *   GET  /api/schedule/list
 *   PATCH /api/schedule/item/:id
 *   POST /api/user/device-token
 */

import api from './api';
import type {HeatmapPoint, RouteResponse, ScheduleItem} from '../types/schedule';

export const getScheduleForMap = async (params: {
  userId: string;
  date: string;
  filters?: string;
}) => {
  const response = await api.get('/api/schedule/map', {params});
  return response.data;
};

export const getScheduleRoute = async (params: {
  userId: string;
  date: string;
}): Promise<RouteResponse> => {
  const response = await api.get('/api/schedule/route', {params});
  return response.data;
};

/**
 * 유저의 전체 방문 히트맵 데이터
 * GET /api/schedule/heatmap?userId=...
 * → [{ lat, lng, weight }]  (weight = 누적 방문 횟수)
 */
export const getHeatmap = async (params: {
  userId: string;
}): Promise<HeatmapPoint[]> => {
  const response = await api.get('/api/schedule/heatmap', {params});
  return response.data;
};

// 아이템 1개씩 개별 저장
// POST /api/schedule body: { userId, scheduledAt, title, location: { name, address, category, lat, lng } }
type ScheduleItemInput = Omit<ScheduleItem, 'id' | 'status'>;

export const saveSchedule = async (params: {
  userId: string;
  date: string;
  title: string;
  sourceText?: string;
  items: ScheduleItemInput[];
}): Promise<void> => {
  await Promise.all(
    params.items.map(item =>
      api.post('/api/schedule', {
        userId: params.userId,
        title: item.title,
        scheduledAt: item.scheduledAt ?? `${params.date}T${item.time}:00Z`,
        location: {
          name: item.title,
          address: item.description ?? item.title,
          category: item.category,
          lat: item.latitude,
          lng: item.longitude,
        },
      }),
    ),
  );
};

export const getScheduleList = async (params: {
  userId: string;
  page?: number;
  limit?: number;
}): Promise<{
  schedules: {id: string; date: string; title: string; itemCount: number; createdAt: string}[];
  total: number;
  hasMore: boolean;
}> => {
  const response = await api.get('/api/schedule/list', {params});
  return response.data;
};

export const updateScheduleItemStatus = async (
  itemId: string,
  status: ScheduleItem['status'],
): Promise<{id: string; status: string}> => {
  const response = await api.patch(`/api/schedule/item/${itemId}`, {status});
  return response.data;
};

/**
 * FCM 디바이스 토큰 등록
 * api.js의 Bearer Token 인증 헤더가 자동으로 포함됩니다.
 */
export const registerDeviceToken = async (
  fcmToken: string,
  platform: string,
): Promise<void> => {
  await api.post('/api/user/device-token', {token: fcmToken, platform});
};
