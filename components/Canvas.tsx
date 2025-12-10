
import React, { useState, useEffect, useRef } from 'react';
import { X, Copy, Check, FileText, Code, Play, MessageSquarePlus } from 'lucide-react';
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

  // Trigger syntax highlighting when switching to preview mode or when content changes
  useEffect(() => {
    if (activeTab === 'preview' && typeof hljs !== 'undefined') {
      // Small timeout to ensure DOM is rendered before highlighting
      setTimeout(() => {
        hljs.highlightAll();
      }, 0);
    }
  }, [activeTab, content]);

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
    
    // 기본 스크립트 태그 이스케이프 (XSS 방지)
    const sanitizeForIframe = (code: string) => {
      return code.replace(/<\/script>/gi, '<\\/script>');
    };

    // Regex to capture code blocks and their language identifier
    // Group 1: Language (optional), Group 2: Code content
    const codeBlockRegex = /```(\w*)\s*([\s\S]*?)```/g;
    
    let match;
    let hasCode = false;

    // Iterate through all code blocks in the markdown
    while ((match = codeBlockRegex.exec(content)) !== null) {
        hasCode = true;
        const lang = (match[1] || '').trim().toLowerCase();
        const code = match[2];

        if (lang === 'html' || lang === 'xml') {
            htmlParts.push(code);
        } else if (lang === 'css') {
            cssParts.push(code);
        } else if (lang === 'js' || lang === 'javascript') {
            jsParts.push(code);
        } else if (!lang && code.trim().startsWith('<')) {
            // Treat unlabeled blocks starting with < as HTML
            htmlParts.push(code);
        }
    }

    // If no code blocks found, but the whole content looks like HTML
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

    // Construct the final HTML document
    return `
      ${sanitizeForIframe(htmlParts.join('\n'))}
      <style>
        /* Default CSS for better reset */
        body { margin: 0; padding: 1rem; }
        ${sanitizeForIframe(cssParts.join('\n'))}
      </style>
      <script>
        try {
            ${sanitizeForIframe(jsParts.join('\n'))}
        } catch (err) {
            document.body.innerHTML += '<div style="color:red; background:#fee; padding:10px; border:1px solid red; margin-top:20px; border-radius:4px;"><strong>JS Error:</strong> ' + err.message + '</div>';
            console.error(err);
        }
      </script>
    `;
  };

  // Allow using "Tab" key for indentation in the textarea
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.target as HTMLTextAreaElement;
      const start = target.selectionStart;
      const end = target.selectionEnd;

      // Insert 2 spaces for tab
      const spaces = "  ";
      const newValue = content.substring(0, start) + spaces + content.substring(end);
      
      onUpdateContent(newValue);

      // Move cursor after the inserted spaces
      setTimeout(() => {
        if (textareaRef.current) {
            textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 2;
        }
      }, 0);
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
             <div className="flex bg-slate-800 rounded-lg p-1 mr-2">
                <button
                    onClick={() => setActiveTab('edit')}
                    className={`p-1.5 rounded-md transition-colors ${activeTab === 'edit' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
                    title="코드 편집"
                >
                    <Code size={16} />
                </button>
                <button
                    onClick={() => setActiveTab('preview')}
                    className={`p-1.5 rounded-md transition-colors ${activeTab === 'preview' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
                    title="문서 미리보기 (Markdown)"
                >
                    <FileText size={16} />
                </button>
                <button
                    onClick={() => setActiveTab('run')}
                    className={`p-1.5 rounded-md transition-colors ${activeTab === 'run' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-sky-400'}`}
                    title="실행 / 라이브 프리뷰"
                >
                    <Play size={16} />
                </button>
            </div>
            
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
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => onUpdateContent(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full h-full bg-slate-950 p-6 text-slate-200 font-mono text-sm resize-none focus:outline-none custom-scrollbar leading-relaxed"
            spellCheck={false}
            placeholder="여기에 코드를 입력하거나 수정하세요..."
          />
        )}
        
        {activeTab === 'preview' && (
          <div className="w-full h-full overflow-y-auto p-6 bg-slate-900 custom-scrollbar">
            <div 
                className="markdown-body"
                dangerouslySetInnerHTML={renderMarkdown()}
            />
          </div>
        )}

        {activeTab === 'run' && (
             <div className="w-full h-full bg-white">
                <iframe
                   title="Live Preview"
                   className="w-full h-full border-none"
                    sandbox="allow-scripts allow-popups allow-forms"
                    srcDoc={`
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <meta charset="utf-8">
                            <meta name="viewport" content="width=device-width, initial-scale=1">
                            <script src="https://cdn.tailwindcss.com"></script>
                            <style>
                                body { font-family: sans-serif; }
                                /* Scrollbar styling for inside iframe */
                                ::-webkit-scrollbar { width: 8px; height: 8px; }
                                ::-webkit-scrollbar-track { background: transparent; }
                                ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
                                ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
                            </style>
                        </head>
                        <body>
                            ${getExecutableCode()}
                        </body>
                        </html>
                    `}
                 />
             </div>
        )}
      </div>
    </div>
  );
};
