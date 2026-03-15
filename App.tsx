/**
 * PlangoApp
 * @format
 */

import './global.css';
import React, {useEffect, useState} from 'react';
import {ActivityIndicator, Alert, Platform, StatusBar, useColorScheme, View} from 'react-native';
import {
  getMessaging,
  getToken,
  onMessage,
  requestPermission,
  AuthorizationStatus,
  registerDeviceForRemoteMessages,
} from '@react-native-firebase/messaging';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {useAuth} from './src/hooks/useAuth';
import ChatScreen from './src/screens/ChatScreen';
import LoginScreen from './src/screens/LoginScreen';
import MapScreen from './src/screens/MapScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import ApiTestScreen from './src/screens/ApiTestScreen';
import ScheduleDetailScreen from './src/screens/ScheduleDetailScreen';
import type {ScheduleItem} from './src/types/schedule';

type Screen = 'login' | 'register';
type AuthScreen = 'chat' | 'map' | 'scheduleDetail' | 'apiTest';

function AppContent() {
  const {token, isLoading, login, register, logout} = useAuth();
  const [screen, setScreen] = useState<Screen>('login');
  const [authScreen, setAuthScreen] = useState<AuthScreen>('chat');
  const [selectedItem, setSelectedItem] = useState<ScheduleItem | null>(null);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  if (token) {
    if (authScreen === 'apiTest') {
      return <ApiTestScreen onGoBack={() => setAuthScreen('chat')} />;
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
      />
    );
  }

  if (screen === 'register') {
    return (
      <RegisterScreen
        onRegister={register}
        onGoLogin={() => setScreen('login')}
      />
    );
  }

  return (
    <LoginScreen
      onLogin={login}
      onGoRegister={() => setScreen('register')}
    />
  );
}

async function requestFCMPermissionAndGetToken() {
  const messaging = getMessaging();

  // iOS: 원격 알림 등록 (getToken 전 필수)
  if (Platform.OS === 'ios') {
    await registerDeviceForRemoteMessages(messaging);

    const authStatus = await requestPermission(messaging);
    const enabled =
      authStatus === AuthorizationStatus.AUTHORIZED ||
      authStatus === AuthorizationStatus.PROVISIONAL;
    if (!enabled) {
      console.log('[FCM] 알림 권한이 거부되었습니다.');
      return;
    }
  }

  // Android 13+ 권한 요청
  if (Platform.OS === 'android') {
    await requestPermission(messaging);
  }

  // FCM 토큰 발급
  const fcmToken = await getToken(messaging);
  console.log('[FCM] Token:', fcmToken);
  Alert.alert('FCM Token', fcmToken);
  return fcmToken;
}

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  useEffect(() => {
    requestFCMPermissionAndGetToken();

    // 포그라운드 메시지 수신
    const messaging = getMessaging();
    const unsubscribe = onMessage(messaging, async remoteMessage => {
      console.log('[FCM] 포그라운드 메시지:', JSON.stringify(remoteMessage));
    });

    return unsubscribe;
  }, []);

  return (
    <GestureHandlerRootView style={{flex: 1}}>
      <SafeAreaProvider>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        <AppContent />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default App;
