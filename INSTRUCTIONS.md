# Gemini Chat UI - 완전한 수정 지시문

> **⚠️ 중요: 본 문서에 명시된 수정 사항만 적용하세요. 명시되지 않은 코드는 절대 수정하지 마세요.**

---

## 📋 목차

1. [개요](#1-개요)
2. [작업 순서](#2-작업-순서)
3. [신규 파일 생성](#3-신규-파일-생성)
4. [기존 파일 수정](#4-기존-파일-수정)
5. [새 기능 추가](#5-새-기능-추가)
6. [빌드 및 검증](#6-빌드-및-검증)

---

## 1. 개요

### 1.1 작업 범위

| 구분 | 파일 수 | 설명 |
|------|--------|------|
| 신규 생성 | 11개 | 엔트리, 컴포넌트, 스타일 |
| 수정 | 8개 | 타입, 상수, 훅, 서비스 |
| 새 기능 | 2개 | Function Calling UI, 멀티턴 이미지 편집 |

### 1.2 최종 목표

- ✅ 프로덕션 빌드 성공
- ✅ TypeScript 오류 0개
- ✅ 모든 핵심 기능 동작
- ✅ Function Calling UI 구현
- ✅ 멀티턴 이미지 편집 구현

---

## 2. 작업 순서

```
1단계: 신규 파일 생성
├── index.html
├── main.tsx
├── App.tsx
├── App.css
├── components/index.ts
├── components/Canvas.tsx
├── components/UsageStats.tsx
├── components/SettingsModal.tsx
├── components/FunctionCallingPanel.tsx [NEW]
└── components/ImageEditToolbar.tsx [NEW]

2단계: 기존 파일 수정
├── types.ts
├── constants.ts
├── hooks/useApiKeys.ts
├── hooks/useChatStream.ts
├── hooks/useSessionManager.ts
├── services/geminiService.ts
├── components/ThinkingDisplay.tsx
└── components/MessageList.tsx

3단계: 의존성 설치
└── npm install

4단계: 빌드 검증
└── npm run build
```

---

## 3. 신규 파일 생성

### 3.1 index.html (루트)

```html
<!DOCTYPE html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="Gemini Chat UI - Google Gemini API를 활용한 AI 채팅 인터페이스" />
    <meta name="theme-color" content="#1a1a2e" />
    <title>Gemini Chat</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      html, body, #root { height: 100%; width: 100%; }
      body {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        background: #0f0f1a;
        color: #e0e0e0;
        overflow: hidden;
      }
      #root { display: flex; }
      .app-loader {
        position: fixed; inset: 0;
        display: flex; align-items: center; justify-content: center;
        background: #0f0f1a;
      }
      .app-loader::after {
        content: '';
        width: 40px; height: 40px;
        border: 3px solid #333;
        border-top-color: #6366f1;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      }
      @keyframes spin { to { transform: rotate(360deg); } }
    </style>
  </head>
  <body>
    <div id="root">
      <div class="app-loader"></div>
    </div>
    <script type="module" src="/main.tsx"></script>
  </body>
</html>
```

### 3.2 main.tsx (루트)

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './App.css';

const container = document.getElementById('root');
if (!container) throw new Error('Root element not found');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

### 3.3 components/index.ts

```ts
export { ErrorBoundary } from './ErrorBoundary';
export { Header } from './Header';
export { Sidebar } from './Sidebar';
export { ChatInput } from './ChatInput';
export { MessageList } from './MessageList';
export { MessageSearch } from './MessageSearch';
export { ThinkingDisplay } from './ThinkingDisplay';
export { SettingsModal } from './SettingsModal';
export { Canvas } from './Canvas';
export { UsageStats } from './UsageStats';
export { FunctionCallingPanel } from './FunctionCallingPanel';
export { ImageEditToolbar } from './ImageEditToolbar';
```

---

**나머지 파일들은 별도 문서 참조:**

- `FILES_APP.md` - App.tsx 전체 코드
- `FILES_CSS.md` - App.css 전체 코드
- `FILES_COMPONENTS.md` - Canvas, UsageStats, SettingsModal, FunctionCallingPanel, ImageEditToolbar
- `FILES_MODIFICATIONS.md` - 기존 파일 수정 사항

---

## 4. 기존 파일 수정

### 4.1 types.ts 수정

#### ThoughtSupportingPart 인터페이스 수정 (Part 상속 제거)

**변경 전:**
```ts
export interface ThoughtSupportingPart extends Part {
    thought?: unknown;
    inlineData?: { mimeType: string; data: string };
    text?: string;
}
```

**변경 후:**
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

#### FunctionCall 관련 타입 추가

```ts
export interface FunctionCallResult {
  name: string;
  args: Record<string, unknown>;
  result?: unknown;
  error?: string;
}

export interface ImageEditRequest {
  type: 'inpaint' | 'outpaint' | 'style' | 'enhance';
  maskData?: string; // base64 encoded mask
  prompt?: string;
  style?: string;
}
```

### 4.2 hooks/useApiKeys.ts

#### rotateKey 함수 추가

```ts
const rotateKey = useCallback(() => {
  setApiKeysState(prev => {
    if (prev.length <= 1) return prev;
    const [first, ...rest] = prev;
    return [...rest, first];
  });
}, []);
```

#### removeApiKey 수정

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

#### return 문에 rotateKey 추가

```ts
return {
  apiKeys,
  addApiKey,
  removeApiKey,
  getActiveKey,
  rotateKey,
};
```

### 4.3 hooks/useChatStream.ts

#### 인터페이스 확장

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

#### 함수 추가

```ts
const startStream = useCallback(() => {
  abortControllerRef.current = new AbortController();
  setIsLoading(true);
}, []);

const stopStream = useCallback(() => {
  stopGeneration();
}, [stopGeneration]);
```

### 4.4 hooks/useSessionManager.ts

#### App.tsx 호환 함수 추가

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

### 4.5 components/ThinkingDisplay.tsx

#### export 변경

**변경 전:**
```ts
const ThinkingDisplay: React.FC<ThinkingDisplayProps> = ({ ... }) => { ... };
export default ThinkingDisplay;
```

**변경 후:**
```ts
export const ThinkingDisplay: React.FC<ThinkingDisplayProps> = ({ ... }) => { ... };
// export default 삭제
```

### 4.6 components/MessageList.tsx

#### import 수정

```ts
import { ThinkingDisplay } from './ThinkingDisplay';
```

#### Function Call 결과 표시 추가 (메시지 렌더링 부분)

```tsx
{/* Function Call 결과 표시 */}
{msg.functionCalls && msg.functionCalls.length > 0 && (
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
```

---

## 5. 새 기능 추가

### 5.1 Function Calling UI

**새 파일: `components/FunctionCallingPanel.tsx`**

기능:
- 함수 정의 CRUD (이름, 설명, 파라미터)
- JSON Schema 파라미터 편집기
- 함수 호출 결과 시뮬레이션
- 함수 템플릿 (날씨, 검색, 계산기 등)

### 5.2 멀티턴 이미지 편집

**새 파일: `components/ImageEditToolbar.tsx`**

기능:
- 이미지 영역 선택 (마스크 그리기)
- Inpainting (선택 영역 수정)
- Outpainting (이미지 확장)
- 스타일 변환
- 편집 히스토리 (Undo/Redo)

### 5.3 geminiService.ts 수정

#### Function Call 처리 추가

```ts
// sendMessageStream 내부에 추가
else if (p.functionCall) {
  const fcBlock = `\n**🔧 Function Call: ${p.functionCall.name}**\n\`\`\`json\n${JSON.stringify(p.functionCall.args, null, 2)}\n\`\`\`\n`;
  onChunk(fcBlock);
  onFunctionCall?.({
    name: p.functionCall.name,
    args: p.functionCall.args as Record<string, unknown>
  });
}
```

#### 이미지 편집 요청 처리

```ts
// initializeChat에 이미지 편집 설정 추가
if (settings.toolSettings?.enableImageEditing) {
  chatConfig.tools = chatConfig.tools || [];
  // 이미지 편집 관련 도구 설정
}
```

---

## 6. 빌드 및 검증

### 6.1 의존성 설치

```bash
npm install
npm install --save-dev @types/react @types/react-dom
```

### 6.2 빌드 테스트

```bash
npm run build
```

### 6.3 예상 출력

```
✓ built in ~6s
dist/
├── index.html (2.07 KB)
└── assets/
    ├── index.css (~22 KB)
    ├── vendor-react.js (~12 KB)
    ├── vendor-ui.js (~20 KB)
    ├── vendor-markdown.js (~62 KB)
    ├── vendor-genai.js (~220 KB)
    └── index.js (~265 KB)
```

### 6.4 TypeScript 검증 (선택)

```bash
npx tsc --noEmit
```

오류 0개 예상

---

## ⚠️ 주의사항

1. **본 문서에 명시된 수정 사항만 적용하세요.**
2. **명시되지 않은 코드는 절대 수정하지 마세요.**
3. 파일 생성/수정 순서를 준수하세요.
4. 각 단계 후 빌드 테스트 권장
5. 문제 발생 시 해당 단계만 롤백

---

## 📁 관련 문서

| 파일 | 설명 |
|------|------|
| `FILES_APP.md` | App.tsx 전체 코드 |
| `FILES_CSS.md` | App.css 전체 코드 |
| `FILES_COMPONENTS.md` | 새 컴포넌트 전체 코드 |
| `FILES_MODIFICATIONS.md` | 기존 파일 수정 diff |
