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

interface RegisterScreenProps {
  onRegister: (
    name: string,
    email: string,
    password: string,
    passwordConfirm: string,
  ) => Promise<void>;
  onGoLogin: () => void;
}

interface RegisterErrors {
  name?: string;
  email?: string;
  password?: string;
  passwordConfirm?: string;
  general?: string;
}

interface AxiosLikeError {
  response?: {
    data?: {
      errors?: {
        name?: string[];
        email?: string[];
        password?: string[];
        password_confirmation?: string[];
      };
      message?: string;
    };
  };
}

const RegisterScreen = ({onRegister, onGoLogin}: RegisterScreenProps) => {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<RegisterErrors>({});

  const validate = (): RegisterErrors => {
    const e: RegisterErrors = {};
    if (!name.trim()) {e.name = '이름을 입력해주세요.';}
    if (!email.trim()) {e.email = '이메일을 입력해주세요.';}
    if (!password) {e.password = '비밀번호를 입력해주세요.';}
    else if (password.length < 8) {e.password = '비밀번호는 8자 이상이어야 합니다.';}
    if (password !== passwordConfirm) {e.passwordConfirm = '비밀번호가 일치하지 않습니다.';}
    return e;
  };

  const handleRegister = async () => {
    const e = validate();
    if (Object.keys(e).length > 0) {
      setErrors(e);
      return;
    }
    setErrors({});
    setIsLoading(true);
    try {
      await onRegister(name.trim(), email.trim(), password, passwordConfirm);
    } catch (err) {
      const axiosErr = err as AxiosLikeError;
      const serverErrors = axiosErr?.response?.data?.errors ?? {};
      const fallback = axiosErr?.response?.data?.message ?? '회원가입에 실패했습니다.';
      if (Object.keys(serverErrors).length > 0) {
        setErrors({
          name: serverErrors.name?.[0],
          email: serverErrors.email?.[0],
          password: serverErrors.password?.[0],
          general: serverErrors.password_confirmation?.[0],
        });
      } else {
        setErrors({general: fallback});
      }
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
          <Text className="text-sm text-gray-400 mt-1">여행 계획을 시작해볼까요?</Text>
        </View>

        {/* 이름 */}
        <View className="mb-3">
          <TextInput
            className={`bg-white border rounded-2xl px-4 py-4 text-sm text-gray-800 ${
              errors.name ? 'border-red-400' : 'border-gray-200'
            }`}
            placeholder="이름"
            placeholderTextColor="#9ca3af"
            value={name}
            onChangeText={setName}
            autoCorrect={false}
          />
          {errors.name ? (
            <Text className="text-red-500 text-xs ml-1 mt-1">{errors.name}</Text>
          ) : null}
        </View>

        {/* 이메일 */}
        <View className="mb-3">
          <TextInput
            className={`bg-white border rounded-2xl px-4 py-4 text-sm text-gray-800 ${
              errors.email ? 'border-red-400' : 'border-gray-200'
            }`}
            placeholder="이메일"
            placeholderTextColor="#9ca3af"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {errors.email ? (
            <Text className="text-red-500 text-xs ml-1 mt-1">{errors.email}</Text>
          ) : null}
        </View>

        {/* 비밀번호 */}
        <View className="mb-3">
          <TextInput
            className={`bg-white border rounded-2xl px-4 py-4 text-sm text-gray-800 ${
              errors.password ? 'border-red-400' : 'border-gray-200'
            }`}
            placeholder="비밀번호 (8자 이상)"
            placeholderTextColor="#9ca3af"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
          />
          {errors.password ? (
            <Text className="text-red-500 text-xs ml-1 mt-1">{errors.password}</Text>
          ) : null}
        </View>

        {/* 비밀번호 확인 */}
        <View className="mb-3">
          <TextInput
            className={`bg-white border rounded-2xl px-4 py-4 text-sm text-gray-800 ${
              errors.passwordConfirm ? 'border-red-400' : 'border-gray-200'
            }`}
            placeholder="비밀번호 확인"
            placeholderTextColor="#9ca3af"
            value={passwordConfirm}
            onChangeText={setPasswordConfirm}
            secureTextEntry
            autoCapitalize="none"
          />
          {errors.passwordConfirm ? (
            <Text className="text-red-500 text-xs ml-1 mt-1">{errors.passwordConfirm}</Text>
          ) : null}
        </View>

        {/* 일반 에러 */}
        {errors.general ? (
          <Text className="text-red-500 text-xs text-center mb-2">{errors.general}</Text>
        ) : null}

        {/* 회원가입 버튼 */}
        <TouchableOpacity
          onPress={handleRegister}
          disabled={isLoading}
          activeOpacity={0.8}
          className={`rounded-2xl py-4 items-center mt-1 ${
            isLoading ? 'bg-indigo-300' : 'bg-indigo-500'
          }`}>
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-bold text-base">회원가입</Text>
          )}
        </TouchableOpacity>

        {/* 로그인 링크 */}
        <View className="flex-row justify-center items-center mt-6 mb-4">
          <Text className="text-gray-400 text-sm">이미 계정이 있으신가요?</Text>
          <TouchableOpacity onPress={onGoLogin} className="ml-1">
            <Text className="text-indigo-500 text-sm font-semibold">로그인</Text>
          </TouchableOpacity>
        </View>

    </KeyboardAwareScrollView>
  );
};

export default RegisterScreen;
