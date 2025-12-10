import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, ChevronUp, Code, Copy, Download } from 'lucide-react';
import DOMPurify from 'dompurify';

// hljs는 전역에서 로드됨
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const hljs: any;

interface CodeBlockProps {
  code: string;
  language: string;
  onOpenInCanvas?: (code: string) => void;
  showLineNumbers?: boolean;
  maxHeight?: number;
  filename?: string;
}

const LANGUAGE_CONFIG: Record<string, { icon?: string; color: string; extension: string; displayName: string }> = {
  javascript: { color: 'text-yellow-400', extension: 'js', displayName: 'JavaScript' },
  typescript: { color: 'text-blue-400', extension: 'ts', displayName: 'TypeScript' },
  jsx: { color: 'text-cyan-400', extension: 'jsx', displayName: 'JSX' },
  tsx: { color: 'text-cyan-400', extension: 'tsx', displayName: 'TSX' },
  python: { color: 'text-green-400', extension: 'py', displayName: 'Python' },
  java: { color: 'text-orange-400', extension: 'java', displayName: 'Java' },
  cpp: { color: 'text-blue-300', extension: 'cpp', displayName: 'C++' },
  c: { color: 'text-blue-300', extension: 'c', displayName: 'C' },
  csharp: { color: 'text-purple-400', extension: 'cs', displayName: 'C#' },
  go: { color: 'text-cyan-300', extension: 'go', displayName: 'Go' },
  rust: { color: 'text-orange-300', extension: 'rs', displayName: 'Rust' },
  ruby: { color: 'text-red-400', extension: 'rb', displayName: 'Ruby' },
  php: { color: 'text-indigo-400', extension: 'php', displayName: 'PHP' },
  swift: { color: 'text-orange-400', extension: 'swift', displayName: 'Swift' },
  kotlin: { color: 'text-purple-300', extension: 'kt', displayName: 'Kotlin' },
  html: { color: 'text-orange-500', extension: 'html', displayName: 'HTML' },
  css: { color: 'text-blue-400', extension: 'css', displayName: 'CSS' },
  scss: { color: 'text-pink-400', extension: 'scss', displayName: 'SCSS' },
  json: { color: 'text-yellow-300', extension: 'json', displayName: 'JSON' },
  yaml: { color: 'text-red-300', extension: 'yaml', displayName: 'YAML' },
  xml: { color: 'text-orange-400', extension: 'xml', displayName: 'XML' },
  sql: { color: 'text-blue-300', extension: 'sql', displayName: 'SQL' },
  bash: { color: 'text-green-300', extension: 'sh', displayName: 'Bash' },
  shell: { color: 'text-green-300', extension: 'sh', displayName: 'Shell' },
  powershell: { color: 'text-blue-400', extension: 'ps1', displayName: 'PowerShell' },
  markdown: { color: 'text-slate-300', extension: 'md', displayName: 'Markdown' },
  plaintext: { color: 'text-slate-400', extension: 'txt', displayName: 'Text' },
};

const DEFAULT_CONFIG = { color: 'text-slate-400', extension: 'txt', displayName: 'Code' };

const detectLanguage = (code: string, explicit?: string) => {
  if (explicit) return explicit.toLowerCase();
  if (typeof hljs !== 'undefined') {
    const result = hljs.highlightAuto(code);
    return result.language || 'plaintext';
  }
  return 'plaintext';
};

const getLanguageIcon = (lang: string) => {
  const icons: Record<string, string> = {
    javascript: 'JS',
    typescript: 'TS',
    python: 'PY',
    java: 'JAVA',
    cpp: 'C++',
    csharp: 'CS',
    go: 'GO',
    rust: 'RS',
    ruby: 'RB',
    php: 'PHP',
    swift: 'SW',
    kotlin: 'KT',
    html: 'HTML',
    css: 'CSS',
    scss: 'SCSS',
    json: 'JSON',
    yaml: 'YAML',
    xml: 'XML',
    sql: 'SQL',
    bash: 'SH',
    shell: 'SH',
    powershell: 'PS',
    markdown: 'MD',
    jsx: 'JSX',
    tsx: 'TSX',
  };
  return icons[lang] || 'CODE';
};

const getFileExtension = (lang: string) => LANGUAGE_CONFIG[lang]?.extension || DEFAULT_CONFIG.extension;

const CodeBlock: React.FC<CodeBlockProps> = ({
  code,
  language,
  onOpenInCanvas,
  showLineNumbers = false,
  maxHeight = 300,
  filename,
}) => {
  const [copied, setCopied] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => code.split('\n').length > 20);
  const [isHighlighted, setIsHighlighted] = useState(false);
  const codeRef = useRef<HTMLElement>(null);

  const effectiveLanguage = useMemo(() => detectLanguage(code, language), [code, language]);
  const languageConfig = LANGUAGE_CONFIG[effectiveLanguage] || DEFAULT_CONFIG;
  const lines = useMemo(() => code.split('\n'), [code]);

  useEffect(() => {
    if (codeRef.current && typeof hljs !== 'undefined') {
      try {
        hljs.highlightElement(codeRef.current);
        setIsHighlighted(true);
      } catch {
        setIsHighlighted(false);
      }
    }
  }, [code, effectiveLanguage]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error('복사 실패:', err);
    }
  };

  const handleDownload = () => {
    const ext = getFileExtension(effectiveLanguage);
    const blob = new Blob([code], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename || 'code'}.${ext}`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handleToggleCollapse = () => {
    setIsCollapsed((prev) => !prev);
  };

  const escapedCode = useMemo(() => DOMPurify.sanitize(code.replace(/</g, '&lt;').replace(/>/g, '&gt;')), [code]);

  return (
    <div className="rounded-lg border border-slate-700 overflow-hidden bg-slate-900/80">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <span
            className={`text-[10px] px-2 py-0.5 rounded bg-slate-700 font-mono uppercase ${languageConfig.color}`}
            title={languageConfig.displayName}
          >
            {getLanguageIcon(effectiveLanguage)}
          </span>
          <span className="text-[11px] text-slate-400 font-mono uppercase">
            {languageConfig.displayName || DEFAULT_CONFIG.displayName}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleCopy}
            className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
            title="복사"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>
          {onOpenInCanvas && (
            <button
              onClick={() => onOpenInCanvas(code)}
              className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
              title="Canvas에서 열기"
            >
              <Code size={14} />
            </button>
          )}
          <button
            onClick={handleDownload}
            className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
            title="다운로드"
          >
            <Download size={14} />
          </button>
          {lines.length > 20 && (
            <button
              onClick={handleToggleCollapse}
              className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
              title={isCollapsed ? '펼치기' : '접기'}
            >
              {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
            </button>
          )}
        </div>
      </div>

      {/* 코드 영역 */}
      <div className="relative bg-slate-950">
        <div
          className={`flex ${showLineNumbers ? 'pl-3' : ''}`}
          style={isCollapsed ? { maxHeight: maxHeight, overflow: 'hidden' } : undefined}
        >
          {showLineNumbers && (
            <div className="py-4 pr-3 text-right select-none border-r border-slate-800">
              {lines.map((_, idx) => (
                <div key={idx} className="text-[11px] font-mono text-slate-600 leading-6 h-6">
                  {idx + 1}
                </div>
              ))}
            </div>
          )}

          <pre className="flex-1 p-4 overflow-x-auto text-sm leading-6">
            <code
              ref={codeRef}
              className={`hljs language-${effectiveLanguage}`}
              dangerouslySetInnerHTML={{ __html: isHighlighted ? codeRef.current?.innerHTML || escapedCode : escapedCode }}
            />
          </pre>
        </div>

        {isCollapsed && (
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-slate-950 to-transparent pointer-events-none" />
        )}
      </div>

      {isCollapsed && (
        <div className="px-4 py-2 bg-slate-900 border-t border-slate-800 text-right">
          <button
            onClick={handleToggleCollapse}
            className="text-[11px] text-slate-300 hover:text-white font-mono"
          >
            더 보기 (총 {lines.length}줄)
          </button>
        </div>
      )}
    </div>
  );
};

export default CodeBlock;
