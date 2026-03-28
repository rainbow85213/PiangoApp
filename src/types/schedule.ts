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
