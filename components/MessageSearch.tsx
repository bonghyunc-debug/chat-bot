
import React, { useMemo, useState } from 'react';
import type { ChatMessage } from '../types';

interface MessageSearchProps {
  messages: ChatMessage[];
  onResultSelect: (index: number) => void;
  onClose: () => void;
}

export const MessageSearch: React.FC<MessageSearchProps> = ({ messages, onResultSelect, onClose }) => {
  const [query, setQuery] = useState('');
  const results = useMemo(() => {
    const lower = query.toLowerCase();
    return messages
      .map((m, idx) => ({ ...m, idx }))
      .filter(m => m.content.toLowerCase().includes(lower));
  }, [messages, query]);

  return (
    <div className="message-search">
      <div className="search-header">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="메시지 검색" />
        <button onClick={onClose}>닫기</button>
      </div>
      <div className="search-results">
        {results.map(r => (
          <button key={r.id} className="search-result" onClick={() => onResultSelect(r.idx)}>
            <div className="result-role">{r.role}</div>
            <div className="result-content">{r.content.slice(0, 80)}</div>
          </button>
        ))}
        {results.length === 0 && <div className="empty">검색 결과가 없습니다.</div>}
      </div>
    </div>
  );
};
