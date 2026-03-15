import React, {useState} from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {openNavi, type NaviApp} from '../services/navigationService';
import type {ScheduleItem} from '../types/schedule';

const STATUS_COLORS: Record<ScheduleItem['status'], string> = {
  completed: '#22c55e',
  in_progress: '#3b82f6',
  pending: '#f97316',
  cancelled: '#ef4444',
};

const STATUS_LABELS: Record<ScheduleItem['status'], string> = {
  completed: '완료',
  in_progress: '진행 중',
  pending: '예정',
  cancelled: '취소',
};

const CATEGORY_LABELS: Record<ScheduleItem['category'], string> = {
  restaurant: '🍽 식당',
  attraction: '🏛 관광',
  accommodation: '🏨 숙박',
  transport: '🚌 교통',
  other: '📌 기타',
};

interface Props {
  item: ScheduleItem;
  onGoBack: () => void;
}

const ScheduleDetailScreen: React.FC<Props> = ({item, onGoBack}) => {
  const insets = useSafeAreaInsets();
  const [modalVisible, setModalVisible] = useState(false);
  const [launching, setLaunching] = useState(false);

  const handleNaviSelect = async (app: NaviApp) => {
    setModalVisible(false);
    setLaunching(true);
    try {
      await openNavi(app, item.latitude, item.longitude, item.title);
    } finally {
      setLaunching(false);
    }
  };

  const statusColor = STATUS_COLORS[item.status];

  return (
    <View style={[styles.container, {paddingTop: insets.top}]}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onGoBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>일정 상세</Text>
        <View style={styles.headerRight} />
      </View>

      {/* 본문 */}
      <View style={styles.body}>
        {/* 순서 + 상태 배지 */}
        <View style={styles.topRow}>
          <View style={styles.orderBadge}>
            <Text style={styles.orderText}>#{item.order}</Text>
          </View>
          <View style={[styles.statusBadge, {backgroundColor: statusColor}]}>
            <Text style={styles.statusText}>{STATUS_LABELS[item.status]}</Text>
          </View>
        </View>

        {/* 제목 */}
        <Text style={styles.title}>{item.title}</Text>

        {/* 메타 정보 */}
        <View style={styles.metaCard}>
          <MetaRow label="시간" value={item.time} />
          <MetaRow label="카테고리" value={CATEGORY_LABELS[item.category]} />
          <MetaRow
            label="위치"
            value={`${item.latitude.toFixed(5)}, ${item.longitude.toFixed(5)}`}
          />
          {item.description ? (
            <MetaRow label="설명" value={item.description} />
          ) : null}
        </View>

        {/* 길 안내 버튼 영역 */}
        <Text style={styles.naviSectionTitle}>길 안내</Text>

        {/* 카카오맵 직접 버튼 */}
        <TouchableOpacity
          style={[styles.naviButton, styles.kakaoButton]}
          onPress={() => handleNaviSelect('kakaomap')}
          activeOpacity={0.8}>
          <Text style={styles.naviButtonEmoji}>🗺</Text>
          <Text style={styles.naviButtonText}>카카오맵으로 길찾기</Text>
        </TouchableOpacity>

        {/* T맵 직접 버튼 */}
        <TouchableOpacity
          style={[styles.naviButton, styles.tmapButton]}
          onPress={() => handleNaviSelect('tmap')}
          activeOpacity={0.8}>
          <Text style={styles.naviButtonEmoji}>🔵</Text>
          <Text style={styles.naviButtonText}>T맵으로 길찾기</Text>
        </TouchableOpacity>

        {/* 통합 선택 모달 버튼 */}
        <TouchableOpacity
          style={styles.modalTriggerButton}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.8}>
          <Text style={styles.modalTriggerText}>앱 선택해서 길찾기</Text>
        </TouchableOpacity>
      </View>

      {/* 앱 선택 모달 */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}>
          <View
            style={[
              styles.modalSheet,
              {paddingBottom: insets.bottom + (Platform.OS === 'ios' ? 0 : 16)},
            ]}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>길 안내 앱 선택</Text>
            <Text style={styles.modalSubtitle}>
              어떤 앱으로 길 안내를 받으시겠어요?
            </Text>

            <TouchableOpacity
              style={[styles.modalOption, styles.kakaoOption]}
              onPress={() => handleNaviSelect('kakaomap')}
              activeOpacity={0.8}>
              <Text style={styles.modalOptionEmoji}>🗺</Text>
              <View style={styles.modalOptionInfo}>
                <Text style={styles.modalOptionTitle}>카카오맵</Text>
                <Text style={styles.modalOptionDesc}>
                  kakaomap:// · 미설치 시 앱스토어 이동
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalOption, styles.tmapOption]}
              onPress={() => handleNaviSelect('tmap')}
              activeOpacity={0.8}>
              <Text style={styles.modalOptionEmoji}>🔵</Text>
              <View style={styles.modalOptionInfo}>
                <Text style={styles.modalOptionTitle}>T맵</Text>
                <Text style={styles.modalOptionDesc}>
                  tmap:// · 미설치 시 앱스토어 이동
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setModalVisible(false)}
              activeOpacity={0.8}>
              <Text style={styles.modalCancelText}>취소</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 앱 실행 중 오버레이 */}
      {launching && (
        <View style={styles.launchingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.launchingText}>앱을 여는 중...</Text>
        </View>
      )}
    </View>
  );
};

const MetaRow: React.FC<{label: string; value: string}> = ({label, value}) => (
  <View style={styles.metaRow}>
    <Text style={styles.metaLabel}>{label}</Text>
    <Text style={styles.metaValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#f9fafb'},

  // 헤더
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
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
    color: '#1f2937',
  },
  headerRight: {width: 40},

  // 본문
  body: {padding: 20},

  topRow: {flexDirection: 'row', alignItems: 'center', marginBottom: 12},
  orderBadge: {
    backgroundColor: '#e0e7ff',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginRight: 8,
  },
  orderText: {fontSize: 12, fontWeight: '700', color: '#6366f1'},
  statusBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusText: {fontSize: 12, fontWeight: '700', color: '#fff'},

  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1f2937',
    marginBottom: 16,
    lineHeight: 30,
  },

  // 메타 카드
  metaCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  metaRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  metaLabel: {
    width: 72,
    fontSize: 13,
    color: '#9ca3af',
    fontWeight: '600',
  },
  metaValue: {
    flex: 1,
    fontSize: 13,
    color: '#374151',
  },

  // 길 안내 버튼들
  naviSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6b7280',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  naviButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 18,
    marginBottom: 10,
  },
  kakaoButton: {backgroundColor: '#FEE500'},
  tmapButton: {backgroundColor: '#0066FF'},
  naviButtonEmoji: {fontSize: 20, marginRight: 12},
  naviButtonText: {fontSize: 15, fontWeight: '700', color: '#1f2937'},

  modalTriggerButton: {
    marginTop: 4,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#6366f1',
    borderStyle: 'dashed',
  },
  modalTriggerText: {fontSize: 14, fontWeight: '600', color: '#6366f1'},

  // 모달
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#d1d5db',
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1f2937',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#9ca3af',
    marginBottom: 20,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  kakaoOption: {backgroundColor: '#FEF9C3'},
  tmapOption: {backgroundColor: '#EFF6FF'},
  modalOptionEmoji: {fontSize: 24, marginRight: 14},
  modalOptionInfo: {flex: 1},
  modalOptionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 2,
  },
  modalOptionDesc: {fontSize: 11, color: '#9ca3af'},

  modalCancelButton: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 4,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
  },
  modalCancelText: {fontSize: 15, fontWeight: '600', color: '#6b7280'},

  // 실행 오버레이
  launchingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  launchingText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 12,
  },
});

export default ScheduleDetailScreen;
