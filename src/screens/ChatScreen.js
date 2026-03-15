import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import api from '../services/api';

const ChatScreen = ({onLogout, onGoMap, onGoApiTest}) => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const flatListRef = useRef(null);
  const insets = useSafeAreaInsets();
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', e => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const sendMessage = useCallback(async () => {
    const text = inputText.trim();
    if (!text || isLoading) {
      return;
    }

    const userMessage = {
      id: `user-${Date.now()}`,
      text,
      role: 'user',
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      const response = await api.post('/chat', {message: text});

      // Laravel ApiResponse 구조: { success, message, data: { reply } }
      const replyText =
        response.data?.data?.reply ??
        '응답을 받았습니다.';

      const botMessage = {
        id: `bot-${Date.now()}`,
        text: replyText,
        role: 'assistant',
      };
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      const errorMessage = {
        id: `error-${Date.now()}`,
        text: '서버 연결에 실패했습니다. IP 주소와 서버 상태를 확인해주세요.',
        role: 'error',
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [inputText, isLoading]);

  const renderMessage = useCallback(({item}) => {
    const isUser = item.role === 'user';
    const isError = item.role === 'error';

    return (
      <View
        className={`flex-row mb-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
        {/* AI 아바타 */}
        {!isUser && (
          <View className="w-8 h-8 rounded-full bg-indigo-500 items-center justify-center mr-2 mt-1 shrink-0">
            <Text className="text-white text-xs font-bold">AI</Text>
          </View>
        )}

        {/* 말풍선 */}
        <View
          className={`max-w-[75%] px-4 py-3 rounded-2xl ${
            isUser
              ? 'bg-indigo-500 rounded-tr-sm'
              : isError
                ? 'bg-red-100 rounded-tl-sm'
                : 'bg-white rounded-tl-sm shadow-sm'
          }`}>
          <Text
            className={`text-sm leading-5 ${
              isUser
                ? 'text-white'
                : isError
                  ? 'text-red-600'
                  : 'text-gray-800'
            }`}>
            {item.text}
          </Text>
        </View>
      </View>
    );
  }, []);

  const scrollToBottom = useCallback(() => {
    flatListRef.current?.scrollToEnd({animated: true});
  }, []);

  return (
    <View
      className="flex-1 bg-gray-100"
      style={{paddingTop: insets.top, marginBottom: keyboardHeight > 0 ? keyboardHeight + insets.bottom : 0}}>

      {/* 헤더 */}
      <View className="bg-white px-4 py-3 border-b border-gray-200 flex-row items-center justify-between">
        <TouchableOpacity onPress={onGoMap} className="w-12 items-start">
          <Icon name="map" size={24} color="#6366f1" />
        </TouchableOpacity>
        <View className="items-center">
          <Text className="text-lg font-bold text-gray-800">Plango AI</Text>
          <Text className="text-xs text-gray-400 mt-0.5">AI 여행 플래너</Text>
        </View>
        <View className="flex-row items-center gap-3">
          {onGoApiTest && (
            <TouchableOpacity onPress={onGoApiTest}>
              <Text className="text-xs text-indigo-400 font-semibold">API</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={onLogout}>
            <Text className="text-sm text-gray-400">로그아웃</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 메시지 목록 */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item.id}
        renderItem={renderMessage}
        contentContainerStyle={{padding: 16, paddingBottom: 8}}
        onContentSizeChange={scrollToBottom}
        onLayout={scrollToBottom}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <View className="items-center justify-center mt-24">
            <Text className="text-5xl mb-4">✈️</Text>
            <Text className="text-gray-600 text-base font-semibold">
              안녕하세요!
            </Text>
            <Text className="text-gray-400 text-sm mt-1">
              여행 계획을 도와드릴게요.
            </Text>
          </View>
        }
      />

      {/* 로딩 인디케이터 (AI 응답 대기 중) */}
      {isLoading && (
        <View className="flex-row items-center px-4 pb-2">
          <View className="w-8 h-8 rounded-full bg-indigo-500 items-center justify-center mr-2">
            <Text className="text-white text-xs font-bold">AI</Text>
          </View>
          <View className="bg-white px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm">
            <ActivityIndicator size="small" color="#6366f1" />
          </View>
        </View>
      )}

      {/* 입력 영역 */}
      <View
        className="bg-white border-t border-gray-200 px-4 pt-3 flex-row items-end gap-2"
        style={{paddingBottom: keyboardHeight > 0 ? 12 : insets.bottom + 12}}>
        <TextInput
          className="flex-1 bg-gray-100 rounded-2xl px-4 py-3 text-sm text-gray-800 max-h-28"
          placeholder="메시지를 입력하세요..."
          placeholderTextColor="#9ca3af"
          value={inputText}
          onChangeText={setInputText}
          multiline
          returnKeyType="send"
          blurOnSubmit={false}
          onSubmitEditing={sendMessage}
        />

        <TouchableOpacity
          onPress={sendMessage}
          disabled={isLoading || !inputText.trim()}
          activeOpacity={0.7}
          className={`w-11 h-11 rounded-full items-center justify-center ${
            isLoading || !inputText.trim() ? 'bg-gray-200' : 'bg-indigo-500'
          }`}>
          <Text
            className={`text-base font-bold ${
              isLoading || !inputText.trim()
                ? 'text-gray-400'
                : 'text-white'
            }`}>
            ↑
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default ChatScreen;
