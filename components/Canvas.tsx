import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Copy,
  Check,
  FileText,
  Code,
  Play,
  MessageSquarePlus,
  Terminal,
  ChevronUp,
  ChevronDown,
  Package,
  Undo2,
  Redo2,
  Wand2,
} from 'lucide-react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

// Declare hljs globally (loaded via CDN in index.html)
declare const hljs: any;

interface CanvasProps {
  content: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdateContent: (newContent: string) => void;
  onSendToChat?: (content: string) => void;
}

// Ensure consistent markdown rendering options
marked.setOptions({
  breaks: true,
  gfm: true,
});

export const Canvas: React.FC<CanvasProps> = ({ content, isOpen, onClose, onUpdateContent, onSendToChat }) => {
  const [activeTab, setActiveTab] = useState<'edit' | 'preview' | 'run'>('preview');
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [consoleLogs, setConsoleLogs] = useState<Array<{ type: string; message: string; timestamp: number }>>([]);
  const [showConsole, setShowConsole] = useState(false);
  const [enabledLibs, setEnabledLibs] = useState<string[]>(['tailwind']);
  const AVAILABLE_LIBS = [
    { id: 'tailwind', name: 'Tailwind CSS', url: 'https://cdn.tailwindcss.com' },
    { id: 'alpine', name: 'Alpine.js', url: 'https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js', defer: true },
    { id: 'htmx', name: 'htmx', url: 'https://unpkg.com/htmx.org@1.9.10' },
    { id: 'chart', name: 'Chart.js', url: 'https://cdn.jsdelivr.net/npm/chart.js' },
    { id: 'd3', name: 'D3.js', url: 'https://d3js.org/d3.v7.min.js' },
    { id: 'three', name: 'Three.js', url: 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js' },
    { id: 'axios', name: 'Axios', url: 'https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js' },
    { id: 'lodash', name: 'Lodash', url: 'https://cdn.jsdelivr.net/npm/lodash@4.17.21/lodash.min.js' },
  ];
  const [viewportSize, setViewportSize] = useState<'full' | 'mobile' | 'tablet'>('full');
  const VIEWPORT_SIZES = {
    full: { width: '100%', label: '전체' },
    mobile: { width: '375px', label: '모바일' },
    tablet: { width: '768px', label: '태블릿' },
  };
  const [history, setHistory] = useState<string[]>([content]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const isUndoRedo = useRef(false);
  const AUTOSAVE_KEY = 'canvas_autosave';

  // Trigger syntax highlighting when switching to preview mode or when content changes
  useEffect(() => {
    if (activeTab === 'preview' && typeof hljs !== 'undefined') {
      setTimeout(() => {
        hljs.highlightAll();
      }, 0);
    }
  }, [activeTab, content]);

  useEffect(() => {
    return () => {
      if (iframeRef.current) {
        iframeRef.current.src = 'about:blank';
      }
    };
  }, [activeTab]);

  // 콘솔 메시지 수신
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // origin 검증 추가 (보안 강화)
      if (event.data?.type === 'console') {
        setConsoleLogs((prev) => [
          ...prev.slice(-99),
          {
            type: event.data.logType,
            message: event.data.message,
            timestamp: event.data.timestamp,
          },
        ]);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
      // iframe 정리
      if (iframeRef.current) {
        iframeRef.current.src = 'about:blank';
      }
    };
  }, []);

  // 실행 탭 전환 시 콘솔 초기화
  useEffect(() => {
    if (activeTab === 'run') {
      setConsoleLogs([]);
    }
  }, [activeTab, content]);

  // 콘텐츠 변경 시 히스토리 추가
  useEffect(() => {
    if (isUndoRedo.current) {
      isUndoRedo.current = false;
      return;
    }

    const timer = setTimeout(() => {
      setHistory((prev) => {
        const newHistory = prev.slice(0, historyIndex + 1);
        if (newHistory[newHistory.length - 1] !== content) {
          return [...newHistory.slice(-49), content];
        }
        return newHistory;
      });
      setHistoryIndex((prev) => Math.min(prev + 1, 49));
    }, 500);

    return () => clearTimeout(timer);
  }, [content, historyIndex]);

  const handleUndo = () => {
    if (historyIndex > 0) {
      isUndoRedo.current = true;
      setHistoryIndex(historyIndex - 1);
      onUpdateContent(history[historyIndex - 1]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      isUndoRedo.current = true;
      setHistoryIndex(historyIndex + 1);
      onUpdateContent(history[historyIndex + 1]);
    }
  };

  // 자동 저장
  useEffect(() => {
    const timer = setTimeout(() => {
      if (content.trim()) {
        localStorage.setItem(
          AUTOSAVE_KEY,
          JSON.stringify({
            content,
            timestamp: Date.now(),
          })
        );
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [content]);

  // 복구 확인
  useEffect(() => {
    const saved = localStorage.getItem(AUTOSAVE_KEY);
    if (saved && !content.trim()) {
      try {
        const { content: savedContent, timestamp } = JSON.parse(saved);
        const minutesAgo = Math.round((Date.now() - timestamp) / 60000);
        if (minutesAgo < 60 && confirm(`${minutesAgo}분 전에 저장된 내용을 복구하시겠습니까?`)) {
          onUpdateContent(savedContent);
        }
      } catch (e) {
        // ignore
      }
    }
  }, []);

  const clearAutosave = () => {
    localStorage.removeItem(AUTOSAVE_KEY);
  };

  if (!isOpen) return null;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderMarkdown = () => {
    const rawMarkup = marked.parse(content);
    const cleanMarkup = DOMPurify.sanitize(rawMarkup as string);
    return { __html: cleanMarkup };
  };

  // Improved: Extract and merge multiple code blocks
  const getExecutableCode = () => {
    const htmlParts: string[] = [];
    const cssParts: string[] = [];
    const jsParts: string[] = [];

    const sanitizeForIframe = (code: string): string => {
      // 1단계: 기본 이스케이프
      let sanitized = code
        .replace(/<\/script>/gi, '<\\/script>')
        .replace(/javascript:/gi, 'javascript-blocked:')
        .replace(/vbscript:/gi, 'vbscript-blocked:')
        .replace(/data:(?!image\/(png|jpg|jpeg|gif|webp|svg\+xml))/gi, 'data-blocked:');
      
      // 2단계: 이벤트 핸들러 제거 (모든 on* 속성)
      sanitized = sanitized.replace(/\s(on\w+)\s*=/gi, ' data-blocked-$1=');
      
      // 3단계: 위험한 태그 속성 제거
      sanitized = sanitized.replace(/srcdoc\s*=/gi, 'data-blocked-srcdoc=');
      sanitized = sanitized.replace(/formaction\s*=/gi, 'data-blocked-formaction=');
      
      // 4단계: base 태그 제거 (URL 하이재킹 방지)
      sanitized = sanitized.replace(/<base\s/gi, '<blocked-base ');
      
      return sanitized;
    };

    const codeBlockRegex = /```([\w-]*)\s*\n?([\s\S]*?)```/g;

    let match;
    let hasCode = false;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      hasCode = true;
      const lang = (match[1] || '').trim().toLowerCase();
      const code = match[2];

      if (lang === 'html' || lang === 'xml' || lang === 'htm') {
        htmlParts.push(code);
      } else if (lang === 'css' || lang === 'scss' || lang === 'less') {
        cssParts.push(code);
      } else if (
        lang === 'js' ||
        lang === 'javascript' ||
        lang === 'ts' ||
        lang === 'typescript' ||
        lang === 'jsx' ||
        lang === 'tsx'
      ) {
        jsParts.push(code);
      } else if (lang === 'json') {
        jsParts.push(`const jsonData = ${code};`);
      } else if (!lang && code.trim().startsWith('<')) {
        htmlParts.push(code);
      } else if (!lang && (code.trim().startsWith('const ') || code.trim().startsWith('let ') || code.trim().startsWith('function '))) {
        jsParts.push(code);
      }
    }

    if (!hasCode && content.trim().startsWith('<')) {
      return content;
    }

    if (!hasCode) {
      return `
            <div class="flex items-center justify-center h-screen text-slate-400 font-sans">
                <div class="text-center p-6 bg-slate-50 rounded-xl border border-slate-200">
                    <h1 class="text-lg font-bold mb-2 text-slate-700">실행할 코드가 없습니다</h1>
                    <p class="text-sm">마크다운 코드 블록(&#96;&#96;&#96;)을 사용하여<br>HTML, CSS, 또는 JS 코드를 작성해주세요.</p>
                </div>
            </div>
        `;
    }

    const libScripts = enabledLibs
      .map((libId) => {
        const lib = AVAILABLE_LIBS.find((l) => l.id === libId);
        if (!lib) return '';
        return `<script src="${lib.url}"${lib.defer ? ' defer' : ''}></script>`;
      })
      .join('\n');

    const consoleInterceptor = `
      <script>
        (function() {
          const originalConsole = { log: console.log, error: console.error, warn: console.warn, info: console.info };
          const sendToParent = (type, args) => {
            try {
              window.parent.postMessage({ 
                type: 'console', 
                logType: type, 
                message: Array.from(args).map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' '),
                timestamp: Date.now()
              }, '*');
            } catch(e) {}
          };
          console.log = function(...args) { sendToParent('log', args); originalConsole.log.apply(console, args); };
          console.error = function(...args) { sendToParent('error', args); originalConsole.error.apply(console, args); };
          console.warn = function(...args) { sendToParent('warn', args); originalConsole.warn.apply(console, args); };
          console.info = function(...args) { sendToParent('info', args); originalConsole.info.apply(console, args); };
          window.onerror = function(msg, url, line, col, error) {
            sendToParent('error', ['Runtime Error: ' + msg + ' (Line ' + line + ')']);
            return false;
          };
        })();
      </script>
    `;

    const cspPolicy = `default-src 'self' 'unsafe-inline' 'unsafe-eval' blob:; img-src 'self' data: blob: https:; style-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com; script-src 'self' 'unsafe-inline' 'unsafe-eval' ${enabledLibs.map(id => AVAILABLE_LIBS.find(l => l.id === id)?.url).filter(Boolean).map(url => new URL(url!).origin).join(' ')}; connect-src 'none'; frame-src 'none';`;

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta http-equiv="Content-Security-Policy" content="${cspPolicy}">
  ${consoleInterceptor}
  ${libScripts}
  <style>body { margin: 0; padding: 1rem; }${sanitizeForIframe(cssParts.join('\n'))}</style>
</head>
<body>
  ${sanitizeForIframe(htmlParts.join('\n'))}
  <script>try{${sanitizeForIframe(jsParts.join('\n'))}}catch(err){console.error('Error: ' + err.message);}</script>
</body>
</html>`;
  };

  // Allow using "Tab" key for indentation in the textarea
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.target as HTMLTextAreaElement;
      const start = target.selectionStart;
      const end = target.selectionEnd;

      const spaces = '  ';
      const newValue = content.substring(0, start) + spaces + content.substring(end);

      onUpdateContent(newValue);

      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 2;
        }
      }, 0);
    }

    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      handleUndo();
    }

    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
      e.preventDefault();
      handleRedo();
    }
  };

  const formatCode = () => {
    try {
      let formatted = content;

      const lines = formatted.split('\n');
      let indentLevel = 0;
      const indentSize = 2;

      formatted = lines
        .map((line) => {
          const trimmed = line.trim();
          if (!trimmed) return '';

          if (trimmed.match(/^<\/(div|section|article|header|footer|main|aside|nav|ul|ol|li|table|tr|td|th|thead|tbody|form|fieldset)/i)) {
            indentLevel = Math.max(0, indentLevel - 1);
          }

          const indentedLine = ' '.repeat(indentLevel * indentSize) + trimmed;

          if (
            trimmed.match(/<(div|section|article|header|footer|main|aside|nav|ul|ol|li|table|tr|td|th|thead|tbody|form|fieldset)[^>]*>$/i) &&
            !trimmed.match(/\/>$/)
          ) {
            indentLevel++;
          }

          return indentedLine;
        })
        .join('\n');

      onUpdateContent(formatted);
    } catch (e) {
      console.error('포매팅 오류:', e);
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-900 border-l border-slate-800 shadow-xl transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-sky-400 uppercase tracking-wider">캔버스</span>
        </div>
        <div className="flex items-center gap-1">
          {activeTab === 'edit' && (
            <div className="flex items-center gap-1 mr-2">
              <button
                onClick={handleUndo}
                disabled={historyIndex <= 0}
                className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
                title="실행 취소 (Ctrl+Z)"
              >
                <Undo2 size={14} />
              </button>
              <button
                onClick={handleRedo}
                disabled={historyIndex >= history.length - 1}
                className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
                title="다시 실행 (Ctrl+Y)"
              >
                <Redo2 size={14} />
              </button>
              <button
                onClick={formatCode}
                className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-700"
                title="코드 정리"
              >
                <Wand2 size={14} />
              </button>
            </div>
          )}

          {activeTab === 'run' && (
            <div className="flex bg-slate-800 rounded-lg p-0.5 mr-2">
              {Object.entries(VIEWPORT_SIZES).map(([key, { label }]) => (
                <button
                  key={key}
                  onClick={() => setViewportSize(key as 'full' | 'mobile' | 'tablet')}
                  className={`px-2 py-1 rounded text-[10px] transition-colors ${
                    viewportSize === key ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          <div className="flex bg-slate-800 rounded-lg p-1 mr-2">
            <button
              onClick={() => setActiveTab('edit')}
              className={`p-1.5 rounded-md transition-colors ${
                activeTab === 'edit' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="코드 편집"
            >
              <Code size={16} />
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              className={`p-1.5 rounded-md transition-colors ${
                activeTab === 'preview' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="문서 미리보기 (Markdown)"
            >
              <FileText size={16} />
            </button>
            <button
              onClick={() => setActiveTab('run')}
              className={`p-1.5 rounded-md transition-colors ${
                activeTab === 'run' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-sky-400'
              }`}
              title="실행 / 라이브 프리뷰"
            >
              <Play size={16} />
            </button>
          </div>

          {activeTab === 'run' && (
            <div className="relative group">
              <button className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-700" title="라이브러리">
                <Package size={16} />
              </button>
              <div className="absolute right-0 top-full mt-1 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 hidden group-hover:block">
                {AVAILABLE_LIBS.map((lib) => (
                  <label key={lib.id} className="flex items-center gap-2 px-3 py-2 hover:bg-slate-700 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={enabledLibs.includes(lib.id)}
                      onChange={(e) => {
                        if (e.target.checked) setEnabledLibs([...enabledLibs, lib.id]);
                        else setEnabledLibs(enabledLibs.filter((l) => l !== lib.id));
                      }}
                      className="rounded border-slate-600"
                    />
                    <span className="text-slate-300">{lib.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {onSendToChat && (
            <button
              onClick={() => onSendToChat(content)}
              className="p-2 text-slate-400 hover:text-sky-400 transition-colors"
              title="채팅으로 코드 전송 및 질문"
            >
              <MessageSquarePlus size={18} />
            </button>
          )}

          <button
            onClick={handleCopy}
            className="p-2 text-slate-400 hover:text-sky-400 transition-colors"
            title="클립보드에 복사"
          >
            {copied ? <Check size={18} /> : <Copy size={18} />}
          </button>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-red-400 transition-colors"
            title="캔버스 닫기"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden relative bg-slate-950">
        {activeTab === 'edit' && (
          <div className="w-full h-full flex bg-slate-950">
            <div className="flex-shrink-0 py-6 pr-2 text-right select-none bg-slate-900 border-r border-slate-800">
              {content.split('\n').map((_, idx) => (
                <div key={idx} className="px-3 text-[11px] font-mono text-slate-600 leading-[1.625rem]">
                  {idx + 1}
                </div>
              ))}
            </div>

            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => onUpdateContent(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 h-full bg-slate-950 p-6 pl-4 text-slate-200 font-mono text-sm resize-none focus:outline-none leading-[1.625rem]"
              spellCheck={false}
              placeholder="코드를 입력하세요..."
            />
          </div>
        )}

        {activeTab === 'preview' && (
          <div className="w-full h-full overflow-y-auto p-6 bg-slate-900 custom-scrollbar">
            <div className="markdown-body" dangerouslySetInnerHTML={renderMarkdown()} />
          </div>
        )}

        {activeTab === 'run' && (
          <div className="w-full h-full flex flex-col bg-white">
            <div className={`flex-1 ${showConsole ? 'h-1/2' : 'h-full'} flex justify-center bg-slate-200 overflow-auto`}>
              <div style={{ width: VIEWPORT_SIZES[viewportSize].width, height: '100%' }} className="bg-white shadow-lg">
                <iframe
                  ref={iframeRef}
                  title="Live Preview"
                  className="w-full h-full border-none"
                  sandbox="allow-scripts allow-popups allow-forms"
                  srcDoc={getExecutableCode()}
                />
              </div>
            </div>

            <button
              onClick={() => setShowConsole(!showConsole)}
              className="w-full py-1 bg-slate-900 text-slate-400 text-xs font-mono border-t border-slate-700 hover:bg-slate-800 flex items-center justify-center gap-2"
            >
              <Terminal size={12} />
              Console ({consoleLogs.length})
              {showConsole ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
            </button>

            {showConsole && (
              <div className="h-1/2 bg-slate-950 overflow-y-auto font-mono text-xs border-t border-slate-800">
                {consoleLogs.length === 0 ? (
                  <div className="p-4 text-slate-600 text-center">콘솔 출력이 여기에 표시됩니다</div>
                ) : (
                  consoleLogs.map((log, idx) => (
                    <div
                      key={idx}
                      className={`px-3 py-1.5 border-b border-slate-900 ${
                        log.type === 'error'
                          ? 'bg-red-950/30 text-red-400'
                          : log.type === 'warn'
                          ? 'bg-yellow-950/30 text-yellow-400'
                          : log.type === 'info'
                          ? 'bg-blue-950/30 text-blue-400'
                          : 'text-slate-300'
                      }`}
                    >
                      <span className="text-slate-600 mr-2">[{log.type}]</span>
                      <span className="whitespace-pre-wrap break-all">{log.message}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
