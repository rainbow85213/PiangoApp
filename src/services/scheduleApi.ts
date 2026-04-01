/**
 * 일정 관련 API — TravelPlatform 경유
 *
 * TravelPlatform ScheduleController가 아래 경로들을 처리합니다.
 *   GET  /api/schedule/map
 *   GET  /api/schedule/route
 *   GET  /api/schedule/heatmap
 *   POST /api/schedule
 *   GET  /api/schedule/list
 *   PATCH /api/schedule/item/:id
 *   POST /api/user/device-token
 */

import api from './api';
import type {HeatmapPoint, RouteResponse, ScheduleItem, ScheduleItemInput} from '../types/schedule';

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

// POST /api/schedule — 일정 전체를 단건 배치 전송
// Bearer 토큰에서 userId를 자동 추출하므로 클라이언트에서 별도 전송 불필요.
// items[].order는 index 기반으로 자동 주입 (0부터 시작).
export const saveSchedule = async (params: {
  date: string;
  title: string;
  sourceText?: string;
  items: ScheduleItemInput[];
}): Promise<void> => {
  await api.post('/api/schedule', {
    date: params.date,
    title: params.title,
    sourceText: params.sourceText,
    items: params.items.map((item, index) => ({
      title: item.title,
      latitude: item.latitude,
      longitude: item.longitude,
      time: item.time,
      scheduledAt: item.scheduledAt ?? `${params.date}T${item.time}:00Z`,
      category: item.category,
      description: item.description,
      order: index,
    })),
  });
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
