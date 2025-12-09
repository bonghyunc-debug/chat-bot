
import { ModelOption, ChatSettings, SystemPromptPreset, ToolSettings } from './types';

// Updated default model to Gemini 3.0 Pro Preview
export const DEFAULT_MODEL_ID = 'gemini-3-pro-preview'; 
export const DEFAULT_SYSTEM_INSTRUCTION = "당신은 유용하고 친절한 AI 어시스턴트입니다."; 

export const DEFAULT_TEMPERATURE = 0.7;
export const DEFAULT_TOP_P = 0.95;
export const DEFAULT_TOP_K = 40;
export const DEFAULT_MAX_OUTPUT_TOKENS = 8192;

// Default to TRUE as requested
export const DEFAULT_SHOW_THOUGHTS = true;

// Default to TRUE as requested
export const DEFAULT_USE_GOOGLE_SEARCH = true;

export const DEFAULT_JSON_MODE = false;
export const DEFAULT_SAFETY_SETTING = 'BLOCK_MEDIUM_AND_ABOVE'; 
export const DEFAULT_STOP_SEQUENCES: string[] = [];

export const DEFAULT_TOOL_SETTINGS: ToolSettings = {
  enableFunctionCalling: false,
  functions: [],
  enableCodeExecution: false,
  enableUrlGrounding: false,
};

// New Presets
export type SettingsPresetId = 'balanced' | 'coding' | 'brainstorm' | 'json';

export const SETTINGS_PRESETS: Record<SettingsPresetId, Partial<ChatSettings>> = {
  balanced: {
    temperature: 0.7,
    topP: 0.9,
    topK: 40,
    jsonMode: false,
    useGoogleSearch: true,
    showThoughts: false,
  },
  coding: {
    temperature: 0.2,
    topP: 0.8,
    topK: 32,
    jsonMode: false,
    useGoogleSearch: false,
    showThoughts: true,
  },
  brainstorm: {
    temperature: 0.9,
    topP: 0.95,
    topK: 64,
    jsonMode: false,
    useGoogleSearch: true,
    showThoughts: true,
  },
  json: {
    temperature: 0.3,
    topP: 0.8,
    topK: 32,
    jsonMode: true,
    useGoogleSearch: false,
    showThoughts: false,
  },
};

export const SYSTEM_PROMPT_PRESETS: SystemPromptPreset[] = [
  {
    id: 'general-assistant',
    name: '일반 어시스턴트',
    description: '간결하고 도움이 되는 AI',
    instruction: 'You are a helpful and concise AI assistant.',
  },
  {
    id: 'coding-assistant',
    name: '코딩 전문가',
    description: '코드 설명 및 개선 제안',
    instruction: 'You are an expert software engineer. Explain code and propose improvements with clear examples. Use markdown for code blocks.',
  },
  {
    id: 'translator-kr-en',
    name: '한영 번역기',
    description: '자연스러운 번역',
    instruction: 'Translate the following text into English. If it is already in English, translate it into Korean. Ensure the tone is natural and professional.',
  },
  {
    id: 'creative-writer',
    name: '창의적 글쓰기',
    description: '스토리텔링 및 아이디어',
    instruction: 'You are a creative writer. Generate engaging stories, vivid descriptions, and imaginative ideas.',
  },
  {
    id: 'summarizer',
    name: '요약 전문가',
    description: '핵심 내용 요약',
    instruction: 'You are an expert summarizer. Produce structured bullet point summaries and highlight key decisions or takeaways.',
  }
];
