/**
 * PlangoApp
 * @format
 */

import './global.css';
import notifee, {AndroidImportance, EventType} from '@notifee/react-native';
import messaging from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Alert, Platform, StatusBar, useColorScheme, View} from 'react-native';
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
import api from './src/services/api';
import {saveSchedule, registerDeviceToken} from './src/services/scheduleApi';
import {TRAVEL_PLATFORM_BASE_URL} from './src/config/endpoints';
import type {ScheduleItem} from './src/types/schedule';

const CHAT_MESSAGES_KEY = '@plango_chat_messages';
const SAVED_SCHEDULES_KEY = '@plango_saved_schedules';

// ── 채팅 메시지 타입 ──────────────────────────────────────────────────────
interface ChatMessage {
  id: string;
  text: string;
  role: 'user' | 'assistant' | 'error';
  schedule?: ScheduleItem[] | null;
  hasSchedule?: boolean;
}

// ── 네비게이션 타입 ────────────────────────────────────────────────────────
type AuthScreen =
  | 'chat'
  | 'map'
  | 'scheduleDetail'
  | 'notifications'
  | 'apiTest';

type UnauthScreen = 'login' | 'register';

// ── 서버 워밍업 (fly.dev 무료 플랜: 비활성 시 sleep → 첫 요청 지연 방지) ──
// 최대 MAX_RETRIES회 재시도하여 서버가 실제로 응답할 때까지 기다립니다.
async function warmupServers() {
  const MAX_RETRIES = 3;
  const RETRY_DELAY_MS = 5000;

  const pingOnce = async (url: string): Promise<boolean> => {
    try {
      const res = await fetch(`${url}/api/health`, {method: 'GET'});
      return res.status < 500;
    } catch {
      return false;
    }
  };

  for (let i = 0; i < MAX_RETRIES; i++) {
    const ok = await pingOnce(TRAVEL_PLATFORM_BASE_URL);
    if (ok) {return;}
    if (i < MAX_RETRIES - 1) {
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
    }
  }
}

// ── FCM 토큰을 서버에 등록 (TravelPlatform 프록시 경유) ──────────────────
async function uploadDeviceToken(fcmToken: string) {
  try {
    await registerDeviceToken(fcmToken, Platform.OS);
    console.log('[FCM] device token uploaded');
  } catch (e) {
    console.warn('[FCM] device token upload failed:', e);
  }
}

// ── FCM 권한 + 토큰 발급 ──────────────────────────────────────────────────
async function initFCM(): Promise<string | null> {
  try {
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
  } catch (e) {
    // iOS: aps-environment entitlement 없음 (무료 계정 or Push 미설정)
    console.warn('[FCM] 초기화 실패 (Push 알림 미지원 환경):', e);
    return null;
  }
}

// ── AppContent ─────────────────────────────────────────────────────────────
function AppContent() {
  const {token: authToken, user, isLoading, login, register, logout} = useAuth();
  const {addNotification, parseScheduleItem, markRead} = useNotifications();
  const insets = useSafeAreaInsets();

  const [unauthScreen, setUnauthScreen] = useState<UnauthScreen>('login');
  const [authScreen, setAuthScreen] = useState<AuthScreen>('chat');
  const [selectedItem, setSelectedItem] = useState<ScheduleItem | null>(null);
  const [mapInitialSchedule, setMapInitialSchedule] = useState<ScheduleItem[] | null>(null);

  // ── 채팅 영구 상태 ────────────────────────────────────────────────────
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatSavedIds, setChatSavedIds] = useState<Set<string>>(new Set());
  const [chatInputText, setChatInputText] = useState('');
  const [chatIsLoading, setChatIsLoading] = useState(false);

  // 로그인 시 서버에서 채팅 기록 로드, 실패 시 AsyncStorage 폴백
  useEffect(() => {
    if (!authToken) {
      // 로그아웃 시 채팅 초기화
      setChatMessages([]);
      setChatSavedIds(new Set());
      return;
    }

    const loadHistory = async () => {
      try {
        const res = await api.get('/api/chat/history', {params: {limit: 50}});
        const serverMsgs: ChatMessage[] = (res.data?.data?.messages ?? []).map(
          (m: {id: string; role: string; text: string; schedule?: ScheduleItem[] | null}) => ({
            id: m.id,
            text: m.text,
            role: m.role as ChatMessage['role'],
            schedule: m.schedule ?? null,
            hasSchedule: Array.isArray(m.schedule) && m.schedule.length > 0,
          }),
        );
        setChatMessages(serverMsgs);
        // 서버 기록을 AsyncStorage에도 캐싱
        AsyncStorage.setItem(CHAT_MESSAGES_KEY, JSON.stringify(serverMsgs)).catch(() => {});
      } catch {
        // 서버 실패 시 로컬 캐시로 폴백
        const raw = await AsyncStorage.getItem(CHAT_MESSAGES_KEY).catch(() => null);
        if (raw) {
          try { setChatMessages(JSON.parse(raw)); } catch {}
        }
      }
    };

    loadHistory();
  }, [authToken]);

  // 메시지 추가 + AsyncStorage 캐싱 (서버 저장은 /api/chat에서 자동 처리)
  const handleAddMessage = useCallback((msg: ChatMessage) => {
    setChatMessages(prev => {
      const next = [...prev, msg];
      AsyncStorage.setItem(CHAT_MESSAGES_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  // 일정 저장: TravelPlatform 서버에 저장
  const handleSaveSchedule = useCallback(async (item: ChatMessage) => {
    // schedule 배열이 없으면 저장 불가 안내
    if (!item.schedule?.length) {
      Alert.alert(
        '저장 불가',
        'AI가 구체적인 일정 데이터를 생성하지 않았습니다.\n"확정해줘" 또는 "이걸로 해줘"라고 말하면 저장 가능한 일정이 만들어집니다.',
      );
      return;
    }

    try {
      // scheduledAt이 없으면 오늘 날짜 사용
      const firstScheduledAt = item.schedule[0].scheduledAt;
      const date = firstScheduledAt
        ? firstScheduledAt.split('T')[0]
        : new Date().toISOString().split('T')[0];

      await saveSchedule({
        date,
        title: `AI 추천 일정 (${date})`,
        sourceText: item.text,
        items: item.schedule.map(s => ({
          // 방어 코드: title 없으면 place 사용 (구버전 chatbot 응답 호환)
          title: (s as any).title ?? (s as any).place ?? '장소',
          latitude: s.latitude,
          longitude: s.longitude,
          time: s.time ?? '00:00',
          scheduledAt: s.scheduledAt,
          // category 없으면 attraction 기본값
          category: s.category ?? 'attraction',
          description: s.description,
        })),
      });

      // 성공 시에만 저장됨 표시
      setChatSavedIds(prev => new Set([...prev, item.id]));
      Alert.alert('저장 완료', '일정이 저장됐습니다. 지도 화면에서 확인할 수 있어요.');
    } catch (e) {
      console.warn('[Chat] 일정 저장 실패:', e);
      Alert.alert(
        '저장 실패',
        '일정을 서버에 저장하지 못했습니다. 잠시 후 다시 시도해주세요.',
      );
    }
  }, [user]);

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
          uploadDeviceToken(token);
        }
      }
    });
  }, [authToken]);

  // ── 로그인 후 토큰 업로드 ─────────────────────────────────────────────
  useEffect(() => {
    if (authToken && fcmTokenRef.current) {
      uploadDeviceToken(fcmTokenRef.current);
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
          onGoBack={() => {
            setMapInitialSchedule(null);
            setAuthScreen('chat');
          }}
          onSelectItem={item => {
            setSelectedItem(item);
            setAuthScreen('scheduleDetail');
          }}
          initialSchedule={mapInitialSchedule}
          userId={String((user as {id?: string | number} | null)?.id ?? '1')}
        />
      );
    }
    return (
      <ChatScreen
        onLogout={logout}
        onGoMap={() => setAuthScreen('map')}
        onGoMapWithSchedule={(schedule: ScheduleItem[] | null) => {
          setMapInitialSchedule(schedule);
          setAuthScreen('map');
        }}
        onGoApiTest={() => setAuthScreen('apiTest')}
        onGoNotifications={() => setAuthScreen('notifications')}
        messages={chatMessages}
        onAddMessage={handleAddMessage}
        savedIds={chatSavedIds}
        onSaveSchedule={handleSaveSchedule}
        isLoading={chatIsLoading}
        onSetLoading={setChatIsLoading}
        inputText={chatInputText}
        onSetInputText={setChatInputText}
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

  // 앱 시작 즉시 서버 워밍업 (fly.dev sleep 해제)
  useEffect(() => {
    warmupServers();
  }, []);

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
