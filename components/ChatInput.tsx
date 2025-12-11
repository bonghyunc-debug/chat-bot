
import React, { useState } from 'react';
import { Attachment } from '../types';

interface ChatInputProps {
  onSend: (content: string, attachments?: Attachment[]) => void;
  onStop: () => void;
  isStreaming: boolean;
  disabled?: boolean;
  model: string;
  apiKey: string;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSend, onStop, isStreaming, disabled }) => {
  const [text, setText] = useState('');

  const handleSend = () => {
    if (!text.trim()) return;
    onSend(text);
    setText('');
  };

  return (
    <div className="chat-input">
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="메시지를 입력하세요"
        disabled={disabled || isStreaming}
      />
      <div className="btn-row">
        {isStreaming ? (
          <button className="btn-secondary" onClick={onStop}>중단</button>
        ) : (
          <button className="btn-primary" onClick={handleSend} disabled={disabled}>전송</button>
        )}
      </div>
    </div>
  );
};
