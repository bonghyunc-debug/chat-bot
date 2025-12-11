import React, { useMemo } from 'react';
import { X, BarChart3, Coins, MessageSquare, Clock, TrendingUp } from 'lucide-react';
import { ChatSession } from '../types';
import { calculateCost } from '../utils/pricing';

interface UsageStatsProps {
  sessions: ChatSession[];
  onClose: () => void;
}

export const UsageStats: React.FC<UsageStatsProps> = ({ sessions, onClose }) => {
  const stats = useMemo(() => {
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let totalThinkingTokens = 0;
    let totalResponses = 0;
    let totalCost = 0;
    const modelUsage: Record<string, { responses: number; tokens: number; cost: number }> = {};
    const dailyUsage: Record<string, number> = {};

    for (const session of sessions) {
      for (const msg of session.messages) {
        if (msg.role === 'assistant' || msg.role === 'model') {
          totalResponses++;
          
          const usage = msg.metadata?.usageMetadata || msg.usageMetadata;
          if (usage) {
            totalInputTokens += usage.promptTokenCount || 0;
            totalOutputTokens += usage.candidatesTokenCount || 0;
            totalThinkingTokens += usage.thoughtsTokenCount || 0;
            
            const model = msg.metadata?.model || session.settings.model;
            const cost = calculateCost(model, usage.promptTokenCount, usage.candidatesTokenCount);
            totalCost += cost;

            if (!modelUsage[model]) {
              modelUsage[model] = { responses: 0, tokens: 0, cost: 0 };
            }
            modelUsage[model].responses++;
            modelUsage[model].tokens += usage.totalTokenCount || 0;
            modelUsage[model].cost += cost;
          }

          // Daily usage
          const date = new Date(msg.timestamp).toISOString().split('T')[0];
          dailyUsage[date] = (dailyUsage[date] || 0) + (usage?.totalTokenCount || 0);
        }
      }
    }

    return {
      totalInputTokens,
      totalOutputTokens,
      totalThinkingTokens,
      totalTokens: totalInputTokens + totalOutputTokens + totalThinkingTokens,
      totalResponses,
      totalCost,
      totalSessions: sessions.length,
      modelUsage,
      dailyUsage,
    };
  }, [sessions]);

  const maxTokens = Math.max(...Object.values(stats.dailyUsage), 1);
  const recentDays = Object.entries(stats.dailyUsage)
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 7)
    .reverse();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal usage-stats-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2><BarChart3 size={20} /> 사용량 통계</h2>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="stats-content">
          {/* Summary Cards */}
          <div className="stats-cards">
            <div className="stat-card">
              <div className="stat-icon">
                <MessageSquare size={24} />
              </div>
              <div className="stat-info">
                <span className="stat-value">{stats.totalTokens.toLocaleString()}</span>
                <span className="stat-label">총 토큰</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">
                <TrendingUp size={24} />
              </div>
              <div className="stat-info">
                <span className="stat-value">{stats.totalResponses}</span>
                <span className="stat-label">응답 수</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">
                <Coins size={24} />
              </div>
              <div className="stat-info">
                <span className="stat-value">${stats.totalCost.toFixed(4)}</span>
                <span className="stat-label">예상 비용</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">
                <Clock size={24} />
              </div>
              <div className="stat-info">
                <span className="stat-value">{stats.totalSessions}</span>
                <span className="stat-label">세션 수</span>
              </div>
            </div>
          </div>

          {/* Token Breakdown */}
          <div className="stats-section">
            <h3><BarChart3 size={16} /> 토큰 분류</h3>
            <div className="token-breakdown">
              <div className="breakdown-item">
                <span className="breakdown-label">입력 토큰</span>
                <div className="breakdown-bar">
                  <div
                    className="breakdown-fill input"
                    style={{ width: `${(stats.totalInputTokens / stats.totalTokens) * 100}%` }}
                  />
                </div>
                <span className="breakdown-value">{stats.totalInputTokens.toLocaleString()}</span>
              </div>
              <div className="breakdown-item">
                <span className="breakdown-label">출력 토큰</span>
                <div className="breakdown-bar">
                  <div
                    className="breakdown-fill output"
                    style={{ width: `${(stats.totalOutputTokens / stats.totalTokens) * 100}%` }}
                  />
                </div>
                <span className="breakdown-value">{stats.totalOutputTokens.toLocaleString()}</span>
              </div>
              <div className="breakdown-item">
                <span className="breakdown-label">Thinking 토큰</span>
                <div className="breakdown-bar">
                  <div
                    className="breakdown-fill thinking"
                    style={{ width: `${(stats.totalThinkingTokens / stats.totalTokens) * 100}%` }}
                  />
                </div>
                <span className="breakdown-value">{stats.totalThinkingTokens.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Daily Chart */}
          {recentDays.length > 0 && (
            <div className="stats-section">
              <h3><TrendingUp size={16} /> 최근 7일</h3>
              <div className="usage-chart">
                {recentDays.map(([date, tokens]) => (
                  <div key={date} className="chart-bar-container">
                    <div
                      className="chart-bar"
                      style={{ height: `${(tokens / maxTokens) * 100}%` }}
                    >
                      <span className="chart-value">{(tokens / 1000).toFixed(1)}K</span>
                    </div>
                    <span className="chart-label">{date.slice(5)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Model Usage */}
          {Object.keys(stats.modelUsage).length > 0 && (
            <div className="stats-section">
              <h3><MessageSquare size={16} /> 모델별 사용량</h3>
              <div className="model-breakdown">
                {Object.entries(stats.modelUsage).map(([model, usage]) => (
                  <div key={model} className="model-usage-item">
                    <span className="model-name">{model}</span>
                    <div className="model-stats">
                      <span>{usage.responses} 응답</span>
                      <span>{usage.tokens.toLocaleString()} 토큰</span>
                      <span>${usage.cost.toFixed(4)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
