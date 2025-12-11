
import React from 'react';
import { Activity, BarChart2, Image, Search, Settings, Wrench } from 'lucide-react';

interface HeaderProps {
  model: string;
  modelSpecs?: { capabilities?: string[] };
  isOnline: boolean;
  onToggleCanvas: () => void;
  onToggleStats: () => void;
  onToggleSearch: () => void;
  onToggleFunctions: () => void;
  showCanvas: boolean;
  showStats: boolean;
  hasFunctions: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  model,
  modelSpecs,
  isOnline,
  onToggleCanvas,
  onToggleStats,
  onToggleSearch,
  onToggleFunctions,
  showCanvas,
  showStats,
  hasFunctions,
}) => {
  return (
    <header className="app-header">
      <div className="header-left">
        <h1>Gemini Chat</h1>
        <span className="model-chip">{model}</span>
        {modelSpecs?.capabilities && (
          <span className="model-capabilities">{modelSpecs.capabilities.join(', ')}</span>
        )}
      </div>
      <div className="header-actions">
        <button className={`btn-icon ${showCanvas ? 'active' : ''}`} onClick={onToggleCanvas} title="생각 보기">
          <Image size={16} />
        </button>
        <button className={`btn-icon ${showStats ? 'active' : ''}`} onClick={onToggleStats} title="통계">
          <BarChart2 size={16} />
        </button>
        <button className="btn-icon" onClick={onToggleSearch} title="검색">
          <Search size={16} />
        </button>
        <button className={`btn-icon ${hasFunctions ? 'header-functions-badge' : ''}`} onClick={onToggleFunctions} title="함수">
          <Wrench size={16} />
        </button>
        <div className={`status-indicator ${isOnline ? 'online' : 'offline'}`}>
          <Activity size={14} />
        </div>
      </div>
    </header>
  );
};
