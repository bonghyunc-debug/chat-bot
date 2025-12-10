
import React from 'react';
import { PanelRightClose, PanelRightOpen, SlidersHorizontal, BarChart2, Image } from 'lucide-react';
import { MessageSearch } from './MessageSearch';
import { ChatMessage } from '../types';

interface HeaderProps {
  onClearChat: () => void;
  onOpenSettingsModal: () => void; 
  isLoading: boolean;
  currentModelName?: string;
  onToggleSidebar: () => void; // Kept for prop compatibility but unused in UI
  isCanvasOpen: boolean;
  onToggleCanvas: () => void;
  isControlPanelOpen?: boolean;
  onOpenUsageStats?: () => void;
  onOpenImageGallery?: () => void;
  messages?: ChatMessage[];
  onScrollToMessage?: (messageId: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onClearChat,
  onOpenSettingsModal,
  isLoading,
  currentModelName,
  isCanvasOpen,
  onToggleCanvas,
  isControlPanelOpen,
  onOpenUsageStats,
  onOpenImageGallery,
  messages,
  onScrollToMessage
}) => {
  return (
    <header className="bg-slate-950/80 backdrop-blur-sm px-6 h-[60px] shadow-sm flex items-center justify-between z-10 border-b border-slate-800 shrink-0">
      <div className="flex items-center gap-4">
        {/* Hamburger Menu Removed for Desktop Optimization */}

        <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-slate-200">Gemini Playground</h1>
            {currentModelName && (
            <span
                className="text-xs text-sky-400 font-mono px-2 py-0.5 rounded bg-sky-950/30 border border-sky-900/50 tracking-wide"
            >
                {currentModelName}
            </span>
            )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
            onClick={onToggleCanvas}
            className={`p-2 rounded-lg transition-colors border ${isCanvasOpen ? 'bg-sky-950 text-sky-400 border-sky-800' : 'text-slate-400 hover:text-white hover:bg-slate-800 border-transparent'}`}
            title={isCanvasOpen ? "캔버스 닫기" : "캔버스 열기"}
        >
            {isCanvasOpen ? <PanelRightClose size={18} /> : <PanelRightOpen size={18} />}
        </button>

        <div className="h-4 w-px bg-slate-800 mx-1"></div>

        {onOpenUsageStats && (
          <button
            onClick={onOpenUsageStats}
            className="p-2 rounded-lg transition-colors text-slate-400 hover:text-emerald-400 hover:bg-slate-800 border border-transparent"
            title="토큰 사용량 통계"
          >
            <BarChart2 size={18} />
          </button>
        )}

        {onOpenImageGallery && (
          <button
            onClick={onOpenImageGallery}
            className="p-2 rounded-lg transition-colors text-slate-400 hover:text-purple-400 hover:bg-slate-800 border border-transparent"
            title="이미지 갤러리"
          >
            <Image size={18} />
          </button>
        )}

        {messages && onScrollToMessage && (
          <MessageSearch messages={messages} onScrollToMessage={onScrollToMessage} />
        )}

        <button
          onClick={onOpenSettingsModal}
          className={`p-2 px-3 rounded-lg transition-colors flex items-center gap-2 border ${isControlPanelOpen ? 'bg-slate-800 text-sky-400 border-slate-700' : 'text-slate-400 hover:text-white hover:bg-slate-800 border-transparent'}`}
          disabled={isLoading}
          title="설정 및 파라미터"
        >
          <SlidersHorizontal size={16} />
          <span className="text-xs font-medium">Parameters</span>
        </button>

        <button
          onClick={onClearChat}
          className="px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 hover:border-red-500/40 rounded-lg transition-all text-xs font-medium"
          disabled={isLoading}
        >
          Clear
        </button>
      </div>
    </header>
  );
};
