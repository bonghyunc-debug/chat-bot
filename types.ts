
import { Chat, Part, GroundingMetadata } from "@google/genai";

export type CopyFormat = 'plain' | 'markdown' | 'html';

// 안전 설정 타입
export type SafetyThreshold = 
  | 'BLOCK_NONE' 
  | 'BLOCK_LOW_AND_ABOVE' 
  | 'BLOCK_MEDIUM_AND_ABOVE' 
  | 'BLOCK_ONLY_HIGH';

// 메시지 역할 타입
export type MessageRole = 'user' | 'model' | 'error';

// 첨부 파일 카테고리 타입
export type AttachmentCategory = 'image' | 'video' | 'audio' | 'pdf' | 'text';

export interface Attachment {
  id: string;
  name: string;
  mimeType: string;
  data: string; // Base64 string for binary, raw string for text
  category: AttachmentCategory;
}

export interface UsageMetadata {
  promptTokenCount: number;
  candidatesTokenCount: number;
  totalTokenCount: number;
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  thoughts?: string;
  groundingMetadata?: GroundingMetadata;
  usageMetadata?: UsageMetadata; // Token usage info
  isLoading?: boolean;
  attachments?: Attachment[]; // Replaces single 'image' field
  
  // Attachment for model generated content (e.g. generated images)
  modelAttachment?: {
    data: string;
    mimeType: string;
  };
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  lastModified: number;
  settings: ChatSettings;
}

export interface ModelOption {
  id: string;
  name: string;
  description?: string;
  tags?: string[];
  isVision?: boolean;
  isReasoning?: boolean;
  isFast?: boolean;
}

export interface ContentPart {
  text?: string;
  inlineData?: { mimeType: string; data: string };
  functionCall?: { name: string; args: Record<string, any> };
  functionResponse?: { name: string; response: Record<string, any> };
  executableCode?: { language: string; code: string };
  codeExecutionResult?: { outcome: string; output?: string };
}

export interface ChatHistoryItem {
  role: 'user' | 'model';
  parts: ContentPart[];
}

export interface SafetySetting {
  category: string;
  threshold: string;
}

export interface SystemPromptPreset {
  id: string;
  name: string;
  description?: string;
  instruction: string;
}

export interface ToolFunctionDefinition {
  name: string;
  description?: string;
  parameters?: any; // JSON Schema
}

export interface ToolSettings {
  enableFunctionCalling: boolean;
  functions: ToolFunctionDefinition[];
  enableCodeExecution: boolean;
  enableUrlGrounding: boolean;
}

export interface ChatSettings {
  modelId: string;
  systemInstruction: string;
  temperature: number;
  topP: number;
  topK: number;
  maxOutputTokens: number;
  showThoughts: boolean;
  useGoogleSearch: boolean;
  jsonMode: boolean; // For responseMimeType: application/json
  safetySettings: SafetyThreshold; // Simplified for UI: 'BLOCK_NONE' | 'BLOCK_ONLY_HIGH' etc.
  stopSequences: string[];
  toolSettings?: ToolSettings;
}

export interface GeminiService {
  initializeChat: (
    modelId: string,
    settings: ChatSettings,
    history?: ChatHistoryItem[],
    apiKey?: string 
  ) => Promise<Chat | null>;
  sendMessageStream: (
    chat: Chat,
    message: string,
    attachments: Attachment[], // Updated to support array of attachments
    onChunk: (chunk: string) => void,
    onThoughtChunk: (chunk: string) => void,
    onGroundingMetadata: (metadata: GroundingMetadata) => void,
    onUsageMetadata: (usage: UsageMetadata) => void, // New callback
    onImageGenerated: (image: { data: string; mimeType: string }) => void,
    onError: (error: Error) => void,
    onComplete: () => void,
    abortSignal?: AbortSignal
  ) => Promise<void>;
  getAvailableModels: (apiKey?: string) => Promise<ModelOption[]>;
  countTokens: (modelId: string, apiKey: string | undefined, contents: any[]) => Promise<number | null>;
}

export interface ThoughtSupportingPart extends Part {
    thought?: any;
    inlineData?: { mimeType: string; data: string };
    text?: string;
}

export interface PromptTemplate {
  id: string;
  name: string;
  content: string;
  category?: string;
  createdAt: number;
}
