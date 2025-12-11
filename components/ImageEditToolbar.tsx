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
