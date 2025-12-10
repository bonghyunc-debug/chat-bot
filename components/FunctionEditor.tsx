import React, { useMemo, useState } from 'react';
import { Plus, Trash2, Code, ToggleLeft, ToggleRight } from 'lucide-react';
import { ToolFunctionDefinition } from '../types';

interface FunctionEditorProps {
  functions: ToolFunctionDefinition[];
  onChange: (functions: ToolFunctionDefinition[]) => void;
  isEnabled: boolean;
  onToggleEnabled: (enabled: boolean) => void;
}

const FUNCTION_PRESETS: Record<string, ToolFunctionDefinition> = {
  weather: {
    name: 'get_weather',
    description: '특정 위치의 현재 날씨 조회',
    parameters: {
      type: 'object',
      properties: {
        location: { type: 'string' },
        unit: { type: 'string', enum: ['celsius', 'fahrenheit'] }
      },
      required: ['location']
    }
  },
  search: {
    name: 'web_search',
    description: '웹 검색',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        limit: { type: 'number' }
      },
      required: ['query']
    }
  },
  calculator: {
    name: 'calculate',
    description: '수학 계산',
    parameters: {
      type: 'object',
      properties: {
        expression: { type: 'string' }
      },
      required: ['expression']
    }
  },
  get_time: {
    name: 'get_current_time',
    description: '현재 시간 조회',
    parameters: {
      type: 'object',
      properties: {
        timezone: { type: 'string' }
      },
      required: []
    }
  }
};

export const FunctionEditor: React.FC<FunctionEditorProps> = ({ functions, onChange, isEnabled, onToggleEnabled }) => {
  const [editingFunctionName, setEditingFunctionName] = useState<string | null>(null);
  const [jsonEditValue, setJsonEditValue] = useState('');

  const presetStatuses = useMemo(() => {
    const names = functions.map(f => f.name);
    return Object.keys(FUNCTION_PRESETS).reduce<Record<string, boolean>>((acc, key) => {
      acc[key] = names.includes(FUNCTION_PRESETS[key].name);
      return acc;
    }, {});
  }, [functions]);

  const handleAddPreset = (key: string) => {
    if (presetStatuses[key]) return;
    onChange([...functions, FUNCTION_PRESETS[key]]);
  };

  const handleDelete = (name: string) => {
    onChange(functions.filter(f => f.name !== name));
    if (editingFunctionName === name) {
      setEditingFunctionName(null);
    }
  };

  const handleStartEdit = (fn: ToolFunctionDefinition) => {
    setEditingFunctionName(fn.name);
    setJsonEditValue(JSON.stringify(fn.parameters ?? {}, null, 2));
  };

  const handleJsonSave = (name: string) => {
    try {
      const parsed = jsonEditValue ? JSON.parse(jsonEditValue) : {};
      onChange(functions.map(f => (f.name === name ? { ...f, parameters: parsed } : f)));
      setEditingFunctionName(null);
    } catch (e) {
      alert('JSON 형식이 올바르지 않습니다.');
    }
  };

  const handleAddCustom = () => {
    const newName = `custom_function_${functions.length + 1}`;
    const newFn: ToolFunctionDefinition = {
      name: newName,
      description: '',
      parameters: {}
    };
    onChange([...functions, newFn]);
    handleStartEdit(newFn);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
          <Code size={14} />
          Function Calling
        </div>
        <button
          onClick={() => onToggleEnabled(!isEnabled)}
          className="flex items-center gap-1 text-xs text-slate-300"
        >
          {isEnabled ? <ToggleRight className="text-emerald-400" size={18} /> : <ToggleLeft className="text-slate-500" size={18} />}
          <span>{isEnabled ? 'Enabled' : 'Disabled'}</span>
        </button>
      </div>
      <p className="text-[10px] text-slate-500">모델이 지정된 함수를 호출하도록 설정합니다.</p>

      {isEnabled && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {Object.keys(FUNCTION_PRESETS).map((key) => (
              <button
                key={key}
                onClick={() => handleAddPreset(key)}
                disabled={presetStatuses[key]}
                className={`px-2 py-1 rounded border text-xs transition-colors ${presetStatuses[key]
                  ? 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'}`}
              >
                + {key}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            {functions.map(fn => (
              <div key={fn.name} className="bg-slate-900/50 border border-slate-800 rounded-lg p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm text-slate-200 font-semibold">{fn.name}</div>
                    {fn.description && <div className="text-[11px] text-slate-500">{fn.description}</div>}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      className="text-[10px] px-2 py-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700"
                      onClick={() => handleStartEdit(fn)}
                    >
                      JSON 편집
                    </button>
                    <button
                      className="text-[10px] px-2 py-1 rounded text-red-400 hover:bg-red-500/20 border border-transparent hover:border-red-500/40"
                      onClick={() => handleDelete(fn.name)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {editingFunctionName === fn.name ? (
                  <div className="space-y-2">
                    <textarea
                      className="w-full h-32 bg-slate-950 border border-slate-800 rounded p-2 text-xs text-slate-200 font-mono"
                      value={jsonEditValue}
                      onChange={(e) => setJsonEditValue(e.target.value)}
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        className="text-[10px] px-2 py-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700"
                        onClick={() => setEditingFunctionName(null)}
                      >
                        취소
                      </button>
                      <button
                        className="text-[10px] px-2 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-500"
                        onClick={() => handleJsonSave(fn.name)}
                      >
                        저장
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-400">
                    <pre className="bg-slate-950 border border-slate-800 rounded p-2 overflow-x-auto text-[11px] text-slate-300">
                      {JSON.stringify(fn.parameters, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>

          <button
            onClick={handleAddCustom}
            className="w-full border border-dashed border-slate-700 hover:border-sky-500 text-slate-300 text-xs py-2 rounded flex items-center justify-center gap-2"
          >
            <Plus size={14} /> 커스텀 함수 추가
          </button>
        </div>
      )}
    </div>
  );
};

export default FunctionEditor;
