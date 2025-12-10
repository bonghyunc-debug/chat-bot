import React, { useState, useMemo } from 'react';
import { Search, X, ChevronUp, ChevronDown } from 'lucide-react';
import { ChatMessage } from '../types';

interface MessageSearchProps {
  messages: ChatMessage[];
  onScrollToMessage: (messageId: string) => void;
}

export const MessageSearch: React.FC<MessageSearchProps> = ({ messages, onScrollToMessage }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const lowerQuery = query.toLowerCase();
    return messages
      .filter(msg => msg.content.toLowerCase().includes(lowerQuery))
      .map(msg => msg.id);
  }, [messages, query]);

  const handleNext = () => {
    if (results.length === 0) return;
    const nextIndex = (currentIndex + 1) % results.length;
    setCurrentIndex(nextIndex);
    onScrollToMessage(results[nextIndex]);
  };

  const handlePrev = () => {
    if (results.length === 0) return;
    const prevIndex = (currentIndex - 1 + results.length) % results.length;
    setCurrentIndex(prevIndex);
    onScrollToMessage(results[prevIndex]);
  };

  const handleSearch = (value: string) => {
    setQuery(value);
    setCurrentIndex(0);
    if (value.trim()) {
      const lowerQuery = value.toLowerCase();
      const firstMatch = messages.find(msg => msg.content.toLowerCase().includes(lowerQuery));
      if (firstMatch) onScrollToMessage(firstMatch.id);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="p-2 text-slate-400 hover:text-sky-400 hover:bg-slate-800 rounded-lg transition-colors"
        title="메시지 검색 (Ctrl+F)"
      >
        <Search size={18} />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5">
      <Search size={16} className="text-slate-500" />
      <input
        type="text"
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
        placeholder="메시지 검색..."
        className="bg-transparent border-none outline-none text-sm text-slate-200 placeholder-slate-500 w-40"
        autoFocus
      />
      {results.length > 0 && (
        <span className="text-xs text-slate-500 font-mono">
          {currentIndex + 1}/{results.length}
        </span>
      )}
      <div className="flex items-center gap-1 border-l border-slate-700 pl-2 ml-1">
        <button
          onClick={handlePrev}
          disabled={results.length === 0}
          className="p-1 text-slate-400 hover:text-white disabled:opacity-30"
        >
          <ChevronUp size={14} />
        </button>
        <button
          onClick={handleNext}
          disabled={results.length === 0}
          className="p-1 text-slate-400 hover:text-white disabled:opacity-30"
        >
          <ChevronDown size={14} />
        </button>
        <button
          onClick={() => { setIsOpen(false); setQuery(''); }}
          className="p-1 text-slate-400 hover:text-red-400 ml-1"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
};
