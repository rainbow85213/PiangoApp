import BottomSheet, {BottomSheetFlatList} from '@gorhom/bottom-sheet';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, {Polyline, UrlTile} from 'react-native-maps';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import ScheduleMarker from '../components/ScheduleMarker';
import {getScheduleForMap, getScheduleRoute} from '../services/tourCastApi';
import type {
  CategoryFilter,
  RouteResponse,
  ScheduleItem,
  TimeFilter,
} from '../types/schedule';

const INITIAL_REGION = {
  latitude: 35.6895,
  longitude: 139.6917,
  latitudeDelta: 0.12,
  longitudeDelta: 0.08,
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
}

const MapScreen: React.FC<Props> = ({onGoBack, onSelectItem}) => {
  const insets = useSafeAreaInsets();
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['25%', '50%'], []);

  const [selectedDate, setSelectedDate] = useState(getToday());
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);
  const [routeData, setRouteData] = useState<RouteResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // TODO: 백엔드 /api/schedule/map 구현 후 아래 더미 데이터 제거
  const DUMMY_ITEMS: ScheduleItem[] = [
    {id: '1', title: '신주쿠 교엔', latitude: 35.6851, longitude: 139.7100, status: 'completed', time: '09:00', scheduledAt: `${selectedDate}T09:00:00Z`, category: 'attraction', description: '도쿄 최대 정원', order: 1},
    {id: '2', title: '이치란 라멘 신주쿠점', latitude: 35.6938, longitude: 139.7034, status: 'completed', time: '12:00', scheduledAt: `${selectedDate}T12:00:00Z`, category: 'restaurant', description: '1인 라멘 맛집', order: 2},
    {id: '3', title: '센소지 절', latitude: 35.7148, longitude: 139.7967, status: 'in_progress', time: '14:00', scheduledAt: `${selectedDate}T14:00:00Z`, category: 'attraction', description: '도쿄에서 가장 오래된 사원', order: 3},
    {id: '4', title: '시부야 스크램블 교차로', latitude: 35.6595, longitude: 139.7004, status: 'pending', time: '17:00', scheduledAt: `${selectedDate}T17:00:00Z`, category: 'attraction', description: '세계에서 가장 바쁜 교차로', order: 4},
    {id: '5', title: '도쿄 프린스 호텔', latitude: 35.6564, longitude: 139.7453, status: 'pending', time: '20:00', scheduledAt: `${selectedDate}T20:00:00Z`, category: 'accommodation', description: '숙박', order: 5},
  ];

  const fetchSchedule = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getScheduleForMap({userId: '1', date: selectedDate});
      setScheduleItems(data?.items ?? data ?? []);
    } catch {
      // 백엔드 미구현 상태: 더미 데이터로 대체
      setScheduleItems(DUMMY_ITEMS);
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate]);

  const fetchRoute = useCallback(async () => {
    try {
      const data = await getScheduleRoute({userId: '1', date: selectedDate});
      setRouteData(data);
    } catch {
      setRouteData(null);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchSchedule();
    fetchRoute();
  }, [fetchSchedule, fetchRoute]);

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
        <View style={styles.headerRight} />
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
        style={styles.map}
        initialRegion={INITIAL_REGION}
        mapType="none">
        <UrlTile
          urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          maximumZ={19}
          flipY={false}
        />
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

      {/* 경로 정보 뱃지 */}
      {routeData && (
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
  headerRight: {width: 40},
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
