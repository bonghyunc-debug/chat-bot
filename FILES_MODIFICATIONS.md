# FILES_MODIFICATIONS.md - 기존 파일 수정 상세

---

## 1. types.ts 수정

### 1.1 FunctionCallResult 타입 추가 (파일 끝에 추가)

```ts
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
```

### 1.2 ChatMessage 인터페이스에 functionCalls 추가

```ts
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
  functionCalls?: FunctionCallResult[]; // 추가
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
```

### 1.3 ThoughtSupportingPart 확장

```ts
export interface ThoughtSupportingPart {
    thought?: unknown;
    inlineData?: { mimeType: string; data: string };
    text?: string;
    executableCode?: { language: string; code: string };
    codeExecutionResult?: { outcome: string; output?: string };
    functionCall?: { name: string; args: Record<string, unknown> };
    functionResponse?: { name: string; response: Record<string, unknown> };
}
```

---

## 2. services/geminiService.ts 수정

### 2.1 sendMessageStream 콜백 시그니처 확장

`geminiServiceImpl.sendMessageStream` 함수의 파라미터에 `onFunctionCall` 추가:

```ts
sendMessageStream: async (
  chat: Chat,
  message: string,
  attachments: Attachment[],
  onChunk: (chunk: string) => void,
  onThoughtChunk: (chunk: string) => void,
  onGroundingMetadata: (metadata: GroundingMetadata) => void,
  onUsageMetadata: (usage: UsageMetadata) => void,
  onImageGenerated: (image: { data: string; mimeType: string }) => void,
  onFunctionCall: (fc: { name: string; args: Record<string, unknown> }) => void, // 추가
  onError: (error: Error) => void,
  onComplete: () => void,
  abortSignal?: AbortSignal
): Promise<void> => {
```

### 2.2 Function Call 처리 추가 (sendMessageStream 내부)

```ts
// 기존 part 처리 코드에 추가
if (chunkResponse.candidates && chunkResponse.candidates[0]?.content?.parts) {
  for (const part of chunkResponse.candidates[0].content.parts) {
    const p = part as ThoughtSupportingPart;
    
    if (p.inlineData) {
      onImageGenerated({
        mimeType: p.inlineData.mimeType,
        data: p.inlineData.data
      });
    }
    else if (p.executableCode) {
      const codeBlock = `\n\`\`\`${p.executableCode.language || 'python'}\n${p.executableCode.code}\n\`\`\`\n`;
      onChunk(codeBlock);
    }
    else if (p.codeExecutionResult) {
      const resultBlock = p.codeExecutionResult.outcome === 'OUTCOME_OK'
        ? `\n**실행 결과:**\n\`\`\`\n${p.codeExecutionResult.output || '(출력 없음)'}\n\`\`\`\n`
        : `\n**실행 오류:** ${p.codeExecutionResult.outcome}\n`;
      onChunk(resultBlock);
    }
    // 추가: Function Call 처리
    else if (p.functionCall) {
      const fcBlock = `\n**🔧 Function Call: ${p.functionCall.name}**\n\`\`\`json\n${JSON.stringify(p.functionCall.args, null, 2)}\n\`\`\`\n`;
      onChunk(fcBlock);
      onFunctionCall({
        name: p.functionCall.name,
        args: p.functionCall.args as Record<string, unknown>
      });
    }
    else if (p.thought) { 
      onThoughtChunk(typeof p.thought === 'string' ? p.thought : JSON.stringify(p.thought));
    } 
    else if (p.text) {
      onChunk(p.text);
    }
  }
}
```

### 2.3 initializeChat에 Function Calling 설정 추가

```ts
// initializeChat 내부, tools 설정 부분 수정

// Function Calling
if (settings.toolSettings?.enableFunctionCalling && settings.toolSettings.functions.length > 0) {
  if (!chatConfig.tools) chatConfig.tools = [];
  chatConfig.tools.push({
    functionDeclarations: settings.toolSettings.functions.map(fn => ({
      name: fn.name,
      description: fn.description,
      parameters: fn.parameters,
    }))
  });
}
```

### 2.4 래퍼 함수 sendMessageStream 수정

```ts
export async function sendMessageStream(
  chat: Chat,
  message: string,
  options: {
    attachments?: Attachment[];
    signal?: AbortSignal;
    onChunk: (chunk: { text?: string; thinking?: string }) => void;
    onFunctionCall?: (fc: { name: string; args: Record<string, unknown> }) => void; // 추가
    onImageGenerated?: (image: { data: string; mimeType: string }) => void; // 추가
    onComplete: (result: { usageMetadata?: UsageMetadata; groundingMetadata?: GroundingMetadata }) => void;
    onError: (error: Error) => void;
  }
): Promise<void> {
  let usageMetadata: UsageMetadata | undefined;
  let groundingMetadata: GroundingMetadata | undefined;

  await geminiServiceImpl.sendMessageStream(
    chat,
    message,
    options.attachments || [],
    (text) => options.onChunk({ text }),
    (thinking) => options.onChunk({ thinking }),
    (metadata) => { groundingMetadata = metadata; },
    (usage) => { usageMetadata = usage; },
    options.onImageGenerated || (() => {}),
    options.onFunctionCall || (() => {}), // 추가
    options.onError,
    () => options.onComplete({ usageMetadata, groundingMetadata }),
    options.signal
  );
}
```

### 2.5 initializeChat 래퍼 함수 수정

```ts
export async function initializeChat(
  apiKey: string,
  options: {
    model: string;
    systemPrompt?: string;
    temperature?: number;
    maxTokens?: number;
    thinkingBudget?: number;
    useGoogleSearch?: boolean;
    toolSettings?: ToolSettings; // 추가
    history?: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>;
  }
): Promise<Chat | null> {
  const settings: ChatSettings = {
    model: options.model,
    systemPrompt: options.systemPrompt || '',
    temperature: options.temperature ?? 0.7,
    maxTokens: options.maxTokens ?? 8192,
    thinkingBudget: options.thinkingBudget ?? 8192,
    showThoughts: true,
    useGoogleSearch: options.useGoogleSearch ?? true,
    toolSettings: options.toolSettings, // 추가
  };

  // ... 나머지 코드
}
```

---

## 3. components/MessageList.tsx 수정

### 3.1 Props 인터페이스 확장

```ts
interface MessageListProps {
  messages: ChatMessage[];
  onEditMessage: (messageId: string) => void;
  onRegenerate: () => void;
  lastUserMessageId?: string;
  showThoughts: boolean;
  onOpenCanvas: (content: string) => void;
  isLoading?: boolean;
  modelId: string;
  onOpenThinkingSidePanel?: (thoughts: string) => void;
  // 추가
  onFunctionResponse?: (result: unknown) => void;
  pendingFunctionCall?: FunctionCallResult | null;
}
```

### 3.2 Function Call 응답 입력 UI 추가

메시지 렌더링 부분에 추가:

```tsx
{/* Function Call 결과 표시 */}
{isModel && msg.functionCalls && msg.functionCalls.length > 0 && (
  <div className="function-calls">
    <h4><Wrench size={14} /> Function Calls</h4>
    {msg.functionCalls.map((fc, idx) => (
      <div key={idx} className="function-call-item">
        <span className="fn-name">{fc.name}</span>
        <pre className="fn-args">{JSON.stringify(fc.args, null, 2)}</pre>
        {fc.result && (
          <pre className="fn-result">{JSON.stringify(fc.result, null, 2)}</pre>
        )}
      </div>
    ))}
  </div>
)}

{/* Function Response 입력 (대기 중인 function call이 있을 때) */}
{pendingFunctionCall && isLastMessage && (
  <FunctionResponseInput
    functionCall={pendingFunctionCall}
    onSubmit={onFunctionResponse}
  />
)}
```

### 3.3 FunctionResponseInput 컴포넌트 추가 (MessageList.tsx 내부)

```tsx
const FunctionResponseInput: React.FC<{
  functionCall: FunctionCallResult;
  onSubmit?: (result: unknown) => void;
}> = ({ functionCall, onSubmit }) => {
  const [response, setResponse] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = () => {
    try {
      const parsed = JSON.parse(response);
      setError(null);
      onSubmit?.(parsed);
    } catch {
      setError('유효한 JSON 형식이 아닙니다.');
    }
  };

  return (
    <div className="function-response-input">
      <h5>🔧 {functionCall.name} 응답 입력</h5>
      <textarea
        className="textarea"
        placeholder='함수 실행 결과를 JSON으로 입력하세요...\n예: {"temperature": 25, "condition": "sunny"}'
        value={response}
        onChange={(e) => setResponse(e.target.value)}
        rows={4}
      />
      {error && <div className="error-text">{error}</div>}
      <div className="btn-row">
        <button className="btn-primary" onClick={handleSubmit}>
          <Check size={14} /> 응답 전송
        </button>
      </div>
    </div>
  );
};
```

### 3.4 Import 추가

```tsx
import { Wrench, Check } from 'lucide-react';
import type { FunctionCallResult } from '../types';
```

---

## 4. components/Header.tsx 수정

### 4.1 Props 확장

```ts
interface HeaderProps {
  model: string;
  modelSpecs?: ModelSpec;
  isOnline: boolean;
  onToggleCanvas: () => void;
  onToggleStats: () => void;
  onToggleSearch: () => void;
  onToggleFunctions: () => void; // 추가
  showCanvas: boolean;
  showStats: boolean;
  hasFunctions?: boolean; // 추가
}
```

### 4.2 Function 버튼 추가

```tsx
<button
  className={`btn-icon ${hasFunctions ? 'header-functions-badge' : ''}`}
  onClick={onToggleFunctions}
  title="Function Calling (Ctrl+J)"
>
  <Wrench size={18} />
</button>
```

### 4.3 Import 추가

```tsx
import { Wrench } from 'lucide-react';
```

---

## 5. hooks/useApiKeys.ts 수정

### 5.1 rotateKey 함수 추가

```ts
const rotateKey = useCallback(() => {
  setApiKeysState(prev => {
    if (prev.length <= 1) return prev;
    const [first, ...rest] = prev;
    return [...rest, first];
  });
}, []);
```

### 5.2 removeApiKey 수정

```ts
const removeApiKey = useCallback((indexOrKey: number | string) => {
  setApiKeysState(prev => {
    if (typeof indexOrKey === 'number') {
      return prev.filter((_, i) => i !== indexOrKey);
    }
    return prev.filter(k => k !== indexOrKey);
  });
}, []);
```

### 5.3 return 문 수정

```ts
return {
  apiKeys,
  addApiKey,
  removeApiKey,
  getActiveKey,
  rotateKey,
};
```

---

## 6. hooks/useChatStream.ts 수정

### 6.1 인터페이스 확장

```ts
interface UseChatStreamReturn {
  isLoading: boolean;
  chatSession: Chat | null;
  streamResponse: (...) => Promise<void>;
  stopGeneration: () => void;
  resetChatSession: () => void;
  // 추가
  isStreaming: boolean;
  startStream: () => void;
  stopStream: () => void;
  streamController: AbortController | null;
}
```

### 6.2 함수 추가

```ts
const startStream = useCallback(() => {
  abortControllerRef.current = new AbortController();
  setIsLoading(true);
}, []);

const stopStream = useCallback(() => {
  stopGeneration();
}, [stopGeneration]);
```

### 6.3 return 문 확장

```ts
return {
  isLoading,
  chatSession,
  streamResponse,
  stopGeneration,
  resetChatSession,
  // 추가
  isStreaming: isLoading,
  startStream,
  stopStream,
  streamController: abortControllerRef.current,
};
```

---

## 7. hooks/useSessionManager.ts 수정

### 7.1 App.tsx 호환 함수 추가

```ts
const createSession = useCallback(() => {
  return createNewSession();
}, [createNewSession]);

const selectSession = useCallback((sessionId: string) => {
  setCurrentSessionId(sessionId);
}, [setCurrentSessionId]);

const addMessage = useCallback((message: ChatMessage) => {
  if (!currentSessionId) {
    const newId = createNewSession();
    setSessions(prev => prev.map(s => 
      s.id === newId 
        ? { ...s, messages: [message], lastModified: Date.now() }
        : s
    ));
  } else {
    updateSessionMessages(currentSessionId, (messages) => [...messages, message]);
  }
}, [currentSessionId, createNewSession, setSessions, updateSessionMessages]);

const updateMessage = useCallback((messageId: string, updates: Partial<ChatMessage>) => {
  if (!currentSessionId) return;
  updateSessionMessages(currentSessionId, (messages) => 
    messages.map(m => m.id === messageId ? { ...m, ...updates } : m)
  );
}, [currentSessionId, updateSessionMessages]);

const importSessions = useCallback((importedSessions: ChatSession[]) => {
  setSessions(prev => [...importedSessions, ...prev]);
}, [setSessions]);

const exportSessions = useCallback(() => {
  const dataStr = JSON.stringify(sessions, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `gemini-chat-backup-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}, [sessions]);
```

### 7.2 return 문 확장

```ts
return {
  sessions,
  setSessions,
  currentSessionId,
  setCurrentSessionId,
  currentSession,
  currentMessages,
  createNewSession,
  deleteSession,
  renameSession,
  updateSessionMessages,
  updateSessionSettings,
  updateSessionTitle,
  validateAndRecoverSessions,
  // 추가
  createSession,
  selectSession,
  addMessage,
  updateMessage,
  importSessions,
  exportSessions,
};
```

---

## 8. components/ThinkingDisplay.tsx 수정

### 8.1 export 변경

**변경 전:**
```ts
const ThinkingDisplay: React.FC<ThinkingDisplayProps> = ({ ... }) => { ... };
export default ThinkingDisplay;
```

**변경 후:**
```ts
export const ThinkingDisplay: React.FC<ThinkingDisplayProps> = ({ ... }) => { ... };
// default export 삭제
```

---

## 9. package.json 수정

### 9.1 devDependencies 추가

```bash
npm install --save-dev @types/react @types/react-dom
```
