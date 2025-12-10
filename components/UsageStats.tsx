import React, { useMemo } from 'react';
import { X, BarChart2, TrendingUp, Zap, MessageSquare } from 'lucide-react';
import { ChatSession } from '../types';

interface UsageStatsProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: ChatSession[];
}

export const UsageStats: React.FC<UsageStatsProps> = ({ isOpen, onClose, sessions }) => {
  const stats = useMemo(() => {
    let totalPromptTokens = 0;
    let totalCompletionTokens = 0;
    let totalMessages = 0;
    let sessionsWithUsage = 0;

    const sessionStats: { id: string; title: string; tokens: number; messages: number }[] = [];

    sessions.forEach(session => {
      let sessionTokens = 0;
      let sessionMessages = 0;

      session.messages.forEach(msg => {
        if (msg.usageMetadata) {
          totalPromptTokens += msg.usageMetadata.promptTokenCount;
          totalCompletionTokens += msg.usageMetadata.candidatesTokenCount;
          sessionTokens += msg.usageMetadata.totalTokenCount;
        }
        if (msg.role === 'user' || msg.role === 'model') {
          totalMessages++;
          sessionMessages++;
        }
      });

      if (sessionTokens > 0) {
        sessionsWithUsage++;
        sessionStats.push({
          id: session.id,
          title: session.title,
          tokens: sessionTokens,
          messages: sessionMessages
        });
      }
    });

    // 상위 5개 세션
    const topSessions = sessionStats
      .sort((a, b) => b.tokens - a.tokens)
      .slice(0, 5);

    const maxTokens = topSessions.length > 0 ? topSessions[0].tokens : 0;

    return {
      totalPromptTokens,
      totalCompletionTokens,
      totalTokens: totalPromptTokens + totalCompletionTokens,
      totalMessages,
      sessionsWithUsage,
      topSessions,
      maxTokens
    };
  }, [sessions]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2 text-slate-200">
            <div className="p-1.5 bg-emerald-500/20 rounded-md text-emerald-400">
              <BarChart2 size={18} />
            </div>
            <h2 className="text-sm font-bold uppercase tracking-wide">토큰 사용량 통계</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
              <div className="flex items-center gap-2 text-slate-400 mb-2">
                <Zap size={14} />
                <span className="text-xs uppercase">총 토큰</span>
              </div>
              <p className="text-2xl font-bold text-white">{stats.totalTokens.toLocaleString()}</p>
            </div>
            
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
              <div className="flex items-center gap-2 text-slate-400 mb-2">
                <TrendingUp size={14} />
                <span className="text-xs uppercase">입력 토큰</span>
              </div>
              <p className="text-2xl font-bold text-indigo-400">{stats.totalPromptTokens.toLocaleString()}</p>
            </div>
            
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
              <div className="flex items-center gap-2 text-slate-400 mb-2">
                <TrendingUp size={14} className="rotate-180" />
                <span className="text-xs uppercase">출력 토큰</span>
              </div>
              <p className="text-2xl font-bold text-emerald-400">{stats.totalCompletionTokens.toLocaleString()}</p>
            </div>
            
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
              <div className="flex items-center gap-2 text-slate-400 mb-2">
                <MessageSquare size={14} />
                <span className="text-xs uppercase">총 메시지</span>
              </div>
              <p className="text-2xl font-bold text-sky-400">{stats.totalMessages.toLocaleString()}</p>
            </div>
          </div>

          {/* Top Sessions */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide">토큰 사용량 상위 세션</h3>
            
            {stats.topSessions.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">아직 사용량 데이터가 없습니다</p>
            ) : (
              <div className="space-y-2">
                {stats.topSessions.map((session, index) => (
                  <div key={session.id} className="bg-slate-800/30 border border-slate-800 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-slate-500 w-5">{index + 1}.</span>
                        <span className="text-sm text-slate-200 truncate max-w-[200px]">{session.title}</span>
                      </div>
                      <span className="text-xs font-mono text-emerald-400">{session.tokens.toLocaleString()} tok</span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-emerald-500 to-sky-500 rounded-full transition-all"
                        style={{ width: `${(session.tokens / stats.maxTokens) * 100}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">{session.messages} 메시지</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="text-xs text-slate-500 text-center pt-4 border-t border-slate-800">
            {stats.sessionsWithUsage}개 세션에서 수집된 데이터입니다
          </div>
        </div>
      </div>
    </div>
  );
};
