// hooks/useSessionManager.ts
import { useState, useCallback, useMemo, useEffect } from 'react';
import { ChatSession, ChatMessage, ChatSettings } from '../types';
import { DEFAULT_MODEL_ID, DEFAULT_SYSTEM_INSTRUCTION, DEFAULT_TEMPERATURE, DEFAULT_TOP_P, DEFAULT_TOP_K, DEFAULT_MAX_OUTPUT_TOKENS, DEFAULT_SHOW_THOUGHTS, DEFAULT_USE_GOOGLE_SEARCH, DEFAULT_JSON_MODE, DEFAULT_SAFETY_SETTING, DEFAULT_STOP_SEQUENCES, DEFAULT_TOOL_SETTINGS } from '../constants';
import { useLocalStorage } from './useLocalStorage';

const getDefaultSettings = (): ChatSettings => ({
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
  toolSettings: DEFAULT_TOOL_SETTINGS
});

const deserializeSessions = (json: string): ChatSession[] => {
  const parsed = JSON.parse(json);
  return parsed.map((s: any) => ({
    ...s,
    messages: s.messages.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }))
  }));
};

export const useSessionManager = () => {
  const [sessions, setSessions] = useLocalStorage<ChatSession[]>(
    'gemini_chat_sessions',
    [],
    { deserialize: deserializeSessions }
  );
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(() => {
    if (sessions.length > 0) {
      const sorted = [...sessions].sort((a, b) => b.lastModified - a.lastModified);
      return sorted[0]?.id ?? null;
    }
    return null;
  });

  const currentSession = useMemo(() => 
    sessions.find(s => s.id === currentSessionId) ?? null,
    [sessions, currentSessionId]
  );

  const currentMessages = useMemo(() => 
    currentSession?.messages ?? [],
    [currentSession]
  );

  const createNewSession = useCallback((settings?: ChatSettings) => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: '새 채팅',
      messages: [],
      lastModified: Date.now(),
      settings: settings ?? getDefaultSettings()
    };
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
    return newSession.id;
  }, [setSessions]);

  const deleteSession = useCallback((sessionId: string) => {
    setSessions(prev => {
      const newSessions = prev.filter(s => s.id !== sessionId);
      if (currentSessionId === sessionId) {
        const nextSession = newSessions[0];
        setCurrentSessionId(nextSession?.id ?? null);
      }
      return newSessions;
    });
  }, [setSessions, currentSessionId]);

  const renameSession = useCallback((sessionId: string, newTitle: string) => {
    setSessions(prev => prev.map(s =>
      s.id === sessionId ? { ...s, title: newTitle } : s
    ));
  }, [setSessions]);

  const updateSessionMessages = useCallback((
    sessionId: string,
    updateFn: (messages: ChatMessage[]) => ChatMessage[]
  ) => {
    setSessions(prev => prev.map(s => {
      if (s.id === sessionId) {
        const newMessages = updateFn(s.messages);
        return { ...s, messages: newMessages, lastModified: Date.now() };
      }
      return s;
    }));
  }, [setSessions]);

  const updateSessionSettings = useCallback((sessionId: string, settings: ChatSettings) => {
    setSessions(prev => prev.map(s =>
      s.id === sessionId ? { ...s, settings } : s
    ));
  }, [setSessions]);

  const updateSessionTitle = useCallback((sessionId: string, title: string) => {
    setSessions(prev => prev.map(s =>
      s.id === sessionId ? { ...s, title } : s
    ));
  }, [setSessions]);

  // 세션 유효성 검증 및 복구
  const validateAndRecoverSessions = useCallback(() => {
    setSessions(prev => {
      const validSessions = prev.filter(session => {
        // 필수 필드 검증
        if (!session.id || !session.title || !Array.isArray(session.messages)) {
          console.warn(`Invalid session detected: ${session.id}`);
          return false;
        }
        return true;
      }).map(session => ({
        ...session,
        // 누락된 필드 복구
        lastModified: session.lastModified || Date.now(),
        settings: session.settings || getDefaultSettings(),
        messages: session.messages.map(msg => ({
          ...msg,
          timestamp: msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp),
          id: msg.id || `recovered-${Date.now()}-${Math.random().toString(36).slice(2)}`
        }))
      }));

      return validSessions;
    });
  }, [setSessions]);

  // 컴포넌트 마운트 시 세션 검증
  useEffect(() => {
    validateAndRecoverSessions();
  }, []);

  return {
    sessions,
    setSessions,
    currentSessionId,
    setCurrentSessionId,
    currentSession,
    currentMessages,
    createNewSession,
    deleteSession,
    renameSession,
    updateSessionMessages,
    updateSessionSettings,
    updateSessionTitle,
    validateAndRecoverSessions
  };
};
