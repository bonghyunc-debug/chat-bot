import React, { useMemo, useState } from 'react';
import { Terminal, ChevronDown, PanelRightOpen } from 'lucide-react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

export interface ThinkingStep {
  id: number;
  title: string;
  content: string;
}

export interface ThinkingDisplayProps {
  thoughts: string;
  isExpanded: boolean;
  onToggle: () => void;
  displayMode: 'collapsed' | 'timeline' | 'full';
  onModeChange: (mode: 'collapsed' | 'timeline' | 'full') => void;
  onOpenSidePanel?: (thoughts: string) => void;
}

const numberPattern = /^(?:\d+[.)\]:]|\[?\d+\])/gm;
const keywordPattern = /\b(먼저|첫째|다음으로|그 다음|마지막으로|결론|First|Second|Then|Finally|Step)\b/i;

export const parseThinkingSteps = (thoughts: string): ThinkingStep[] => {
  const lines = thoughts.split(/\n+/);
  const steps: ThinkingStep[] = [];
  let currentStep: string[] = [];
  let stepIndex = 1;

  const flushStep = () => {
    if (currentStep.length === 0) return;
    const raw = currentStep.join('\n').trim();
    if (!raw) return;
    const [firstLine, ...rest] = raw.split('\n');
    const title = (firstLine || raw).slice(0, 50);
    const content = rest.join('\n').trim();
    steps.push({ id: stepIndex++, title, content: content || raw });
    currentStep = [];
  };

  lines.forEach((line) => {
    if (numberPattern.test(line) || keywordPattern.test(line)) {
      flushStep();
      currentStep.push(line.trim());
    } else {
      currentStep.push(line.trim());
    }
    numberPattern.lastIndex = 0;
    keywordPattern.lastIndex = 0;
  });
  flushStep();

  if (steps.length === 0) {
    const paragraphs = thoughts.split(/\n\n+/).map(p => p.trim()).filter(Boolean);
    return paragraphs.map((p, idx) => ({
      id: idx + 1,
      title: p.slice(0, 50),
      content: p,
    }));
  }

  return steps;
};

const badgeNumbers = ['①','②','③','④','⑤','⑥','⑦','⑧','⑨','⑩'];

const ThinkingDisplay: React.FC<ThinkingDisplayProps> = ({
  thoughts,
  isExpanded,
  onToggle,
  displayMode,
  onModeChange,
  onOpenSidePanel
}) => {
  const steps = useMemo(() => parseThinkingSteps(thoughts), [thoughts]);
  const previewText = useMemo(() => thoughts.replace(/\n/g, ' ').slice(0, 100), [thoughts]);
  const [expandedSteps, setExpandedSteps] = useState<Record<number, boolean>>({});

  const renderedMarkdown = useMemo(() => {
    const raw = marked.parse(thoughts);
    const clean = DOMPurify.sanitize(raw as string);
    return { __html: clean };
  }, [thoughts]);

  if (displayMode === 'collapsed') {
    return (
      <div className="mb-6 rounded-xl overflow-hidden border border-purple-500/20 bg-gradient-to-b from-purple-950/30 to-slate-950/50">
        <button
          onClick={() => {
            onModeChange('timeline');
            onToggle();
          }}
          className="w-full flex items-center gap-3 p-3 text-left hover:bg-purple-900/20 transition-colors group"
        >
          <div className="p-1.5 rounded-lg bg-purple-500/20 text-purple-400 group-hover:bg-purple-500/30 transition-colors">
            <Terminal size={14} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-purple-300 uppercase tracking-wide">Thinking</span>
              <span className="text-[10px] text-purple-500/70 font-mono">{steps.length} steps</span>
            </div>
            <p className="text-xs text-slate-500 truncate mt-0.5 pr-4">{previewText}...</p>
          </div>
          <div className="text-purple-400 transition-transform duration-200">
            <ChevronDown size={16} />
          </div>
        </button>
      </div>
    );
  }

  if (displayMode === 'timeline') {
    return (
      <div className="mb-6 rounded-xl overflow-hidden border border-purple-500/20 bg-gradient-to-b from-purple-950/30 to-slate-950/50">
        <div className="w-full flex items-center gap-3 p-3 text-left border-b border-purple-500/10">
          <div className="p-1.5 rounded-lg bg-purple-500/20 text-purple-400">
            <Terminal size={14} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-purple-300 uppercase tracking-wide">Thinking Process</span>
            <span className="text-[10px] text-purple-500/70 font-mono">{steps.length} steps</span>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            {onOpenSidePanel && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenSidePanel(thoughts);
                }}
                className="p-1 text-slate-500 hover:text-purple-400 rounded"
                title="사이드 패널에서 보기"
              >
                <PanelRightOpen size={14} />
              </button>
            )}
            <button
              onClick={() => onModeChange('full')}
              className="text-[10px] px-2 py-1 rounded bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 transition-colors"
            >
              전체 보기
            </button>
            <button
              onClick={() => {
                onModeChange('collapsed');
                onToggle();
              }}
              className="text-[10px] px-2 py-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
            >
              접기
            </button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {steps.map((step, idx) => (
            <div key={step.id} className="relative pl-10">
              <div className="absolute left-1 top-0 bottom-0 border-l-2 border-purple-500/30" aria-hidden></div>
              <div className="absolute left-[-3px] top-0 flex items-center justify-center w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 text-xs font-bold">
                {badgeNumbers[idx] || idx + 1}
              </div>
              <div className="bg-slate-900/40 border border-purple-500/10 rounded-lg p-3 ml-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-purple-200 font-semibold">{step.title}</span>
                  <button
                    className="text-[10px] text-purple-400 hover:text-purple-200"
                    onClick={() => setExpandedSteps(prev => ({ ...prev, [step.id]: !prev[step.id] }))}
                  >
                    {expandedSteps[step.id] ? '접기' : '펼치기'}
                  </button>
                </div>
                <p className={`text-xs text-slate-400 mt-2 ${expandedSteps[step.id] ? '' : 'line-clamp-2'}`}>
                  {step.content || step.title}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-end gap-2 px-3 py-2 border-t border-purple-500/10 bg-slate-900/50">
          <button
            onClick={() => onModeChange('full')}
            className="text-[10px] px-2 py-1 rounded bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 transition-colors"
          >
            전체 보기
          </button>
          <button
            onClick={() => {
              onModeChange('collapsed');
              onToggle();
            }}
            className="text-[10px] px-2 py-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
          >
            접기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6 rounded-xl overflow-hidden border border-purple-500/20 bg-gradient-to-b from-purple-950/30 to-slate-950/50">
      <div className="w-full flex items-center gap-3 p-3 text-left border-b border-purple-500/10">
        <div className="p-1.5 rounded-lg bg-purple-500/20 text-purple-400">
          <Terminal size={14} />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-purple-300 uppercase tracking-wide">Thinking Process</span>
          <span className="text-[10px] text-purple-500/70 font-mono">{thoughts.length.toLocaleString()} chars</span>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          {onOpenSidePanel && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenSidePanel(thoughts);
              }}
              className="p-1 text-slate-500 hover:text-purple-400 rounded"
              title="사이드 패널에서 보기"
            >
              <PanelRightOpen size={14} />
            </button>
          )}
          <button
            onClick={() => onModeChange('timeline')}
            className="text-[10px] px-2 py-1 rounded bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 transition-colors"
          >
            타임라인
          </button>
          <button
            onClick={() => {
              onModeChange('collapsed');
              onToggle();
            }}
            className="text-[10px] px-2 py-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
          >
            접기
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 bg-slate-950/70 max-h-[400px] overflow-y-auto custom-scrollbar">
          <div
            className="text-sm text-slate-300 leading-relaxed markdown-body prose-purple"
            dangerouslySetInnerHTML={renderedMarkdown}
          />
        </div>
      )}
    </div>
  );
};

export default ThinkingDisplay;
