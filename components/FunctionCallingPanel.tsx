import React, { useState, useCallback } from 'react';
import { X, Plus, Trash2, Play, Save, FileJson, Wand2, ChevronDown, ChevronRight } from 'lucide-react';
import type { ToolFunctionDefinition } from '../types';

interface FunctionCallingPanelProps {
  functions: ToolFunctionDefinition[];
  onFunctionsChange: (functions: ToolFunctionDefinition[]) => void;
  onClose: () => void;
}

interface ParameterSchema {
  type: string;
  description?: string;
  enum?: string[];
  items?: ParameterSchema;
  properties?: Record<string, ParameterSchema>;
  required?: string[];
}

const FUNCTION_TEMPLATES: ToolFunctionDefinition[] = [
  {
    name: 'get_weather',
    description: '지정된 위치의 현재 날씨 정보를 가져옵니다.',
    parameters: {
      type: 'object',
      properties: {
        location: {
          type: 'string',
          description: '도시 이름 (예: Seoul, New York)',
        },
        unit: {
          type: 'string',
          enum: ['celsius', 'fahrenheit'],
          description: '온도 단위',
        },
      },
      required: ['location'],
    },
  },
  {
    name: 'search_web',
    description: '웹에서 정보를 검색합니다.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: '검색 쿼리',
        },
        num_results: {
          type: 'integer',
          description: '반환할 결과 수 (기본값: 5)',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'calculate',
    description: '수학 계산을 수행합니다.',
    parameters: {
      type: 'object',
      properties: {
        expression: {
          type: 'string',
          description: '계산할 수학 표현식 (예: 2 + 2 * 3)',
        },
      },
      required: ['expression'],
    },
  },
  {
    name: 'send_email',
    description: '이메일을 전송합니다.',
    parameters: {
      type: 'object',
      properties: {
        to: {
          type: 'string',
          description: '수신자 이메일 주소',
        },
        subject: {
          type: 'string',
          description: '이메일 제목',
        },
        body: {
          type: 'string',
          description: '이메일 본문',
        },
      },
      required: ['to', 'subject', 'body'],
    },
  },
  {
    name: 'get_stock_price',
    description: '주식 가격 정보를 조회합니다.',
    parameters: {
      type: 'object',
      properties: {
        symbol: {
          type: 'string',
          description: '주식 심볼 (예: AAPL, GOOGL)',
        },
      },
      required: ['symbol'],
    },
  },
];

export const FunctionCallingPanel: React.FC<FunctionCallingPanelProps> = ({
  functions,
  onFunctionsChange,
  onClose,
}) => {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [newFunction, setNewFunction] = useState<ToolFunctionDefinition>({
    name: '',
    description: '',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  });
  const [jsonMode, setJsonMode] = useState(false);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [expandedFunctions, setExpandedFunctions] = useState<Set<number>>(new Set());
  const [testResult, setTestResult] = useState<string | null>(null);

  const toggleExpanded = (index: number) => {
    setExpandedFunctions(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const handleAddFunction = useCallback(() => {
    if (!newFunction.name.trim()) return;

    const updated = [...functions, { ...newFunction }];
    onFunctionsChange(updated);
    setNewFunction({
      name: '',
      description: '',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    });
  }, [functions, newFunction, onFunctionsChange]);

  const handleRemoveFunction = useCallback((index: number) => {
    const updated = functions.filter((_, i) => i !== index);
    onFunctionsChange(updated);
  }, [functions, onFunctionsChange]);

  const handleUpdateFunction = useCallback((index: number, fn: ToolFunctionDefinition) => {
    const updated = functions.map((f, i) => (i === index ? fn : f));
    onFunctionsChange(updated);
    setEditingIndex(null);
  }, [functions, onFunctionsChange]);

  const handleTemplateSelect = useCallback((template: ToolFunctionDefinition) => {
    setNewFunction({ ...template });
  }, []);

  const handleJsonEdit = useCallback((json: string) => {
    try {
      const parsed = JSON.parse(json);
      if (Array.isArray(parsed)) {
        onFunctionsChange(parsed);
        setJsonError(null);
      } else {
        setJsonError('배열 형식이어야 합니다.');
      }
    } catch (e) {
      setJsonError('유효하지 않은 JSON 형식입니다.');
    }
  }, [onFunctionsChange]);

  const handleTestFunction = useCallback((fn: ToolFunctionDefinition) => {
    // Simulate function call
    const mockArgs: Record<string, unknown> = {};
    const props = fn.parameters?.properties as Record<string, ParameterSchema> | undefined;
    
    if (props) {
      Object.entries(props).forEach(([key, schema]) => {
        if (schema.type === 'string') {
          mockArgs[key] = schema.enum ? schema.enum[0] : `test_${key}`;
        } else if (schema.type === 'integer' || schema.type === 'number') {
          mockArgs[key] = 42;
        } else if (schema.type === 'boolean') {
          mockArgs[key] = true;
        }
      });
    }

    setTestResult(JSON.stringify({
      function: fn.name,
      arguments: mockArgs,
      result: { status: 'success', message: '테스트 실행 완료' },
    }, null, 2));
  }, []);

  return (
    <div className="function-panel">
      <div className="function-panel-header">
        <h3><FileJson size={18} /> Function Calling</h3>
        <div className="function-panel-actions">
          <button
            className={`btn-icon ${jsonMode ? 'active' : ''}`}
            onClick={() => setJsonMode(!jsonMode)}
            title="JSON 편집 모드"
          >
            <FileJson size={16} />
          </button>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="function-panel-content">
        {jsonMode ? (
          <div className="json-editor">
            <textarea
              className="textarea mono"
              value={JSON.stringify(functions, null, 2)}
              onChange={(e) => handleJsonEdit(e.target.value)}
              placeholder="함수 정의를 JSON 배열로 입력하세요..."
              rows={20}
            />
            {jsonError && <div className="error-text">{jsonError}</div>}
          </div>
        ) : (
          <>
            {/* Templates */}
            <div className="function-templates">
              <h4>템플릿</h4>
              <div className="template-buttons">
                {FUNCTION_TEMPLATES.map((template) => (
                  <button
                    key={template.name}
                    className="btn-template"
                    onClick={() => handleTemplateSelect(template)}
                  >
                    <Wand2 size={14} />
                    {template.name}
                  </button>
                ))}
              </div>
            </div>

            {/* New Function Form */}
            <div className="new-function-form">
              <h4>새 함수 추가</h4>
              <div className="form-row">
                <input
                  type="text"
                  className="input"
                  placeholder="함수 이름 (예: get_weather)"
                  value={newFunction.name}
                  onChange={(e) => setNewFunction({ ...newFunction, name: e.target.value })}
                />
              </div>
              <div className="form-row">
                <textarea
                  className="textarea"
                  placeholder="함수 설명"
                  value={newFunction.description || ''}
                  onChange={(e) => setNewFunction({ ...newFunction, description: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="form-row">
                <textarea
                  className="textarea mono"
                  placeholder='파라미터 (JSON Schema)&#10;예: {"type": "object", "properties": {...}}'
                  value={JSON.stringify(newFunction.parameters, null, 2)}
                  onChange={(e) => {
                    try {
                      const params = JSON.parse(e.target.value);
                      setNewFunction({ ...newFunction, parameters: params });
                    } catch {
                      // Invalid JSON, ignore
                    }
                  }}
                  rows={5}
                />
              </div>
              <button
                className="btn-primary"
                onClick={handleAddFunction}
                disabled={!newFunction.name.trim()}
              >
                <Plus size={16} /> 함수 추가
              </button>
            </div>

            {/* Function List */}
            <div className="function-list">
              <h4>등록된 함수 ({functions.length})</h4>
              {functions.length === 0 ? (
                <div className="empty-state">
                  <p>등록된 함수가 없습니다.</p>
                  <p className="hint">템플릿을 선택하거나 새 함수를 추가하세요.</p>
                </div>
              ) : (
                functions.map((fn, index) => (
                  <div key={index} className="function-item">
                    <div
                      className="function-item-header"
                      onClick={() => toggleExpanded(index)}
                    >
                      {expandedFunctions.has(index) ? (
                        <ChevronDown size={16} />
                      ) : (
                        <ChevronRight size={16} />
                      )}
                      <span className="function-name">{fn.name}</span>
                      <div className="function-item-actions">
                        <button
                          className="btn-icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTestFunction(fn);
                          }}
                          title="테스트"
                        >
                          <Play size={14} />
                        </button>
                        <button
                          className="btn-icon btn-danger"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveFunction(index);
                          }}
                          title="삭제"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    {expandedFunctions.has(index) && (
                      <div className="function-item-details">
                        <p className="function-description">{fn.description}</p>
                        <pre className="function-params">
                          {JSON.stringify(fn.parameters, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Test Result */}
            {testResult && (
              <div className="test-result">
                <h4>테스트 결과</h4>
                <pre>{testResult}</pre>
                <button
                  className="btn-icon"
                  onClick={() => setTestResult(null)}
                >
                  <X size={14} />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
