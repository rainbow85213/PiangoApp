import React, {useCallback} from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {
  useNotifications,
  type StoredNotification,
} from '../contexts/NotificationContext';
import type {ScheduleItem} from '../types/schedule';

interface Props {
  onGoBack: () => void;
  onSelectScheduleItem: (item: ScheduleItem) => void;
}

const formatTime = (iso: string) => {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) {return '방금 전';}
  if (diffMin < 60) {return `${diffMin}분 전`;}
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) {return `${diffHour}시간 전`;}
  return `${d.getMonth() + 1}/${d.getDate()}`;
};

const NotificationScreen: React.FC<Props> = ({onGoBack, onSelectScheduleItem}) => {
  const insets = useSafeAreaInsets();
  const {notifications, unreadCount, markRead, markAllRead, clearAll, parseScheduleItem} =
    useNotifications();

  const handlePress = useCallback(
    (n: StoredNotification) => {
      markRead(n.id);
      const item = parseScheduleItem(n);
      if (item) {
        onSelectScheduleItem(item);
      }
    },
    [markRead, parseScheduleItem, onSelectScheduleItem],
  );

  const renderItem = useCallback(
    ({item}: {item: StoredNotification}) => {
      const hasDetail = !!parseScheduleItem(item);
      return (
        <TouchableOpacity
          style={[styles.item, !item.read && styles.itemUnread]}
          onPress={() => handlePress(item)}
          activeOpacity={0.7}>
          {/* 읽음 점 */}
          {!item.read && <View style={styles.unreadDot} />}

          <View style={styles.itemIcon}>
            <Text style={styles.itemIconText}>
              {item.data?.type === 'schedule_reminder' ? '📅' : '🔔'}
            </Text>
          </View>

          <View style={styles.itemContent}>
            <View style={styles.itemRow}>
              <Text style={styles.itemTitle} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={styles.itemTime}>{formatTime(item.receivedAt)}</Text>
            </View>
            <Text style={styles.itemBody} numberOfLines={2}>
              {item.body}
            </Text>
            {hasDetail && (
              <Text style={styles.itemLink}>일정 상세 보기 →</Text>
            )}
          </View>
        </TouchableOpacity>
      );
    },
    [handlePress, parseScheduleItem],
  );

  return (
    <View style={[styles.container, {paddingTop: insets.top}]}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onGoBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>알림</Text>
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        <View style={styles.headerActions}>
          {unreadCount > 0 && (
            <TouchableOpacity onPress={markAllRead}>
              <Text style={styles.headerAction}>모두 읽음</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 리스트 */}
      <FlatList
        data={notifications}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.list,
          {paddingBottom: insets.bottom + 24},
        ]}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🔕</Text>
            <Text style={styles.emptyText}>알림이 없습니다</Text>
          </View>
        }
        ListFooterComponent={
          notifications.length > 0 ? (
            <TouchableOpacity style={styles.clearButton} onPress={clearAll}>
              <Text style={styles.clearButtonText}>알림 전체 삭제</Text>
            </TouchableOpacity>
          ) : null
        }
      />
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
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  headerTitle: {fontSize: 17, fontWeight: '700', color: '#1f2937'},
  badge: {
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  badgeText: {fontSize: 11, fontWeight: '700', color: '#fff'},
  headerActions: {width: 64, alignItems: 'flex-end'},
  headerAction: {fontSize: 12, color: '#6366f1', fontWeight: '600'},

  list: {paddingTop: 8},

  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  itemUnread: {backgroundColor: '#f0f1ff'},
  unreadDot: {
    position: 'absolute',
    left: 6,
    top: '50%',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#6366f1',
    marginTop: -3,
  },
  itemIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  itemIconText: {fontSize: 18},
  itemContent: {flex: 1},
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1f2937',
    flex: 1,
    marginRight: 8,
  },
  itemTime: {fontSize: 11, color: '#9ca3af'},
  itemBody: {fontSize: 13, color: '#6b7280', lineHeight: 18, marginBottom: 4},
  itemLink: {fontSize: 12, color: '#6366f1', fontWeight: '600'},

  empty: {
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyIcon: {fontSize: 48, marginBottom: 12},
  emptyText: {fontSize: 15, color: '#9ca3af'},

  clearButton: {
    marginHorizontal: 16,
    marginTop: 16,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  clearButtonText: {fontSize: 14, color: '#ef4444', fontWeight: '600'},
});

export default NotificationScreen;
