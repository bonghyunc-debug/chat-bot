
import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Send, Loader2, Edit2, Paperclip, X, Image as ImageIcon, FileText, FileAudio, FileVideo, File } from 'lucide-react';
import { Attachment } from '../types';
import { geminiServiceInstance } from '../services/geminiService';

interface ChatInputProps {
  inputText: string;
  setInputText: (text: string) => void;
  onSendMessage: (attachments: Attachment[]) => void;
  isLoading: boolean;
  isEditing: boolean;
  modelId: string;
  apiKey?: string;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  inputText,
  setInputText,
  onSendMessage,
  isLoading,
  isEditing,
  modelId,
  apiKey
}) => {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [tokenCount, setTokenCount] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea effect
  useEffect(() => {
    if (textareaRef.current) {
        // Reset height to auto first to get the correct scrollHeight
        textareaRef.current.style.height = 'auto';
        // Set new height based on scrollHeight, capped at 200px
        const newHeight = Math.min(textareaRef.current.scrollHeight, 200);
        textareaRef.current.style.height = `${newHeight}px`;
    }
  }, [inputText]);

  // Focus textarea when editing mode starts
  useEffect(() => {
    if (isEditing && textareaRef.current) {
        textareaRef.current.focus();
    }
  }, [isEditing]);

  // Debounced Token Counting
  useEffect(() => {
    if (!inputText.trim()) {
      setTokenCount(null);
      return;
    }

    const handle = setTimeout(async () => {
      // NOTE: For accurate counting, we send only text part as requested in instructions.
      // Attachments token counting requires more complex logic (converting base64 to parts).
      const contents = [
        { role: 'user', parts: [{ text: inputText }] },
      ];
      const tokens = await geminiServiceInstance.countTokens(modelId, apiKey, contents);
      setTokenCount(tokens);
    }, 400); // 400ms debounce

    return () => clearTimeout(handle);
  }, [inputText, modelId, apiKey]);

  const processFiles = async (files: FileList | File[]) => {
    const newAttachments: Attachment[] = [];

    for (const file of Array.from(files)) {
      // Basic category detection
      let category: Attachment['category'] = 'text';
      if (file.type.startsWith('image/')) category = 'image';
      else if (file.type.startsWith('audio/')) category = 'audio';
      else if (file.type.startsWith('video/')) category = 'video';
      else if (file.type === 'application/pdf') category = 'pdf';
      else {
          // Check extensions for common text/code files if type is empty or generic
          const ext = file.name.split('.').pop()?.toLowerCase();
          if (ext && ['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'c', 'cpp', 'html', 'css', 'json', 'md', 'txt', 'csv', 'xml', 'yaml', 'yml'].includes(ext)) {
              category = 'text';
          }
      }

      try {
        let data = '';
        if (category === 'text') {
            data = await file.text();
        } else {
            const base64Url = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(file);
            });
            // Strip the data URL prefix (e.g., "data:image/png;base64,")
            data = base64Url.split(',')[1];
        }

        newAttachments.push({
            id: Math.random().toString(36).substring(7),
            name: file.name,
            mimeType: file.type || 'text/plain',
            data: data,
            category: category
        });
      } catch (e) {
        console.error("Error reading file", file.name, e);
      }
    }

    setAttachments(prev => [...prev, ...newAttachments]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
        processFiles(e.target.files);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          processFiles(e.dataTransfer.files);
      }
  }, []);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
      if (e.clipboardData.files && e.clipboardData.files.length > 0) {
          e.preventDefault();
          processFiles(e.clipboardData.files);
      }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!inputText.trim() && attachments.length === 0) || isLoading) return;
    
    onSendMessage(attachments);
    setAttachments([]); 
    
    // Reset height explicitly after send
    if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        // Keep focus for continuous chatting
        textareaRef.current.focus();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Check isComposing for IME (Korean) support
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
  };

  const removeAttachment = (id: string) => {
      setAttachments(prev => prev.filter(a => a.id !== id));
  };

  // Render attachment icon based on type
  const renderAttachmentPreview = (att: Attachment) => {
      if (att.category === 'image') {
          return (
              <img 
                src={`data:${att.mimeType};base64,${att.data}`} 
                alt={att.name} 
                className="h-14 w-14 object-cover rounded-md"
              />
          );
      }
      
      let Icon = File;
      if (att.category === 'pdf') Icon = FileText;
      else if (att.category === 'audio') Icon = FileAudio;
      else if (att.category === 'video') Icon = FileVideo;
      else if (att.category === 'text') Icon = FileText;

      return (
          <div className="h-14 w-14 bg-slate-800 rounded-md flex flex-col items-center justify-center text-slate-400 p-1">
              <Icon size={20} className="mb-1 text-sky-400" />
              <span className="text-[8px] w-full truncate text-center leading-tight">{att.name.split('.').pop()}</span>
          </div>
      );
  };

  return (
    // Changed: Removed absolute positioning, added background and border for footer style
    <div className="w-full bg-slate-950 border-t border-slate-800 px-4 py-4 z-20 flex justify-center shrink-0">
      <div 
        className={`
            w-full max-w-5xl bg-slate-900 border shadow-2xl rounded-2xl overflow-hidden transition-all duration-200 relative
            ${isDragging ? 'border-sky-500 ring-2 ring-sky-500/50 bg-slate-800' : 'border-slate-700 ring-1 ring-white/5 focus-within:ring-sky-500/50'}
        `}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        {isDragging && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/90 backdrop-blur-sm">
                <div className="text-sky-400 font-bold text-lg flex items-center gap-2">
                    <Paperclip size={24} />
                    <span>여기에 파일을 드롭하여 추가</span>
                </div>
            </div>
        )}
        
        {/* Attachment List Area */}
        {attachments.length > 0 && (
          <div className="px-4 pt-3 pb-1 flex gap-3 overflow-x-auto custom-scrollbar">
            {attachments.map(att => (
                <div key={att.id} className="relative group flex-shrink-0">
                    {renderAttachmentPreview(att)}
                    <button
                        type="button"
                        onClick={() => removeAttachment(att.id)}
                        className="absolute -top-1.5 -right-1.5 bg-slate-800 hover:bg-red-500 text-slate-300 hover:text-white rounded-full p-0.5 shadow-md transition-colors border border-slate-600"
                    >
                        <X size={12} />
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-[9px] text-white truncate px-1 rounded-b-md opacity-0 group-hover:opacity-100 transition-opacity">
                        {att.name}
                    </div>
                </div>
            ))}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="flex flex-col"
        >
          <div className="flex items-end gap-2 p-2">
            <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2.5 text-slate-400 hover:text-sky-400 hover:bg-slate-800 rounded-xl transition-colors flex-shrink-0"
                disabled={isLoading}
                title="파일 첨부"
            >
                <PlusIconWithRing />
            </button>
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileSelect} 
                multiple
                className="hidden" 
            />

            <textarea
                ref={textareaRef}
                value={inputText}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                onPaste={handlePaste}
                placeholder={attachments.length > 0 ? "파일에 대해 물어보세요..." : "메시지 입력..."}
                className="flex-grow py-2.5 px-3 bg-transparent border-0 focus:ring-0 text-slate-200 placeholder-slate-500 resize-none overflow-y-auto text-sm leading-relaxed custom-scrollbar"
                rows={1}
                style={{minHeight: '42px', maxHeight: '200px'}} 
                disabled={isLoading}
            />

            <div className="flex flex-col justify-end pb-0.5">
                 <button
                    type="submit"
                    disabled={isLoading || (!inputText.trim() && attachments.length === 0)}
                    className={`p-2 rounded-xl flex-shrink-0 transition-all duration-200 flex items-center justify-center ${
                        isLoading || (!inputText.trim() && attachments.length === 0) 
                        ? 'text-slate-600 cursor-not-allowed bg-slate-800/50'
                        : isEditing 
                            ? 'bg-amber-600 hover:bg-amber-500 text-white' 
                            : 'bg-sky-600 hover:bg-sky-500 text-white'
                    }`}
                    style={{ width: '36px', height: '36px' }}
                >
                    {isLoading ? (
                    <Loader2 size={16} className="animate-spin" />
                    ) : isEditing ? (
                    <Edit2 size={16} />
                    ) : (
                    <Send size={16} className={inputText.trim() || attachments.length > 0 ? "translate-x-0.5" : ""} />
                    )}
                </button>
            </div>
          </div>
          
          <div className="px-4 py-1.5 bg-slate-950/30 flex justify-between items-center text-[10px] text-slate-500 border-t border-slate-800/50">
             <span>Shift + Enter 줄바꿈</span>
             <span className="font-mono">
                {tokenCount !== null 
                    ? `Input: ${tokenCount.toLocaleString()} tokens` 
                    : 'Input: -'}
             </span>
          </div>
        </form>
      </div>
    </div>
  );
};

const PlusIconWithRing = () => (
    <div className="relative">
        <Paperclip size={18} />
    </div>
);
