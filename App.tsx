
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChatMessage, ModelOption, ChatHistoryItem, ChatSettings, ChatSession, Attachment, UsageMetadata } from './types';
import { DEFAULT_MODEL_ID, DEFAULT_SYSTEM_INSTRUCTION, DEFAULT_TEMPERATURE, DEFAULT_TOP_P, DEFAULT_TOP_K, DEFAULT_MAX_OUTPUT_TOKENS, DEFAULT_SHOW_THOUGHTS, DEFAULT_USE_GOOGLE_SEARCH, DEFAULT_JSON_MODE, DEFAULT_SAFETY_SETTING, DEFAULT_STOP_SEQUENCES, DEFAULT_TOOL_SETTINGS } from './constants';
import { Header } from './components/Header';
import { MessageList } from './components/MessageList';
import { ChatInput } from './components/ChatInput';
import { ControlPanel } from './components/ControlPanel'; 
import { Sidebar } from './components/Sidebar';
import { Canvas } from './components/Canvas';
import CodeExportModal from './components/CodeExportModal';
import { geminiServiceInstance } from './services/geminiService';
import { Chat, GroundingMetadata } from '@google/genai';
import { initApiKeyPool, getHealthyApiKey } from './services/apiKeyPool';
import { PlaygroundInspector, PlaygroundRequestPreview } from './components/PlaygroundInspector';

const App: React.FC = () => {
  // --- State: Sessions & Persistence ---
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    try {
      const saved = localStorage.getItem('gemini_chat_sessions');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.map((s: any) => ({
          ...s,
          messages: s.messages.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }))
        }));
      }
    } catch (e) {
      console.error("Failed to load sessions from local storage", e);
    }
    return [];
  });

  // --- State: API Keys Management ---
  const [apiKeys, setApiKeys] = useState<string[]>(() => {
      try {
          const saved = localStorage.getItem('gemini_api_keys');
          return saved ? JSON.parse(saved) : [];
      } catch (e) {
          return [];
      }
  });

  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isCanvasOpen, setIsCanvasOpen] = useState(false);
  const [isControlPanelOpen, setIsControlPanelOpen] = useState(true); // Default open for desktop
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false); // Code Export Modal State
  const [canvasContent, setCanvasContent] = useState<string>('');
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);

  // --- State: Current Session Settings (Active) ---
  // Initialize from LocalStorage if available, else defaults
  const [currentSettings, setCurrentSettings] = useState<ChatSettings>(() => {
      try {
          const saved = localStorage.getItem('gemini_global_settings');
          if (saved) {
              const parsed = JSON.parse(saved);
              // Merge with defaults to ensure all keys exist (in case of updates)
              return {
                  modelId: parsed.modelId || DEFAULT_MODEL_ID,
                  systemInstruction: parsed.systemInstruction ?? DEFAULT_SYSTEM_INSTRUCTION,
                  temperature: parsed.temperature ?? DEFAULT_TEMPERATURE,
                  topP: parsed.topP ?? DEFAULT_TOP_P,
                  topK: parsed.topK ?? DEFAULT_TOP_K,
                  maxOutputTokens: parsed.maxOutputTokens ?? DEFAULT_MAX_OUTPUT_TOKENS,
                  showThoughts: parsed.showThoughts ?? DEFAULT_SHOW_THOUGHTS,
                  useGoogleSearch: parsed.useGoogleSearch ?? DEFAULT_USE_GOOGLE_SEARCH,
                  jsonMode: parsed.jsonMode ?? DEFAULT_JSON_MODE,
                  safetySettings: parsed.safetySettings ?? DEFAULT_SAFETY_SETTING,
                  stopSequences: parsed.stopSequences ?? DEFAULT_STOP_SEQUENCES,
                  toolSettings: parsed.toolSettings ?? DEFAULT_TOOL_SETTINGS
              };
          }
      } catch (e) {
          console.error("Failed to load settings", e);
      }
      return {
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
      };
  });

  // --- State: UI & API ---
  const [apiModels, setApiModels] = useState<ModelOption[]>([]);
  const [modelsLoadingError, setModelsLoadingError] = useState<string | null>(null);
  const [isModelsLoading, setIsModelsLoading] = useState<boolean>(false);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [chatSession, setChatSession] = useState<Chat | null>(null);
  const [lastRequestPreview, setLastRequestPreview] = useState<PlaygroundRequestPreview | null>(null);
  const [lastUsage, setLastUsage] = useState<UsageMetadata | null>(null);

  // Track the settings used to initialize the *current* chat object
  const [activeChatSettings, setActiveChatSettings] = useState<ChatSettings | null>(null);

  const [inputText, setInputText] = useState<string>('');
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);

  // Helper to get current messages
  const currentMessages = sessions.find(s => s.id === currentSessionId)?.messages || [];

  // --- Effects ---

  // Initialize API Key Pool whenever keys change
  useEffect(() => {
    initApiKeyPool(apiKeys);
  }, [apiKeys]);

  // Save Sessions to LocalStorage
  useEffect(() => {
    localStorage.setItem('gemini_chat_sessions', JSON.stringify(sessions));
  }, [sessions]);

  // Save API Keys to LocalStorage
  useEffect(() => {
    localStorage.setItem('gemini_api_keys', JSON.stringify(apiKeys));
  }, [apiKeys]);

  // Save Global Settings to LocalStorage whenever they change
  useEffect(() => {
      localStorage.setItem('gemini_global_settings', JSON.stringify(currentSettings));
  }, [currentSettings]);

  // Load Models
  useEffect(() => {
    const fetchAndSetModels = async () => {
      setIsLoading(true);
      setIsModelsLoading(true);
      setModelsLoadingError(null);
      try {
        const fetchedModels = await geminiServiceInstance.getAvailableModels(getHealthyApiKey());
        if (fetchedModels.length > 0) {
          setApiModels(fetchedModels);
          if (sessions.length === 0) {
            createNewSession();
          } else if (!currentSessionId) {
            // Fix: Create a copy of sessions array before sorting to avoid state mutation
            const recent = [...sessions].sort((a,b) => b.lastModified - a.lastModified)[0];
            if (recent) {
              setCurrentSessionId(recent.id);
            }
          }
        } else {
          setModelsLoadingError("호환되는 모델을 찾을 수 없습니다. 기본값을 사용합니다.");
          setApiModels([{ id: DEFAULT_MODEL_ID, name: `기본: ${DEFAULT_MODEL_ID.split('/').pop()}` }]);
        }
      } catch (error) {
        console.error("Failed to fetch models:", error);
        setModelsLoadingError(`모델을 불러오지 못했습니다. 기본값을 사용합니다.`);
        setApiModels([{ id: DEFAULT_MODEL_ID, name: `기본값` }]);
      } finally {
        setIsModelsLoading(false);
        setIsLoading(false);
      }
    };
    fetchAndSetModels();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  // Sync Settings when Session Changes
  useEffect(() => {
    if (currentSessionId) {
      const session = sessions.find(s => s.id === currentSessionId);
      if (session) {
        // Only update currentSettings if the session has specific settings.
        // If we want new chats to use global settings, we handle that in createNewSession.
        // Here, we load the session's saved settings into the UI.
        
        // Merge defaults in case of old sessions missing new keys
        const sessionSettings = {
            modelId: session.settings.modelId || DEFAULT_MODEL_ID,
            systemInstruction: session.settings.systemInstruction ?? DEFAULT_SYSTEM_INSTRUCTION,
            temperature: session.settings.temperature ?? DEFAULT_TEMPERATURE,
            topP: session.settings.topP ?? DEFAULT_TOP_P,
            topK: session.settings.topK ?? DEFAULT_TOP_K,
            maxOutputTokens: session.settings.maxOutputTokens ?? DEFAULT_MAX_OUTPUT_TOKENS,
            showThoughts: session.settings.showThoughts ?? DEFAULT_SHOW_THOUGHTS,
            useGoogleSearch: session.settings.useGoogleSearch ?? DEFAULT_USE_GOOGLE_SEARCH,
            jsonMode: session.settings.jsonMode ?? DEFAULT_JSON_MODE,
            safetySettings: session.settings.safetySettings ?? DEFAULT_SAFETY_SETTING,
            stopSequences: session.settings.stopSequences ?? DEFAULT_STOP_SEQUENCES,
            toolSettings: session.settings.toolSettings ?? DEFAULT_TOOL_SETTINGS
        };
        
        // We set current settings to the active session's settings
        setCurrentSettings(sessionSettings);
      }
    }
  }, [currentSessionId]);

  // --- Logic ---

  const handleAddApiKey = (key: string) => {
      if (!apiKeys.includes(key)) {
          setApiKeys([...apiKeys, key]);
      }
  };

  const handleRemoveApiKey = (key: string) => {
      setApiKeys(apiKeys.filter(k => k !== key));
  };

  const createNewSession = () => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: '새 채팅',
      messages: [],
      lastModified: Date.now(),
      // Use currentSettings (which reflects global/last used settings) for new session
      // instead of resetting to hard defaults. This is better UX.
      settings: { ...currentSettings } 
    };
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
    setChatSession(null);
  };

  const deleteSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSessions = sessions.filter(s => s.id !== sessionId);
    setSessions(newSessions);
    if (currentSessionId === sessionId) {
      if (newSessions.length > 0) {
        setCurrentSessionId(newSessions[0].id);
      } else {
        createNewSession();
      }
    }
  };

  const handleRenameSession = (sessionId: string, newTitle: string) => {
    setSessions(prev => prev.map(s => 
      s.id === sessionId ? { ...s, title: newTitle } : s
    ));
  };

  const updateCurrentSessionMessages = (updateFn: (msgs: ChatMessage[]) => ChatMessage[]) => {
    if (!currentSessionId) return;
    setSessions(prev => prev.map(s => {
      if (s.id === currentSessionId) {
        const newMsgs = updateFn(s.messages);
        let newTitle = s.title;
        if (s.messages.length === 0 && newMsgs.length > 0 && s.title === '새 채팅') {
           const firstUserMsg = newMsgs.find(m => m.role === 'user');
           if (firstUserMsg) {
             newTitle = firstUserMsg.content.slice(0, 30) + (firstUserMsg.content.length > 30 ? '...' : '');
           }
        }
        return { ...s, messages: newMsgs, title: newTitle, lastModified: Date.now() };
      }
      return s;
    }));
  };

  const updateCurrentSessionSettings = (newSettings: ChatSettings) => {
    setCurrentSettings(newSettings); // Update local UI state
    if (!currentSessionId) return;
    setSessions(prev => prev.map(s => 
      s.id === currentSessionId ? { ...s, settings: newSettings } : s
    ));
  };

  const createChatHistoryForApi = (msgs: ChatMessage[]): ChatHistoryItem[] => {
    return msgs
      .filter(msg => msg.role === 'user' || msg.role === 'model')
      .map(msg => {
        let parts: any[] = [];
        
        // Handle attachments in history
        if (msg.role === 'user' && msg.attachments && msg.attachments.length > 0) {
            msg.attachments.forEach(att => {
                if (att.category === 'text') {
                    parts.push({ text: `[File Context: ${att.name}]\n${att.data}\n` });
                } else {
                    parts.push({ inlineData: { mimeType: att.mimeType, data: att.data } });
                }
            });
        }
        
        if (msg.content) {
            parts.push({ text: msg.content });
        }

        // If no content/attachments but message exists (weird edge case), ensure at least empty text
        if (parts.length === 0) {
            parts.push({ text: ' ' });
        }

        return {
          role: msg.role as 'user' | 'model',
          parts: parts,
        };
      });
  };

  const buildRequestPreview = (message: string, attachments: Attachment[]): PlaygroundRequestPreview => {
    const toolConfigs: any[] = [];
    const isImageModel = currentSettings.modelId.toLowerCase().includes('image');
    const shouldUseSearch = currentSettings.useGoogleSearch && !currentSettings.jsonMode;

    if (shouldUseSearch) {
      toolConfigs.push({ googleSearch: {} });
    }

    if (currentSettings.toolSettings?.enableFunctionCalling && currentSettings.toolSettings.functions.length > 0) {
      toolConfigs.push({
        functionDeclarations: currentSettings.toolSettings.functions.map(fn => ({
          name: fn.name,
          description: fn.description
        }))
      });
    }

    if (currentSettings.toolSettings?.enableCodeExecution) {
      toolConfigs.push({ codeExecution: {} });
    }

    if (currentSettings.toolSettings?.enableUrlGrounding) {
      toolConfigs.push({ urlFetch: {} });
    }

    const responseMimeType = currentSettings.jsonMode && !shouldUseSearch && !isImageModel
      ? 'application/json'
      : undefined;

    return {
      model: currentSettings.modelId,
      message,
      attachments: attachments.map(att => ({ name: att.name, mimeType: att.mimeType, category: att.category })),
      config: {
        systemInstruction: currentSettings.systemInstruction,
        temperature: currentSettings.temperature,
        topP: currentSettings.topP,
        topK: currentSettings.topK,
        maxOutputTokens: currentSettings.maxOutputTokens,
        stopSequences: currentSettings.stopSequences,
        safetySettings: currentSettings.safetySettings,
        responseMimeType,
        tools: toolConfigs.length > 0 ? toolConfigs : undefined,
        jsonMode: currentSettings.jsonMode,
        useGoogleSearch: currentSettings.useGoogleSearch,
      },
      timestamp: new Date().toLocaleString(),
      flags: {
        search: shouldUseSearch,
        jsonMode: !!responseMimeType,
        thoughts: currentSettings.showThoughts,
        functions: currentSettings.toolSettings?.functions.length || 0,
        codeExecution: !!currentSettings.toolSettings?.enableCodeExecution,
        urlGrounding: !!currentSettings.toolSettings?.enableUrlGrounding,
      },
    };
  };

  const updateCurrentSessionMessagesRef = useRef(updateCurrentSessionMessages);
  useEffect(() => {
    updateCurrentSessionMessagesRef.current = updateCurrentSessionMessages;
  }, [updateCurrentSessionMessages]);

  const initializeCurrentChatSession = useCallback(async (history?: ChatHistoryItem[]) => {
    if (!currentSettings.modelId) return;
    setIsLoading(true);
    try {
      const selectedKey = getHealthyApiKey();
      
      const newSession = await geminiServiceInstance.initializeChat(
        currentSettings.modelId,
        currentSettings,
        history,
        selectedKey
      );
      
      if (!newSession) {
          // Explicit null handling instead of throw
          updateCurrentSessionMessagesRef.current(prev => [...prev, { 
              id: Date.now().toString(), 
              role: 'error', 
              content: '모델 초기화에 실패했습니다 (세션 생성 불가). API 키나 네트워크 상태를 확인해주세요.', 
              timestamp: new Date() 
          }]);
          setIsLoading(false);
          return;
      }

      setChatSession(newSession);
      setActiveChatSettings(currentSettings);
    } catch (error) {
      console.error("Error initializing chat session:", error);
      updateCurrentSessionMessagesRef.current(prev => [...prev, { id: Date.now().toString(), role: 'error', content: `채팅 초기화 오류: ${String(error)}`, timestamp: new Date() }]);
    } finally {
      setIsLoading(false);
    }
  }, [currentSettings]);

  // Initialize API Chat Object when critical settings change
  useEffect(() => {
    if (currentSettings.modelId && !isModelsLoading && currentSessionId) {
        const needsReinit = !activeChatSettings ||
            currentSettings.modelId !== activeChatSettings.modelId ||
            currentSettings.systemInstruction !== activeChatSettings.systemInstruction ||
            currentSettings.temperature !== activeChatSettings.temperature ||
            currentSettings.topP !== activeChatSettings.topP ||
            currentSettings.topK !== activeChatSettings.topK ||
            currentSettings.maxOutputTokens !== activeChatSettings.maxOutputTokens ||
            currentSettings.showThoughts !== activeChatSettings.showThoughts ||
            currentSettings.useGoogleSearch !== activeChatSettings.useGoogleSearch ||
            currentSettings.jsonMode !== activeChatSettings.jsonMode ||
            currentSettings.safetySettings !== activeChatSettings.safetySettings ||
            JSON.stringify(currentSettings.stopSequences) !== JSON.stringify(activeChatSettings.stopSequences) ||
            JSON.stringify(currentSettings.toolSettings) !== JSON.stringify(activeChatSettings.toolSettings);

        if (needsReinit) {
            initializeCurrentChatSession();
        }
    }
  }, [currentSettings, isModelsLoading, currentSessionId, activeChatSettings, initializeCurrentChatSession]);

  // Abstracted logic for streaming response, used by both send and regenerate
  // Added optional 'overrideHistory' to support regeneration logic where state is stale
  const streamResponse = async (inputContent: string, attachments: Attachment[], overrideHistory?: ChatMessage[]) => {
    setIsLoading(true);
    setLastUsage(null);
    setLastRequestPreview(buildRequestPreview(inputContent, attachments));
    let currentChat = chatSession;

    // Use overrideHistory if provided, otherwise default to currentMessages
    const effectiveMessages = overrideHistory || currentMessages;

    // Re-init if chat doesn't exist OR if we have overrideHistory (implies context change like regen)
    if (!currentChat || overrideHistory) {
         const selectedKey = getHealthyApiKey();
         
         const historyMsgs = effectiveMessages.filter(m => m.role === 'user' || m.role === 'model');
         
         // For a new chat, the SDK expects history BEFORE the current turn.
         const historyForInit = createChatHistoryForApi(historyMsgs.slice(0, -1)); 
         
         // Directly assign
         currentChat = await geminiServiceInstance.initializeChat(
            currentSettings.modelId,
            currentSettings,
            historyForInit,
            selectedKey
          );
          
          if (!currentChat) {
             // Handle null return explicitly
             updateCurrentSessionMessages(prev => [...prev, { 
                 id: Date.now().toString(), 
                 role: 'error', 
                 content: '모델과의 연결을 초기화하지 못했습니다. 잠시 후 다시 시도해 주세요.', 
                 timestamp: new Date() 
             }]);
             setIsLoading(false);
             return;
          }

          setChatSession(currentChat);
          setActiveChatSettings(currentSettings);
    }

    // Defensive check
    if (!currentChat) {
       updateCurrentSessionMessages(prev => [...prev, { id: Date.now().toString(), role: 'error', content: '연결이 끊어졌습니다. 새로고침 해주세요.', timestamp: new Date() }]);
       setIsLoading(false);
       return;
    }

    const modelMessageId = (Date.now() + 1).toString();
    updateCurrentSessionMessages(prev => [
      ...prev,
      { id: modelMessageId, role: 'model', content: '', thoughts: '', timestamp: new Date(), isLoading: true },
    ]);

    await geminiServiceInstance.sendMessageStream(
      currentChat,
      inputContent,
      attachments,
      (chunk) => {
        updateCurrentSessionMessages(prev => prev.map(msg => msg.id === modelMessageId ? { ...msg, content: msg.content + chunk, isLoading: true } : msg));
      },
      (thoughtChunk) => {
        updateCurrentSessionMessages(prev => prev.map(msg => msg.id === modelMessageId ? { ...msg, thoughts: (msg.thoughts || '') + thoughtChunk, isLoading: true } : msg));
      },
      (metadata) => {
        updateCurrentSessionMessages(prev => prev.map(msg => msg.id === modelMessageId ? { ...msg, groundingMetadata: metadata, isLoading: true } : msg));
      },
      (usage) => {
        updateCurrentSessionMessages(prev => prev.map(msg => msg.id === modelMessageId ? { ...msg, usageMetadata: usage, isLoading: true } : msg));
        setLastUsage(usage);
      },
      (generatedImage) => {
        updateCurrentSessionMessages(prev => prev.map(msg => msg.id === modelMessageId ? { 
            ...msg, 
            modelAttachment: generatedImage,
            isLoading: true 
        } : msg));
      },
      (error) => {
        updateCurrentSessionMessages(prev => prev.map(msg => msg.id === modelMessageId ? { ...msg, role: 'error', content: error.message, isLoading: false } : msg));
        setIsLoading(false);
      },
      () => {
        updateCurrentSessionMessages(prev => prev.map(msg => msg.id === modelMessageId ? { ...msg, isLoading: false } : msg));
        setIsLoading(false);
      }
    );
  };

  const handleSendMessage = async (attachments: Attachment[]) => {
    if (!inputText.trim() && attachments.length === 0) return;
    const currentInputText = inputText;
    setInputText('');
    setEditingMessageId(null);
    
    // 1. Add User Message to State
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: currentInputText,
      timestamp: new Date(),
      attachments: attachments.length > 0 ? attachments : undefined
    };
    
    setSessions(prev => prev.map(s => {
      if (s.id === currentSessionId) {
        return { ...s, messages: [...s.messages, userMessage], lastModified: Date.now() };
      }
      return s;
    }));

    // For normal send, we don't need overrideHistory because we just appended to state,
    // and we want normal continuation.
    await streamResponse(currentInputText, attachments);
  };

  // --- New Handler for Sending from Canvas ---
  const handleSendFromCanvas = async (content: string) => {
    if (!content.trim() || !currentSessionId || isLoading) return;

    const messageContent = `\`\`\`\n${content}\n\`\`\`\n\n(Canvas 내용 전송됨)`;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: messageContent,
      timestamp: new Date(),
    };

    setSessions(prev => prev.map(s => {
      if (s.id === currentSessionId) {
        return { ...s, messages: [...s.messages, userMessage], lastModified: Date.now() };
      }
      return s;
    }));

    await streamResponse(messageContent, []);
  };

  const handleRegenerate = async () => {
    if (!currentSessionId || isLoading) return;

    const msgs = currentMessages;
    if (msgs.length === 0) return;

    const lastMsg = msgs[msgs.length - 1];
    let userMsgToRetry: ChatMessage | undefined;
    let slicedMsgs: ChatMessage[] = [];

    // Check if last message is model (normal regen) or error
    if (lastMsg.role === 'model' || lastMsg.role === 'error') {
        slicedMsgs = msgs.slice(0, -1); // Remove model answer
        userMsgToRetry = slicedMsgs[slicedMsgs.length - 1]; // Get user question
    } else {
        return; // Last message is user, wait for answer (or manual retry handled differently)
    }

    if (userMsgToRetry && userMsgToRetry.role === 'user') {
         // 1. Update UI State synchronously
         setSessions(prev => prev.map(s => {
            if (s.id === currentSessionId) {
                return { ...s, messages: slicedMsgs, lastModified: Date.now() };
            }
            return s;
        }));
        
        // 2. Force reset chat session to clear SDK history
        setChatSession(null); 

        // 3. Trigger generation using the CORRECTED history
        // We pass `slicedMsgs` which contains the User Message at the end.
        // streamResponse logic will slice off the last user message for `initializeChat` history
        // and send `userMsgToRetry.content` as the new prompt.
        await streamResponse(
            userMsgToRetry.content, 
            userMsgToRetry.attachments || [], 
            slicedMsgs // <--- Critical Fix: Pass correct history snapshot
        );
    }
  };


  const handleClearChat = () => {
    if (confirm("이 대화를 정말 지우시겠습니까?")) {
        updateCurrentSessionMessages(() => []);
        setChatSession(null); 
    }
  };

  const handleEditMessage = (messageId: string) => {
    const messageToEdit = currentMessages.find(msg => msg.id === messageId);
    if (messageToEdit && messageToEdit.role === 'user') {
      setInputText(messageToEdit.content);
      setEditingMessageId(messageId);
      // Remove this message and everything after it
      updateCurrentSessionMessages(prev => {
          const index = prev.findIndex(m => m.id === messageId);
          if (index !== -1) return prev.slice(0, index);
          return prev;
      });
      // Force re-init of chat context since history changed
      setChatSession(null); 
    }
  };
  
  const handleOpenCanvas = (content: string) => {
      setCanvasContent(content);
      setIsCanvasOpen(true);
      setIsControlPanelOpen(false); // Close control panel when canvas opens to save space
  };

  const getCurrentModelDisplayName = () => {
     const model = apiModels.find(m => m.id === currentSettings.modelId);
     return model ? model.name : currentSettings.modelId;
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      <Sidebar 
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSelectSession={setCurrentSessionId}
        onCreateSession={createNewSession}
        onDeleteSession={deleteSession}
        onRenameSession={handleRenameSession}
      />
      
      <div className="flex flex-col flex-1 h-full w-full relative min-w-0">
        <Header
          onClearChat={handleClearChat}
          onOpenSettingsModal={() => setIsControlPanelOpen(!isControlPanelOpen)}
          isLoading={isLoading || isModelsLoading}
          currentModelName={getCurrentModelDisplayName()}
          onToggleSidebar={() => {}} // No-op for desktop
          isCanvasOpen={isCanvasOpen}
          onToggleCanvas={() => {
              setIsCanvasOpen(!isCanvasOpen);
              if (!isCanvasOpen) setIsControlPanelOpen(false);
          }}
          isControlPanelOpen={isControlPanelOpen}
        />

        {modelsLoadingError && (
           <div className="p-2 bg-red-900/50 text-center text-xs text-red-200 border-b border-red-800">{modelsLoadingError}</div>
        )}

        <PlaygroundInspector
          isOpen={isInspectorOpen}
          onToggle={() => setIsInspectorOpen(!isInspectorOpen)}
          requestPreview={lastRequestPreview}
          usage={lastUsage}
        />

        <div className="flex-1 flex overflow-hidden relative">
            <div className="flex flex-col flex-1 h-full relative min-w-0 transition-all duration-300">
                
                {/* Scrollable Message Area */}
                <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-950">
                    <MessageList
                        messages={currentMessages}
                        onEditMessage={handleEditMessage}
                        onRegenerate={handleRegenerate}
                        lastUserMessageId={currentMessages.slice().reverse().find(msg => msg.role === 'user')?.id}
                        showThoughts={currentSettings.showThoughts}
                        onOpenCanvas={handleOpenCanvas}
                        isLoading={isLoading}
                    />
                </div>
                
                 {/* Chat Input - Static at bottom in flex flow */}
                 <ChatInput
                    inputText={inputText}
                    setInputText={setInputText}
                    onSendMessage={handleSendMessage}
                    isLoading={isLoading}
                    isEditing={!!editingMessageId}
                    modelId={currentSettings.modelId}
                    apiKey={getHealthyApiKey()}
                />
            </div>

            {/* Right Control Panel (Desktop Docked Style) */}
            {isControlPanelOpen && !isCanvasOpen && (
                 <ControlPanel
                    isOpen={isControlPanelOpen}
                    onClose={() => setIsControlPanelOpen(false)}
                    currentSettings={currentSettings}
                    availableModels={apiModels}
                    onSettingsChange={updateCurrentSessionSettings}
                    isModelsLoading={isModelsLoading}
                    modelsLoadingError={modelsLoadingError}
                    apiKeys={apiKeys}
                    onAddApiKey={handleAddApiKey}
                    onRemoveApiKey={handleRemoveApiKey}
                    onOpenCodeModal={() => setIsCodeModalOpen(true)}
                 />
            )}

            {/* Canvas Panel */}
            {isCanvasOpen && (
                <div className="w-1/2 border-l border-slate-800 h-full flex flex-col z-10 shadow-2xl bg-slate-900">
                    <Canvas 
                        content={canvasContent} 
                        isOpen={isCanvasOpen} 
                        onClose={() => setIsCanvasOpen(false)}
                        onUpdateContent={setCanvasContent}
                        onSendToChat={handleSendFromCanvas}
                    />
                </div>
            )}
            
            {/* Code Export Modal */}
            <CodeExportModal 
                isOpen={isCodeModalOpen}
                onClose={() => setIsCodeModalOpen(false)}
                modelId={currentSettings.modelId}
                settings={currentSettings}
            />
        </div>
      </div>
    </div>
  );
};

export default App;
