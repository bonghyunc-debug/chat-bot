import React, { useState, useMemo } from 'react';
import { X, ChevronDown, ChevronRight, Brain, Search, Lightbulb, CheckCircle, FileText, Code } from 'lucide-react';

interface CanvasProps {
  thinking: string;
  isOpen: boolean;
  onClose: () => void;
}

interface ThinkingStep {
  type: 'analysis' | 'search' | 'reasoning' | 'conclusion' | 'code' | 'general';
  content: string;
  expanded?: boolean;
}

const getStepIcon = (type: ThinkingStep['type']) => {
  switch (type) {
    case 'analysis': return <Brain size={14} />;
    case 'search': return <Search size={14} />;
    case 'reasoning': return <Lightbulb size={14} />;
    case 'conclusion': return <CheckCircle size={14} />;
    case 'code': return <Code size={14} />;
    default: return <FileText size={14} />;
  }
};

const getStepLabel = (type: ThinkingStep['type']) => {
  switch (type) {
    case 'analysis': return '분석';
    case 'search': return '검색';
    case 'reasoning': return '추론';
    case 'conclusion': return '결론';
    case 'code': return '코드';
    default: return '사고';
  }
};

const parseThinking = (text: string): ThinkingStep[] => {
  if (!text) return [];
  
  const steps: ThinkingStep[] = [];
  const lines = text.split('\n');
  let currentContent = '';
  let currentType: ThinkingStep['type'] = 'general';

  const detectType = (line: string): ThinkingStep['type'] | null => {
    const lower = line.toLowerCase();
    if (lower.includes('분석') || lower.includes('analyzing') || lower.includes('examining')) return 'analysis';
    if (lower.includes('검색') || lower.includes('search') || lower.includes('찾')) return 'search';
    if (lower.includes('추론') || lower.includes('reasoning') || lower.includes('생각')) return 'reasoning';
    if (lower.includes('결론') || lower.includes('conclusion') || lower.includes('결과')) return 'conclusion';
    if (lower.includes('코드') || lower.includes('code') || lower.includes('```')) return 'code';
    return null;
  };

  for (const line of lines) {
    const detectedType = detectType(line);
    
    if (detectedType && detectedType !== currentType && currentContent.trim()) {
      steps.push({ type: currentType, content: currentContent.trim() });
      currentContent = '';
      currentType = detectedType;
    }
    
    currentContent += line + '\n';
  }

  if (currentContent.trim()) {
    steps.push({ type: currentType, content: currentContent.trim() });
  }

  return steps;
};

export const Canvas: React.FC<CanvasProps> = ({ thinking, isOpen, onClose }) => {
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set([0]));
  const [showRaw, setShowRaw] = useState(false);

  const steps = useMemo(() => parseThinking(thinking), [thinking]);

  const toggleStep = (index: number) => {
    setExpandedSteps(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  if (!isOpen) return null;

  return (
    <div className="canvas">
      <div className="canvas-header">
        <h3><Brain size={18} /> Thinking Process</h3>
        <div className="canvas-actions">
          <button
            className={`btn-icon ${showRaw ? 'active' : ''}`}
            onClick={() => setShowRaw(!showRaw)}
            title="원본 보기"
          >
            <FileText size={16} />
          </button>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="canvas-content">
        {!thinking ? (
          <div className="empty-state">
            <Brain size={32} />
            <p>AI의 사고 과정이 여기에 표시됩니다.</p>
          </div>
        ) : showRaw ? (
          <pre className="raw-thinking">{thinking}</pre>
        ) : (
          <div className="thinking-steps">
            {steps.map((step, index) => (
              <div key={index} className={`thinking-step ${step.type}`}>
                <div
                  className="step-header"
                  onClick={() => toggleStep(index)}
                >
                  {expandedSteps.has(index) ? (
                    <ChevronDown size={14} />
                  ) : (
                    <ChevronRight size={14} />
                  )}
                  <span className="step-icon">{getStepIcon(step.type)}</span>
                  <span className="step-label">{getStepLabel(step.type)}</span>
                  <span className="step-preview">
                    {step.content.slice(0, 50)}...
                  </span>
                </div>
                {expandedSteps.has(index) && (
                  <div className="step-content">
                    <pre>{step.content}</pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};