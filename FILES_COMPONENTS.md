# FILES_COMPONENTS.md - 새 컴포넌트 전체 코드

---

## 1. components/FunctionCallingPanel.tsx

```tsx
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
```

---

## 2. components/ImageEditToolbar.tsx

```tsx
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { 
  Paintbrush, Eraser, Square, Circle, Undo, Redo, 
  Download, ZoomIn, ZoomOut, Maximize2, Wand2, 
  Palette, Image as ImageIcon, X, Check, RotateCcw
} from 'lucide-react';
import type { ImageEditRequest } from '../types';

interface ImageEditToolbarProps {
  imageData: string;
  mimeType: string;
  onEditRequest: (request: ImageEditRequest) => void;
  onClose: () => void;
}

type Tool = 'brush' | 'eraser' | 'rectangle' | 'circle';
type EditMode = 'inpaint' | 'outpaint' | 'style' | 'enhance';

interface HistoryState {
  maskData: string;
  canvasData: string;
}

const STYLE_PRESETS = [
  { id: 'anime', name: '애니메이션', icon: '🎨' },
  { id: 'oil_painting', name: '유화', icon: '🖼️' },
  { id: 'watercolor', name: '수채화', icon: '💧' },
  { id: 'pencil_sketch', name: '연필 스케치', icon: '✏️' },
  { id: 'digital_art', name: '디지털 아트', icon: '🎮' },
  { id: 'photorealistic', name: '포토리얼', icon: '📷' },
];

export const ImageEditToolbar: React.FC<ImageEditToolbarProps> = ({
  imageData,
  mimeType,
  onEditRequest,
  onClose,
}) => {
  const [tool, setTool] = useState<Tool>('brush');
  const [editMode, setEditMode] = useState<EditMode>('inpaint');
  const [brushSize, setBrushSize] = useState(20);
  const [isDrawing, setIsDrawing] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize canvases
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      const canvas = canvasRef.current;
      const maskCanvas = maskCanvasRef.current;
      if (!canvas || !maskCanvas) return;

      canvas.width = img.width;
      canvas.height = img.height;
      maskCanvas.width = img.width;
      maskCanvas.height = img.height;

      const ctx = canvas.getContext('2d');
      const maskCtx = maskCanvas.getContext('2d');
      if (!ctx || !maskCtx) return;

      ctx.drawImage(img, 0, 0);
      maskCtx.fillStyle = 'black';
      maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);

      // Save initial state
      saveHistory();
    };
    img.src = `data:${mimeType};base64,${imageData}`;
  }, [imageData, mimeType]);

  const saveHistory = useCallback(() => {
    const canvas = canvasRef.current;
    const maskCanvas = maskCanvasRef.current;
    if (!canvas || !maskCanvas) return;

    const newState: HistoryState = {
      canvasData: canvas.toDataURL(),
      maskData: maskCanvas.toDataURL(),
    };

    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(newState);
      return newHistory.slice(-20); // Keep last 20 states
    });
    setHistoryIndex(prev => Math.min(prev + 1, 19));
  }, [historyIndex]);

  const undo = useCallback(() => {
    if (historyIndex <= 0) return;
    const newIndex = historyIndex - 1;
    setHistoryIndex(newIndex);
    restoreState(history[newIndex]);
  }, [historyIndex, history]);

  const redo = useCallback(() => {
    if (historyIndex >= history.length - 1) return;
    const newIndex = historyIndex + 1;
    setHistoryIndex(newIndex);
    restoreState(history[newIndex]);
  }, [historyIndex, history]);

  const restoreState = (state: HistoryState) => {
    const canvas = canvasRef.current;
    const maskCanvas = maskCanvasRef.current;
    if (!canvas || !maskCanvas) return;

    const ctx = canvas.getContext('2d');
    const maskCtx = maskCanvas.getContext('2d');
    if (!ctx || !maskCtx) return;

    const img = new Image();
    img.onload = () => ctx.drawImage(img, 0, 0);
    img.src = state.canvasData;

    const maskImg = new Image();
    maskImg.onload = () => maskCtx.drawImage(maskImg, 0, 0);
    maskImg.src = state.maskData;
  };

  const getMousePos = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / zoom,
      y: (e.clientY - rect.top) / zoom,
    };
  };

  const startDrawing = (e: React.MouseEvent) => {
    setIsDrawing(true);
    draw(e);
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      saveHistory();
    }
  };

  const draw = (e: React.MouseEvent) => {
    if (!isDrawing) return;
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;

    const ctx = maskCanvas.getContext('2d');
    if (!ctx) return;

    const pos = getMousePos(e);
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (tool === 'brush') {
      ctx.strokeStyle = 'white';
      ctx.globalCompositeOperation = 'source-over';
    } else if (tool === 'eraser') {
      ctx.strokeStyle = 'black';
      ctx.globalCompositeOperation = 'source-over';
    }

    if (tool === 'brush' || tool === 'eraser') {
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    } else if (tool === 'rectangle' || tool === 'circle') {
      // For shapes, we'll handle on mouse up
    }
  };

  const clearMask = () => {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;
    const ctx = maskCanvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
    saveHistory();
  };

  const handleApply = () => {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;

    const maskData = maskCanvas.toDataURL().split(',')[1];
    
    onEditRequest({
      type: editMode,
      maskData: editMode === 'inpaint' || editMode === 'outpaint' ? maskData : undefined,
      prompt: prompt || undefined,
      style: selectedStyle || undefined,
    });
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const link = document.createElement('a');
    link.download = `edited-image-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="image-edit-toolbar" ref={containerRef}>
      <div className="edit-toolbar-header">
        <h3><ImageIcon size={18} /> 이미지 편집</h3>
        <button className="btn-icon" onClick={onClose}>
          <X size={18} />
        </button>
      </div>

      {/* Edit Mode Tabs */}
      <div className="edit-mode-tabs">
        <button
          className={`tab ${editMode === 'inpaint' ? 'active' : ''}`}
          onClick={() => setEditMode('inpaint')}
        >
          <Paintbrush size={14} /> Inpaint
        </button>
        <button
          className={`tab ${editMode === 'outpaint' ? 'active' : ''}`}
          onClick={() => setEditMode('outpaint')}
        >
          <Maximize2 size={14} /> Outpaint
        </button>
        <button
          className={`tab ${editMode === 'style' ? 'active' : ''}`}
          onClick={() => setEditMode('style')}
        >
          <Palette size={14} /> 스타일
        </button>
        <button
          className={`tab ${editMode === 'enhance' ? 'active' : ''}`}
          onClick={() => setEditMode('enhance')}
        >
          <Wand2 size={14} /> 향상
        </button>
      </div>

      {/* Tool Bar */}
      {(editMode === 'inpaint' || editMode === 'outpaint') && (
        <div className="tool-bar">
          <button
            className={`btn-icon ${tool === 'brush' ? 'active' : ''}`}
            onClick={() => setTool('brush')}
            title="브러시"
          >
            <Paintbrush size={16} />
          </button>
          <button
            className={`btn-icon ${tool === 'eraser' ? 'active' : ''}`}
            onClick={() => setTool('eraser')}
            title="지우개"
          >
            <Eraser size={16} />
          </button>
          <button
            className={`btn-icon ${tool === 'rectangle' ? 'active' : ''}`}
            onClick={() => setTool('rectangle')}
            title="사각형"
          >
            <Square size={16} />
          </button>
          <button
            className={`btn-icon ${tool === 'circle' ? 'active' : ''}`}
            onClick={() => setTool('circle')}
            title="원형"
          >
            <Circle size={16} />
          </button>
          
          <div className="divider" />
          
          <button className="btn-icon" onClick={undo} disabled={historyIndex <= 0} title="실행 취소">
            <Undo size={16} />
          </button>
          <button className="btn-icon" onClick={redo} disabled={historyIndex >= history.length - 1} title="다시 실행">
            <Redo size={16} />
          </button>
          <button className="btn-icon" onClick={clearMask} title="마스크 초기화">
            <RotateCcw size={16} />
          </button>
          
          <div className="divider" />
          
          <div className="brush-size">
            <span>크기: {brushSize}</span>
            <input
              type="range"
              min="5"
              max="100"
              value={brushSize}
              onChange={(e) => setBrushSize(parseInt(e.target.value))}
            />
          </div>
        </div>
      )}

      {/* Style Presets */}
      {editMode === 'style' && (
        <div className="style-presets">
          {STYLE_PRESETS.map((style) => (
            <button
              key={style.id}
              className={`style-preset ${selectedStyle === style.id ? 'active' : ''}`}
              onClick={() => setSelectedStyle(style.id)}
            >
              <span className="style-icon">{style.icon}</span>
              <span className="style-name">{style.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Canvas Area */}
      <div className="canvas-container" style={{ transform: `scale(${zoom})` }}>
        <canvas ref={canvasRef} className="main-canvas" />
        <canvas
          ref={maskCanvasRef}
          className="mask-canvas"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
        />
      </div>

      {/* Zoom Controls */}
      <div className="zoom-controls">
        <button className="btn-icon" onClick={() => setZoom(z => Math.max(0.25, z - 0.25))}>
          <ZoomOut size={16} />
        </button>
        <span>{Math.round(zoom * 100)}%</span>
        <button className="btn-icon" onClick={() => setZoom(z => Math.min(3, z + 0.25))}>
          <ZoomIn size={16} />
        </button>
      </div>

      {/* Prompt Input */}
      <div className="prompt-input">
        <input
          type="text"
          className="input"
          placeholder={
            editMode === 'inpaint' ? '선택 영역에 무엇을 그릴까요?' :
            editMode === 'outpaint' ? '확장 영역에 무엇을 추가할까요?' :
            editMode === 'style' ? '추가 스타일 지시사항 (선택)' :
            '이미지 향상 지시사항'
          }
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
      </div>

      {/* Action Buttons */}
      <div className="action-buttons">
        <button className="btn-icon" onClick={handleDownload} title="다운로드">
          <Download size={16} />
        </button>
        <button className="btn-primary" onClick={handleApply}>
          <Check size={16} /> 적용하기
        </button>
      </div>
    </div>
  );
};
```

---

## 3. components/Canvas.tsx

```tsx
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
```

---

## 4. components/UsageStats.tsx

```tsx
import React, { useMemo } from 'react';
import { X, BarChart3, Coins, MessageSquare, Clock, TrendingUp } from 'lucide-react';
import { ChatSession } from '../types';
import { calculateCost } from '../utils/pricing';

interface UsageStatsProps {
  sessions: ChatSession[];
  onClose: () => void;
}

export const UsageStats: React.FC<UsageStatsProps> = ({ sessions, onClose }) => {
  const stats = useMemo(() => {
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let totalThinkingTokens = 0;
    let totalResponses = 0;
    let totalCost = 0;
    const modelUsage: Record<string, { responses: number; tokens: number; cost: number }> = {};
    const dailyUsage: Record<string, number> = {};

    for (const session of sessions) {
      for (const msg of session.messages) {
        if (msg.role === 'assistant' || msg.role === 'model') {
          totalResponses++;
          
          const usage = msg.metadata?.usageMetadata || msg.usageMetadata;
          if (usage) {
            totalInputTokens += usage.promptTokenCount || 0;
            totalOutputTokens += usage.candidatesTokenCount || 0;
            totalThinkingTokens += usage.thoughtsTokenCount || 0;
            
            const model = msg.metadata?.model || session.settings.model;
            const cost = calculateCost(model, usage.promptTokenCount, usage.candidatesTokenCount);
            totalCost += cost;

            if (!modelUsage[model]) {
              modelUsage[model] = { responses: 0, tokens: 0, cost: 0 };
            }
            modelUsage[model].responses++;
            modelUsage[model].tokens += usage.totalTokenCount || 0;
            modelUsage[model].cost += cost;
          }

          // Daily usage
          const date = new Date(msg.timestamp).toISOString().split('T')[0];
          dailyUsage[date] = (dailyUsage[date] || 0) + (usage?.totalTokenCount || 0);
        }
      }
    }

    return {
      totalInputTokens,
      totalOutputTokens,
      totalThinkingTokens,
      totalTokens: totalInputTokens + totalOutputTokens + totalThinkingTokens,
      totalResponses,
      totalCost,
      totalSessions: sessions.length,
      modelUsage,
      dailyUsage,
    };
  }, [sessions]);

  const maxTokens = Math.max(...Object.values(stats.dailyUsage), 1);
  const recentDays = Object.entries(stats.dailyUsage)
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 7)
    .reverse();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal usage-stats-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2><BarChart3 size={20} /> 사용량 통계</h2>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="stats-content">
          {/* Summary Cards */}
          <div className="stats-cards">
            <div className="stat-card">
              <div className="stat-icon">
                <MessageSquare size={24} />
              </div>
              <div className="stat-info">
                <span className="stat-value">{stats.totalTokens.toLocaleString()}</span>
                <span className="stat-label">총 토큰</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">
                <TrendingUp size={24} />
              </div>
              <div className="stat-info">
                <span className="stat-value">{stats.totalResponses}</span>
                <span className="stat-label">응답 수</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">
                <Coins size={24} />
              </div>
              <div className="stat-info">
                <span className="stat-value">${stats.totalCost.toFixed(4)}</span>
                <span className="stat-label">예상 비용</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">
                <Clock size={24} />
              </div>
              <div className="stat-info">
                <span className="stat-value">{stats.totalSessions}</span>
                <span className="stat-label">세션 수</span>
              </div>
            </div>
          </div>

          {/* Token Breakdown */}
          <div className="stats-section">
            <h3><BarChart3 size={16} /> 토큰 분류</h3>
            <div className="token-breakdown">
              <div className="breakdown-item">
                <span className="breakdown-label">입력 토큰</span>
                <div className="breakdown-bar">
                  <div
                    className="breakdown-fill input"
                    style={{ width: `${(stats.totalInputTokens / stats.totalTokens) * 100}%` }}
                  />
                </div>
                <span className="breakdown-value">{stats.totalInputTokens.toLocaleString()}</span>
              </div>
              <div className="breakdown-item">
                <span className="breakdown-label">출력 토큰</span>
                <div className="breakdown-bar">
                  <div
                    className="breakdown-fill output"
                    style={{ width: `${(stats.totalOutputTokens / stats.totalTokens) * 100}%` }}
                  />
                </div>
                <span className="breakdown-value">{stats.totalOutputTokens.toLocaleString()}</span>
              </div>
              <div className="breakdown-item">
                <span className="breakdown-label">Thinking 토큰</span>
                <div className="breakdown-bar">
                  <div
                    className="breakdown-fill thinking"
                    style={{ width: `${(stats.totalThinkingTokens / stats.totalTokens) * 100}%` }}
                  />
                </div>
                <span className="breakdown-value">{stats.totalThinkingTokens.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Daily Chart */}
          {recentDays.length > 0 && (
            <div className="stats-section">
              <h3><TrendingUp size={16} /> 최근 7일</h3>
              <div className="usage-chart">
                {recentDays.map(([date, tokens]) => (
                  <div key={date} className="chart-bar-container">
                    <div
                      className="chart-bar"
                      style={{ height: `${(tokens / maxTokens) * 100}%` }}
                    >
                      <span className="chart-value">{(tokens / 1000).toFixed(1)}K</span>
                    </div>
                    <span className="chart-label">{date.slice(5)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Model Usage */}
          {Object.keys(stats.modelUsage).length > 0 && (
            <div className="stats-section">
              <h3><MessageSquare size={16} /> 모델별 사용량</h3>
              <div className="model-breakdown">
                {Object.entries(stats.modelUsage).map(([model, usage]) => (
                  <div key={model} className="model-usage-item">
                    <span className="model-name">{model}</span>
                    <div className="model-stats">
                      <span>{usage.responses} 응답</span>
                      <span>{usage.tokens.toLocaleString()} 토큰</span>
                      <span>${usage.cost.toFixed(4)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
```
