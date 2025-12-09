
import React, { useState, useEffect } from 'react';
import { ModelOption, ChatSettings } from '../types';
import { Loader2, Plus, Terminal, Shield, Zap, Key, Trash2, X, CheckCircle2, Sliders, Box, Settings, Wrench, BookTemplate, Code } from 'lucide-react'; 
import { SETTINGS_PRESETS, SYSTEM_PROMPT_PRESETS, SettingsPresetId, DEFAULT_TOOL_SETTINGS } from '../constants';

interface ControlPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentSettings: ChatSettings;
  availableModels: ModelOption[];
  onSettingsChange: (newSettings: ChatSettings) => void;
  isModelsLoading: boolean;
  modelsLoadingError: string | null;
  apiKeys: string[];
  onAddApiKey: (key: string) => void;
  onRemoveApiKey: (key: string) => void;
  onOpenCodeModal: () => void;
}

const isGemini3Model = (modelId: string) => modelId.startsWith('gemini-3-');

export const ControlPanel: React.FC<ControlPanelProps> = ({
  isOpen,
  onClose,
  currentSettings,
  availableModels,
  onSettingsChange,
  isModelsLoading,
  modelsLoadingError,
  apiKeys,
  onAddApiKey,
  onRemoveApiKey,
  onOpenCodeModal
}) => {
  const [localSettings, setLocalSettings] = useState<ChatSettings>(currentSettings);
  const [newStopSequence, setNewStopSequence] = useState('');
  const [newApiKey, setNewApiKey] = useState('');
  const [isApplied, setIsApplied] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<SettingsPresetId | 'custom'>('custom');
  const [selectedSystemPresetId, setSelectedSystemPresetId] = useState<string>('custom');

  useEffect(() => {
    setLocalSettings(currentSettings);
  }, [currentSettings]);

  useEffect(() => {
    const matched = SYSTEM_PROMPT_PRESETS.find(p => p.instruction.trim() === localSettings.systemInstruction.trim());
    setSelectedSystemPresetId(matched ? matched.id : 'custom');
  }, [localSettings.systemInstruction]);


  const updateSetting = (key: keyof ChatSettings, value: any) => {
    const updated = { ...localSettings, [key]: value };
    setLocalSettings(updated);
    setIsApplied(false); 
    setSelectedPreset('custom');
  };

  const handleApplySettings = () => {
      onSettingsChange(localSettings);
      setIsApplied(true);
      setTimeout(() => setIsApplied(false), 2000);
  };

  const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const value = e.target.value as SettingsPresetId | 'custom';
      setSelectedPreset(value);
      
      if (value !== 'custom') {
          const preset = SETTINGS_PRESETS[value];
          setLocalSettings(prev => ({
              ...prev,
              ...preset
          }));
          setIsApplied(false);
      }
  };

  const handleSystemPresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const id = e.target.value;
      setSelectedSystemPresetId(id);
      
      if (id !== 'custom') {
          const preset = SYSTEM_PROMPT_PRESETS.find(p => p.id === id);
          if (preset) {
              updateSetting('systemInstruction', preset.instruction);
          }
      }
  };

  const handleAddStopSequence = (e: React.FormEvent) => {
      e.preventDefault();
      if (newStopSequence.trim()) {
          const updated = [...(localSettings.stopSequences || []), newStopSequence.trim()];
          updateSetting('stopSequences', updated);
          setNewStopSequence('');
      }
  };

  const handleRemoveStopSequence = (index: number) => {
      const updated = localSettings.stopSequences.filter((_, i) => i !== index);
      updateSetting('stopSequences', updated);
  };

  const handleAddKey = (e: React.FormEvent) => {
      e.preventDefault();
      if (newApiKey.trim()) {
          onAddApiKey(newApiKey.trim());
          setNewApiKey('');
      }
  };

  // Google Search and JSON Mode are mutually exclusive regardless of model
  const handleGoogleSearchToggle = () => {
      const willEnable = !localSettings.useGoogleSearch;
      
      if (willEnable && localSettings.jsonMode) {
        // Disable JSON Mode if enabling Search
        setLocalSettings(prev => ({
            ...prev,
            useGoogleSearch: true,
            jsonMode: false
        }));
      } else {
        updateSetting('useGoogleSearch', willEnable);
      }
  };

  const handleJsonModeToggle = () => {
      const willEnable = !localSettings.jsonMode;

      if (willEnable && localSettings.useGoogleSearch) {
          // Disable Search if enabling JSON Mode
          setLocalSettings(prev => ({
              ...prev,
              jsonMode: true,
              useGoogleSearch: false
          }));
      } else {
          updateSetting('jsonMode', willEnable);
      }
  };
  
  const currentModelInfo = availableModels.find(m => m.id === localSettings.modelId);

  if (!isOpen) return null;

  return (
    <div className="h-full flex flex-col bg-slate-950/30 border-l border-slate-800 w-80 shrink-0 z-10">
        <div className="flex items-center justify-between px-4 border-b border-slate-800 h-[60px] shrink-0">
            <h2 className="text-xs font-bold text-slate-300 flex items-center gap-2 uppercase tracking-wide">
                <Terminal size={14} className="text-sky-500"/>
                Control Panel
            </h2>
            <button
                onClick={onOpenCodeModal}
                className="p-1.5 text-slate-400 hover:text-sky-400 hover:bg-slate-800 rounded transition-colors"
                title="Get Code"
            >
                <Code size={16} />
            </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
          
          {/* API Key Management (Global) */}
          <div className="space-y-3 bg-slate-900/50 p-3 rounded-lg border border-slate-800">
              <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-sky-400 uppercase tracking-wide flex items-center gap-1">
                      <Key size={12} /> API Key
                  </label>
                  <span className="text-[10px] text-slate-500 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 font-mono">
                      {apiKeys.length > 0 ? `POOL: ${apiKeys.length}` : 'DEFAULT ENV'}
                  </span>
              </div>
              
              <div className="flex gap-2">
                 <input 
                    type="password" 
                    value={newApiKey}
                    onChange={(e) => setNewApiKey(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddKey(e)}
                    placeholder="Add API Key..."
                    className="flex-1 bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-xs text-white focus:border-sky-500 outline-none placeholder-slate-600 font-mono"
                 />
                 <button onClick={handleAddKey} disabled={!newApiKey.trim()} className="p-1.5 bg-sky-600 hover:bg-sky-500 disabled:bg-slate-700 disabled:text-slate-500 rounded text-white transition-colors">
                    <Plus size={14} />
                 </button>
             </div>

             {apiKeys.length > 0 && (
                 <div className="flex flex-col gap-1.5 mt-2 max-h-24 overflow-y-auto custom-scrollbar">
                     {apiKeys.map((k, idx) => (
                         <div key={idx} className="flex items-center justify-between bg-slate-900 px-2 py-1.5 rounded text-xs text-slate-300 border border-slate-800 group">
                             <span className="font-mono text-slate-400">
                                 {k.slice(0, 4)}...{k.slice(-4)}
                             </span>
                             <button onClick={() => onRemoveApiKey(k)} className="text-slate-600 hover:text-red-400 transition-colors">
                                 <Trash2 size={12} />
                             </button>
                         </div>
                     ))}
                 </div>
             )}
          </div>

          <hr className="border-slate-800" />

          {/* Presets */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-1">
                <Sliders size={12} /> Preset
            </label>
            <select
                value={selectedPreset}
                onChange={handlePresetChange}
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs font-mono rounded-md p-2 focus:ring-1 focus:ring-sky-500 focus:border-sky-500 outline-none"
            >
                <option value="custom">Custom Configuration</option>
                <option value="balanced">Balanced (Default)</option>
                <option value="coding">Coding & Tech</option>
                <option value="brainstorm">Brainstorming</option>
                <option value="json">JSON Mode</option>
            </select>
          </div>

          {/* Section 1: Model & Context */}
          <section className="space-y-3 border border-slate-800 bg-slate-900/20 rounded-lg p-3">
             <div className="flex items-center justify-between mb-1">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wide flex items-center gap-2">
                    <Box size={14} className="text-indigo-400"/> Model & Context
                </h3>
             </div>
             
             {/* Model Selection */}
             <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500">Model</label>
                {isModelsLoading ? (
                <div className="flex items-center text-xs text-slate-500 p-2 bg-slate-800 rounded">
                    <Loader2 size={14} className="animate-spin mr-2" /> Fetching...
                </div>
                ) : (
                <>
                    <select
                        value={localSettings.modelId}
                        onChange={(e) => updateSetting('modelId', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs font-mono rounded-md p-2 focus:ring-1 focus:ring-sky-500 focus:border-sky-500 outline-none"
                    >
                        {availableModels.map(m => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                    </select>
                    
                    {currentModelInfo && (
                        <div className="mt-2 p-2.5 bg-slate-900/50 rounded-md border border-slate-800/50">
                            <p className="text-[10px] text-slate-400 mb-2 leading-relaxed">
                                {currentModelInfo.description}
                            </p>
                            {currentModelInfo.tags && currentModelInfo.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                    {currentModelInfo.tags.map(tag => (
                                        <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-sky-400/80 border border-slate-700/50 font-medium">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </>
                )}
             </div>

             {/* System Instructions */}
             <div className="space-y-2 pt-2">
                <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-slate-500">System Instruction</label>
                    <select 
                        value={selectedSystemPresetId}
                        onChange={handleSystemPresetChange}
                        className="bg-slate-900 border border-slate-700 text-[10px] text-slate-300 rounded px-2 py-0.5 outline-none focus:border-sky-500 max-w-[140px]"
                    >
                        <option value="custom">Custom</option>
                        {SYSTEM_PROMPT_PRESETS.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                </div>
                <textarea
                    value={localSettings.systemInstruction}
                    onChange={(e) => updateSetting('systemInstruction', e.target.value)}
                    className="w-full h-32 bg-slate-950 border border-slate-800 rounded-md p-3 text-xs text-slate-300 placeholder-slate-700 focus:ring-1 focus:ring-sky-500 focus:border-sky-500 outline-none resize-none font-mono leading-relaxed"
                    placeholder="Define AI persona..."
                />
             </div>
          </section>


          {/* Section 2: Generation Config */}
          <section className="space-y-4 border border-slate-800 bg-slate-900/20 rounded-lg p-3">
             <div className="flex items-center justify-between mb-1">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wide flex items-center gap-2">
                    <Settings size={14} className="text-indigo-400"/> Generation Config
                </h3>
             </div>

            {/* Temperature */}
            <div className="space-y-1">
                <div className="flex justify-between">
                    <span className="text-xs text-slate-500">Temperature</span>
                    <span className="text-xs font-mono text-sky-400">{localSettings.temperature}</span>
                </div>
                <input 
                    type="range" min="0" max="2" step="0.1" 
                    value={localSettings.temperature}
                    onChange={(e) => updateSetting('temperature', parseFloat(e.target.value))}
                    className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-500"
                />
            </div>

            {/* Top P */}
            <div className="space-y-1">
                <div className="flex justify-between">
                    <span className="text-xs text-slate-500">Top P</span>
                    <span className="text-xs font-mono text-sky-400">{localSettings.topP}</span>
                </div>
                <input 
                    type="range" min="0" max="1" step="0.05" 
                    value={localSettings.topP}
                    onChange={(e) => updateSetting('topP', parseFloat(e.target.value))}
                    className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-500"
                />
            </div>

             {/* Top K */}
             <div className="space-y-1">
                <div className="flex justify-between">
                    <span className="text-xs text-slate-500">Top K</span>
                    <span className="text-xs font-mono text-sky-400">{localSettings.topK}</span>
                </div>
                <input 
                    type="range" min="1" max="100" step="1" 
                    value={localSettings.topK}
                    onChange={(e) => updateSetting('topK', parseInt(e.target.value))}
                    className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-500"
                />
            </div>

            {/* Max Output Tokens */}
            <div className="space-y-1">
                <div className="flex justify-between">
                    <span className="text-xs text-slate-500">Max Output Tokens</span>
                    <span className="text-xs font-mono text-sky-400">{localSettings.maxOutputTokens}</span>
                </div>
                <input 
                    type="range" min="100" max="8192" step="100" 
                    value={localSettings.maxOutputTokens}
                    onChange={(e) => updateSetting('maxOutputTokens', parseInt(e.target.value))}
                    className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-500"
                />
            </div>

             <div className="space-y-2 pt-2 border-t border-slate-800/50">
                 <label className="text-xs font-semibold text-slate-500">Stop Sequences</label>
                 <div className="flex gap-2">
                     <input 
                        type="text" 
                        value={newStopSequence}
                        onChange={(e) => setNewStopSequence(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddStopSequence(e)}
                        placeholder="Enter sequence..."
                        className="flex-1 bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-xs text-white focus:border-sky-500 outline-none"
                     />
                     <button onClick={handleAddStopSequence} className="p-1.5 bg-slate-700 hover:bg-slate-600 rounded text-slate-200">
                        <Plus size={14} />
                     </button>
                 </div>
                 <div className="flex flex-wrap gap-2 mt-2">
                     {localSettings.stopSequences?.map((seq, idx) => (
                         <div key={idx} className="flex items-center gap-1 bg-slate-900 px-2 py-1 rounded text-[10px] text-slate-300 border border-slate-700">
                             <span>{seq}</span>
                             <button onClick={() => handleRemoveStopSequence(idx)} className="text-slate-500 hover:text-red-400"><X size={10} /></button>
                         </div>
                     ))}
                 </div>
             </div>
          </section>


          {/* Section 3: Tools & Features */}
          <section className="space-y-4 border border-slate-800 bg-slate-900/20 rounded-lg p-3">
             <div className="flex items-center justify-between mb-1">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wide flex items-center gap-2">
                    <Wrench size={14} className="text-indigo-400"/> Tools & Features
                </h3>
             </div>

             <div className="flex items-center justify-between">
                <div className="flex flex-col">
                    <span className="text-xs text-slate-300 flex items-center gap-2"><Zap size={12} className="text-yellow-500"/> Google Search</span>
                    <span className="text-[9px] text-slate-600">JSON 모드와 함께 사용할 수 없습니다.</span>
                </div>
                <button 
                    onClick={handleGoogleSearchToggle}
                    className={`w-8 h-4 rounded-full relative transition-colors ${localSettings.useGoogleSearch ? 'bg-sky-600' : 'bg-slate-700'}`}
                >
                    <div className={`w-2.5 h-2.5 bg-white rounded-full absolute top-0.5 transition-all ${localSettings.useGoogleSearch ? 'left-5' : 'left-0.5'}`}></div>
                </button>
             </div>

             <div className="flex flex-col gap-1">
                 <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-300 flex items-center gap-2">Thinking Process</span>
                    <button 
                        onClick={() => updateSetting('showThoughts', !localSettings.showThoughts)}
                        className={`w-8 h-4 rounded-full relative transition-colors ${localSettings.showThoughts ? 'bg-sky-600' : 'bg-slate-700'}`}
                    >
                        <div className={`w-2.5 h-2.5 bg-white rounded-full absolute top-0.5 transition-all ${localSettings.showThoughts ? 'left-5' : 'left-0.5'}`}></div>
                    </button>
                 </div>
                 {localSettings.showThoughts && isGemini3Model(localSettings.modelId) && (
                     <span className="text-[10px] text-sky-500/80 ml-6">
                         * Gemini 3 Pro의 Thinking 기능을 사용합니다.
                     </span>
                 )}
             </div>

             <div className="flex items-center justify-between">
                <div className="flex flex-col">
                    <span className="text-xs text-slate-300 flex items-center gap-2">JSON Mode</span>
                     <span className="text-[9px] text-slate-600">Google Search와 함께 사용할 수 없습니다.</span>
                </div>
                <button 
                    onClick={handleJsonModeToggle}
                    className={`w-8 h-4 rounded-full relative transition-colors ${localSettings.jsonMode ? 'bg-sky-600' : 'bg-slate-700'}`}
                >
                    <div className={`w-2.5 h-2.5 bg-white rounded-full absolute top-0.5 transition-all ${localSettings.jsonMode ? 'left-5' : 'left-0.5'}`}></div>
                </button>
             </div>
             
             {/* New Advanced Tools Toggles */}
             <div className="pt-2 border-t border-slate-800/50 space-y-3">
                 <div className="flex items-center justify-between">
                   <div>
                     <div className="text-xs font-semibold text-slate-300">Function Calling</div>
                     <div className="text-[9px] text-slate-500">모델이 지정한 함수를 호출할 수 있도록 허용합니다.</div>
                   </div>
                   <input
                     type="checkbox"
                     className="accent-sky-600"
                     checked={localSettings.toolSettings?.enableFunctionCalling ?? false}
                     onChange={(e) =>
                       updateSetting('toolSettings', {
                         ...(localSettings.toolSettings ?? DEFAULT_TOOL_SETTINGS),
                         enableFunctionCalling: e.target.checked,
                       })
                     }
                   />
                 </div>

                 <div className="flex items-center justify-between">
                   <div>
                     <div className="text-xs font-semibold text-slate-300">Code Execution</div>
                     <div className="text-[9px] text-slate-500">코드 실행 도구를 사용해 계산/스크립트를 실행할 수 있습니다.</div>
                   </div>
                   <input
                     type="checkbox"
                     className="accent-sky-600"
                     checked={localSettings.toolSettings?.enableCodeExecution ?? false}
                     onChange={(e) =>
                       updateSetting('toolSettings', {
                         ...(localSettings.toolSettings ?? DEFAULT_TOOL_SETTINGS),
                         enableCodeExecution: e.target.checked,
                       })
                     }
                   />
                 </div>

                 <div className="flex items-center justify-between">
                   <div>
                     <div className="text-xs font-semibold text-slate-300">URL Grounding</div>
                     <div className="text-[9px] text-slate-500">지정한 URL 콘텐츠를 기반으로 답변을 보강합니다.</div>
                   </div>
                   <input
                     type="checkbox"
                     className="accent-sky-600"
                     checked={localSettings.toolSettings?.enableUrlGrounding ?? false}
                     onChange={(e) =>
                       updateSetting('toolSettings', {
                         ...(localSettings.toolSettings ?? DEFAULT_TOOL_SETTINGS),
                         enableUrlGrounding: e.target.checked,
                       })
                     }
                   />
                 </div>
             </div>

              {/* Safety Settings (Presets) */}
             <div className="space-y-2 pt-2 border-t border-slate-800/50">
                 <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-300 flex items-center gap-2"><Shield size={12} className="text-emerald-500"/> Safety Preset</span>
                    <select 
                        value={localSettings.safetySettings}
                        onChange={(e) => updateSetting('safetySettings', e.target.value)}
                        className="bg-slate-900 text-[10px] text-slate-300 border border-slate-700 rounded px-2 py-1 outline-none focus:border-sky-500"
                    >
                        <option value="BLOCK_NONE">Relaxed (Dev)</option>
                        <option value="BLOCK_MEDIUM_AND_ABOVE">Default (Recommended)</option>
                        <option value="BLOCK_LOW_AND_ABOVE">Strict (Service)</option>
                    </select>
                 </div>
             </div>
          </section>
          
          <div className="h-4"></div>
        </div>

        {/* Apply Button Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/50 backdrop-blur-sm shrink-0">
            <button 
                onClick={handleApplySettings}
                className={`w-full py-2.5 rounded-md text-xs font-bold transition-all shadow-lg flex items-center justify-center gap-2
                    ${isApplied 
                        ? 'bg-emerald-600 text-white shadow-emerald-900/20' 
                        : 'bg-sky-600 hover:bg-sky-500 text-white shadow-sky-900/20'
                    }`}
            >
                {isApplied ? (
                    <>
                        <CheckCircle2 size={14} />
                        Settings Applied
                    </>
                ) : (
                    "설정 적용 (Apply Changes)"
                )}
            </button>
        </div>
    </div>
  );
};
