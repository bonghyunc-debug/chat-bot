
import React, { useImperativeHandle, forwardRef, useRef, useState } from 'react';
import { ChatMessage, FunctionCallResult } from '../types';
import { ThinkingDisplay } from './ThinkingDisplay';

interface MessageListProps {
  messages: ChatMessage[];
  isStreaming: boolean;
  highlightIndex: number | null;
  showThoughts?: boolean;
  onEdit?: (messageId: string) => void;
  onRegenerate?: (messageId: string) => void;
  onFunctionResponse?: (result: unknown) => void;
  pendingFunctionCall?: FunctionCallResult | null;
}

export const MessageList = forwardRef<HTMLDivElement, MessageListProps>(({
  messages,
  isStreaming,
  highlightIndex,
  showThoughts,
  onEdit,
  onRegenerate,
  onFunctionResponse,
  pendingFunctionCall,
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [functionResponse, setFunctionResponse] = useState('');

  useImperativeHandle(ref, () => containerRef.current as HTMLDivElement);

  const handleSubmitFunction = () => {
    if (!onFunctionResponse) return;
    try {
      const parsed = functionResponse ? JSON.parse(functionResponse) : {};
      onFunctionResponse(parsed);
      setFunctionResponse('');
    } catch (err) {
      console.error('Invalid JSON', err);
    }
  };

  return (
    <div className="message-list" ref={containerRef}>
      {messages.map((msg, idx) => (
        <div key={msg.id} className={`message-item ${highlightIndex === idx ? 'highlight' : ''}`}>
          <div className="message-meta">
            <span className="role">{msg.role}</span>
            <span className="time">{new Date(msg.timestamp).toLocaleTimeString()}</span>
          </div>
          <div className="message-content">{msg.content}</div>
          <ThinkingDisplay thinking={msg.thinking} thoughts={msg.thoughts} showThoughts={showThoughts} />
          {onEdit && (
            <button className="btn-link" onClick={() => onEdit(msg.id)}>편집</button>
          )}
          {onRegenerate && (
            <button className="btn-link" onClick={() => onRegenerate(msg.id)}>다시 생성</button>
          )}
        </div>
      ))}

      {pendingFunctionCall && (
        <div className="function-response-input">
          <h5>함수 응답 전송: {pendingFunctionCall.name}</h5>
          <textarea
            className="textarea"
            value={functionResponse}
            onChange={(e) => setFunctionResponse(e.target.value)}
            placeholder="JSON 응답을 입력하세요"
          />
          <div className="btn-row">
            <button className="btn-primary" onClick={handleSubmitFunction}>응답 전송</button>
          </div>
        </div>
      )}

      {isStreaming && <div className="streaming-indicator">생성 중...</div>}
    </div>
  );
});
