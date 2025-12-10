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
  const [highlightedHtml, setHighlightedHtml] = useState<string>('');
  const editorRef = useRef<HTMLDivElement>(null);
  const [cursorPosition, setCursorPosition] = useState<number>(0);
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
  const [executionTime, setExecutionTime] = useState<number | null>(null);
  const iframeLoadTimeRef = useRef<number>(0);

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

  useEffect(() => {
    if (typeof hljs === 'undefined') {
      setHighlightedHtml(content.replace(/</g, '&lt;').replace(/>/g, '&gt;'));
      return;
    }

    let language = 'plaintext';
    const firstLine = content.split('\n')[0].trim();

    if (firstLine.startsWith('<!DOCTYPE') || firstLine.startsWith('<html')) {
      language = 'html';
    } else if (firstLine.startsWith('import ') || firstLine.startsWith('const ') || firstLine.startsWith('function ')) {
      language = 'javascript';
    } else if (firstLine.startsWith('def ') || firstLine.startsWith('import ') || firstLine.startsWith('class ')) {
      language = 'python';
    }

    try {
      const result = hljs.highlight(content, { language, ignoreIllegals: true });
      setHighlightedHtml(result.value);
    } catch {
      setHighlightedHtml(content.replace(/</g, '&lt;').replace(/>/g, '&gt;'));
    }
  }, [content]);

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

  // 실행 탭 전환 시 콘솔 초기화 및 실행 시간 측정 시작
  useEffect(() => {
    if (activeTab === 'run') {
      setConsoleLogs([]);
      iframeLoadTimeRef.current = performance.now();
      setExecutionTime(null);
    }
  }, [activeTab, content, enabledLibs]);

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
          const originalConsole = { 
            log: console.log, 
            error: console.error, 
            warn: console.warn, 
            info: console.info,
            debug: console.debug,
            table: console.table
          };
          
          const formatValue = (val, depth = 0) => {
            if (depth > 3) return '[...]';
            if (val === null) return 'null';
            if (val === undefined) return 'undefined';
            if (typeof val === 'function') return '[Function: ' + (val.name || 'anonymous') + ']';
            if (typeof val === 'symbol') return val.toString();
            if (Array.isArray(val)) {
              if (val.length === 0) return '[]';
              if (depth > 2) return '[Array(' + val.length + ')]';
              return '[' + val.map(v => formatValue(v, depth + 1)).join(', ') + ']';
            }
            if (typeof val === 'object') {
              try {
                const keys = Object.keys(val);
                if (keys.length === 0) return '{}';
                if (depth > 1) return '{...}';
                return '{' + keys.slice(0, 5).map(k => k + ': ' + formatValue(val[k], depth + 1)).join(', ') + (keys.length > 5 ? ', ...' : '') + '}';
              } catch {
                return '[Object]';
              }
            }
            if (typeof val === 'string') return depth > 0 ? '"' + val + '"' : val;
            return String(val);
          };
          
          const sendToParent = (type, args) => {
            try {
              const message = Array.from(args).map(a => formatValue(a)).join(' ');
              window.parent.postMessage({ 
                type: 'console', 
                logType: type, 
                message: message,
                timestamp: Date.now()
              }, '*');
            } catch(e) {
              window.parent.postMessage({ 
                type: 'console', 
                logType: 'error', 
                message: 'Console formatting error: ' + e.message,
                timestamp: Date.now()
              }, '*');
            }
          };
          
          console.log = function(...args) { sendToParent('log', args); originalConsole.log.apply(console, args); };
          console.error = function(...args) { sendToParent('error', args); originalConsole.error.apply(console, args); };
          console.warn = function(...args) { sendToParent('warn', args); originalConsole.warn.apply(console, args); };
          console.info = function(...args) { sendToParent('info', args); originalConsole.info.apply(console, args); };
          console.debug = function(...args) { sendToParent('debug', args); originalConsole.debug.apply(console, args); };
          console.table = function(data) { 
            sendToParent('log', ['[Table]', JSON.stringify(data, null, 2)]); 
            originalConsole.table.apply(console, [data]); 
          };
          
          window.onerror = function(msg, url, line, col, error) {
            let stack = '';
            if (error && error.stack) {
              stack = '\\n' + error.stack.split('\\n').slice(0, 5).join('\\n');
            }
            sendToParent('error', ['❌ ' + msg + ' (Line ' + line + ', Col ' + col + ')' + stack]);
            return false;
          };
          
          window.onunhandledrejection = function(event) {
            sendToParent('error', ['❌ Unhandled Promise Rejection: ' + event.reason]);
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

  const handleEditorScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    const target = e.target as HTMLTextAreaElement;
    const pre = target.previousElementSibling as HTMLPreElement | null;
    if (pre) {
      pre.scrollTop = target.scrollTop;
      pre.scrollLeft = target.scrollLeft;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const target = e.target as HTMLTextAreaElement;
    const start = target.selectionStart;
    const end = target.selectionEnd;

    // Tab - 들여쓰기
    if (e.key === 'Tab') {
      e.preventDefault();
      if (e.shiftKey) {
        // Shift+Tab: 내어쓰기
        const lineStart = content.lastIndexOf('\n', start - 1) + 1;
        const lineContent = content.slice(lineStart, end);
        if (lineContent.startsWith('  ')) {
          const newContent = content.slice(0, lineStart) + lineContent.slice(2) + content.slice(end);
          onUpdateContent(newContent);
          setTimeout(() => {
            if (textareaRef.current) {
              textareaRef.current.selectionStart = Math.max(lineStart, start - 2);
              textareaRef.current.selectionEnd = Math.max(lineStart, end - 2);
            }
          }, 0);
        }
      } else {
        // Tab: 들여쓰기
        const spaces = '  ';
        const newContent = content.slice(0, start) + spaces + content.slice(end);
        onUpdateContent(newContent);
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 2;
          }
        }, 0);
      }
      return;
    }

    // Ctrl+D - 현재 줄 복제
    if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
      e.preventDefault();
      const lineStart = content.lastIndexOf('\n', start - 1) + 1;
      const lineEnd = content.indexOf('\n', start);
      const line = content.slice(lineStart, lineEnd === -1 ? undefined : lineEnd);
      const newContent = content.slice(0, lineEnd === -1 ? content.length : lineEnd) + '\n' + line + content.slice(lineEnd === -1 ? content.length : lineEnd);
      onUpdateContent(newContent);
      return;
    }

    // Ctrl+/ - 주석 토글
    if ((e.ctrlKey || e.metaKey) && e.key === '/') {
      e.preventDefault();
      const lineStart = content.lastIndexOf('\n', start - 1) + 1;
      const lineEnd = content.indexOf('\n', start);
      const line = content.slice(lineStart, lineEnd === -1 ? undefined : lineEnd);
      
      let newLine: string;
      if (line.trimStart().startsWith('//')) {
        // 주석 제거
        newLine = line.replace(/^(\s*)\/\/\s?/, '$1');
      } else {
        // 주석 추가
        newLine = line.replace(/^(\s*)/, '$1// ');
      }
      
      const newContent = content.slice(0, lineStart) + newLine + content.slice(lineEnd === -1 ? content.length : lineEnd);
      onUpdateContent(newContent);
      return;
    }

    // Ctrl+Shift+F - 포매팅
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'F') {
      e.preventDefault();
      formatCode();
      return;
    }

    // Enter - 자동 들여쓰기
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const lineStart = content.lastIndexOf('\n', start - 1) + 1;
      const currentLine = content.slice(lineStart, start);
      const indent = currentLine.match(/^\s*/)?.[0] || '';
      
      // 이전 줄이 { 로 끝나면 추가 들여쓰기
      const extraIndent = currentLine.trimEnd().endsWith('{') ? '  ' : '';
      
      const newContent = content.slice(0, start) + '\n' + indent + extraIndent + content.slice(end);
      onUpdateContent(newContent);
      
      setTimeout(() => {
        if (textareaRef.current) {
          const newPos = start + 1 + indent.length + extraIndent.length;
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = newPos;
        }
      }, 0);
      return;
    }

    // 기존 Undo/Redo 단축키 유지
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
      
      // 언어 감지
      const isHtml = /<[a-z][\s\S]*>/i.test(content);
      const isJson = /^\s*[\[{]/.test(content);
      const isJs = /\b(const|let|var|function|class|import|export)\b/.test(content);
      
      if (isJson) {
        // JSON 포매팅
        try {
          const parsed = JSON.parse(content);
          formatted = JSON.stringify(parsed, null, 2);
        } catch {
          // JSON 파싱 실패 시 무시
        }
      } else if (isHtml) {
        // HTML 포매팅
        const lines = formatted.split('\n');
        let indentLevel = 0;
        const indentSize = 2;
        const voidElements = ['br', 'hr', 'img', 'input', 'meta', 'link', 'area', 'base', 'col', 'embed', 'param', 'source', 'track', 'wbr'];
        
        formatted = lines.map(line => {
          const trimmed = line.trim();
          if (!trimmed) return '';
          
          // 닫는 태그 체크
          const closingMatch = trimmed.match(/^<\/(\w+)/);
          if (closingMatch) {
            indentLevel = Math.max(0, indentLevel - 1);
          }
          
          const indented = ' '.repeat(indentLevel * indentSize) + trimmed;
          
          // 여는 태그 체크 (self-closing 및 void 제외)
          const openingMatch = trimmed.match(/^<(\w+)(?:\s|>)/);
          if (openingMatch && !trimmed.endsWith('/>') && !voidElements.includes(openingMatch[1].toLowerCase())) {
            if (!trimmed.includes('</' + openingMatch[1])) {
              indentLevel++;
            }
          }
          
          return indented;
        }).join('\n');
      } else if (isJs) {
        // JavaScript 기본 포매팅
        formatted = formatted
          // 중괄호 주변 공백
          .replace(/\{(?!\s)/g, '{ ')
          .replace(/(?<!\s)\}/g, ' }')
          // 세미콜론 후 줄바꿈 (문자열 내부 제외는 복잡하므로 단순 처리)
          .replace(/;(?!\s*\n)/g, ';\n')
          // 연속 빈 줄 제거
          .replace(/\n{3,}/g, '\n\n');
      }
      
      onUpdateContent(formatted);
    } catch (e) {
      console.error('포매팅 오류:', e);
    }
  };

  const detectLanguage = (code: string): string => {
    if (!code.trim()) return 'plaintext';
    
    const firstLine = code.split('\n')[0].trim().toLowerCase();
    
    if (firstLine.startsWith('<!doctype html') || firstLine.startsWith('<html')) return 'HTML';
    if (firstLine.startsWith('<?xml')) return 'XML';
    if (/^import\s+.*from\s+['"]/.test(code)) return 'JavaScript';
    if (/^from\s+\w+\s+import|^import\s+\w+$|^def\s+\w+\s*\(/.test(code)) return 'Python';
    if (/^package\s+\w+|^public\s+class/.test(code)) return 'Java';
    if (/^#include\s*</.test(code)) return 'C/C++';
    if (/^\s*[\[{]/.test(code) && /[\]}]\s*$/.test(code.trim())) return 'JSON';
    if (/^---\n|^[\w-]+:\s/.test(code)) return 'YAML';
    if (/^(SELECT|INSERT|UPDATE|DELETE|CREATE|DROP)\s/i.test(code)) return 'SQL';
    if (/^#!\/bin\/(bash|sh)|^#!/.test(code)) return 'Shell';
    
    return 'Code';
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
            <div className="flex items-center gap-1 mr-2 bg-slate-800/50 rounded-lg p-1">
              <button
                onClick={handleUndo}
                disabled={historyIndex <= 0}
                className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="실행 취소 (Ctrl+Z)"
              >
                <Undo2 size={14} />
              </button>
              <button
                onClick={handleRedo}
                disabled={historyIndex >= history.length - 1}
                className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="다시 실행 (Ctrl+Y)"
              >
                <Redo2 size={14} />
              </button>
              
              <div className="w-px h-4 bg-slate-700 mx-1" />
              
              <button
                onClick={formatCode}
                className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                title="코드 정리 (Ctrl+Shift+F)"
              >
                <Wand2 size={14} />
              </button>
              <button
                onClick={() => {
                  if (textareaRef.current) {
                    textareaRef.current.select();
                  }
                }}
                className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                title="전체 선택 (Ctrl+A)"
              >
                <FileText size={14} />
              </button>
              
              <div className="w-px h-4 bg-slate-700 mx-1" />
              
              <span className="text-[10px] text-slate-500 font-mono px-2">
                {detectLanguage(content)}
              </span>
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
          <div className="w-full h-full flex bg-slate-950 relative">
            <div className="flex-shrink-0 py-4 pr-2 text-right select-none bg-slate-900 border-r border-slate-800 overflow-hidden">
              {content.split('\n').map((_, idx) => (
                <div key={idx} className="px-3 text-[11px] font-mono text-slate-600 leading-6 h-6">
                  {idx + 1}
                </div>
              ))}
            </div>

            <div className="flex-1 relative overflow-auto" ref={editorRef}>
              <pre
                className="absolute inset-0 p-4 pl-4 font-mono text-sm leading-6 pointer-events-none overflow-hidden whitespace-pre-wrap break-words"
                aria-hidden="true"
              >
                <code className="hljs" dangerouslySetInnerHTML={{ __html: highlightedHtml }} />
              </pre>

              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => {
                  onUpdateContent(e.target.value);
                  setCursorPosition(e.target.selectionStart);
                }}
                onSelect={(e) => setCursorPosition((e.target as HTMLTextAreaElement).selectionStart)}
                onKeyDown={handleKeyDown}
                onScroll={handleEditorScroll}
                data-cursor={cursorPosition}
                className="absolute inset-0 w-full h-full p-4 pl-4 font-mono text-sm leading-6 bg-transparent text-transparent caret-sky-400 resize-none focus:outline-none overflow-auto"
                style={{ caretColor: '#38bdf8' }}
                spellCheck={false}
                placeholder="코드를 입력하세요..."
              />
            </div>
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
                  onLoad={() => {
                    if (iframeLoadTimeRef.current > 0) {
                      setExecutionTime(performance.now() - iframeLoadTimeRef.current);
                    }
                  }}
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
              <div className="h-1/2 bg-slate-950 flex flex-col border-t border-slate-800">
                <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Terminal size={12} className="text-slate-500" />
                    <span className="text-[10px] text-slate-400 font-mono">Console</span>
                    <span className="text-[10px] text-slate-600">({consoleLogs.length})</span>
                    {executionTime !== null && (
                      <span className="text-[10px] text-emerald-400 font-mono">⚡ {executionTime.toFixed(0)}ms</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setConsoleLogs([])}
                      className="text-[10px] text-slate-500 hover:text-slate-300 px-2 py-0.5 rounded hover:bg-slate-800"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto font-mono text-xs">
                  {consoleLogs.length === 0 ? (
                    <div className="p-4 text-slate-600 text-center">
                      콘솔 출력이 여기에 표시됩니다
                    </div>
                  ) : (
                    consoleLogs.map((log, idx) => (
                      <div
                        key={idx}
                        className={`
              px-3 py-1.5 border-b border-slate-900/50 flex items-start gap-2
              ${log.type === 'error' ? 'bg-red-950/30 text-red-400' : ''}
              ${log.type === 'warn' ? 'bg-yellow-950/30 text-yellow-400' : ''}
              ${log.type === 'info' ? 'bg-blue-950/30 text-blue-400' : ''}
              ${log.type === 'debug' ? 'bg-purple-950/30 text-purple-400' : ''}
              ${log.type === 'log' ? 'text-slate-300' : ''}
            `}
                      >
                        <span className="text-[10px] text-slate-600 select-none min-w-[50px]">
                          {new Date(log.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                          })}
                        </span>
                        <span
                          className={`
              text-[10px] uppercase w-12 flex-shrink-0
              ${log.type === 'error' ? 'text-red-500' : ''}
              ${log.type === 'warn' ? 'text-yellow-500' : ''}
              ${log.type === 'info' ? 'text-blue-500' : ''}
              ${log.type === 'debug' ? 'text-purple-500' : ''}
              ${log.type === 'log' ? 'text-slate-500' : ''}
            `}
                        >
                          {log.type}
                        </span>
                        <pre className="whitespace-pre-wrap break-all flex-1">{log.message}</pre>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
