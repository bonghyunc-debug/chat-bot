# FILES_CSS_ADDITIONS.md - 추가 CSS 스타일

> 기존 App.css 파일 끝에 아래 스타일을 추가하세요.

```css
/* ===== Function Calling Panel ===== */
.function-panel {
  width: var(--canvas-width);
  height: 100vh;
  background: var(--bg-secondary);
  border-left: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.function-panel-header {
  padding: 16px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.function-panel-header h3 {
  margin: 0;
  font-size: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.function-panel-actions {
  display: flex;
  gap: 4px;
}

.function-panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.function-templates {
  margin-bottom: 20px;
}

.function-templates h4 {
  margin: 0 0 12px 0;
  font-size: 13px;
  color: var(--text-secondary);
}

.template-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.btn-template {
  padding: 6px 12px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  color: var(--text-primary);
  font-size: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all var(--transition);
}

.btn-template:hover {
  background: var(--bg-hover);
  border-color: var(--accent-primary);
}

.new-function-form {
  margin-bottom: 20px;
  padding: 16px;
  background: var(--bg-tertiary);
  border-radius: var(--border-radius);
}

.new-function-form h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
}

.form-row {
  margin-bottom: 12px;
}

.form-row:last-child {
  margin-bottom: 0;
}

.textarea.mono {
  font-family: var(--font-mono);
  font-size: 12px;
}

.function-list h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
}

.function-item {
  background: var(--bg-tertiary);
  border-radius: var(--border-radius);
  margin-bottom: 8px;
  overflow: hidden;
}

.function-item-header {
  padding: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: background var(--transition);
}

.function-item-header:hover {
  background: var(--bg-hover);
}

.function-name {
  flex: 1;
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 500;
}

.function-item-actions {
  display: flex;
  gap: 4px;
}

.function-item-details {
  padding: 12px;
  border-top: 1px solid var(--border-color);
  background: var(--bg-primary);
}

.function-description {
  margin: 0 0 12px 0;
  font-size: 13px;
  color: var(--text-secondary);
}

.function-params {
  margin: 0;
  padding: 12px;
  background: var(--bg-secondary);
  border-radius: var(--border-radius);
  font-family: var(--font-mono);
  font-size: 11px;
  overflow-x: auto;
}

.json-editor {
  height: 100%;
}

.json-editor .textarea {
  height: calc(100% - 40px);
  resize: none;
}

.error-text {
  margin-top: 8px;
  color: var(--error);
  font-size: 12px;
}

.test-result {
  margin-top: 16px;
  padding: 12px;
  background: var(--bg-tertiary);
  border-radius: var(--border-radius);
  position: relative;
}

.test-result h4 {
  margin: 0 0 8px 0;
  font-size: 13px;
}

.test-result pre {
  margin: 0;
  padding: 12px;
  background: var(--bg-primary);
  border-radius: var(--border-radius);
  font-family: var(--font-mono);
  font-size: 11px;
  overflow-x: auto;
}

.test-result .btn-icon {
  position: absolute;
  top: 8px;
  right: 8px;
}

/* ===== Image Edit Toolbar ===== */
.image-edit-toolbar {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 90vw;
  max-width: 900px;
  max-height: 90vh;
  background: var(--bg-secondary);
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow-lg);
  display: flex;
  flex-direction: column;
  z-index: 1000;
}

.edit-toolbar-header {
  padding: 16px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.edit-toolbar-header h3 {
  margin: 0;
  font-size: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.edit-mode-tabs {
  display: flex;
  padding: 8px 16px;
  gap: 4px;
  border-bottom: 1px solid var(--border-color);
}

.edit-mode-tabs .tab {
  padding: 8px 16px;
  background: transparent;
  border: none;
  color: var(--text-secondary);
  font-size: 13px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  border-radius: var(--border-radius);
  transition: all var(--transition);
}

.edit-mode-tabs .tab:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.edit-mode-tabs .tab.active {
  background: var(--accent-muted);
  color: var(--accent-primary);
}

.tool-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
  flex-wrap: wrap;
}

.tool-bar .divider {
  width: 1px;
  height: 24px;
  background: var(--border-color);
  margin: 0 8px;
}

.brush-size {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--text-secondary);
}

.brush-size input[type="range"] {
  width: 100px;
}

.style-presets {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 16px;
}

.style-preset {
  padding: 12px 16px;
  background: var(--bg-tertiary);
  border: 2px solid transparent;
  border-radius: var(--border-radius);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  transition: all var(--transition);
}

.style-preset:hover {
  background: var(--bg-hover);
}

.style-preset.active {
  border-color: var(--accent-primary);
  background: var(--accent-muted);
}

.style-icon {
  font-size: 24px;
}

.style-name {
  font-size: 12px;
  color: var(--text-secondary);
}

.canvas-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  overflow: auto;
  position: relative;
  background: var(--bg-primary);
}

.main-canvas {
  max-width: 100%;
  max-height: 100%;
  border-radius: var(--border-radius);
}

.mask-canvas {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  opacity: 0.5;
  cursor: crosshair;
  pointer-events: auto;
}

.zoom-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px;
  border-top: 1px solid var(--border-color);
  font-size: 12px;
  color: var(--text-secondary);
}

.prompt-input {
  padding: 12px 16px;
  border-top: 1px solid var(--border-color);
}

.action-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid var(--border-color);
}

/* ===== Function Calls in Messages ===== */
.function-calls {
  margin-top: 12px;
  padding: 12px;
  background: var(--bg-tertiary);
  border-radius: var(--border-radius);
  border-left: 3px solid var(--warning);
}

.function-calls h4 {
  margin: 0 0 8px 0;
  font-size: 12px;
  color: var(--warning);
  display: flex;
  align-items: center;
  gap: 6px;
}

.function-call-item {
  margin-bottom: 8px;
  padding: 8px;
  background: var(--bg-primary);
  border-radius: var(--border-radius);
}

.function-call-item:last-child {
  margin-bottom: 0;
}

.fn-name {
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 600;
  color: var(--accent-primary);
}

.fn-args, .fn-result {
  margin: 8px 0 0 0;
  padding: 8px;
  background: var(--bg-secondary);
  border-radius: 4px;
  font-family: var(--font-mono);
  font-size: 11px;
  overflow-x: auto;
}

.fn-result {
  border-left: 2px solid var(--success);
}

/* ===== Function Response Input ===== */
.function-response-input {
  margin-top: 12px;
  padding: 12px;
  background: var(--bg-tertiary);
  border-radius: var(--border-radius);
  border: 2px dashed var(--warning);
}

.function-response-input h5 {
  margin: 0 0 8px 0;
  font-size: 12px;
  color: var(--warning);
}

.function-response-input .textarea {
  margin-bottom: 8px;
  font-family: var(--font-mono);
  font-size: 12px;
}

.function-response-input .btn-row {
  display: flex;
  gap: 8px;
}

/* ===== Generated Image Actions ===== */
.generated-image-container {
  position: relative;
}

.generated-image-container .image-actions {
  position: absolute;
  bottom: 8px;
  right: 8px;
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity var(--transition);
}

.generated-image-container:hover .image-actions {
  opacity: 1;
}

.generated-image-container .btn-icon {
  background: rgba(0, 0, 0, 0.6);
  color: white;
  backdrop-filter: blur(4px);
}

.generated-image-container .btn-icon:hover {
  background: rgba(0, 0, 0, 0.8);
}

/* ===== Header Function Button ===== */
.header-functions-badge {
  position: relative;
}

.header-functions-badge::after {
  content: '';
  position: absolute;
  top: 4px;
  right: 4px;
  width: 8px;
  height: 8px;
  background: var(--success);
  border-radius: 50%;
}

/* ===== Responsive Adjustments ===== */
@media (max-width: 768px) {
  .function-panel {
    position: fixed;
    left: 0;
    top: 0;
    width: 100%;
    z-index: 100;
  }

  .image-edit-toolbar {
    width: 100%;
    height: 100%;
    max-width: none;
    max-height: none;
    border-radius: 0;
  }

  .style-presets {
    justify-content: center;
  }
}
```

---

## App.css 전체 파일

> App.css 전체 파일(1608줄)은 현재 프로젝트의 `/home/claude/gemini-chat-ui/App.css` 파일을 복사하고,
> 위의 추가 스타일을 파일 끝에 붙여넣으세요.

또는 별도로 제공되는 `App.css` 파일을 그대로 사용하세요.
