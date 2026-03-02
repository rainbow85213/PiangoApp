/**
 * PlangoApp
 * @format
 */

import './global.css';
import React, {useState} from 'react';
import {ActivityIndicator, StatusBar, useColorScheme, View} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {useAuth} from './src/hooks/useAuth';
import ChatScreen from './src/screens/ChatScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';

type Screen = 'login' | 'register' | 'chat';

function AppContent() {
  const {token, isLoading, login, register, logout} = useAuth();
  const [screen, setScreen] = useState<Screen>('login');

  // 앱 시작 시 토큰 복원 중
  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  // 로그인 상태 → 채팅 화면
  if (token) {
    return <ChatScreen onLogout={logout} />;
  }

  // 비로그인 상태 → 로그인 / 회원가입
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

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <AppContent />
    </SafeAreaProvider>
  );
}

export default App;
