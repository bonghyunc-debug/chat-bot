import { GroundingMetadata, Chat } from '@google/genai';

export type MessageRole = 'user' | 'model' | 'system' | 'error';
export type AttachmentCategory = 'image' | 'video' | 'audio' | 'pdf' | 'text';

export interface Attachment {
  id: string;
  name: string;
  mimeType: string;
  data: string;
  category: AttachmentCategory;
}

export interface UsageMetadata {
  promptTokenCount: number;
  candidatesTokenCount: number;
  totalTokenCount: number;
}

export interface ThoughtSupportingPart {
  thought?: unknown;
  inlineData?: { mimeType: string; data: string };
  text?: string;
  executableCode?: { language: string; code: string };
  codeExecutionResult?: { outcome: string; output?: string };
  functionCall?: { name: string; args: Record<string, unknown> };
  functionResponse?: { name: string; response: Record<string, unknown> };
}

export interface FunctionCallResult {
  name: string;
  args: Record<string, unknown>;
  result?: unknown;
  error?: string;
}

export interface ImageEditRequest {
  type: 'inpaint' | 'outpaint' | 'style' | 'enhance';
  maskData?: string;
  prompt?: string;
  style?: string;
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  thinking?: string;
  thoughts?: string;
  groundingMetadata?: GroundingMetadata;
  usageMetadata?: UsageMetadata;
  isLoading?: boolean;
  isStreaming?: boolean;
  edited?: boolean;
  error?: string;
  attachments?: Attachment[];
  functionCalls?: FunctionCallResult[];
  metadata?: {
    model?: string;
    usageMetadata?: UsageMetadata;
    groundingMetadata?: GroundingMetadata;
  };
  modelAttachment?: {
    data: string;
    mimeType: string;
  };
  previousVersions?: Array<{
    content: string;
    timestamp: number;
  }>;
}

export interface ContentPart {
  text?: string;
  inlineData?: { mimeType: string; data: string };
  functionCall?: { name: string; args: Record<string, unknown> };
  functionResponse?: { name: string; response: Record<string, unknown> };
  executableCode?: { language: string; code: string };
  codeExecutionResult?: { outcome: string; output?: string };
}

export interface ChatHistoryItem {
  role: 'user' | 'model';
  parts: ContentPart[];
}

export interface ToolFunctionDefinition {
  name: string;
  description?: string;
  parameters?: any;
}

export interface ToolSettings {
  enableFunctionCalling?: boolean;
  functions?: ToolFunctionDefinition[];
  enableCodeExecution?: boolean;
  enableUrlGrounding?: boolean;
  enableImageEditing?: boolean;
}

export interface ChatSettings {
  model: string;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  thinkingBudget?: number;
  showThoughts?: boolean;
  useGoogleSearch: boolean;
  toolSettings?: ToolSettings;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  lastModified: number;
  settings?: ChatSettings;
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

export interface SystemPromptPreset {
  id: string;
  name: string;
  description?: string;
  instruction: string;
}

export interface StreamCallbacks {
  onMessageUpdate: (messageId: string, updates: Partial<ChatMessage>) => void;
  onAddMessage: (message: ChatMessage) => void;
  onError: (error: Error) => void;
}

export interface UseChatStreamReturn {
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
  isStreaming: boolean;
  startStream: () => void;
  stopStream: () => void;
  streamController: AbortController | null;
}
