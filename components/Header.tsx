
import React from 'react';
import { Settings, PanelRightClose, PanelRightOpen, SlidersHorizontal } from 'lucide-react'; 

interface HeaderProps {
  onClearChat: () => void;
  onOpenSettingsModal: () => void; 
  isLoading: boolean;
  currentModelName?: string;
  onToggleSidebar: () => void; // Kept for prop compatibility but unused in UI
  isCanvasOpen: boolean;
  onToggleCanvas: () => void;
  isControlPanelOpen?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onClearChat,
  onOpenSettingsModal, 
  isLoading,
  currentModelName,
  isCanvasOpen,
  onToggleCanvas,
  isControlPanelOpen
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
