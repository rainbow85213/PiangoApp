/**
 * API 연결 테스트 화면
 * 모든 엔드포인트의 응답 상태와 응답 시간을 한눈에 확인합니다.
 */
import React, {useCallback, useState} from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import api from '../services/api';
import tourCastApi from '../services/tourCastApi';

type Status = 'idle' | 'running' | 'ok' | 'error';

interface TestCase {
  id: string;
  server: 'TravelPlatform' | 'TourCast';
  method: 'GET' | 'POST';
  endpoint: string;
  description: string;
  run: () => Promise<unknown>;
}

interface TestResult {
  status: Status;
  ms: number | null;
  preview: string | null;
}

const TEST_CASES: TestCase[] = [
  // ── TravelPlatform ─────────────────────────────────────────
  {
    id: 'auth_login',
    server: 'TravelPlatform',
    method: 'POST',
    endpoint: '/api/auth/login',
    description: '로그인 (이메일/비밀번호 형식 검증)',
    run: () =>
      api.post('/api/auth/login', {email: 'test@test.com', password: 'wrong'})
        .catch(e => {
          // 422 Validation / 401 Unauthorized 모두 서버가 응답한 것
          if (e.response) { return e.response; }
          throw e;
        }),
  },

  {
    id: 'auth_register',
    server: 'TravelPlatform',
    method: 'POST',
    endpoint: '/api/auth/register',
    description: '회원가입 (유효성 검사 응답 확인)',
    run: () =>
      api.post('/api/auth/register', {
        name: '',
        email: 'bad-email',
        password: '123',
        password_confirmation: '456',
      }).catch(e => {
        if (e.response) { return e.response; }
        throw e;
      }),
  },
  {
    id: 'chat',
    server: 'TravelPlatform',
    method: 'POST',
    endpoint: '/api/chat',
    description: '채팅 — AI 응답',
    run: () => api.post('/api/chat', {message: '도쿄 여행 1일 코스 추천해줘'}),
  },

  // ── TourCast ────────────────────────────────────────────────
  {
    id: 'schedule_map',
    server: 'TourCast',
    method: 'GET',
    endpoint: '/api/schedule/map',
    description: '여행 일정 지도 데이터',
    run: () =>
      tourCastApi.get('/api/schedule/map', {
        params: {userId: '1', date: new Date().toISOString().slice(0, 10)},
      }),
  },
];

const SERVER_COLORS = {
  TravelPlatform: '#6366f1',
  TourCast: '#0ea5e9',
};

const STATUS_ICON: Record<Status, string> = {
  idle: '○',
  running: '…',
  ok: '✓',
  error: '✗',
};

const STATUS_COLOR: Record<Status, string> = {
  idle: '#9ca3af',
  running: '#f59e0b',
  ok: '#22c55e',
  error: '#ef4444',
};

const summarize = (data: unknown): string => {
  try {
    const str = JSON.stringify(data, null, 2);
    return str.length > 300 ? str.slice(0, 300) + '\n…' : str;
  } catch {
    return String(data);
  }
};

interface Props {
  onGoBack: () => void;
}

const ApiTestScreen: React.FC<Props> = ({onGoBack}) => {
  const insets = useSafeAreaInsets();
  const [results, setResults] = useState<Record<string, TestResult>>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [runningAll, setRunningAll] = useState(false);

  const setResult = (id: string, partial: Partial<TestResult>) =>
    setResults(prev => ({
      ...prev,
      [id]: {...(prev[id] ?? {status: 'idle', ms: null, preview: null}), ...partial},
    }));

  const runOne = useCallback(async (tc: TestCase) => {
    setResult(tc.id, {status: 'running', ms: null, preview: null});
    const t0 = Date.now();
    try {
      const res = await tc.run();
      const ms = Date.now() - t0;
      // res 가 axios Response 이거나 raw data 일 수 있음
      const data = (res as any)?.data ?? res;
      setResult(tc.id, {status: 'ok', ms, preview: summarize(data)});
    } catch (err: any) {
      const ms = Date.now() - t0;
      const preview =
        err?.response
          ? summarize(err.response.data)
          : err?.message ?? '알 수 없는 오류';
      setResult(tc.id, {status: 'error', ms, preview: String(preview)});
    }
  }, []);

  const runAll = useCallback(async () => {
    setRunningAll(true);
    for (const tc of TEST_CASES) {
      await runOne(tc);
    }
    setRunningAll(false);
  }, [runOne]);

  const passCount = Object.values(results).filter(r => r.status === 'ok').length;
  const failCount = Object.values(results).filter(r => r.status === 'error').length;
  const doneCount = passCount + failCount;

  return (
    <View style={[styles.container, {paddingTop: insets.top}]}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onGoBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>API 테스트</Text>
        <View style={styles.headerRight} />
      </View>

      {/* 서버 URL 카드 */}
      <View style={styles.serverCards}>
        <ServerCard
          name="TravelPlatform"
          url="travel-platform.fly.dev"
          color={SERVER_COLORS.TravelPlatform}
        />
        <ServerCard
          name="TourCast"
          url="tour-cast.fly.dev"
          color={SERVER_COLORS.TourCast}
        />
      </View>

      {/* 전체 실행 + 요약 */}
      <View style={styles.summaryRow}>
        <TouchableOpacity
          style={[styles.runAllButton, runningAll && styles.runAllButtonDisabled]}
          onPress={runAll}
          disabled={runningAll}
          activeOpacity={0.8}>
          {runningAll ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.runAllText}>▶ 전체 테스트</Text>
          )}
        </TouchableOpacity>
        {doneCount > 0 && (
          <Text style={styles.summary}>
            <Text style={{color: '#22c55e'}}>{passCount}개 성공</Text>
            {'  '}
            <Text style={{color: '#ef4444'}}>{failCount}개 실패</Text>
            {'  '}
            <Text style={{color: '#9ca3af'}}>/ {TEST_CASES.length}개</Text>
          </Text>
        )}
      </View>

      {/* 테스트 목록 */}
      <ScrollView
        style={styles.list}
        contentContainerStyle={{paddingBottom: insets.bottom + 24}}>
        {TEST_CASES.map(tc => {
          const res = results[tc.id] ?? {status: 'idle' as Status, ms: null, preview: null};
          const isOpen = expanded === tc.id;

          return (
            <View key={tc.id} style={styles.card}>
              <View style={styles.cardHeader}>
                {/* 서버 태그 */}
                <View
                  style={[
                    styles.serverTag,
                    {backgroundColor: SERVER_COLORS[tc.server] + '22'},
                  ]}>
                  <Text
                    style={[
                      styles.serverTagText,
                      {color: SERVER_COLORS[tc.server]},
                    ]}>
                    {tc.server}
                  </Text>
                </View>

                {/* 상태 아이콘 */}
                <View style={styles.statusArea}>
                  {res.status === 'running' ? (
                    <ActivityIndicator size="small" color="#f59e0b" />
                  ) : (
                    <Text
                      style={[
                        styles.statusIcon,
                        {color: STATUS_COLOR[res.status]},
                      ]}>
                      {STATUS_ICON[res.status]}
                    </Text>
                  )}
                  {res.ms !== null && (
                    <Text style={styles.ms}>{res.ms}ms</Text>
                  )}
                </View>
              </View>

              {/* 엔드포인트 */}
              <View style={styles.endpointRow}>
                <View
                  style={[
                    styles.methodBadge,
                    tc.method === 'GET'
                      ? styles.methodGet
                      : styles.methodPost,
                  ]}>
                  <Text style={styles.methodText}>{tc.method}</Text>
                </View>
                <Text style={styles.endpoint}>{tc.endpoint}</Text>
              </View>
              <Text style={styles.description}>{tc.description}</Text>

              {/* 액션 버튼 */}
              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={[
                    styles.runButton,
                    res.status === 'running' && styles.runButtonDisabled,
                  ]}
                  onPress={() => runOne(tc)}
                  disabled={res.status === 'running'}
                  activeOpacity={0.8}>
                  <Text style={styles.runButtonText}>실행</Text>
                </TouchableOpacity>
                {res.preview && (
                  <TouchableOpacity
                    style={styles.toggleButton}
                    onPress={() => setExpanded(isOpen ? null : tc.id)}
                    activeOpacity={0.7}>
                    <Text style={styles.toggleButtonText}>
                      {isOpen ? '접기 ▲' : '응답 보기 ▼'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* 응답 미리보기 */}
              {isOpen && res.preview && (
                <View
                  style={[
                    styles.preview,
                    res.status === 'error'
                      ? styles.previewError
                      : styles.previewOk,
                  ]}>
                  <Text style={styles.previewText}>{res.preview}</Text>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};

const ServerCard: React.FC<{name: string; url: string; color: string}> = ({
  name,
  url,
  color,
}) => (
  <View style={[styles.serverCard, {borderLeftColor: color}]}>
    <Text style={[styles.serverCardName, {color}]}>{name}</Text>
    <Text style={styles.serverCardUrl}>{url}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#f9fafb'},

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {width: 40, alignItems: 'flex-start'},
  backButtonText: {fontSize: 24, color: '#6366f1'},
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
    color: '#1f2937',
  },
  headerRight: {width: 40},

  serverCards: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
  },
  serverCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  serverCardName: {fontSize: 12, fontWeight: '700', marginBottom: 2},
  serverCardUrl: {fontSize: 11, color: '#6b7280'},

  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 12,
  },
  runAllButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    minWidth: 120,
    alignItems: 'center',
  },
  runAllButtonDisabled: {opacity: 0.6},
  runAllText: {color: '#fff', fontWeight: '700', fontSize: 14},
  summary: {fontSize: 13},

  list: {flex: 1, paddingHorizontal: 12},

  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  serverTag: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  serverTagText: {fontSize: 11, fontWeight: '700'},
  statusArea: {flexDirection: 'row', alignItems: 'center', gap: 6},
  statusIcon: {fontSize: 18, fontWeight: '700'},
  ms: {fontSize: 11, color: '#9ca3af'},

  endpointRow: {flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4},
  methodBadge: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  methodGet: {backgroundColor: '#dcfce7'},
  methodPost: {backgroundColor: '#fef9c3'},
  methodText: {fontSize: 11, fontWeight: '700', color: '#374151'},
  endpoint: {fontSize: 13, fontWeight: '600', color: '#1f2937', flex: 1},
  description: {fontSize: 12, color: '#9ca3af', marginBottom: 10},

  cardActions: {flexDirection: 'row', gap: 8},
  runButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 8,
  },
  runButtonDisabled: {opacity: 0.5},
  runButtonText: {color: '#fff', fontWeight: '600', fontSize: 13},
  toggleButton: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  toggleButtonText: {color: '#6b7280', fontSize: 13},

  preview: {
    marginTop: 10,
    borderRadius: 8,
    padding: 10,
  },
  previewOk: {backgroundColor: '#f0fdf4'},
  previewError: {backgroundColor: '#fef2f2'},
  previewText: {fontSize: 11, color: '#374151', fontFamily: 'monospace'},
});

export default ApiTestScreen;
