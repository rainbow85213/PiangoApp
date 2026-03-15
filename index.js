/**
 * @format
 */

import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';
import messaging from '@react-native-firebase/messaging';
import notifee, {AndroidImportance, EventType} from '@notifee/react-native';

// ── 1. FCM Background / Quit 메시지 핸들러 ────────────────────────────────
// AppRegistry.registerComponent 호출 전에 반드시 등록해야 합니다.
messaging().setBackgroundMessageHandler(async remoteMessage => {
  const {notification, data} = remoteMessage;

  // Android 채널 생성 (이미 존재하면 무시됨)
  const channelId = await notifee.createChannel({
    id: 'schedule',
    name: '일정 알림',
    importance: AndroidImportance.HIGH,
  });

  await notifee.displayNotification({
    title: notification?.title ?? '새 알림',
    body: notification?.body ?? '',
    data: data as Record<string, string>,
    android: {channelId, pressAction: {id: 'default'}},
    ios: {sound: 'default'},
  });
});

// ── 2. notifee Background 이벤트 핸들러 ──────────────────────────────────
// 앱이 백그라운드/종료 상태에서 알림을 탭했을 때 처리
notifee.onBackgroundEvent(async ({type, detail}) => {
  if (type === EventType.PRESS) {
    // 탭한 알림의 data를 AsyncStorage에 임시 저장 → AppContent에서 감지 후 처리
    const {default: AsyncStorage} = await import(
      '@react-native-async-storage/async-storage'
    );
    if (detail.notification?.data) {
      await AsyncStorage.setItem(
        '@plango_pending_notification',
        JSON.stringify(detail.notification.data),
      );
    }
  }
});

AppRegistry.registerComponent(appName, () => App);
