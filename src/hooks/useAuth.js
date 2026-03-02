import {useCallback, useEffect, useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

const TOKEN_KEY = '@plango_token';
const USER_KEY = '@plango_user';

export const useAuth = () => {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true); // 앱 시작 시 토큰 복원 중

  // 앱 시작 시 저장된 토큰 복원
  useEffect(() => {
    const restore = async () => {
      try {
        const savedToken = await AsyncStorage.getItem(TOKEN_KEY);
        const savedUser = await AsyncStorage.getItem(USER_KEY);
        if (savedToken) {
          setToken(savedToken);
          setUser(savedUser ? JSON.parse(savedUser) : null);
          api.defaults.headers.common.Authorization = `Bearer ${savedToken}`;
        }
      } finally {
        setIsLoading(false);
      }
    };
    restore();
  }, []);

  const saveSession = useCallback(async (newToken, newUser) => {
    await AsyncStorage.setItem(TOKEN_KEY, newToken);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(newUser));
    api.defaults.headers.common.Authorization = `Bearer ${newToken}`;
    setToken(newToken);
    setUser(newUser);
  }, []);

  const login = useCallback(
    async (email, password) => {
      const res = await api.post('/api/auth/login', {email, password});
      await saveSession(res.data.data.token, res.data.data.user);
    },
    [saveSession],
  );

  const register = useCallback(
    async (name, email, password, passwordConfirmation) => {
      const res = await api.post('/api/auth/register', {
        name,
        email,
        password,
        password_confirmation: passwordConfirmation,
      });
      await saveSession(res.data.data.token, res.data.data.user);
    },
    [saveSession],
  );

  const logout = useCallback(async () => {
    try {
      await api.post('/api/auth/logout');
    } catch (_) {}
    await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
    delete api.defaults.headers.common.Authorization;
    setToken(null);
    setUser(null);
  }, []);

  return {token, user, isLoading, login, register, logout};
};
