// hooks/useChatStream.ts
import { useState, useRef, useCallback } from 'react';
import { Chat } from '@google/genai';
import { ChatMessage, ChatSettings, Attachment, ChatHistoryItem } from '../types';
import { geminiServiceInstance } from '../services/geminiService';
import { getHealthyApiKey } from '../services/apiKeyPool';

interface StreamCallbacks {
  onMessageUpdate: (messageId: string, updates: Partial<ChatMessage>) => void;
  onAddMessage: (message: ChatMessage) => void;
  onError: (error: Error) => void;
}

interface UseChatStreamReturn {
  isLoading: boolean;
  chatSession: Chat | null;
  streamResponse: (
    message: string,
    attachments: Attachment[],
    settings: ChatSettings,
    history: ChatHistoryItem[],
    callbacks: StreamCallbacks
  ) => Promise<void>;
  stopGeneration: () => void;
  resetChatSession: () => void;
}

export const useChatStream = (): UseChatStreamReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [chatSession, setChatSession] = useState<Chat | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const resetChatSession = useCallback(() => {
    setChatSession(null);
  }, []);

  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
    }
  }, []);

  const streamResponse = useCallback(async (
    message: string,
    attachments: Attachment[],
    settings: ChatSettings,
    history: ChatHistoryItem[],
    callbacks: StreamCallbacks
  ) => {
    abortControllerRef.current = new AbortController();
    const abortSignal = abortControllerRef.current.signal;
    setIsLoading(true);

    try {
      const apiKey = getHealthyApiKey();
      
      // 채팅 세션 초기화
      const chat = await geminiServiceInstance.initializeChat(
        settings.modelId,
        settings,
        history,
        apiKey
      );

      if (!chat) {
        callbacks.onError(new Error('모델 초기화에 실패했습니다.'));
        setIsLoading(false);
        return;
      }

      setChatSession(chat);

      // 모델 응답 메시지 생성
      const modelMessageId = (Date.now() + 1).toString();
      callbacks.onAddMessage({
        id: modelMessageId,
        role: 'model',
        content: '',
        thoughts: '',
        timestamp: new Date(),
        isLoading: true
      });

      // 스트리밍 시작
      await geminiServiceInstance.sendMessageStream(
        chat,
        message,
        attachments,
        (chunk) => {
          callbacks.onMessageUpdate(modelMessageId, { 
            content: chunk,
            isLoading: true 
          });
        },
        (thoughtChunk) => {
          callbacks.onMessageUpdate(modelMessageId, { 
            thoughts: thoughtChunk,
            isLoading: true 
          });
        },
        (metadata) => {
          callbacks.onMessageUpdate(modelMessageId, { 
            groundingMetadata: metadata 
          });
        },
        (usage) => {
          callbacks.onMessageUpdate(modelMessageId, { 
            usageMetadata: usage 
          });
        },
        (image) => {
          callbacks.onMessageUpdate(modelMessageId, { 
            modelAttachment: image 
          });
        },
        (error) => {
          callbacks.onMessageUpdate(modelMessageId, { 
            role: 'error',
            content: error.message,
            isLoading: false 
          });
          setIsLoading(false);
        },
        () => {
          callbacks.onMessageUpdate(modelMessageId, { isLoading: false });
          setIsLoading(false);
          abortControllerRef.current = null;
        },
        abortSignal
      );
    } catch (error) {
      callbacks.onError(error as Error);
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, []);

  return {
    isLoading,
    chatSession,
    streamResponse,
    stopGeneration,
    resetChatSession
  };
};
