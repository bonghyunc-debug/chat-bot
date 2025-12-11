import React from 'react';

interface ThinkingDisplayProps {
  thinking?: string;
  thoughts?: string;
  showThoughts?: boolean;
}

export const ThinkingDisplay: React.FC<ThinkingDisplayProps> = ({ thinking, thoughts, showThoughts }) => {
  if (!showThoughts) return null;
  const content = thinking || thoughts;
  if (!content) return null;
  return (
    <div className="thinking-display">
      <div className="thinking-label">Thinking...</div>
      <pre className="thinking-content">{content}</pre>
    </div>
  );
};
