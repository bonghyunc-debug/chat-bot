
import { GoogleGenAI, Chat, Part, GroundingMetadata } from "@google/genai";
import { GeminiService, ChatHistoryItem, ThoughtSupportingPart, ModelOption, ChatSettings, Attachment, UsageMetadata } from '../types';
import { reportApiKeyError } from './apiKeyPool';
import { GeminiServiceError, parseGeminiError } from './errors';

// Default env key as fallback (supports Vite and Node-style envs)
const ENV_API_KEY =
  import.meta.env?.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || process.env.API_KEY;

// Helper to create client with specific key
const getClient = (apiKey?: string) => {
    const key = apiKey || ENV_API_KEY;
    if (!key) {
        throw new Error("API 키가 설정되지 않았습니다. 설정 패널에서 키를 추가하거나 환경 변수를 확인하세요.");
    }
    return new GoogleGenAI({ apiKey: key });
};

const geminiServiceImpl: GeminiService = {
  getAvailableModels: async (apiKey?: string): Promise<ModelOption[]> => {
    // 1. Define Static Fallback Models (Enhanced with metadata)
    const staticModels: ModelOption[] = [
      {
        id: 'gemini-3-pro-preview',
        name: 'Gemini 3.0 Pro',
        description: 'Reasoning & Coding 특화, 복잡한 작업에 최적화된 최신 모델',
        tags: ['Reasoning', 'Coding', 'Preview'],
        isReasoning: true,
        isVision: true,
      },
      {
        id: 'gemini-2.5-flash',
        name: 'Gemini 2.5 Flash',
        description: '빠른 응답 속도와 균형 잡힌 성능을 제공하는 모델',
        tags: ['Balanced', 'Fast', 'General'],
        isFast: true,
        isVision: true,
      },
      {
        id: 'gemini-2.5-pro',
        name: 'Gemini 2.5 Pro',
        description: '복잡한 문제 해결, 코드, 수학, STEM 추론에 최적화된 고급 사고 모델',
        tags: ['Reasoning', 'Long Context', 'Stable'],
        isReasoning: true,
        isVision: true,
      },
      {
        id: 'gemini-2.5-flash-lite',
        name: 'Gemini 2.5 Flash Lite',
        description: '매우 빠른 속도와 비용 효율성을 중시하는 모델',
        tags: ['Fastest', 'Lite'],
        isFast: true,
        isVision: true,
      },
      {
        id: 'gemini-3-pro-image-preview',
        name: 'Gemini 3.0 Pro Image',
        description: '고품질 이미지 생성 및 처리가 가능한 멀티모달 모델',
        tags: ['Media', 'High Quality'],
        isVision: true,
      },
      {
         id: 'gemini-2.5-flash-image',
         name: 'Gemini 2.5 Flash Image',
         description: '빠른 이미지 생성 및 처리를 지원하는 모델',
         tags: ['Media', 'Fast'],
         isVision: true,
         isFast: true,
      }
    ];

    try {
        const ai = getClient(apiKey);
        // 2. Fetch models dynamically from API
        const response = await ai.models.list();
        const responseModels = (response as any).models ?? [];

        if (responseModels.length === 0) {
            return staticModels;
        }

        // 3. Filter and Map API response
        const dynamicModels = responseModels
            .filter(m => {
                const name = m.name?.toLowerCase() || '';
                // Gemini 3, 2.5, 2.0 시리즈 포함 (1.5는 deprecated로 제외)
                return name.includes('gemini-3') ||
                       name.includes('gemini-2.5') ||
                       name.includes('gemini-2.0');
            })
            .map(m => {
                // Remove 'models/' prefix if present
                const rawId = m.name || '';
                const id = rawId.startsWith('models/') ? rawId.replace('models/', '') : rawId;
                
                // Determine characteristics based on ID and metadata
                const isVision = m.inputModalities?.includes('IMAGE') || id.includes('image') || id.includes('vision');
                const isReasoning = id.includes('pro') || id.includes('thinking');
                const isFast = id.includes('flash') || id.includes('lite');
                
                // Determine simplified tags
                const tags: string[] = [];
                if (isReasoning) tags.push('Reasoning');
                if (isFast) tags.push('Fast');
                if (isVision) tags.push('Vision');
                if (id.includes('preview')) tags.push('Preview');

                // Determine display name
                let displayName = m.displayName || id;
                // Cleanup display name if it's too raw
                if (displayName === id) {
                    displayName = id.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
                }

                return {
                    id: id,
                    name: displayName,
                    description: m.description || 'Google DeepMind의 최신 생성형 AI 모델',
                    tags: tags,
                    isVision,
                    isReasoning,
                    isFast
                };
            });

        // If filtering resulted in empty list, revert to static
        return dynamicModels.length > 0 ? dynamicModels : staticModels;

    } catch (e) {
        console.warn("Failed to list models from API, using static fallback.", e);
        if (apiKey) reportApiKeyError(apiKey);
        return staticModels;
    }
  },

  countTokens: async (
    modelId: string,
    apiKey: string | undefined,
    contents: any[],
  ): Promise<number | null> => {
    const key = apiKey || ENV_API_KEY;
    if (!key) return null;

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:countTokens`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': key,
          },
          body: JSON.stringify({ contents }),
        },
      );

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return data.totalTokens ?? null;
    } catch (e) {
      return null;
    }
  },

  initializeChat: async (
    modelId: string,
    settings: ChatSettings,
    history?: ChatHistoryItem[],
    apiKey?: string
  ): Promise<Chat | null> => {
    try {
      const ai = getClient(apiKey);
      const validHistory = history?.filter(item => item.role === 'user' || item.role === 'model');

      const finalSystemInstruction = settings.systemInstruction || undefined;
      
      const isImageModel = modelId.toLowerCase().includes('image');

      interface ThinkingConfig {
        includeThoughts?: boolean;
        thinkingBudget?: number;
        thinkingLevel?: 'low' | 'medium' | 'high';
      }

      // 이미지 모델은 최대 출력 토큰이 32,768로 제한됨
      const effectiveMaxOutputTokens = isImageModel 
        ? Math.min(settings.maxOutputTokens, 32768)
        : settings.maxOutputTokens;

      const chatConfig: {
        systemInstruction?: string;
        temperature?: number;
        topP?: number;
        topK?: number;
        maxOutputTokens?: number;
        responseMimeType?: string;
        stopSequences?: string[];
        safetySettings?: { category: string; threshold: string }[];
        thinkingConfig?: ThinkingConfig;
        tools?: any[];
        imageConfig?: { aspectRatio?: string; imageSize?: string };
      } = {
        systemInstruction: finalSystemInstruction,
        temperature: settings.temperature,
        topP: settings.topP,
        topK: settings.topK,
        maxOutputTokens: effectiveMaxOutputTokens,
        stopSequences: settings.stopSequences.length > 0 ? settings.stopSequences : undefined,
      };

      // Search Tool Configuration
      // Rule: Do NOT set responseMimeType when using googleSearch.
      const shouldUseSearchTool = settings.useGoogleSearch && !settings.jsonMode;

      if (shouldUseSearchTool) {
         // Create tools array if it doesn't exist
         if (!chatConfig.tools) chatConfig.tools = [];
         chatConfig.tools.push({ googleSearch: {} });
      }

      // JSON Mode Configuration
      // Only enable if NOT an image model AND Search is NOT enabled
      const shouldUseJsonMode = settings.jsonMode && !isImageModel && !shouldUseSearchTool;

      if (shouldUseJsonMode) {
          chatConfig.responseMimeType = 'application/json';
      }

      // Handle Safety Settings
      if (settings.safetySettings) {
          const categories = [
              'HARM_CATEGORY_HARASSMENT',
              'HARM_CATEGORY_HATE_SPEECH',
              'HARM_CATEGORY_SEXUALLY_EXPLICIT',
              'HARM_CATEGORY_DANGEROUS_CONTENT'
          ];
          
          chatConfig.safetySettings = categories.map(category => ({
              category,
              threshold: settings.safetySettings
          }));
      }

      // Thinking Config Logic
      if (!isImageModel) {
        if (settings.showThoughts) {
          // 3.x 계열 (예: gemini-3-pro-preview): thinkingLevel + includeThoughts 사용
          if (modelId.startsWith('gemini-3-')) {
             chatConfig.thinkingConfig = {
                 includeThoughts: true,
                 thinkingLevel: 'high' // Gemini 3 Pro 싱킹 레벨 High 고정
             };
          } else {
             // 2.5 계열: Gemini 2.5 Pro는 더 높은 budget 지원
             let budget = 8192;

             if (modelId.includes('2.5-pro')) {
                 budget = 16384; // Gemini 2.5 Pro는 더 긴 사고 가능
             } else if (modelId.includes('pro') || modelId.includes('thinking')) {
                 budget = 8192;
             }

             if (settings.maxOutputTokens) {
                 const maxAllowed = Math.floor(settings.maxOutputTokens * 0.8);
                 if (budget > maxAllowed) budget = maxAllowed;
             }
             
             chatConfig.thinkingConfig = {
                 includeThoughts: true,
                 thinkingBudget: budget
             };
          }
        } else {
          // showThoughts = false 인 경우: thoughts는 숨기되, 모델별로 분리
          if (modelId.startsWith('gemini-3-')) {
              chatConfig.thinkingConfig = {
                  includeThoughts: false
              };
          } else {
              chatConfig.thinkingConfig = {
                  includeThoughts: false,
                  thinkingBudget: 0
              };
          }
        }
      }

      // Add Image Config for Image Models
      if (isImageModel) {
          chatConfig.imageConfig = {
              aspectRatio: "1:1",
              imageSize: "1K" 
          };
      }

      // --- Other Tools ---
      const otherTools: any[] = [];

      // Function Calling
      if (settings.toolSettings?.enableFunctionCalling && settings.toolSettings.functions.length > 0) {
        otherTools.push({
            functionDeclarations: settings.toolSettings.functions.map(fn => ({
                name: fn.name,
                description: fn.description,
                parameters: fn.parameters,
            }))
        });
      }

      // Code Execution
      if (settings.toolSettings?.enableCodeExecution) {
          otherTools.push({ codeExecution: {} });
      }

      // URL Grounding
      if (settings.toolSettings?.enableUrlGrounding) {
           otherTools.push({ urlFetch: {} });
      }

      if (otherTools.length > 0) {
        if (!chatConfig.tools) chatConfig.tools = [];
        chatConfig.tools.push(...otherTools);
      }

      const chat: Chat = ai.chats.create({
        model: modelId,
        config: chatConfig as any,
        history: validHistory as any,
      });

      (chat as any)._apiKey = apiKey;

      return chat;
    } catch (error) {
      console.error("Failed to initialize Gemini chat:", error);
      if (apiKey) reportApiKeyError(apiKey);
      return null;
    }
  },

  sendMessageStream: async (
    chat: Chat,
    message: string,
    attachments: Attachment[],
    onChunk: (chunk: string) => void,
    onThoughtChunk: (chunk: string) => void,
    onGroundingMetadata: (metadata: GroundingMetadata) => void,
    onUsageMetadata: (usage: UsageMetadata) => void,
    onImageGenerated: (image: { data: string; mimeType: string }) => void,
    onError: (error: Error) => void,
    onComplete: () => void,
    abortSignal?: AbortSignal
  ): Promise<void> => {
    try {
      // Check if already aborted
      if (abortSignal?.aborted) {
        onComplete();
        return;
      }

      let parts: Part[] = [];

      // Process attachments
      if (attachments && attachments.length > 0) {
        const attachmentParts: Part[] = attachments.map(att => {
            if (att.category === 'text') {
                return { text: `[File Context: ${att.name}]\n${att.data}\n` };
            } else {
                return {
                    inlineData: {
                        mimeType: att.mimeType,
                        data: att.data
                    }
                };
            }
        });
        parts = [...parts, ...attachmentParts];
      }

      if (message && message.trim()) {
          parts.push({ text: message });
      }

      if (parts.length === 0) {
          parts.push({ text: ' ' }); 
      }

      const result = await chat.sendMessageStream({ message: parts });

      for await (const chunkResponse of result) {
        // Check abort signal on each chunk
        if (abortSignal?.aborted) {
          onComplete();
          return;
        }

        if (chunkResponse.candidates && chunkResponse.candidates[0]?.groundingMetadata) {
            onGroundingMetadata(chunkResponse.candidates[0].groundingMetadata);
        }

        if (chunkResponse.usageMetadata) {
             const u = chunkResponse.usageMetadata;
             onUsageMetadata({
                 promptTokenCount: u.promptTokenCount,
                 candidatesTokenCount: u.candidatesTokenCount,
                 totalTokenCount: u.totalTokenCount
             });
        }

        if (chunkResponse.candidates && chunkResponse.candidates[0]?.content?.parts) {
          for (const part of chunkResponse.candidates[0].content.parts) {
            const p = part as ThoughtSupportingPart;
            
            if (p.inlineData) {
              onImageGenerated({
                mimeType: p.inlineData.mimeType,
                data: p.inlineData.data
              });
            }
            else if (p.thought) { 
              onThoughtChunk(typeof p.thought === 'string' ? p.thought : JSON.stringify(p.thought));
            } 
            else if (p.text) {
              onChunk(p.text);
            }
          }
        } else if (chunkResponse.text) {
          onChunk(chunkResponse.text);
        }
      }
    } catch (error: any) {
      console.error("Error sending message to Gemini:", error);

      const usedKey = (chat as any)._apiKey;
      if (usedKey) {
          reportApiKeyError(usedKey);
      }

      const geminiError = parseGeminiError(error);
      onError(new Error(geminiError.userMessage));
    } finally {
      onComplete();
    }
  },
};

export const generateChatTitle = async (
  firstMessage: string,
  apiKey?: string
): Promise<string> => {
  const key = apiKey || ENV_API_KEY;
  if (!key) return firstMessage.slice(0, 30) + (firstMessage.length > 30 ? '...' : '');

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': key,
        },
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [{ 
              text: `다음 메시지의 주제를 나타내는 짧은 제목(15자 이내, 한국어)을 만들어주세요. 제목만 출력하세요:\n\n"${firstMessage.slice(0, 200)}"` 
            }]
          }],
          generationConfig: {
            maxOutputTokens: 30,
            temperature: 0.3
          }
        }),
      }
    );

    if (!response.ok) {
      return firstMessage.slice(0, 30) + (firstMessage.length > 30 ? '...' : '');
    }

    const data = await response.json();
    const title = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    
    if (title && title.length > 0 && title.length <= 30) {
      return title.replace(/^['"]|['"]$/g, ''); // 따옴표 제거
    }
    
    return firstMessage.slice(0, 30) + (firstMessage.length > 30 ? '...' : '');
  } catch (e) {
    console.warn('Title generation failed:', e);
    return firstMessage.slice(0, 30) + (firstMessage.length > 30 ? '...' : '');
  }
};

export const geminiServiceInstance: GeminiService = geminiServiceImpl;
