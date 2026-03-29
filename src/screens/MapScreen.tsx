import BottomSheet, {BottomSheetFlatList} from '@gorhom/bottom-sheet';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, {Heatmap, Polyline, UrlTile, PROVIDER_GOOGLE} from 'react-native-maps';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import ScheduleMarker from '../components/ScheduleMarker';
import {getHeatmap, getScheduleForMap, getScheduleRoute} from '../services/scheduleApi';
import type {
  CategoryFilter,
  HeatmapPoint,
  RouteResponse,
  ScheduleItem,
  TimeFilter,
} from '../types/schedule';

const DEFAULT_REGION = {
  latitude: 35.6895,
  longitude: 139.6917,
  latitudeDelta: 0.12,
  longitudeDelta: 0.08,
};

function getInitialRegion(schedule?: ScheduleItem[] | null) {
  const first = schedule?.[0];
  if (!first) {
    return DEFAULT_REGION;
  }
  return {
    latitude: first.latitude,
    longitude: first.longitude,
    latitudeDelta: 0.12,
    longitudeDelta: 0.08,
  };
}

// 히트맵 그라데이션: 초록(낮음) → 노랑(중간) → 빨강(높음)
const HEATMAP_GRADIENT = {
  colors: ['#00e676', '#ffeb3b', '#ff1744'],
  startPoints: [0.1, 0.5, 1.0],
  colorMapSize: 256,
};

const STATUS_COLORS = {
  completed: '#22c55e',
  in_progress: '#3b82f6',
  pending: '#f97316',
  cancelled: '#ef4444',
};

const CATEGORY_LABELS: Record<CategoryFilter, string> = {
  all: '전체',
  restaurant: '식당',
  attraction: '관광',
  accommodation: '숙박',
  transport: '교통',
};

const TIME_LABELS: Record<TimeFilter, string> = {
  all: '전체',
  morning: '오전',
  afternoon: '오후',
  evening: '저녁',
};

const getToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const offsetDate = (dateStr: string, days: number) => {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

interface Props {
  onGoBack: () => void;
  onSelectItem?: (item: ScheduleItem) => void;
  initialSchedule?: ScheduleItem[] | null;
  userId?: string;
}

const MapScreen: React.FC<Props> = ({onGoBack, onSelectItem, initialSchedule, userId = '1'}) => {
  const insets = useSafeAreaInsets();
  const bottomSheetRef = useRef<BottomSheet>(null);
  const mapRef = useRef<MapView>(null);
  const snapPoints = useMemo(() => ['25%', '50%'], []);

  const [selectedDate, setSelectedDate] = useState(getToday());
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>(initialSchedule ?? []);
  const [routeData, setRouteData] = useState<RouteResponse | null>(null);
  const [heatmapPoints, setHeatmapPoints] = useState<HeatmapPoint[]>([]);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [heatmapLoading, setHeatmapLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSchedule = useCallback(async () => {
    // 외부에서 일정을 받은 경우 fetch 생략
    if (initialSchedule != null) {
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const data = await getScheduleForMap({userId, date: selectedDate});
      // 실제 응답: { stops: [{lat, lng, title, scheduledAt}] } 또는 { items: [...] }
      const rawItems = data?.items ?? data?.stops;
      if (Array.isArray(rawItems) && rawItems.length > 0) {
        const mapped: ScheduleItem[] = rawItems.map(
          (s: {lat?: number; lng?: number; latitude?: number; longitude?: number; title?: string; scheduledAt?: string; category?: string; status?: string; time?: string; order?: number; description?: string; id?: string}, idx: number) => ({
            id: s.id ?? `stop-${idx}`,
            title: s.title ?? '',
            latitude: s.lat ?? s.latitude ?? 0,
            longitude: s.lng ?? s.longitude ?? 0,
            status: (s.status as ScheduleItem['status']) ?? 'pending',
            time: s.time ?? s.scheduledAt?.split('T')[1]?.substring(0, 5) ?? '00:00',
            scheduledAt: s.scheduledAt,
            category: (s.category as ScheduleItem['category']) ?? 'attraction',
            description: s.description,
            order: s.order ?? idx + 1,
          }),
        );
        setScheduleItems(mapped);
        // 첫 번째 일정 위치로 지도 이동
        const first = mapped[0];
        if (first) {
          mapRef.current?.animateToRegion(
            {
              latitude: first.latitude,
              longitude: first.longitude,
              latitudeDelta: 0.12,
              longitudeDelta: 0.08,
            },
            800,
          );
        }
      } else {
        setScheduleItems([]);
      }
    } catch {
      setError('일정을 불러오지 못했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate, initialSchedule]);

  const fetchRoute = useCallback(async () => {
    try {
      const data = await getScheduleRoute({userId, date: selectedDate});
      setRouteData(data);
    } catch {
      setRouteData(null);
    }
  }, [selectedDate]);

  // 히트맵은 날짜와 무관하게 userId 기준 누적 데이터
  const fetchHeatmap = useCallback(async () => {
    setHeatmapLoading(true);
    try {
      const data = await getHeatmap({userId});
      setHeatmapPoints(data ?? []);
    } catch {
      setHeatmapPoints([]);
    } finally {
      setHeatmapLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSchedule();
    fetchRoute();
  }, [fetchSchedule, fetchRoute]);

  // 히트맵 토글 시 최초 1회 fetch
  useEffect(() => {
    if (showHeatmap && heatmapPoints.length === 0) {
      fetchHeatmap();
    }
  }, [showHeatmap, heatmapPoints.length, fetchHeatmap]);

  const filteredItems = useMemo(() => {
    return scheduleItems.filter(item => {
      const timeMatch =
        timeFilter === 'all' ||
        (timeFilter === 'morning'
          ? item.time < '12:00'
          : timeFilter === 'afternoon'
            ? item.time >= '12:00' && item.time < '18:00'
            : item.time >= '18:00');
      const categoryMatch =
        categoryFilter === 'all' || item.category === categoryFilter;
      return timeMatch && categoryMatch;
    });
  }, [scheduleItems, timeFilter, categoryFilter]);

  // scheduledAt 기준 시간순 정렬 목록 (바텀시트용)
  const sortedFilteredItems = useMemo(
    () =>
      [...filteredItems].sort((a, b) => {
        if (a.scheduledAt && b.scheduledAt) {
          return a.scheduledAt.localeCompare(b.scheduledAt);
        }
        return a.order - b.order;
      }),
    [filteredItems],
  );

  // API 경로 우선, 없으면 filteredItems에서 계산 (폴백)
  const routeCoordinates = useMemo(() => {
    if (routeData?.coordinates?.length) {
      return routeData.coordinates.map(p => ({
        latitude: p.lat,
        longitude: p.lng,
      }));
    }
    return [...filteredItems]
      .sort((a, b) => a.order - b.order)
      .map(item => ({latitude: item.latitude, longitude: item.longitude}));
  }, [routeData, filteredItems],
  );

  const renderScheduleItem = useCallback(
    ({item}: {item: ScheduleItem}) => (
      <TouchableOpacity
        style={styles.listItem}
        onPress={() => onSelectItem?.(item)}
        activeOpacity={onSelectItem ? 0.7 : 1}>
        <View
          style={[
            styles.listItemDot,
            {backgroundColor: STATUS_COLORS[item.status]},
          ]}
        />
        <View style={styles.listItemContent}>
          <Text style={styles.listItemTitle}>{item.title}</Text>
          <Text style={styles.listItemMeta}>
            {item.time} · {item.category}
          </Text>
        </View>
        <Text style={styles.listItemOrder}>#{item.order}</Text>
        {onSelectItem && <Text style={styles.listItemArrow}>›</Text>}
      </TouchableOpacity>
    ),
    [onSelectItem],
  );

  return (
    <View style={[styles.container, {paddingTop: insets.top}]}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onGoBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>여행 지도</Text>
        <TouchableOpacity
          style={[
            styles.heatmapToggle,
            showHeatmap && styles.heatmapToggleActive,
          ]}
          onPress={() => setShowHeatmap(v => !v)}
          activeOpacity={0.75}>
          {heatmapLoading ? (
            <ActivityIndicator size="small" color={showHeatmap ? '#fff' : '#6366f1'} />
          ) : (
            <Text style={[styles.heatmapToggleText, showHeatmap && styles.heatmapToggleTextActive]}>
              🌡 열지도
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* 필터 바 */}
      <View style={styles.filterBar}>
        {/* 날짜 선택 */}
        <View style={styles.dateRow}>
          <TouchableOpacity
            onPress={() => setSelectedDate(d => offsetDate(d, -1))}
            style={styles.dateArrow}>
            <Text style={styles.dateArrowText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.dateText}>{selectedDate}</Text>
          <TouchableOpacity
            onPress={() => setSelectedDate(d => offsetDate(d, 1))}
            style={styles.dateArrow}>
            <Text style={styles.dateArrowText}>›</Text>
          </TouchableOpacity>
        </View>

        {/* 시간대 필터 */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterRow}>
          {(Object.keys(TIME_LABELS) as TimeFilter[]).map(t => (
            <TouchableOpacity
              key={t}
              onPress={() => setTimeFilter(t)}
              style={[
                styles.filterChip,
                timeFilter === t && styles.filterChipActive,
              ]}>
              <Text
                style={[
                  styles.filterChipText,
                  timeFilter === t && styles.filterChipTextActive,
                ]}>
                {TIME_LABELS[t]}
              </Text>
            </TouchableOpacity>
          ))}
          <View style={styles.filterDivider} />
          {(Object.keys(CATEGORY_LABELS) as CategoryFilter[]).map(c => (
            <TouchableOpacity
              key={c}
              onPress={() => setCategoryFilter(c)}
              style={[
                styles.filterChip,
                categoryFilter === c && styles.filterChipActive,
              ]}>
              <Text
                style={[
                  styles.filterChipText,
                  categoryFilter === c && styles.filterChipTextActive,
                ]}>
                {CATEGORY_LABELS[c]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* 지도 */}
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={getInitialRegion(initialSchedule)}
        mapType="standard"
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}>
        {/* UrlTile: Android 전용 (iOS는 Apple Maps 기본 타일 사용) */}
        {Platform.OS === 'android' && (
          <UrlTile
            urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            maximumZ={19}
            flipY={false}
          />
        )}
        {/* 히트맵: Android 전용 (iOS Heatmap은 Google Maps provider 필요) */}
        {Platform.OS === 'android' && showHeatmap && heatmapPoints.length > 0 && (
          <Heatmap
            points={heatmapPoints.map(p => ({
              latitude: p.lat,
              longitude: p.lng,
              weight: p.weight,
            }))}
            radius={40}
            opacity={0.75}
            gradient={HEATMAP_GRADIENT}
          />
        )}
        {filteredItems.map(item => (
          <ScheduleMarker key={item.id} item={item} />
        ))}
        {routeCoordinates.length > 1 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeColor="#6366f1"
            strokeWidth={2}
            lineDashPattern={[6, 4]}
          />
        )}
      </MapView>

      {/* 히트맵 범례 */}
      {showHeatmap && (
        <View style={styles.heatmapLegend}>
          <Text style={styles.heatmapLegendLabel}>낮음</Text>
          <View style={styles.heatmapGradientBar} />
          <Text style={styles.heatmapLegendLabel}>높음</Text>
        </View>
      )}

      {/* 경로 정보 뱃지 */}
      {routeData?.totalDistance != null && (
        <View style={styles.routeBadge}>
          <Text style={styles.routeBadgeText}>
            📍 {routeData.totalDistance.toFixed(1)}km
          </Text>
          <View style={styles.routeBadgeDivider} />
          <Text style={styles.routeBadgeText}>
            🕐 {routeData.estimatedTime}분
          </Text>
        </View>
      )}

      {/* 로딩/에러 오버레이 */}
      {isLoading && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      )}
      {error && !isLoading && (
        <View style={styles.overlay}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={fetchSchedule} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>다시 시도</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 하단 시트 */}
      <BottomSheet
        ref={bottomSheetRef}
        index={0}
        snapPoints={snapPoints}
        backgroundStyle={styles.bottomSheetBg}>
        <View style={styles.bottomSheetHandle}>
          <Text style={styles.bottomSheetTitle}>
            일정 목록 ({sortedFilteredItems.length})
          </Text>
        </View>
        <BottomSheetFlatList
          data={sortedFilteredItems}
          keyExtractor={(item: ScheduleItem) => item.id}
          renderItem={renderScheduleItem}
          contentContainerStyle={{paddingBottom: insets.bottom + 16}}
          ListEmptyComponent={
            <View style={styles.emptyList}>
              <Text style={styles.emptyListText}>
                {isLoading ? '로딩 중...' : '해당 날짜의 일정이 없습니다.'}
              </Text>
            </View>
          }
        />
      </BottomSheet>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#f9fafb'},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {width: 40, alignItems: 'flex-start'},
  backButtonText: {fontSize: 24, color: '#6366f1'},
  headerTitle: {flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: '#1f2937'},
  heatmapToggle: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#6366f1',
    backgroundColor: '#fff',
  },
  heatmapToggleActive: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  heatmapToggleText: {fontSize: 11, fontWeight: '700', color: '#6366f1'},
  heatmapToggleTextActive: {color: '#fff'},
  heatmapLegend: {
    position: 'absolute',
    bottom: 8,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  heatmapLegendLabel: {fontSize: 10, fontWeight: '600', color: '#6b7280'},
  heatmapGradientBar: {
    width: 80,
    height: 8,
    borderRadius: 4,
    // LinearGradient 미사용 → CSS gradient 근사치 색으로 표현
    backgroundColor: '#ffeb3b',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  filterBar: {
    backgroundColor: '#fff',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  dateArrow: {paddingHorizontal: 12, paddingVertical: 4},
  dateArrowText: {fontSize: 20, color: '#6366f1'},
  dateText: {fontSize: 14, fontWeight: '600', color: '#374151', minWidth: 100, textAlign: 'center'},
  filterRow: {paddingHorizontal: 12},
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: '#f3f4f6',
    marginRight: 6,
  },
  filterChipActive: {backgroundColor: '#6366f1'},
  filterChipText: {fontSize: 12, color: '#6b7280'},
  filterChipTextActive: {color: '#fff', fontWeight: '600'},
  filterDivider: {width: 1, backgroundColor: '#e5e7eb', marginRight: 6, marginVertical: 4},
  map: {flex: 1},
  overlay: {
    ...StyleSheet.absoluteFillObject,
    top: 140,
    backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {fontSize: 14, color: '#ef4444', marginBottom: 12},
  retryButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryButtonText: {color: '#fff', fontWeight: '600'},
  routeBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  routeBadgeText: {fontSize: 13, fontWeight: '600', color: '#374151'},
  routeBadgeDivider: {width: 1, height: 14, backgroundColor: '#e5e7eb', marginHorizontal: 8},
  bottomSheetBg: {backgroundColor: '#fff', borderRadius: 16},
  bottomSheetHandle: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  bottomSheetTitle: {fontSize: 14, fontWeight: '700', color: '#374151'},
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  listItemDot: {width: 10, height: 10, borderRadius: 5, marginRight: 12},
  listItemContent: {flex: 1},
  listItemTitle: {fontSize: 14, fontWeight: '600', color: '#1f2937'},
  listItemMeta: {fontSize: 12, color: '#9ca3af', marginTop: 2},
  listItemOrder: {fontSize: 12, color: '#d1d5db'},
  listItemArrow: {fontSize: 18, color: '#9ca3af', marginLeft: 6},
  emptyList: {padding: 32, alignItems: 'center'},
  emptyListText: {fontSize: 14, color: '#9ca3af'},
});

export default MapScreen;
