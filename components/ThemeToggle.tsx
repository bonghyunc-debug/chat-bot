import React from 'react';
import { Moon, Sun } from 'lucide-react';

interface ThemeToggleProps {
  isDark: boolean;
  onToggle: () => void;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ isDark, onToggle }) => {
  return (
    <button
      onClick={onToggle}
      className={`p-2 rounded-lg transition-colors border ${
        isDark 
          ? 'text-slate-400 hover:text-yellow-400 hover:bg-slate-800 border-transparent' 
          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200 border-transparent'
      }`}
      title={isDark ? '라이트 모드로 전환' : '다크 모드로 전환'}
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
};
