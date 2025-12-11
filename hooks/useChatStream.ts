import { useState, useRef, useCallback } from 'react';
import type { UseChatStreamReturn } from '../types';

export const useChatStream = (): UseChatStreamReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [chatSession, setChatSession] = useState<any>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const startStream = useCallback(() => {
    abortControllerRef.current = new AbortController();
    setIsLoading(true);
  }, []);

  const stopGeneration = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setIsLoading(false);
  }, []);

  const stopStream = useCallback(() => {
    stopGeneration();
  }, [stopGeneration]);

  const resetChatSession = useCallback(() => {
    setChatSession(null);
  }, []);

  const streamResponse = async () => {
    // Deprecated in new flow
    return;
  };

  return {
    isLoading,
    chatSession,
    streamResponse,
    stopGeneration,
    resetChatSession,
    isStreaming: isLoading,
    startStream,
    stopStream,
    streamController: abortControllerRef.current,
  };
};
