import axios from 'axios';
import type {RouteResponse} from '../types/schedule';

// TourCast — 여행 일정 서버
const TOUR_CAST_BASE_URL = 'https://tour-cast.fly.dev';

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

export default tourCastApi;
