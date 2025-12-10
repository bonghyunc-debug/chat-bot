
import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { ChatMessage, Attachment } from '../types';
import { Edit3, Copy, Check, Globe, LayoutTemplate, Download, ChevronDown, ChevronRight, Terminal, FileText, FileAudio, FileVideo, File, RotateCw, BarChart2 } from 'lucide-react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

// Declare hljs from window (loaded in index.html)
declare const hljs: any;

// Copy Format Dropdown Component
const CopyDropdown: React.FC<{
  content: string;
  messageId: string;
  onCopySuccess: (id: string) => void;
}> = ({ content, messageId, onCopySuccess }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleCopy = async (format: 'plain' | 'markdown' | 'html') => {
    let textToCopy = content;
    
    if (format === 'plain') {
      // Strip markdown syntax
      textToCopy = content
        .replace(/```[\s\S]*?```/g, (match) => match.replace(/```\w*\n?/g, '').trim())
        .replace(/`([^`]+)`/g, '$1')
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/^#+\s/gm, '')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
    } else if (format === 'html') {
      const rawHtml = marked.parse(content);
      textToCopy = DOMPurify.sanitize(rawHtml as string);
    }
    // markdown: 원본 그대로

    try {
      await navigator.clipboard.writeText(textToCopy);
      onCopySuccess(messageId);
      setIsOpen(false);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-1.5 text-slate-500 hover:text-sky-400 hover:bg-slate-800 rounded transition-colors"
        title="복사 옵션"
      >
        <Copy size={14} />
      </button>
      
      {isOpen && (
        <div className="absolute bottom-full mb-1 left-0 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 min-w-[120px] py-1">
          <button
            onClick={() => handleCopy('plain')}
            className="w-full px-3 py-1.5 text-xs text-left text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
          >
            Plain Text
          </button>
          <button
            onClick={() => handleCopy('markdown')}
            className="w-full px-3 py-1.5 text-xs text-left text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
          >
            Markdown
          </button>
          <button
            onClick={() => handleCopy('html')}
            className="w-full px-3 py-1.5 text-xs text-left text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
          >
            HTML
          </button>
        </div>
      )}
    </div>
  );
  };
  interface MessageListProps {
  messages: ChatMessage[];
  onEditMessage: (messageId: string) => void;
  onRegenerate: () => void;
  lastUserMessageId?: string;
  showThoughts: boolean;
  onOpenCanvas: (content: string) => void;
  isLoading?: boolean;
}

marked.setOptions({
  breaks: true,
  gfm: true,
});

const renderMarkdown = (content: string) => {
  const rawMarkup = marked.parse(content);
  const cleanMarkup = DOMPurify.sanitize(rawMarkup as string);
  return { __html: cleanMarkup };
};

const AttachmentPreview: React.FC<{ att: Attachment }> = React.memo(({ att }) => {
  if (att.category === 'image') {
    return (
      <div className="relative group overflow-hidden rounded-lg border border-slate-700">
        <img 
          src={`data:${att.mimeType};base64,${att.data}`} 
          alt={att.name} 
          className="max-h-64 w-full object-cover"
        />
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <span className="text-xs text-white font-mono">{att.name}</span>
        </div>
      </div>
    );
  }

  let Icon = File;
  let label = 'File';
  if (att.category === 'pdf') { Icon = FileText; label = 'PDF'; }
  else if (att.category === 'audio') { Icon = FileAudio; label = 'AUDIO'; }
  else if (att.category === 'video') { Icon = FileVideo; label = 'VIDEO'; }
  else if (att.category === 'text') { Icon = FileText; label = 'TEXT'; }

  return (
    <div className="flex items-center gap-3 p-3 bg-slate-900/80 rounded-lg border border-slate-700 min-w-[200px]">
      <div className="p-2 bg-slate-800 rounded text-sky-400">
        <Icon size={20} />
      </div>
      <div className="flex flex-col min-w-0">
        <span className="text-xs font-bold text-slate-300 truncate">{att.name}</span>
        <span className="text-[10px] text-slate-500 font-mono uppercase">{label} • {att.mimeType.split('/').pop()}</span>
      </div>
    </div>
  );
});

// --- Optimized Typewriter Component ---
const Typewriter: React.FC<{ content: string; onUpdate?: () => void }> = ({ content, onUpdate }) => {
  const [displayedContent, setDisplayedContent] = useState('');
  const contentRef = useRef(content);
  const onUpdateRef = useRef(onUpdate);

  useEffect(() => {
    contentRef.current = content;
    onUpdateRef.current = onUpdate;
  }, [content, onUpdate]);

  useEffect(() => {
    if (content.length < displayedContent.length) {
        setDisplayedContent('');
    }
  }, [content, displayedContent.length]);

  useEffect(() => {
    const interval = setInterval(() => {
      setDisplayedContent((prev) => {
        const target = contentRef.current;
        if (prev.length >= target.length) return prev;

        const remaining = target.length - prev.length;
        let step = 1;
        if (remaining > 100) step = 10;
        else if (remaining > 50) step = 5;
        else if (remaining > 20) step = 3;
        else if (remaining > 5) step = 2;
        
        const nextContent = target.slice(0, prev.length + step);
        
        if (onUpdateRef.current) {
            onUpdateRef.current();
        }
        
        return nextContent;
      });
    }, 15);

    return () => clearInterval(interval);
  }, []); 

  return (
    <div 
        className="markdown-body blinking-cursor" 
        dangerouslySetInnerHTML={renderMarkdown(displayedContent)} 
    />
  );
};

const MessageListInner: React.FC<MessageListProps> = ({
    messages,
    onEditMessage,
    onRegenerate,
    lastUserMessageId,
    showThoughts,
    onOpenCanvas,
    isLoading
}) => {
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [expandedThoughts, setExpandedThoughts] = useState<Record<string, boolean>>({});
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Track whether we should stick to the bottom
  const shouldAutoScrollRef = useRef(true);

  // Check scroll position before updates
  useLayoutEffect(() => {
      if (!containerRef.current) return;
      const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
      // If we are within 50px of the bottom, we should auto-scroll
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      shouldAutoScrollRef.current = isNearBottom;
  }, [messages, showThoughts]); // Trigger before render when data changes

  // Perform scroll after updates
  useEffect(() => {
    if (bottomRef.current && shouldAutoScrollRef.current) {
        bottomRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages, showThoughts]);

  // Handle manual scroll events to update auto-scroll capability
  const handleScroll = () => {
      if (!containerRef.current) return;
      const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
      // 바닥에서 100px 이내면 자동 스크롤 활성화
      shouldAutoScrollRef.current = scrollHeight - scrollTop - clientHeight < 100;
  };

  useEffect(() => {
    if (typeof hljs !== 'undefined' && containerRef.current) {
      // 마지막 메시지의 코드 블록만 하이라이팅
      const lastMessage = containerRef.current.querySelector('[data-message]:last-child');
      if (lastMessage) {
        lastMessage.querySelectorAll('pre code:not([data-highlighted])').forEach((block) => {
          hljs.highlightElement(block as HTMLElement);
          block.setAttribute('data-highlighted', 'true');
        });
      }
    }
  }, [messages, showThoughts]);

  const handleCopyMessage = async (content: string, messageId: string) => {
    if (!navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 1500);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const toggleThoughts = (id: string) => {
      setExpandedThoughts(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Called by Typewriter to force scroll if we are already following
  const handleTypewriterUpdate = () => {
      if (bottomRef.current && shouldAutoScrollRef.current) {
          bottomRef.current.scrollIntoView({ behavior: 'auto', block: 'end' });
      }
  };

  return (
    // We attach the ref to the outer container if we want to track scroll position, 
    // but in this layout (flex-1 overflow-y-auto is in App.tsx wrapper), we are a child.
    // To fix smart scroll, we need access to the scroll container.
    // Since App.tsx passes us into a div with overflow-y-auto, checking scroll here is tricky without a ref to parent.
    // For this implementation, we will assume standard behavior where `bottomRef` brings us to view.
    // However, to truly prevent jumpiness, this component really wants to be the scroll container itself.
    // Current App structure: <div className="flex-1 overflow-y-auto ..."><MessageList /></div>
    
    // We will leave the div structure as is but rely on the effect.
    <div 
      ref={containerRef}
      onScroll={handleScroll}
      className="w-full h-full p-4 sm:p-8 space-y-8 pb-4"
    >
      
      {/* Messages */}
      {messages.map((msg, index) => {
        const isLastMessage = index === messages.length - 1;
        const isModel = msg.role === 'model' || msg.role === 'error';
        const isUser = msg.role === 'user';

        return (
        <div
          key={msg.id}
          id={`msg-${msg.id}`}
          data-message={msg.id}
          className={`group max-w-4xl mx-auto w-full flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
        >
          {/* Label Row */}
          <div className={`flex items-center gap-2 mb-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
             <span className={`text-xs font-bold tracking-wide uppercase ${isUser ? 'text-slate-400' : 'text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-sky-400'}`}>
                 {isModel ? 'Model' : 'User'}
             </span>
             <span className="text-[10px] text-slate-600 font-mono">
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
             </span>
          </div>
          
          <div className={`relative w-full ${isUser ? 'flex justify-end' : ''}`}>
             <div
                className={`
                    relative rounded-2xl p-4 sm:p-5 text-sm leading-relaxed shadow-sm
                    ${isUser 
                        ? 'bg-slate-800 text-slate-100 max-w-[85%] rounded-tr-sm border border-slate-700/50' 
                        : 'bg-transparent text-slate-100 w-full pl-0 border-none' 
                    }
                `}
            >
            {/* User Attachments (Grid Layout) */}
            {isUser && msg.attachments && msg.attachments.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-2">
                {msg.attachments.map(att => <AttachmentPreview key={att.id} att={att} />)}
              </div>
            )}

            {/* Model Generated Image */}
            {isModel && msg.modelAttachment && (
                <div className="mb-6 group/image relative inline-block">
                    <img 
                        src={`data:${msg.modelAttachment.mimeType};base64,${msg.modelAttachment.data}`} 
                        alt="Gemini 생성 이미지" 
                        className="max-h-[400px] w-auto rounded-xl border border-slate-700 shadow-xl"
                    />
                    <a 
                        href={`data:${msg.modelAttachment.mimeType};base64,${msg.modelAttachment.data}`} 
                        download={`gemini-generated-${Date.now()}.png`}
                        className="absolute bottom-2 right-2 p-2 bg-black/60 hover:bg-black/80 text-white rounded-full opacity-0 group-hover/image:opacity-100 transition-opacity backdrop-blur-sm"
                        title="이미지 다운로드"
                    >
                        <Download size={16} />
                    </a>
                </div>
            )}

            {/* Thinking Process (Log Style) */}
            {showThoughts && isModel && msg.thoughts && (
              <div className="mb-6 rounded-md overflow-hidden border border-slate-800 bg-slate-900/40">
                <button 
                    onClick={() => toggleThoughts(msg.id)}
                    className="w-full flex items-center gap-2 p-2 bg-slate-900 border-b border-slate-800 text-xs font-mono text-slate-400 hover:text-sky-400 transition-colors"
                >
                    <Terminal size={12} />
                    <span>Thinking Process</span>
                    <span className="ml-auto">
                         {expandedThoughts[msg.id] ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    </span>
                </button>
                
                {expandedThoughts[msg.id] && (
                    <div className="p-4 bg-[#0a0f1e]">
                        <div
                        className="text-xs text-slate-400 font-mono leading-relaxed opacity-80 markdown-body" 
                        dangerouslySetInnerHTML={renderMarkdown(msg.thoughts)}
                        />
                    </div>
                )}
              </div>
            )}

            {/* Main Message Content with Typewriter Effect */}
            {(msg.content || (isModel && msg.thoughts && showThoughts)) ? ( 
              <>
                  {msg.isLoading && isModel ? (
                       <Typewriter 
                            content={msg.content} 
                            onUpdate={isLastMessage ? handleTypewriterUpdate : undefined}
                       />
                  ) : (
                      <div 
                        className="text-[15px] markdown-body" 
                        dangerouslySetInnerHTML={renderMarkdown(msg.content || '')} 
                      />
                  )}
              </>
            ) : (
              msg.isLoading && isModel && <span className="inline-block w-2 h-5 bg-sky-500 animate-pulse align-middle ml-1"></span>
            )}

             {/* Grounding Sources */}
             {isModel && msg.groundingMetadata?.groundingChunks && msg.groundingMetadata.groundingChunks.length > 0 && (
                 <div className="mt-6 pt-4 border-t border-slate-800">
                    <div className="flex items-center text-xs text-slate-500 mb-3 uppercase tracking-wider font-bold">
                        <Globe size={12} className="mr-1.5" />
                        <span>Sources</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {msg.groundingMetadata.groundingChunks.map((chunk, index) => {
                            if (chunk.web?.uri && chunk.web?.title) {
                                return (
                                    <a 
                                        key={index}
                                        href={chunk.web.uri} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className="flex items-center p-2 rounded-lg bg-slate-900/50 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 transition-all group/link"
                                    >
                                       <span className="w-5 h-5 rounded bg-slate-800 flex items-center justify-center mr-3 text-[10px] text-slate-400 font-mono group-hover/link:bg-slate-700 group-hover/link:text-white transition-colors">
                                         {index + 1}
                                       </span>
                                       <div className="flex-1 min-w-0">
                                            <p className="text-xs text-sky-400 truncate group-hover/link:underline">{chunk.web.title}</p>
                                       </div>
                                    </a>
                                );
                            }
                            return null;
                        })}
                    </div>
                 </div>
            )}
            
            {/* Token Usage Stats */}
            {isModel && msg.usageMetadata && (
                <div className="mt-4 flex items-center gap-3 text-[10px] text-slate-500 font-mono bg-slate-900/40 w-fit px-2 py-1 rounded border border-slate-800/50 select-none">
                    <div className="flex items-center gap-1.5" title="Prompt Tokens">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500/50"></span>
                        <span>In: {msg.usageMetadata.promptTokenCount.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-1.5" title="Response Tokens">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/50"></span>
                        <span>Out: {msg.usageMetadata.candidatesTokenCount.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-1.5 border-l border-slate-800 pl-2 ml-1 font-semibold text-slate-400" title="Total Tokens">
                        <span>Total: {msg.usageMetadata.totalTokenCount.toLocaleString()}</span>
                    </div>
                </div>
            )}

            {/* Action Buttons (Hover) */}
            <div className={`flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 ${isUser ? 'justify-end' : 'justify-start'}`}>
                {/* User Actions: Edit & Copy */}
                {isUser && (
                     <>
                        <button
                            onClick={() => onEditMessage(msg.id)}
                            className="p-1.5 text-slate-500 hover:text-sky-400 hover:bg-slate-800 rounded transition-colors"
                            title="수정하고 다시 보내기"
                        >
                            <Edit3 size={14} />
                        </button>
                        <button
                            onClick={() => handleCopyMessage(msg.content, msg.id)}
                            className="p-1.5 text-slate-500 hover:text-sky-400 hover:bg-slate-800 rounded transition-colors"
                            title="복사"
                        >
                            {copiedMessageId === msg.id ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                        </button>
                    </>
                )}
                
                {/* Model Actions: Regenerate, Canvas, Copy */}
                {isModel && !msg.isLoading && (
                    <>
                         {/* Regenerate Button (Only for last message) */}
                         {isLastMessage && !isLoading && (
                            <button
                                onClick={onRegenerate}
                                className="p-1.5 text-slate-500 hover:text-sky-400 hover:bg-slate-800 rounded transition-colors"
                                title="답변 다시 생성"
                            >
                                <RotateCw size={14} />
                            </button>
                         )}

                        {msg.content && (
                            <button
                                onClick={() => onOpenCanvas(msg.content)}
                                className="p-1.5 text-slate-500 hover:text-sky-400 hover:bg-slate-800 rounded transition-colors"
                                title="캔버스에서 열기"
                            >
                                <LayoutTemplate size={14} />
                            </button>
                        )}
                        
                        {msg.content && (
                            copiedMessageId === msg.id ? (
                                <span className="p-1.5 text-emerald-400">
                                    <Check size={14} />
                                </span>
                            ) : (
                                <CopyDropdown
                                    content={msg.content}
                                    messageId={msg.id}
                                    onCopySuccess={setCopiedMessageId}
                                />
                            )
                        )}
                    </>
                )}
            </div>

          </div>
          </div>
        </div>
        );
      })}
      {/* Anchor for Auto-scroll */}
      <div ref={bottomRef} />
    </div>
  );
};

export const MessageList = React.memo(MessageListInner);
