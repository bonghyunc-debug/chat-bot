
import React, { useState } from 'react';
import type { ChatSettings, ModelOption } from '../types';

interface SettingsModalProps {
  settings: ChatSettings;
  onSettingsChange: (settings: ChatSettings) => void;
  apiKeys: string[];
  onAddApiKey: (key: string) => void;
  onRemoveApiKey: (key: string | number) => void;
  availableModels: ModelOption[];
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onSettingsChange,
  apiKeys,
  onAddApiKey,
  onRemoveApiKey,
  availableModels,
  onClose,
}) => {
  const [newKey, setNewKey] = useState('');

  const handleChange = (field: keyof ChatSettings, value: any) => {
    onSettingsChange({ ...settings, [field]: value });
  };

  const handleAddKey = () => {
    if (!newKey.trim()) return;
    onAddApiKey(newKey.trim());
    setNewKey('');
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <header className="modal-header">
          <h3>설정</h3>
          <button onClick={onClose}>닫기</button>
        </header>

        <div className="modal-body">
          <label className="form-row">
            <span>모델</span>
            <select value={settings.model} onChange={(e) => handleChange('model', e.target.value)}>
              {availableModels.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </label>

          <label className="form-row">
            <span>시스템 프롬프트</span>
            <textarea
              value={settings.systemPrompt}
              onChange={(e) => handleChange('systemPrompt', e.target.value)}
            />
          </label>

          <label className="form-row">
            <span>온도</span>
            <input
              type="number"
              value={settings.temperature}
              min={0}
              max={1}
              step={0.1}
              onChange={(e) => handleChange('temperature', parseFloat(e.target.value))}
            />
          </label>

          <label className="form-row">
            <span>최대 토큰</span>
            <input
              type="number"
              value={settings.maxTokens}
              onChange={(e) => handleChange('maxTokens', parseInt(e.target.value, 10))}
            />
          </label>

          <label className="form-row checkbox">
            <input
              type="checkbox"
              checked={settings.useGoogleSearch}
              onChange={(e) => handleChange('useGoogleSearch', e.target.checked)}
            />
            <span>Google 검색 사용</span>
          </label>

          <div className="api-keys">
            <h4>API Keys</h4>
            <div className="api-key-list">
              {apiKeys.map((key, idx) => (
                <div key={key} className="api-key-item">
                  <span>{key}</span>
                  <button onClick={() => onRemoveApiKey(idx)}>삭제</button>
                </div>
              ))}
            </div>
            <div className="api-key-add">
              <input value={newKey} onChange={(e) => setNewKey(e.target.value)} placeholder="새 API 키" />
              <button onClick={handleAddKey}>추가</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
