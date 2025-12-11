import type { ChatSettings, ModelOption } from './types';

export const DEFAULT_SETTINGS: ChatSettings = {
  model: 'gemini-1.5-flash',
  systemPrompt: 'You are a helpful and concise assistant.',
  temperature: 0.7,
  maxTokens: 2048,
  thinkingBudget: 60000,
  showThoughts: true,
  useGoogleSearch: false,
  toolSettings: {
    enableFunctionCalling: true,
    functions: [],
    enableCodeExecution: false,
    enableUrlGrounding: false,
    enableImageEditing: false,
  },
};

export const SYSTEM_PROMPT_PRESETS: Record<string, string> = {
  default: 'You are a helpful and concise assistant.',
  coder: 'You are an expert software engineer. Provide clear, concise answers with examples.',
  analyst: 'You are a thoughtful analyst who explains reasoning before conclusions.',
};

export const MODEL_SPECS: Record<string, { contextWindow: string; maxOutput: number; inputPrice: number; outputPrice: number; capabilities: string[]; limitations: string[]; }> = {
  'gemini-1.5-flash': {
    contextWindow: '1M tokens',
    maxOutput: 8192,
    inputPrice: 0,
    outputPrice: 0,
    capabilities: ['Fast responses', 'Vision'],
    limitations: ['Preview features may change'],
  },
  'gemini-1.5-pro': {
    contextWindow: '2M tokens',
    maxOutput: 8192,
    inputPrice: 1.25,
    outputPrice: 5.0,
    capabilities: ['High quality responses', 'Reasoning', 'Vision'],
    limitations: ['Slower than Flash'],
  },
};

export const AVAILABLE_MODELS: ModelOption[] = [
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
];
