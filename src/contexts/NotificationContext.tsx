import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import type {ScheduleItem} from '../types/schedule';

const STORAGE_KEY = '@plango_notifications';
const MAX_STORED = 50;

export interface StoredNotification {
  id: string;
  title: string;
  body: string;
  /** FCM data payload — scheduleItem JSON 포함 가능 */
  data?: Record<string, string>;
  receivedAt: string; // ISO 8601
  read: boolean;
}

interface NotificationContextValue {
  notifications: StoredNotification[];
  unreadCount: number;
  /** 배너용: 가장 최근에 추가된 미읽음 알림 */
  latestUnread: StoredNotification | null;
  addNotification: (
    n: Omit<StoredNotification, 'id' | 'receivedAt' | 'read'>,
  ) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  clearAll: () => void;
  /** FCM data 에서 ScheduleItem 파싱 (없으면 null) */
  parseScheduleItem: (n: StoredNotification) => ScheduleItem | null;
}

const NotificationContext = createContext<NotificationContextValue | null>(
  null,
);

export const NotificationProvider: React.FC<{children: React.ReactNode}> = ({
  children,
}) => {
  const [notifications, setNotifications] = useState<StoredNotification[]>([]);

  // 앱 시작 시 저장된 알림 복원
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(raw => {
      if (raw) {
        try {
          setNotifications(JSON.parse(raw));
        } catch {}
      }
    });
  }, []);

  const persist = (list: StoredNotification[]) => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list)).catch(() => {});
  };

  const addNotification = useCallback(
    (n: Omit<StoredNotification, 'id' | 'receivedAt' | 'read'>) => {
      const newN: StoredNotification = {
        ...n,
        id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        receivedAt: new Date().toISOString(),
        read: false,
      };
      setNotifications(prev => {
        const next = [newN, ...prev].slice(0, MAX_STORED);
        persist(next);
        return next;
      });
    },
    [],
  );

  const markRead = useCallback((id: string) => {
    setNotifications(prev => {
      const next = prev.map(n => (n.id === id ? {...n, read: true} : n));
      persist(next);
      return next;
    });
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications(prev => {
      const next = prev.map(n => ({...n, read: true}));
      persist(next);
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
    AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
  }, []);

  const parseScheduleItem = useCallback(
    (n: StoredNotification): ScheduleItem | null => {
      try {
        const raw = n.data?.scheduleItem;
        if (!raw) {return null;}
        return JSON.parse(raw) as ScheduleItem;
      } catch {
        return null;
      }
    },
    [],
  );

  const unreadCount = notifications.filter(n => !n.read).length;
  const latestUnread = notifications.find(n => !n.read) ?? null;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        latestUnread,
        addNotification,
        markRead,
        markAllRead,
        clearAll,
        parseScheduleItem,
      }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = (): NotificationContextValue => {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error('useNotifications must be used inside NotificationProvider');
  }
  return ctx;
};
