import React, {useCallback, useEffect, useRef} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
// @ts-ignore — api.js is a plain JS module without type declarations
import api from '../services/api';
import {useNotifications} from '../contexts/NotificationContext';
import type {ScheduleItem} from '../types/schedule';

// ── 타입 정의 ────────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  text: string;
  role: 'user' | 'assistant' | 'error';
  schedule?: ScheduleItem[] | null;
  hasSchedule?: boolean;
}

interface ChatApiResponseData {
  reply?: string;
  schedule?: ScheduleItem[] | null;
}

interface AxiosLikeError {
  response?: {
    status?: number;
    data?: {
      message?: string;
      error?: string;
    };
  };
  message?: string;
}

interface ChatScreenProps {
  onLogout: () => void;
  onGoMap: () => void;
  onGoMapWithSchedule?: (schedule: ScheduleItem[] | null) => void;
  onGoApiTest?: () => void;
  onGoNotifications?: () => void;
  // 채팅 기록 (App.tsx에서 관리)
  messages: ChatMessage[];
  onAddMessage: (msg: ChatMessage) => void;
  // 저장된 일정 ID Set (App.tsx에서 관리)
  savedIds: Set<string>;
  onSaveSchedule: (item: ChatMessage) => void;
  // 로딩 상태
  isLoading: boolean;
  onSetLoading: (loading: boolean) => void;
  inputText: string;
  onSetInputText: (text: string) => void;
}

// ── 여행 일정 포함 여부 감지 (텍스트 기반 휴리스틱) ─────────────────────────

function detectsItinerary(text: string): boolean {
  const keywords = ['일차', '오전', '오후', '저녁', 'Day ', '관광', '식당', '숙박', '교통'];
  const matched = keywords.filter(kw => text.includes(kw));
  return matched.length >= 2 && text.length > 80;
}

// ── 컴포넌트 ─────────────────────────────────────────────────────────────────

const ChatScreen = ({
  onLogout,
  onGoMap,
  onGoMapWithSchedule,
  onGoApiTest,
  onGoNotifications,
  messages,
  onAddMessage,
  savedIds,
  onSaveSchedule,
  isLoading,
  onSetLoading,
  inputText,
  onSetInputText,
}: ChatScreenProps) => {
  const {unreadCount} = useNotifications();
  const flatListRef = useRef<FlatList<ChatMessage>>(null);
  const insets = useSafeAreaInsets();
  const [keyboardHeight, setKeyboardHeight] = React.useState(0);

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

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      text,
      role: 'user',
    };

    onAddMessage(userMessage);
    onSetInputText('');
    onSetLoading(true);

    try {
      const response = await api.post('/api/chat', {message: text});

      // Laravel ApiResponse 구조: { success, message, data: { reply, schedule? } }
      const resData: ChatApiResponseData = response.data?.data ?? {};
      const replyText = resData.reply ?? '응답을 받았습니다.';
      const scheduleData = Array.isArray(resData.schedule) ? resData.schedule : null;
      const hasSchedule = scheduleData !== null || detectsItinerary(replyText);

      onAddMessage({
        id: `bot-${Date.now()}`,
        text: replyText,
        role: 'assistant',
        schedule: scheduleData,
        hasSchedule,
      });
    } catch (error) {
      const err = error as AxiosLikeError;
      const status = err?.response?.status;
      const serverMsg = err?.response?.data?.message ?? err?.response?.data?.error;
      const detail = status
        ? `[${status}] ${serverMsg ?? err?.message ?? '알 수 없는 오류'}`
        : (err?.message ?? '네트워크 연결을 확인해주세요.');
      onAddMessage({
        id: `error-${Date.now()}`,
        text: `서버 오류: ${detail}`,
        role: 'error',
      });
    } finally {
      onSetLoading(false);
    }
  }, [inputText, isLoading, onAddMessage, onSetInputText, onSetLoading]);

  const handleGoMapWithSchedule = useCallback((item: ChatMessage) => {
    const navigate = onGoMapWithSchedule ?? onGoMap;
    navigate(item.schedule ?? null);
  }, [onGoMapWithSchedule, onGoMap]);

  const scrollToBottom = useCallback(() => {
    flatListRef.current?.scrollToEnd({animated: true});
  }, []);

  const renderMessage = useCallback(({item}: {item: ChatMessage}) => {
    const isUser = item.role === 'user';
    const isError = item.role === 'error';
    const isSaved = savedIds.has(item.id);

    return (
      <View
        className={`flex-row mb-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
        {/* AI 아바타 */}
        {!isUser && (
          <View className="w-8 h-8 rounded-full bg-indigo-500 items-center justify-center mr-2 mt-1 shrink-0">
            <Text className="text-white text-xs font-bold">AI</Text>
          </View>
        )}

        <View className="max-w-[75%]">
          {/* 말풍선 */}
          <View
            className={`px-4 py-3 rounded-2xl ${
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

          {/* 일정 액션 버튼 */}
          {!isUser && !isError && item.hasSchedule && (
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.actionBtn, isSaved && styles.actionBtnSaved]}
                onPress={() => !isSaved && onSaveSchedule(item)}
                activeOpacity={isSaved ? 1 : 0.7}>
                <Text style={[styles.actionBtnText, isSaved && styles.actionBtnTextSaved]}>
                  {isSaved ? '✓ 저장됨' : '💾 일정 저장'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => handleGoMapWithSchedule(item)}
                activeOpacity={0.7}>
                <Text style={styles.actionBtnText}>🗺 지도로 보기</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  }, [savedIds, onSaveSchedule, handleGoMapWithSchedule]);

  return (
    <View
      className="flex-1 bg-gray-100"
      style={{paddingTop: insets.top, marginBottom: keyboardHeight > 0 ? keyboardHeight + insets.bottom : 0}}>

      {/* 헤더 */}
      <View className="bg-white px-4 py-3 border-b border-gray-200 flex-row items-center justify-between">
        <View className="flex-row items-center gap-3">
          <TouchableOpacity onPress={onGoMap}>
            <Icon name="map" size={24} color="#6366f1" />
          </TouchableOpacity>
          {onGoNotifications && (
            <TouchableOpacity onPress={onGoNotifications} style={{position: 'relative'}}>
              <Icon name="notifications" size={24} color="#6366f1" />
              {unreadCount > 0 && (
                <View style={{position:'absolute', top:-4, right:-4, backgroundColor:'#ef4444', borderRadius:8, minWidth:16, height:16, alignItems:'center', justifyContent:'center', paddingHorizontal:3}}>
                  <Text style={{color:'#fff', fontSize:9, fontWeight:'700'}}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          )}
        </View>
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
          onChangeText={onSetInputText}
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

const styles = StyleSheet.create({
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: '#eef2ff',
    borderRadius: 10,
    paddingVertical: 7,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#c7d2fe',
  },
  actionBtnSaved: {
    backgroundColor: '#f0fdf4',
    borderColor: '#86efac',
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6366f1',
  },
  actionBtnTextSaved: {
    color: '#16a34a',
  },
});

export default ChatScreen;
