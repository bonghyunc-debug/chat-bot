import { describe, expect, beforeEach, it, vi } from 'vitest';
import {
  DEFAULT_JSON_MODE,
  DEFAULT_MAX_OUTPUT_TOKENS,
  DEFAULT_MODEL_ID,
  DEFAULT_SAFETY_SETTING,
  DEFAULT_SHOW_THOUGHTS,
  DEFAULT_SYSTEM_INSTRUCTION,
  DEFAULT_TEMPERATURE,
  DEFAULT_TOOL_SETTINGS,
  DEFAULT_TOP_K,
  DEFAULT_TOP_P,
  DEFAULT_USE_GOOGLE_SEARCH,
  STORAGE_KEYS,
} from '../constants';
import { persistSessionsWithLimits, loadPersistedSessions } from './sessionStorage';
import { ChatSession } from '../types';

const buildSession = (id: string, content: string, lastModified: number): ChatSession => ({
  id,
  title: `세션-${id}`,
  lastModified,
  messages: [
    {
      id: `${id}-msg-1`,
      role: 'user',
      content,
      timestamp: new Date(),
    },
  ],
  settings: {
    modelId: DEFAULT_MODEL_ID,
    systemInstruction: DEFAULT_SYSTEM_INSTRUCTION,
    temperature: DEFAULT_TEMPERATURE,
    topP: DEFAULT_TOP_P,
    topK: DEFAULT_TOP_K,
    maxOutputTokens: DEFAULT_MAX_OUTPUT_TOKENS,
    showThoughts: DEFAULT_SHOW_THOUGHTS,
    useGoogleSearch: DEFAULT_USE_GOOGLE_SEARCH,
    jsonMode: DEFAULT_JSON_MODE,
    safetySettings: DEFAULT_SAFETY_SETTING,
    stopSequences: [],
    toolSettings: DEFAULT_TOOL_SETTINGS,
  },
});

describe('sessionStorage', () => {
  const mockStorage = new Map<string, string>();

  beforeEach(() => {
    mockStorage.clear();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => mockStorage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        mockStorage.set(key, value);
      },
      removeItem: (key: string) => {
        mockStorage.delete(key);
      },
      clear: () => mockStorage.clear(),
      key: (index: number) => Array.from(mockStorage.keys())[index] ?? null,
      get length() {
        return mockStorage.size;
      },
    });
  });

  it('PII 문자열을 마스킹하여 저장한다', () => {
    const session = buildSession('1', '이메일은 test@example.com 입니다.', Date.now());
    const result = persistSessionsWithLimits([session], { limitBytes: 1024 * 1024 });

    expect(result.piiDetected).toBe(true);
    const stored = mockStorage.get(STORAGE_KEYS.SESSIONS) ?? '';
    expect(stored).not.toContain('test@example.com');
    expect(stored).toContain('[민감정보 제거]');
  });

  it('저장 한도를 초과하면 오래된 세션을 제거한다', () => {
    const bigMessage = 'x'.repeat(1200);
    const recent = buildSession('recent', '짧은 메시지', Date.now());
    const old = buildSession('old', bigMessage.repeat(3), Date.now() - 1000);

    const result = persistSessionsWithLimits([old, recent], { limitBytes: 1024 });

    expect(result.removedCount).toBe(1);
    expect(result.trimmedSessions).toHaveLength(1);
    expect(result.trimmedSessions[0].id).toBe('recent');
  });

  it('저장된 세션을 안전하게 역직렬화한다', () => {
    const session = buildSession('deser', '내용', Date.now());
    persistSessionsWithLimits([session], { limitBytes: 1024 * 1024 });

    const loaded = loadPersistedSessions();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].messages[0].timestamp instanceof Date).toBe(true);
  });
});
