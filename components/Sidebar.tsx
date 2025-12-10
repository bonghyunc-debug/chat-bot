
import React, { useState, useRef, useEffect } from 'react';
import { ChatSession } from '../types';
import { MessageSquare, Plus, Trash2, Edit2, Download, Upload } from 'lucide-react';

interface SidebarProps {
  sessions: ChatSession[];
  currentSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onCreateSession: () => void;
  onDeleteSession: (sessionId: string, e: React.MouseEvent) => void;
  onRenameSession: (sessionId: string, newTitle: string) => void;
  onExportSessions: () => void;
  onImportSessions: (sessions: ChatSession[]) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  sessions,
  currentSessionId,
  onSelectSession,
  onCreateSession,
  onDeleteSession,
  onRenameSession,
  onExportSessions,
  onImportSessions
}) => {
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        if (Array.isArray(imported)) {
          // 날짜 문자열을 Date 객체로 변환
          const processed = imported.map((s: any) => ({
            ...s,
            messages: s.messages.map((m: any) => ({
              ...m,
              timestamp: new Date(m.timestamp)
            }))
          }));
          onImportSessions(processed);
        } else {
          alert('유효하지 않은 파일 형식입니다.');
        }
      } catch (err) {
        alert('파일을 읽는 중 오류가 발생했습니다.');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  useEffect(() => {
    if (editingSessionId && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editingSessionId]);

  const startEditing = (e: React.MouseEvent, session: ChatSession) => {
    e.stopPropagation();
    setEditingSessionId(session.id);
    setEditTitle(session.title);
  };

  const saveTitle = (e?: React.FormEvent) => {
    e?.stopPropagation(); // Prevent click propagation
    if (editingSessionId && editTitle.trim()) {
      onRenameSession(editingSessionId, editTitle.trim());
    }
    setEditingSessionId(null);
  };

  const cancelEditing = () => {
    setEditingSessionId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveTitle();
    } else if (e.key === 'Escape') {
      cancelEditing();
    }
  };

  return (
    <aside className="flex flex-col h-full w-72 bg-slate-950/50 backdrop-blur-xl border-r border-slate-800 shrink-0">
        <div className="p-5 flex items-center justify-between border-b border-slate-800/50 h-[60px]">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-gradient-to-br from-sky-400 to-indigo-500"></div>
            <h2 className="text-sm font-bold text-slate-200 tracking-wide uppercase">Workspace</h2>
          </div>
        </div>

        <div className="px-4 pt-4 pb-2 space-y-2">
          <button
            onClick={onCreateSession}
            className="w-full flex items-center justify-center gap-2 p-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg transition-all shadow-lg shadow-sky-900/20 font-medium text-sm hover:translate-y-[-1px] active:translate-y-[0px]"
          >
            <Plus size={16} />
            새 채팅
          </button>
          
          <div className="flex gap-2">
            <button
              onClick={onExportSessions}
              className="flex-1 flex items-center justify-center gap-1.5 p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors text-xs border border-slate-700"
              title="모든 대화 내보내기"
            >
              <Download size={14} />
              내보내기
            </button>
            <button
              onClick={handleImportClick}
              className="flex-1 flex items-center justify-center gap-1.5 p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors text-xs border border-slate-700"
              title="대화 가져오기"
            >
              <Upload size={14} />
              가져오기
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1 custom-scrollbar">
          {sessions.length === 0 && (
            <div className="text-center text-slate-500 text-xs mt-8">
              대화 기록이 없습니다.
            </div>
          )}
          
          {[...sessions].sort((a, b) => b.lastModified - a.lastModified).map((session) => (
            <div
              key={session.id}
              onClick={() => { 
                if (editingSessionId !== session.id) {
                    onSelectSession(session.id); 
                }
              }}
              className={`
                group relative flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all duration-200 border border-transparent
                ${currentSessionId === session.id 
                    ? 'bg-slate-800 text-sky-100 border-slate-700/50 shadow-sm' 
                    : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'}
              `}
            >
              <MessageSquare size={16} className={`flex-shrink-0 ${currentSessionId === session.id ? 'text-sky-400' : 'text-slate-500'}`} />
              
              <div className="flex-1 truncate text-sm">
                {editingSessionId === session.id ? (
                  <input
                    ref={inputRef}
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={() => saveTitle()}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full bg-slate-950 border border-sky-500/50 rounded px-1.5 py-0.5 text-white focus:outline-none focus:ring-1 focus:ring-sky-500 text-xs"
                  />
                ) : (
                  session.title || '새 채팅'
                )}
              </div>
              
              {editingSessionId !== session.id && (
                <div className={`
                    absolute right-2 flex items-center gap-1
                    ${currentSessionId === session.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
                    transition-all duration-200
                `}>
                     <button
                        onClick={(e) => startEditing(e, session)}
                        className="p-1 text-slate-400 hover:text-sky-400 rounded hover:bg-slate-700 transition-colors"
                        title="이름 변경"
                    >
                        <Edit2 size={12} />
                    </button>
                    <button
                        onClick={(e) => onDeleteSession(session.id, e)}
                        className="p-1 text-slate-400 hover:text-red-400 rounded hover:bg-slate-700 transition-colors"
                        title="삭제"
                    >
                        <Trash2 size={12} />
                    </button>
                </div>
              )}
            </div>
          ))}
        </div>
        
        <div className="p-3 border-t border-slate-800/50">
             <div className="text-[10px] text-slate-600 font-mono text-center">Gemini Pro Dashboard</div>
        </div>
      </aside>
  );
};
