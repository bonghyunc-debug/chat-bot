import { STORAGE_KEYS, DEFAULT_MODEL_ID, DEFAULT_SYSTEM_INSTRUCTION, DEFAULT_TEMPERATURE, DEFAULT_TOP_P, DEFAULT_TOP_K, DEFAULT_MAX_OUTPUT_TOKENS, DEFAULT_SHOW_THOUGHTS, DEFAULT_USE_GOOGLE_SEARCH, DEFAULT_JSON_MODE, DEFAULT_SAFETY_SETTING, DEFAULT_STOP_SEQUENCES, DEFAULT_TOOL_SETTINGS } from '../constants';
import { ChatMessage, ChatSession, ChatSettings } from '../types';

export const SESSION_STORAGE_LIMIT_BYTES = 5 * 1024 * 1024; // 5MB 안전 상한

const textEncoder = new TextEncoder();

const PII_PATTERNS: RegExp[] = [
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
  /\b\d{2,3}-\d{3,4}-\d{4}\b/g,
  /\b\d{3}-\d{2}-\d{4}\b/g,
];

const buildDefaultSettings = (): ChatSettings => ({
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
  stopSequences: DEFAULT_STOP_SEQUENCES,
  toolSettings: DEFAULT_TOOL_SETTINGS,
});

const sanitizeContent = (content: string): { sanitized: string; piiDetected: boolean } => {
  let sanitized = content;
  let piiDetected = false;
  PII_PATTERNS.forEach((pattern) => {
    if (pattern.test(sanitized)) {
      piiDetected = true;
      sanitized = sanitized.replace(pattern, '[민감정보 제거]');
    }
  });
  return { sanitized, piiDetected };
};

const sanitizeMessages = (messages: ChatMessage[]): { sanitized: ChatMessage[]; piiDetected: boolean } => {
  let piiDetected = false;
  const sanitizedMessages = messages.map((message) => {
    if (!message.content) return message;
    const { sanitized, piiDetected: messageDetected } = sanitizeContent(message.content);
    piiDetected = piiDetected || messageDetected;
    return { ...message, content: sanitized };
  });
  return { sanitized: sanitizedMessages, piiDetected };
};

const encodeSize = (payload: unknown, limitBytes: number) => {
  const serialized = JSON.stringify(payload);
  return {
    serialized,
    size: textEncoder.encode(serialized).length,
    exceeds: textEncoder.encode(serialized).length > limitBytes,
  };
};

export interface PersistResult {
  trimmedSessions: ChatSession[];
  removedCount: number;
  piiDetected: boolean;
  storageBytes: number;
}

export const loadPersistedSessions = (): ChatSession[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.SESSIONS);
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    return parsed.map((session: any) => ({
      ...session,
      messages: (session.messages || []).map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) })),
      settings: {
        modelId: session.settings?.modelId || DEFAULT_MODEL_ID,
        systemInstruction: session.settings?.systemInstruction ?? DEFAULT_SYSTEM_INSTRUCTION,
        temperature: session.settings?.temperature ?? DEFAULT_TEMPERATURE,
        topP: session.settings?.topP ?? DEFAULT_TOP_P,
        topK: session.settings?.topK ?? DEFAULT_TOP_K,
        maxOutputTokens: session.settings?.maxOutputTokens ?? DEFAULT_MAX_OUTPUT_TOKENS,
        showThoughts: session.settings?.showThoughts ?? DEFAULT_SHOW_THOUGHTS,
        useGoogleSearch: session.settings?.useGoogleSearch ?? DEFAULT_USE_GOOGLE_SEARCH,
        jsonMode: session.settings?.jsonMode ?? DEFAULT_JSON_MODE,
        safetySettings: session.settings?.safetySettings ?? DEFAULT_SAFETY_SETTING,
        stopSequences: session.settings?.stopSequences ?? DEFAULT_STOP_SEQUENCES,
        toolSettings: session.settings?.toolSettings ?? DEFAULT_TOOL_SETTINGS,
      },
    }));
  } catch (error) {
    console.error('세션 로드에 실패했습니다.', error);
    return [];
  }
};

export const persistSessionsWithLimits = (
  sessions: ChatSession[],
  options?: { limitBytes?: number },
): PersistResult => {
  const limitBytes = options?.limitBytes ?? SESSION_STORAGE_LIMIT_BYTES;
  const sessionsByRecency = [...sessions].sort((a, b) => b.lastModified - a.lastModified);
  let workingSet = sessionsByRecency.map((session) => ({ ...session }));
  let removedCount = 0;
  let piiDetected = false;

  const buildPayload = (input: ChatSession[]) => {
    const sanitizedSessions = input.map((session) => {
      const { sanitized, piiDetected: messagePii } = sanitizeMessages(session.messages || []);
      piiDetected = piiDetected || messagePii;
      return { ...session, messages: sanitized };
    });
    return sanitizedSessions;
  };

  let payload = buildPayload(workingSet);
  let { size, serialized } = encodeSize(payload, limitBytes);

  while (size > limitBytes && workingSet.length > 0) {
    workingSet.pop();
    removedCount += 1;
    payload = buildPayload(workingSet);
    ({ size, serialized } = encodeSize(payload, limitBytes));
  }

  try {
    localStorage.setItem(STORAGE_KEYS.SESSIONS, serialized);
  } catch (error) {
    console.error('세션 저장에 실패했습니다.', error);
  }

  return {
    trimmedSessions: removedCount > 0 ? workingSet : sessions,
    removedCount,
    piiDetected,
    storageBytes: size,
  };
};

export const buildDefaultSession = (): ChatSession => ({
  id: Date.now().toString(),
  title: '새 채팅',
  messages: [],
  lastModified: Date.now(),
  settings: buildDefaultSettings(),
});
