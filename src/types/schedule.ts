export interface ScheduleItem {
  id: string;
  title: string;
  latitude: number;
  longitude: number;
  status: 'completed' | 'in_progress' | 'pending' | 'cancelled';
  time: string; // "HH:mm"
  scheduledAt?: string; // ISO 8601 — 시간순 정렬 기준
  category: 'restaurant' | 'attraction' | 'accommodation' | 'transport' | 'other';
  description?: string;
  order: number;
}

export interface RoutePoint {
  lat: number;
  lng: number;
}

export interface RouteResponse {
  coordinates: RoutePoint[];
  totalDistance: number; // km
  estimatedTime: number; // 분
}

export interface HeatmapPoint {
  lat: number;
  lng: number;
  weight: number; // 방문 횟수
}

export type TimeFilter = 'all' | 'morning' | 'afternoon' | 'evening';
export type CategoryFilter =
  | 'all'
  | 'restaurant'
  | 'attraction'
  | 'accommodation'
  | 'transport';

// POST /api/schedule 요청 시 items 배열의 각 항목 타입.
// order는 saveSchedule이 index 기반으로 자동 주입하므로 optional.
export interface ScheduleItemInput {
  title: string;
  latitude: number;
  longitude: number;
  time: string;
  scheduledAt?: string;
  category: ScheduleItem['category'];
  description?: string;
  order?: number;
}
