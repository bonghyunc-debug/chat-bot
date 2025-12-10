import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Copy, Check, BookOpen, Search, FolderOpen } from 'lucide-react';
import { PromptTemplate } from '../types';

interface PromptLibraryProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPrompt: (content: string) => void;
}

const DEFAULT_TEMPLATES: PromptTemplate[] = [
  {
    id: 'default-1',
    name: '코드 리뷰 요청',
    content: '다음 코드를 리뷰해주세요. 버그, 성능 개선점, 코드 스타일 문제를 찾아주세요:\n\n```\n[코드 붙여넣기]\n```',
    category: '개발',
    createdAt: Date.now()
  },
  {
    id: 'default-2',
    name: '문서 요약',
    content: '다음 문서를 핵심 포인트 위주로 요약해주세요. 불릿 포인트로 정리해주세요:\n\n[문서 내용]',
    category: '생산성',
    createdAt: Date.now()
  },
  {
    id: 'default-3',
    name: '번역 요청',
    content: '다음 텍스트를 자연스러운 한국어로 번역해주세요. 원문의 뉘앙스와 톤을 유지해주세요:\n\n[번역할 텍스트]',
    category: '번역',
    createdAt: Date.now()
  }
];

export const PromptLibrary: React.FC<PromptLibraryProps> = ({ isOpen, onClose, onSelectPrompt }) => {
  const [templates, setTemplates] = useState<PromptTemplate[]>(() => {
    try {
      const saved = localStorage.getItem('prompt_templates');
      if (saved) {
        const parsed = JSON.parse(saved);
        return [...DEFAULT_TEMPLATES, ...parsed];
      }
    } catch (e) {
      console.error('Failed to load templates', e);
    }
    return DEFAULT_TEMPLATES;
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    // 사용자 템플릿만 저장 (기본 템플릿 제외)
    const userTemplates = templates.filter(t => !t.id.startsWith('default-'));
    localStorage.setItem('prompt_templates', JSON.stringify(userTemplates));
  }, [templates]);

  if (!isOpen) return null;

  const filteredTemplates = templates.filter(t =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const categories = [...new Set(templates.map(t => t.category).filter(Boolean))];

  const handleAddTemplate = () => {
    if (!newName.trim() || !newContent.trim()) return;

    const newTemplate: PromptTemplate = {
      id: `user-${Date.now()}`,
      name: newName.trim(),
      content: newContent.trim(),
      category: newCategory.trim() || undefined,
      createdAt: Date.now()
    };

    setTemplates(prev => [...prev, newTemplate]);
    setNewName('');
    setNewContent('');
    setNewCategory('');
    setIsAdding(false);
  };

  const handleDeleteTemplate = (id: string) => {
    if (id.startsWith('default-')) return; // 기본 템플릿은 삭제 불가
    setTemplates(prev => prev.filter(t => t.id !== id));
  };

  const handleCopyToClipboard = async (content: string, id: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleUseTemplate = (content: string) => {
    onSelectPrompt(content);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-w-3xl w-full flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2 text-slate-200">
            <div className="p-1.5 bg-amber-500/20 rounded-md text-amber-400">
              <BookOpen size={18} />
            </div>
            <h2 className="text-sm font-bold uppercase tracking-wide">프롬프트 라이브러리</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Search & Add */}
        <div className="px-6 py-3 border-b border-slate-800 flex gap-3">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="템플릿 검색..."
              className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:border-sky-500 outline-none"
            />
          </div>
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus size={16} />
            새 템플릿
          </button>
        </div>

        {/* Add Form */}
        {isAdding && (
          <div className="px-6 py-4 border-b border-slate-800 bg-slate-800/50 space-y-3">
            <div className="flex gap-3">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="템플릿 이름"
                className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-sky-500 outline-none"
              />
              <input
                type="text"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="카테고리 (선택)"
                className="w-32 bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-sky-500 outline-none"
              />
            </div>
            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="프롬프트 내용..."
              rows={4}
              className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-sky-500 outline-none resize-none"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsAdding(false)}
                className="px-4 py-1.5 text-slate-400 hover:text-white text-sm transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleAddTemplate}
                disabled={!newName.trim() || !newContent.trim()}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded text-sm font-medium transition-colors"
              >
                저장
              </button>
            </div>
          </div>
        )}

        {/* Template List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {filteredTemplates.length === 0 ? (
            <div className="text-center text-slate-500 py-8">
              <FolderOpen size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">템플릿이 없습니다</p>
            </div>
          ) : (
            filteredTemplates.map(template => (
              <div
                key={template.id}
                className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 hover:border-slate-600 transition-colors group"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-sm font-medium text-white">{template.name}</h3>
                    {template.category && (
                      <span className="text-[10px] text-slate-400 bg-slate-700 px-1.5 py-0.5 rounded mt-1 inline-block">
                        {template.category}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleCopyToClipboard(template.content, template.id)}
                      className="p-1.5 text-slate-400 hover:text-sky-400 hover:bg-slate-700 rounded transition-colors"
                      title="복사"
                    >
                      {copiedId === template.id ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    </button>
                    {!template.id.startsWith('default-') && (
                      <button
                        onClick={() => handleDeleteTemplate(template.id)}
                        className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded transition-colors"
                        title="삭제"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-xs text-slate-400 line-clamp-2 mb-3">{template.content}</p>
                <button
                  onClick={() => handleUseTemplate(template.content)}
                  className="w-full py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded text-xs font-medium transition-colors"
                >
                  이 템플릿 사용
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
