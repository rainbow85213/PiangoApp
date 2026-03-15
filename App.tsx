/**
 * PlangoApp
 * @format
 */

import './global.css';
import notifee, {AndroidImportance, EventType} from '@notifee/react-native';
import messaging from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Platform, StatusBar, useColorScheme, View} from 'react-native';
import {ActivityIndicator} from 'react-native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import NotificationBanner from './src/components/NotificationBanner';
import {
  NotificationProvider,
  useNotifications,
  type StoredNotification,
} from './src/contexts/NotificationContext';
import {useAuth} from './src/hooks/useAuth';
import ApiTestScreen from './src/screens/ApiTestScreen';
import ChatScreen from './src/screens/ChatScreen';
import LoginScreen from './src/screens/LoginScreen';
import MapScreen from './src/screens/MapScreen';
import NotificationScreen from './src/screens/NotificationScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import ScheduleDetailScreen from './src/screens/ScheduleDetailScreen';
import tourCastApi from './src/services/tourCastApi';
import type {ScheduleItem} from './src/types/schedule';

// ── 네비게이션 타입 ────────────────────────────────────────────────────────
type AuthScreen =
  | 'chat'
  | 'map'
  | 'scheduleDetail'
  | 'notifications'
  | 'apiTest';

type UnauthScreen = 'login' | 'register';

// ── FCM 토큰을 tour-cast 서버에 등록 ──────────────────────────────────────
async function uploadDeviceToken(fcmToken: string, authToken: string) {
  try {
    await tourCastApi.post(
      '/api/user/device-token',
      {token: fcmToken, platform: Platform.OS},
      {headers: {Authorization: `Bearer ${authToken}`}},
    );
    console.log('[FCM] device token uploaded');
  } catch (e) {
    console.warn('[FCM] device token upload failed:', e);
  }
}

// ── FCM 권한 + 토큰 발급 ──────────────────────────────────────────────────
async function initFCM(): Promise<string | null> {
  if (Platform.OS === 'ios') {
    await messaging().registerDeviceForRemoteMessages();
    const status = await messaging().requestPermission();
    const granted =
      status === messaging.AuthorizationStatus.AUTHORIZED ||
      status === messaging.AuthorizationStatus.PROVISIONAL;
    if (!granted) {
      console.log('[FCM] 권한 거부');
      return null;
    }
  } else {
    await messaging().requestPermission();
  }

  // Android 알림 채널 생성
  if (Platform.OS === 'android') {
    await notifee.createChannel({
      id: 'schedule',
      name: '일정 알림',
      importance: AndroidImportance.HIGH,
    });
  }

  const token = await messaging().getToken();
  console.log('[FCM] token:', token);
  return token;
}

// ── AppContent ─────────────────────────────────────────────────────────────
function AppContent() {
  const {token: authToken, isLoading, login, register, logout} = useAuth();
  const {addNotification, parseScheduleItem, markRead} = useNotifications();
  const insets = useSafeAreaInsets();

  const [unauthScreen, setUnauthScreen] = useState<UnauthScreen>('login');
  const [authScreen, setAuthScreen] = useState<AuthScreen>('chat');
  const [selectedItem, setSelectedItem] = useState<ScheduleItem | null>(null);

  // 배너에 표시할 알림 (null이면 숨김)
  const [bannerNotif, setBannerNotif] = useState<StoredNotification | null>(
    null,
  );
  const fcmTokenRef = useRef<string | null>(null);

  // ── 알림 탭 시 ScheduleDetail 이동 ────────────────────────────────────
  const navigateFromNotification = useCallback(
    (n: StoredNotification) => {
      markRead(n.id);
      const item = parseScheduleItem(n);
      if (item) {
        setSelectedItem(item);
        setAuthScreen('scheduleDetail');
      } else {
        setAuthScreen('notifications');
      }
    },
    [markRead, parseScheduleItem],
  );

  // ── FCM 초기화 + 토큰 업로드 ──────────────────────────────────────────
  useEffect(() => {
    initFCM().then(token => {
      if (token) {
        fcmTokenRef.current = token;
        if (authToken) {
          uploadDeviceToken(token, authToken);
        }
      }
    });
  }, [authToken]);

  // ── 로그인 후 토큰 업로드 ─────────────────────────────────────────────
  useEffect(() => {
    if (authToken && fcmTokenRef.current) {
      uploadDeviceToken(fcmTokenRef.current, authToken);
    }
  }, [authToken]);

  // ── Foreground 메시지 수신 → 배너 표시 ───────────────────────────────
  useEffect(() => {
    const unsub = messaging().onMessage(async remoteMessage => {
      const {notification, data} = remoteMessage;
      const n: Omit<StoredNotification, 'id' | 'receivedAt' | 'read'> = {
        title: notification?.title ?? '새 알림',
        body: notification?.body ?? '',
        data: data as Record<string, string>,
      };
      addNotification(n);

      // notifee로 포그라운드 알림 표시 (iOS는 배너로 대체)
      if (Platform.OS === 'android') {
        await notifee.displayNotification({
          title: n.title,
          body: n.body,
          data: n.data,
          android: {
            channelId: 'schedule',
            pressAction: {id: 'default'},
          },
        });
      }

      // 인앱 배너 표시
      setBannerNotif({...n, id: `tmp-${Date.now()}`, receivedAt: new Date().toISOString(), read: false});
    });
    return unsub;
  }, [addNotification]);

  // ── notifee Foreground 이벤트 (알림 탭) ──────────────────────────────
  useEffect(() => {
    return notifee.onForegroundEvent(({type, detail}) => {
      if (type === EventType.PRESS && detail.notification) {
        const {title, body, data} = detail.notification;
        const n: StoredNotification = {
          id: `notifee-${Date.now()}`,
          title: title ?? '새 알림',
          body: body ?? '',
          data: data as Record<string, string>,
          receivedAt: new Date().toISOString(),
          read: false,
        };
        navigateFromNotification(n);
      }
    });
  }, [navigateFromNotification]);

  // ── 앱이 Background → Foreground 전환 시 알림 탭 처리 ────────────────
  useEffect(() => {
    // messaging: 백그라운드에서 FCM 알림 탭
    const unsubBg = messaging().onNotificationOpenedApp(remoteMessage => {
      const {notification, data} = remoteMessage;
      const n: StoredNotification = {
        id: `bg-${Date.now()}`,
        title: notification?.title ?? '새 알림',
        body: notification?.body ?? '',
        data: data as Record<string, string>,
        receivedAt: new Date().toISOString(),
        read: false,
      };
      addNotification(n);
      navigateFromNotification(n);
    });

    // notifee: 백그라운드에서 저장된 pending notification 처리
    AsyncStorage.getItem('@plango_pending_notification').then(raw => {
      if (raw) {
        AsyncStorage.removeItem('@plango_pending_notification');
        try {
          const data = JSON.parse(raw) as Record<string, string>;
          const n: StoredNotification = {
            id: `pending-${Date.now()}`,
            title: data.title ?? '알림',
            body: data.body ?? '',
            data,
            receivedAt: new Date().toISOString(),
            read: false,
          };
          navigateFromNotification(n);
        } catch {}
      }
    });

    return unsubBg;
  }, [addNotification, navigateFromNotification]);

  // ── Quit 상태에서 알림 탭으로 앱 열림 ────────────────────────────────
  useEffect(() => {
    messaging()
      .getInitialNotification()
      .then(remoteMessage => {
        if (remoteMessage) {
          const {notification, data} = remoteMessage;
          const n: StoredNotification = {
            id: `initial-${Date.now()}`,
            title: notification?.title ?? '새 알림',
            body: notification?.body ?? '',
            data: data as Record<string, string>,
            receivedAt: new Date().toISOString(),
            read: false,
          };
          addNotification(n);
          navigateFromNotification(n);
        }
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── 렌더링 ────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  const renderAuthScreen = () => {
    if (authScreen === 'apiTest') {
      return <ApiTestScreen onGoBack={() => setAuthScreen('chat')} />;
    }
    if (authScreen === 'notifications') {
      return (
        <NotificationScreen
          onGoBack={() => setAuthScreen('chat')}
          onSelectScheduleItem={item => {
            setSelectedItem(item);
            setAuthScreen('scheduleDetail');
          }}
        />
      );
    }
    if (authScreen === 'scheduleDetail' && selectedItem) {
      return (
        <ScheduleDetailScreen
          item={selectedItem}
          onGoBack={() => setAuthScreen('map')}
        />
      );
    }
    if (authScreen === 'map') {
      return (
        <MapScreen
          onGoBack={() => setAuthScreen('chat')}
          onSelectItem={item => {
            setSelectedItem(item);
            setAuthScreen('scheduleDetail');
          }}
        />
      );
    }
    return (
      <ChatScreen
        onLogout={logout}
        onGoMap={() => setAuthScreen('map')}
        onGoApiTest={() => setAuthScreen('apiTest')}
        onGoNotifications={() => setAuthScreen('notifications')}
      />
    );
  };

  return (
    <View style={{flex: 1}}>
      {authToken ? (
        renderAuthScreen()
      ) : unauthScreen === 'register' ? (
        <RegisterScreen
          onRegister={register}
          onGoLogin={() => setUnauthScreen('login')}
        />
      ) : (
        <LoginScreen
          onLogin={login}
          onGoRegister={() => setUnauthScreen('register')}
        />
      )}

      {/* 인앱 알림 배너 (모든 화면 위에 표시) */}
      <NotificationBanner
        notification={authToken ? bannerNotif : null}
        onPress={navigateFromNotification}
        onDismiss={() => setBannerNotif(null)}
      />
    </View>
  );
}

// ── App ────────────────────────────────────────────────────────────────────
function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <GestureHandlerRootView style={{flex: 1}}>
      <SafeAreaProvider>
        <NotificationProvider>
          <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
          <AppContent />
        </NotificationProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default App;
