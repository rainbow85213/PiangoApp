import axios from 'axios';
import type {HeatmapPoint, RouteResponse, ScheduleItem} from '../types/schedule';
import {TOUR_CAST_BASE_URL} from '../config/endpoints';

const tourCastApi = axios.create({
  baseURL: TOUR_CAST_BASE_URL,
  timeout: 30000,
});

export const getScheduleForMap = async (params: {
  userId: string;
  date: string;
  filters?: string;
}) => {
  const response = await tourCastApi.get('/api/schedule/map', {params});
  return response.data;
};

export const getScheduleRoute = async (params: {
  userId: string;
  date: string;
}): Promise<RouteResponse> => {
  const response = await tourCastApi.get('/api/schedule/route', {params});
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
  const response = await tourCastApi.get('/api/schedule/heatmap', {params});
  return response.data;
};

// 실제 TourCast API: 아이템 1개씩 개별 저장
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
      tourCastApi.post('/api/schedule', {
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
  const response = await tourCastApi.get('/api/schedule/list', {params});
  return response.data;
};

export const updateScheduleItemStatus = async (
  itemId: string,
  status: ScheduleItem['status'],
): Promise<{id: string; status: string}> => {
  const response = await tourCastApi.patch(`/api/schedule/item/${itemId}`, {status});
  return response.data;
};

export default tourCastApi;
