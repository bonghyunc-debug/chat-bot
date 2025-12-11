# FILES_APP.md - App.tsx 전체 코드

> 이 파일을 `/home/claude/gemini-chat-ui/App.tsx`로 생성하세요.

```tsx
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { ChatInput } from './components/ChatInput';
import { MessageList } from './components/MessageList';
import { MessageSearch } from './components/MessageSearch';
import { SettingsModal } from './components/SettingsModal';
import { Canvas } from './components/Canvas';
import { UsageStats } from './components/UsageStats';
import { FunctionCallingPanel } from './components/FunctionCallingPanel';
import { useSessionManager } from './hooks/useSessionManager';
import { useApiKeys } from './hooks/useApiKeys';
import { useChatStream } from './hooks/useChatStream';
import { useNetworkStatus } from './hooks/useNetworkStatus';
import { useLocalStorage } from './hooks/useLocalStorage';
import { initializeChat, sendMessageStream, generateChatTitle, getAvailableModels } from './services/geminiService';
import { DEFAULT_SETTINGS, SYSTEM_PROMPT_PRESETS, MODEL_SPECS } from './constants';
import type { ChatSettings, ChatMessage, ModelOption, Attachment, ToolFunctionDefinition, FunctionCallResult } from './types';

export default function App() {
  // State
  const [settings, setSettings] = useLocalStorage<ChatSettings>('gemini-settings', DEFAULT_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);
  const [showCanvas, setShowCanvas] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showFunctionPanel, setShowFunctionPanel] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [availableModels, setAvailableModels] = useState<ModelOption[]>([]);
  const [currentThinking, setCurrentThinking] = useState<string>('');
  const [searchHighlight, setSearchHighlight] = useState<number | null>(null);
  const [pendingFunctionCall, setPendingFunctionCall] = useState<FunctionCallResult | null>(null);

  // Custom hooks
  const { apiKeys, addApiKey, removeApiKey, getActiveKey, rotateKey } = useApiKeys();
  const {
    sessions,
    currentSession,
    currentSessionId,
    createSession,
    selectSession,
    deleteSession,
    updateSessionTitle,
    addMessage,
    updateMessage,
    importSessions,
    exportSessions,
  } = useSessionManager();
  const { isStreaming, startStream, stopStream, streamController } = useChatStream();
  const isOnline = useNetworkStatus();

  // Refs
  const chatInstanceRef = useRef<any>(null);
  const messageListRef = useRef<HTMLDivElement>(null);

  // Load available models on mount
  useEffect(() => {
    const loadModels = async () => {
      const apiKey = getActiveKey();
      if (apiKey) {
        const models = await getAvailableModels(apiKey);
        setAvailableModels(models);
      }
    };
    loadModels();
  }, [apiKeys, getActiveKey]);

  // Initialize chat when session or model changes
  useEffect(() => {
    const initChat = async () => {
      const apiKey = getActiveKey();
      if (!apiKey || !currentSession) return;

      try {
        const systemPrompt = settings.systemPrompt || SYSTEM_PROMPT_PRESETS.default;
        chatInstanceRef.current = await initializeChat(apiKey, {
          model: settings.model,
          systemPrompt,
          temperature: settings.temperature,
          maxTokens: settings.maxTokens,
          thinkingBudget: settings.thinkingBudget,
          useGoogleSearch: settings.useGoogleSearch,
          toolSettings: settings.toolSettings,
          history: currentSession.messages.filter(m => m.role !== 'system').map(m => ({
            role: m.role as 'user' | 'model',
            parts: [{ text: m.content }],
          })),
        });
      } catch (error) {
        console.error('Failed to initialize chat:', error);
      }
    };

    initChat();
  }, [currentSessionId, settings.model, getActiveKey]);

  // Handle function call response
  const handleFunctionResponse = useCallback(async (result: unknown) => {
    if (!pendingFunctionCall || !chatInstanceRef.current) return;

    const responseMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: `[Function Response: ${pendingFunctionCall.name}]\n${JSON.stringify(result, null, 2)}`,
      timestamp: Date.now(),
    };
    addMessage(responseMessage);
    setPendingFunctionCall(null);

    // Continue the conversation with the function result
    // This will be handled by the chat instance automatically
  }, [pendingFunctionCall, addMessage]);

  // Handle sending message
  const handleSend = useCallback(async (content: string, attachments?: Attachment[]) => {
    const apiKey = getActiveKey();
    if (!apiKey || !content.trim()) return;

    // Create user message
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      attachments,
      timestamp: Date.now(),
    };
    addMessage(userMessage);

    // Create placeholder for assistant message
    const assistantMessageId = crypto.randomUUID();
    const assistantMessage: ChatMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      isStreaming: true,
    };
    addMessage(assistantMessage);
    setCurrentThinking('');

    try {
      startStream();

      // Reinitialize chat if needed
      if (!chatInstanceRef.current) {
        const systemPrompt = settings.systemPrompt || SYSTEM_PROMPT_PRESETS.default;
        chatInstanceRef.current = await initializeChat(apiKey, {
          model: settings.model,
          systemPrompt,
          temperature: settings.temperature,
          maxTokens: settings.maxTokens,
          thinkingBudget: settings.thinkingBudget,
          useGoogleSearch: settings.useGoogleSearch,
          toolSettings: settings.toolSettings,
        });
      }

      let fullContent = '';
      let thinkingContent = '';
      let functionCalls: FunctionCallResult[] = [];
      let metadata: any = null;

      await sendMessageStream(
        chatInstanceRef.current,
        content,
        {
          attachments,
          signal: streamController?.signal,
          onChunk: (chunk) => {
            if (chunk.thinking) {
              thinkingContent += chunk.thinking;
              setCurrentThinking(thinkingContent);
            }
            if (chunk.text) {
              fullContent += chunk.text;
              updateMessage(assistantMessageId, {
                content: fullContent,
                thinking: thinkingContent || undefined,
              });
            }
          },
          onFunctionCall: (fc) => {
            functionCalls.push(fc);
            setPendingFunctionCall(fc);
            updateMessage(assistantMessageId, {
              content: fullContent,
              functionCalls: [...functionCalls],
            });
          },
          onImageGenerated: (image) => {
            updateMessage(assistantMessageId, {
              content: fullContent,
              modelAttachment: image,
            });
          },
          onComplete: (result) => {
            metadata = result;
            updateMessage(assistantMessageId, {
              content: fullContent,
              thinking: thinkingContent || undefined,
              isStreaming: false,
              functionCalls: functionCalls.length > 0 ? functionCalls : undefined,
              metadata: {
                model: settings.model,
                usageMetadata: result.usageMetadata,
                groundingMetadata: result.groundingMetadata,
              },
            });
          },
          onError: (error) => {
            updateMessage(assistantMessageId, {
              content: fullContent || '오류가 발생했습니다.',
              isStreaming: false,
              error: error.message,
            });

            // Rotate API key on rate limit
            if (error.message.includes('429') || error.message.includes('quota')) {
              rotateKey();
            }
          },
        }
      );

      // Generate title for new sessions
      if (currentSession && currentSession.messages.length <= 2 && currentSession.title.startsWith('New')) {
        const title = await generateChatTitle(apiKey, content, settings.model);
        if (title) {
          updateSessionTitle(currentSessionId!, title);
        }
      }
    } catch (error: any) {
      console.error('Send error:', error);
      updateMessage(assistantMessageId, {
        content: `오류: ${error.message}`,
        isStreaming: false,
        error: error.message,
      });
    } finally {
      stopStream();
    }
  }, [
    getActiveKey,
    settings,
    addMessage,
    updateMessage,
    startStream,
    stopStream,
    streamController,
    currentSession,
    currentSessionId,
    updateSessionTitle,
    rotateKey,
  ]);

  // Handle message edit
  const handleEditMessage = useCallback((messageId: string, newContent: string) => {
    updateMessage(messageId, { content: newContent, edited: true });
  }, [updateMessage]);

  // Handle message regeneration
  const handleRegenerate = useCallback(async (messageId: string) => {
    if (!currentSession) return;

    const messageIndex = currentSession.messages.findIndex(m => m.id === messageId);
    if (messageIndex === -1) return;

    // Find the previous user message
    let userMessageIndex = messageIndex - 1;
    while (userMessageIndex >= 0 && currentSession.messages[userMessageIndex].role !== 'user') {
      userMessageIndex--;
    }

    if (userMessageIndex >= 0) {
      const userMessage = currentSession.messages[userMessageIndex];
      // Reset chat instance to replay from that point
      chatInstanceRef.current = null;
      handleSend(userMessage.content, userMessage.attachments);
    }
  }, [currentSession, handleSend]);

  // Handle search result navigation
  const handleSearchResult = useCallback((index: number) => {
    setSearchHighlight(index);
    setTimeout(() => {
      const element = document.querySelector(`[data-message-index="${index}"]`);
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  }, []);

  // Handle function definitions update
  const handleFunctionsUpdate = useCallback((functions: ToolFunctionDefinition[]) => {
    setSettings(prev => ({
      ...prev,
      toolSettings: {
        ...prev.toolSettings,
        enableFunctionCalling: functions.length > 0,
        functions,
        enableCodeExecution: prev.toolSettings?.enableCodeExecution ?? false,
        enableUrlGrounding: prev.toolSettings?.enableUrlGrounding ?? false,
      },
    }));
    // Reset chat instance to apply new functions
    chatInstanceRef.current = null;
  }, [setSettings]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'f':
            e.preventDefault();
            setShowSearch(prev => !prev);
            break;
          case ',':
            e.preventDefault();
            setShowSettings(prev => !prev);
            break;
          case 'b':
            e.preventDefault();
            setSidebarOpen(prev => !prev);
            break;
          case 'n':
            e.preventDefault();
            createSession();
            break;
          case 'j':
            e.preventDefault();
            setShowFunctionPanel(prev => !prev);
            break;
        }
      }
      if (e.key === 'Escape') {
        setShowSearch(false);
        setShowSettings(false);
        setShowCanvas(false);
        setShowStats(false);
        setShowFunctionPanel(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [createSession]);

  // Check if API key is configured
  const hasApiKey = apiKeys.length > 0;

  return (
    <ErrorBoundary>
      <div className="app">
        {/* Sidebar */}
        <Sidebar
          sessions={sessions}
          currentSessionId={currentSessionId}
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(prev => !prev)}
          onSelectSession={selectSession}
          onNewSession={createSession}
          onDeleteSession={deleteSession}
          onRenameSession={updateSessionTitle}
          onImport={importSessions}
          onExport={exportSessions}
          onOpenSettings={() => setShowSettings(true)}
        />

        {/* Main content */}
        <div className="main-content">
          <Header
            model={settings.model}
            modelSpecs={MODEL_SPECS[settings.model]}
            isOnline={isOnline}
            onToggleCanvas={() => setShowCanvas(prev => !prev)}
            onToggleStats={() => setShowStats(prev => !prev)}
            onToggleSearch={() => setShowSearch(prev => !prev)}
            onToggleFunctions={() => setShowFunctionPanel(prev => !prev)}
            showCanvas={showCanvas}
            showStats={showStats}
            hasFunctions={settings.toolSettings?.functions?.length > 0}
          />

          {showSearch && currentSession && (
            <MessageSearch
              messages={currentSession.messages}
              onResultSelect={handleSearchResult}
              onClose={() => setShowSearch(false)}
            />
          )}

          <div className="chat-container">
            {!hasApiKey ? (
              <div className="no-api-key">
                <div className="no-api-key-content">
                  <h2>API 키가 필요합니다</h2>
                  <p>Gemini API를 사용하려면 먼저 API 키를 설정해주세요.</p>
                  <button onClick={() => setShowSettings(true)} className="btn-primary">
                    설정 열기
                  </button>
                </div>
              </div>
            ) : (
              <>
                <MessageList
                  ref={messageListRef}
                  messages={currentSession?.messages || []}
                  isStreaming={isStreaming}
                  highlightIndex={searchHighlight}
                  showThoughts={settings.showThoughts}
                  onEdit={handleEditMessage}
                  onRegenerate={handleRegenerate}
                  onFunctionResponse={handleFunctionResponse}
                  pendingFunctionCall={pendingFunctionCall}
                />

                <ChatInput
                  onSend={handleSend}
                  onStop={stopStream}
                  isStreaming={isStreaming}
                  disabled={!hasApiKey || !isOnline}
                  model={settings.model}
                  apiKey={getActiveKey() || ''}
                />
              </>
            )}
          </div>
        </div>

        {/* Canvas (Thinking side panel) */}
        {showCanvas && (
          <Canvas
            thinking={currentThinking}
            isOpen={showCanvas}
            onClose={() => setShowCanvas(false)}
          />
        )}

        {/* Function Calling Panel */}
        {showFunctionPanel && (
          <FunctionCallingPanel
            functions={settings.toolSettings?.functions || []}
            onFunctionsChange={handleFunctionsUpdate}
            onClose={() => setShowFunctionPanel(false)}
          />
        )}

        {/* Settings Modal */}
        {showSettings && (
          <SettingsModal
            settings={settings}
            onSettingsChange={setSettings}
            apiKeys={apiKeys}
            onAddApiKey={addApiKey}
            onRemoveApiKey={removeApiKey}
            availableModels={availableModels}
            onClose={() => setShowSettings(false)}
          />
        )}

        {/* Usage Stats Modal */}
        {showStats && (
          <UsageStats
            sessions={sessions}
            onClose={() => setShowStats(false)}
          />
        )}

        {/* Offline indicator */}
        {!isOnline && (
          <div className="offline-banner">
            오프라인 상태입니다. 인터넷 연결을 확인해주세요.
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}
```
