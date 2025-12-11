import type { Attachment, ChatMessage, ModelOption } from '../types';
import { AVAILABLE_MODELS } from '../constants';

interface SendOptions {
  attachments?: Attachment[];
  signal?: AbortSignal;
  onChunk?: (chunk: { text?: string; thinking?: string }) => void;
  onThoughtChunk?: (chunk: string) => void;
  onGroundingMetadata?: (metadata: any) => void;
  onUsageMetadata?: (usage: any) => void;
  onImageGenerated?: (image: { data: string; mimeType: string }) => void;
  onFunctionCall?: (fc: { name: string; args: Record<string, unknown> }) => void;
  onError?: (error: Error) => void;
  onComplete?: (result: { usageMetadata?: any; groundingMetadata?: any }) => void;
}

export const initializeChat = async (apiKey: string, settings: Record<string, any>) => {
  // Placeholder chat session object
  return { apiKey, settings } as any;
};

export const sendMessageStream = async (
  chat: any,
  message: string,
  options: SendOptions
) => {
  try {
    options.onChunk?.({ text: '응답 생성 중...' });
    options.onComplete?.({ usageMetadata: null, groundingMetadata: null });
  } catch (error) {
    options.onError?.(error as Error);
  }
};

export const generateChatTitle = async (
  apiKey: string,
  messages: ChatMessage[]
): Promise<string> => {
  const lastUser = [...messages].reverse().find(m => m.role === 'user');
  return lastUser ? lastUser.content.slice(0, 30) || '새 채팅' : '새 채팅';
};

export const getAvailableModels = async (_apiKey: string): Promise<ModelOption[]> => {
  return AVAILABLE_MODELS;
};
