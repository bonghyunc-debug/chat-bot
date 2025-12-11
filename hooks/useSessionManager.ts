import { useCallback, useMemo, useState, useEffect } from 'react';
import type { ChatMessage, ChatSession } from '../types';

const STORAGE_KEY = 'gemini_sessions';

const createEmptySession = (): ChatSession => ({
  id: crypto.randomUUID(),
  title: 'New Chat',
  messages: [],
  lastModified: Date.now(),
});

export const useSessionManager = () => {
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [createEmptySession()];
  });
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  }, [sessions]);

  const currentSession = useMemo(
    () => sessions.find(s => s.id === (currentSessionId || sessions[0]?.id)) || sessions[0],
    [sessions, currentSessionId]
  );

  const updateSessionMessages = useCallback((sessionId: string, updater: (messages: ChatMessage[]) => ChatMessage[]) => {
    setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, messages: updater(s.messages), lastModified: Date.now() } : s));
  }, []);

  const createSession = useCallback(() => {
    const newSession = createEmptySession();
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
    return newSession.id;
  }, []);

  const selectSession = useCallback((sessionId: string) => {
    setCurrentSessionId(sessionId);
  }, []);

  const deleteSession = useCallback((sessionId: string) => {
    setSessions(prev => prev.filter(s => s.id !== sessionId));
    if (currentSessionId === sessionId) {
      setCurrentSessionId(null);
    }
  }, [currentSessionId]);

  const updateSessionTitle = useCallback((sessionId: string, title: string) => {
    setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, title, lastModified: Date.now() } : s));
  }, []);

  const addMessage = useCallback((message: ChatMessage) => {
    const targetId = currentSession?.id || createSession();
    updateSessionMessages(targetId, messages => [...messages, message]);
  }, [currentSession, createSession, updateSessionMessages]);

  const updateMessage = useCallback((messageId: string, updates: Partial<ChatMessage>) => {
    const targetId = currentSession?.id;
    if (!targetId) return;
    updateSessionMessages(targetId, messages => messages.map(m => m.id === messageId ? { ...m, ...updates } : m));
  }, [currentSession, updateSessionMessages]);

  const importSessions = useCallback((imported: ChatSession[]) => {
    setSessions(prev => [...imported, ...prev]);
  }, []);

  const exportSessions = useCallback(() => {
    const dataStr = JSON.stringify(sessions, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gemini-chat-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [sessions]);

  return {
    sessions,
    currentSession,
    currentSessionId: currentSession?.id || currentSessionId,
    createSession,
    selectSession,
    deleteSession,
    updateSessionTitle,
    addMessage,
    updateMessage,
    importSessions,
    exportSessions,
    updateSessionMessages,
    setSessions,
    setCurrentSessionId,
  };
};
