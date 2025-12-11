
import React from 'react';
import type { ChatSession } from '../types';

interface SidebarProps {
  sessions: ChatSession[];
  currentSessionId?: string | null;
  isOpen: boolean;
  onToggle: () => void;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  onDeleteSession: (id: string) => void;
  onRenameSession: (id: string, title: string) => void;
  onImport: (sessions: ChatSession[]) => void;
  onExport: () => void;
  onOpenSettings: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  sessions,
  currentSessionId,
  isOpen,
  onToggle,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  onRenameSession,
  onImport,
  onExport,
  onOpenSettings,
}) => {
  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);
        onImport(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Import failed', err);
      }
    };
    reader.readAsText(file);
  };

  return (
    <aside className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
      <div className="sidebar-header">
        <h2>세션</h2>
        <button className="btn-icon" onClick={onToggle}>{isOpen ? '⟨' : '⟩'}</button>
      </div>
      <div className="sidebar-actions">
        <button className="btn-primary" onClick={onNewSession}>새 세션</button>
        <button className="btn-secondary" onClick={onOpenSettings}>설정</button>
        <button className="btn-secondary" onClick={onExport}>내보내기</button>
        <label className="btn-secondary">
          불러오기
          <input type="file" accept="application/json" onChange={handleImport} hidden />
        </label>
      </div>
      <ul className="session-list">
        {sessions.map(session => (
          <li key={session.id} className={session.id === currentSessionId ? 'active' : ''}>
            <button className="session-title" onClick={() => onSelectSession(session.id)}>
              {session.title || 'Untitled'}
            </button>
            <div className="session-actions">
              <button onClick={() => onRenameSession(session.id, prompt('새 제목', session.title) || session.title)}>이름 변경</button>
              <button onClick={() => onDeleteSession(session.id)}>삭제</button>
            </div>
          </li>
        ))}
      </ul>
    </aside>
  );
};
