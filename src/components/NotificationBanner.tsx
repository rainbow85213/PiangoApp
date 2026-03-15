import React, {useEffect, useRef} from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import type {StoredNotification} from '../contexts/NotificationContext';

interface Props {
  notification: StoredNotification | null;
  onPress: (n: StoredNotification) => void;
  onDismiss: () => void;
}

const BANNER_HEIGHT = 80;
const AUTO_DISMISS_MS = 4000;

const NotificationBanner: React.FC<Props> = ({
  notification,
  onPress,
  onDismiss,
}) => {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(-(BANNER_HEIGHT + 60))).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 현재 표시 중인 알림 ID 추적 (중복 애니메이션 방지)
  const visibleIdRef = useRef<string | null>(null);

  const dismiss = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    Animated.timing(slideAnim, {
      toValue: -(BANNER_HEIGHT + 60),
      duration: 280,
      useNativeDriver: true,
    }).start(() => {
      visibleIdRef.current = null;
      onDismiss();
    });
  };

  useEffect(() => {
    if (!notification || visibleIdRef.current === notification.id) {
      return;
    }
    visibleIdRef.current = notification.id;

    // 이미 내려와 있으면 먼저 올린 뒤 다시 내림
    slideAnim.setValue(-(BANNER_HEIGHT + 60));

    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      friction: 9,
      tension: 70,
    }).start();

    timerRef.current = setTimeout(dismiss, AUTO_DISMISS_MS);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notification?.id]);

  if (!notification) {
    return null;
  }

  const topOffset = insets.top + 8;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          top: topOffset,
          transform: [{translateY: slideAnim}],
        },
      ]}>
      <TouchableOpacity
        style={styles.inner}
        onPress={() => {
          dismiss();
          onPress(notification);
        }}
        activeOpacity={0.92}>
        {/* 아이콘 */}
        <View style={styles.iconBox}>
          <Text style={styles.iconText}>🔔</Text>
        </View>

        {/* 텍스트 */}
        <View style={styles.textBox}>
          <Text style={styles.title} numberOfLines={1}>
            {notification.title}
          </Text>
          <Text style={styles.body} numberOfLines={2}>
            {notification.body}
          </Text>
        </View>

        {/* 닫기 */}
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={dismiss}
          hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 9999,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1f2937',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 6},
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconText: {fontSize: 18},
  textBox: {flex: 1},
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: '#f9fafb',
    marginBottom: 3,
  },
  body: {
    fontSize: 12,
    color: '#9ca3af',
    lineHeight: 17,
  },
  closeBtn: {
    marginLeft: 10,
    padding: 2,
  },
  closeText: {
    fontSize: 13,
    color: '#6b7280',
  },
});

export default NotificationBanner;
