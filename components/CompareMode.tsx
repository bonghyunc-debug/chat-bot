import React, { useMemo, useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { ChatSettings, ModelOption, UsageMetadata } from '../types';
import { geminiServiceInstance } from '../services/geminiService';
import { calculateCost, formatCost } from '../utils/pricing';

export interface CompareConfig {
  modelId: string;
  temperature: number;
  systemInstruction: string;
}

export interface CompareResult {
  config: CompareConfig;
  response: string;
  usage: UsageMetadata | null;
  duration: number;
  error: string | null;
}

interface CompareModeProps {
  isOpen: boolean;
  onClose: () => void;
  baseSettings: ChatSettings;
  apiKey: string | undefined;
  availableModels: ModelOption[];
}

const renderMarkdown = (content: string) => {
  const raw = marked.parse(content || '');
  const clean = DOMPurify.sanitize(raw as string);
  return { __html: clean };
};

const CompareMode: React.FC<CompareModeProps> = ({ isOpen, onClose, baseSettings, apiKey, availableModels }) => {
  const [prompt, setPrompt] = useState('');
  const [configA, setConfigA] = useState<CompareConfig>({
    modelId: baseSettings.modelId,
    temperature: baseSettings.temperature,
    systemInstruction: baseSettings.systemInstruction,
  });
  const [configB, setConfigB] = useState<CompareConfig>({
    modelId: baseSettings.modelId,
    temperature: baseSettings.temperature,
    systemInstruction: baseSettings.systemInstruction,
  });
  const [resultA, setResultA] = useState<CompareResult | null>(null);
  const [resultB, setResultB] = useState<CompareResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const handleRun = async () => {
    if (!prompt.trim()) return;
    setIsRunning(true);
    setResultA(null);
    setResultB(null);

    const runSingle = async (config: CompareConfig, setter: React.Dispatch<React.SetStateAction<CompareResult | null>>) => {
      const settings: ChatSettings = {
        ...baseSettings,
        modelId: config.modelId,
        temperature: config.temperature,
        systemInstruction: config.systemInstruction || baseSettings.systemInstruction,
      };

      const chat = await geminiServiceInstance.initializeChat(config.modelId, settings, [], apiKey);
      if (!chat) {
        setter({ config, response: '', usage: null, duration: 0, error: '채팅 초기화 실패' });
        return;
      }

      let responseText = '';
      let usage: UsageMetadata | null = null;
      let error: string | null = null;
      const start = performance.now();

      await geminiServiceInstance.sendMessageStream(
        chat,
        prompt,
        [],
        (chunk) => {
          responseText += chunk;
        },
        () => {},
        () => {},
        (u) => { usage = u; },
        () => {},
        (err) => { error = err.message; },
        () => {},
      );

      const duration = performance.now() - start;
      setter({ config, response: responseText, usage, duration, error });
    };

    await Promise.all([
      runSingle(configA, setResultA),
      runSingle(configB, setResultB)
    ]);

    setIsRunning(false);
  };

  const renderResultCard = (result: CompareResult | null, label: string) => {
    const cost = result?.usage ? calculateCost(result.config.modelId, result.usage.promptTokenCount, result.usage.candidatesTokenCount) : null;
    return (
      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 flex flex-col gap-2 h-full">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="font-semibold text-slate-200">{label}</span>
          <span className="text-[10px] text-slate-500">{result ? result.config.modelId : ''}</span>
        </div>
        <div className="flex-1 overflow-y-auto bg-slate-900/50 rounded p-2 text-sm text-slate-200 markdown-body" dangerouslySetInnerHTML={renderMarkdown(result?.response || '')} />
        {result && (
          <div className="text-[11px] text-slate-400 flex flex-wrap gap-3 items-center">
            <span>토큰: {result.usage ? result.usage.totalTokenCount.toLocaleString() : '-'}</span>
            <span>시간: {result.duration.toFixed(0)} ms</span>
            <span>비용: {cost ? `$${formatCost(cost.total)}` : '-'}</span>
            {result.error && <span className="text-red-400">에러: {result.error}</span>}
          </div>
        )}
      </div>
    );
  };

  const modelOptions = useMemo(() => availableModels.map(m => (
    <option key={m.id} value={m.id}>{m.name}</option>
  )), [availableModels]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-950 border border-slate-800 rounded-xl shadow-2xl w-full max-w-6xl h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
          <div className="flex items-center gap-2 text-slate-200 font-semibold">
            ⚖️ 응답 비교 모드
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded hover:bg-slate-800">
            <X size={16} />
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-hidden flex-1 flex flex-col">
          <textarea
            className="w-full h-24 bg-slate-900 border border-slate-800 rounded p-3 text-sm text-slate-200"
            placeholder="비교할 프롬프트를 입력하세요..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-slate-900/40 border border-slate-800 rounded-lg p-3 space-y-2">
              <div className="text-xs text-slate-400 font-semibold">Config A</div>
              <select
                className="w-full bg-slate-950 border border-slate-800 rounded text-xs text-slate-200 p-2"
                value={configA.modelId}
                onChange={(e) => setConfigA({ ...configA, modelId: e.target.value })}
              >
                {modelOptions}
              </select>
              <div>
                <label className="text-[11px] text-slate-400">Temperature: {configA.temperature}</label>
                <input
                  type="range"
                  min={0}
                  max={2}
                  step={0.1}
                  value={configA.temperature}
                  onChange={(e) => setConfigA({ ...configA, temperature: parseFloat(e.target.value) })}
                  className="w-full"
                />
              </div>
              <textarea
                className="w-full h-20 bg-slate-950 border border-slate-800 rounded p-2 text-xs text-slate-200"
                placeholder="System Instruction"
                value={configA.systemInstruction}
                onChange={(e) => setConfigA({ ...configA, systemInstruction: e.target.value })}
              />
            </div>

            <div className="bg-slate-900/40 border border-slate-800 rounded-lg p-3 space-y-2">
              <div className="text-xs text-slate-400 font-semibold">Config B</div>
              <select
                className="w-full bg-slate-950 border border-slate-800 rounded text-xs text-slate-200 p-2"
                value={configB.modelId}
                onChange={(e) => setConfigB({ ...configB, modelId: e.target.value })}
              >
                {modelOptions}
              </select>
              <div>
                <label className="text-[11px] text-slate-400">Temperature: {configB.temperature}</label>
                <input
                  type="range"
                  min={0}
                  max={2}
                  step={0.1}
                  value={configB.temperature}
                  onChange={(e) => setConfigB({ ...configB, temperature: parseFloat(e.target.value) })}
                  className="w-full"
                />
              </div>
              <textarea
                className="w-full h-20 bg-slate-950 border border-slate-800 rounded p-2 text-xs text-slate-200"
                placeholder="System Instruction"
                value={configB.systemInstruction}
                onChange={(e) => setConfigB({ ...configB, systemInstruction: e.target.value })}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleRun}
              disabled={isRunning}
              className="px-4 py-2 bg-amber-500/20 text-amber-300 rounded border border-amber-500/40 hover:bg-amber-500/30 disabled:opacity-50"
            >
              {isRunning ? <Loader2 className="animate-spin" size={16} /> : '비교 실행'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1 min-h-0">
            {renderResultCard(resultA, 'Result A')}
            {renderResultCard(resultB, 'Result B')}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompareMode;
