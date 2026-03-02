import React, {useState} from 'react';
import {
  ActivityIndicator,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

const LoginScreen = ({onLogin, onGoRegister}) => {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError('이메일과 비밀번호를 입력해주세요.');
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      await onLogin(email.trim(), password);
    } catch (e) {
      const msg =
        e?.response?.data?.errors?.email?.[0] ??
        e?.response?.data?.message ??
        '로그인에 실패했습니다. 다시 시도해주세요.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAwareScrollView
      className="flex-1 bg-gray-50"
      contentContainerStyle={{
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: 24,
        paddingTop: insets.top,
        paddingBottom: insets.bottom + 16,
      }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      enableOnAndroid
      extraScrollHeight={20}>

      {/* 로고 */}
      <View className="items-center mb-10">
        <Text className="text-5xl mb-3">✈️</Text>
        <Text className="text-3xl font-bold text-indigo-600">Plango</Text>
        <Text className="text-sm text-gray-400 mt-1">AI 여행 플래너</Text>
      </View>

      {/* 이메일 */}
      <TextInput
        className="bg-white border border-gray-200 rounded-2xl px-4 py-4 text-sm text-gray-800 mb-3"
        placeholder="이메일"
        placeholderTextColor="#9ca3af"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
      />

      {/* 비밀번호 */}
      <TextInput
        className="bg-white border border-gray-200 rounded-2xl px-4 py-4 text-sm text-gray-800 mb-3"
        placeholder="비밀번호"
        placeholderTextColor="#9ca3af"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
      />

      {/* 에러 메시지 */}
      {error ? (
        <Text className="text-red-500 text-xs text-center mb-2">{error}</Text>
      ) : null}

      {/* 로그인 버튼 */}
      <TouchableOpacity
        onPress={handleLogin}
        disabled={isLoading}
        activeOpacity={0.8}
        className={`rounded-2xl py-4 items-center mt-1 ${
          isLoading ? 'bg-indigo-300' : 'bg-indigo-500'
        }`}>
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-white font-bold text-base">로그인</Text>
        )}
      </TouchableOpacity>

      {/* 회원가입 링크 */}
      <View className="flex-row justify-center items-center mt-6">
        <Text className="text-gray-400 text-sm">아직 계정이 없으신가요?</Text>
        <TouchableOpacity onPress={onGoRegister} className="ml-1">
          <Text className="text-indigo-500 text-sm font-semibold">회원가입</Text>
        </TouchableOpacity>
      </View>

    </KeyboardAwareScrollView>
  );
};

export default LoginScreen;
