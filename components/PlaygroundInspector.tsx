import React, { useMemo } from 'react';
import { ChevronDown, ChevronUp, Clipboard, CheckCircle2, Info, Globe, Terminal, Activity } from 'lucide-react';
import { UsageMetadata, Attachment, ChatSettings } from '../types';

interface PlaygroundRequestPreview {
  model: string;
  message: string;
  attachments?: Pick<Attachment, 'name' | 'mimeType' | 'category'>[];
  config: Partial<ChatSettings> & {
    responseMimeType?: string;
    tools?: any[];
  };
  timestamp: string;
  flags: {
    search: boolean;
    jsonMode: boolean;
    thoughts: boolean;
    functions: number;
    codeExecution: boolean;
    urlGrounding: boolean;
  };
}

interface PlaygroundInspectorProps {
  isOpen: boolean;
  onToggle: () => void;
  requestPreview: PlaygroundRequestPreview | null;
  usage: UsageMetadata | null;
}

const formatJson = (value: unknown) => JSON.stringify(value, null, 2);

export const PlaygroundInspector: React.FC<PlaygroundInspectorProps> = ({
  isOpen,
  onToggle,
  requestPreview,
  usage,
}) => {
  const summary = useMemo(() => {
    if (!requestPreview) return null;

    const caps: string[] = [];
    if (requestPreview.flags.search) caps.push('Google Search');
    if (requestPreview.flags.jsonMode) caps.push('JSON Mode');
    if (requestPreview.flags.thoughts) caps.push('Thoughts');
    if (requestPreview.flags.codeExecution) caps.push('Code Execution');
    if (requestPreview.flags.urlGrounding) caps.push('URL Grounding');
    if (requestPreview.flags.functions > 0) caps.push(`Functions x${requestPreview.flags.functions}`);

    return {
      caps,
      hasAttachments: !!requestPreview.attachments?.length,
    };
  }, [requestPreview]);

  const copyJson = async () => {
    if (!requestPreview) return;
    await navigator.clipboard.writeText(formatJson(requestPreview));
  };

  return (
    <div className="border-b border-slate-800 bg-slate-950/60">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-300 hover:text-white"
      >
        <div className="flex items-center gap-2">
          <Terminal size={14} className="text-sky-400" />
          Playground Inspector
          {requestPreview?.timestamp && (
            <span className="text-[10px] text-slate-500 font-mono normal-case">
              Last request • {requestPreview.timestamp}
            </span>
          )}
          {usage && (
            <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
              <Activity size={10} />
              {usage.totalTokenCount.toLocaleString()} tok
            </span>
          )}
        </div>
        {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {isOpen && (
        <div className="px-4 pb-4 space-y-3 text-sm text-slate-200">
          {!requestPreview && (
            <p className="text-xs text-slate-500 flex items-center gap-2">
              <Info size={14} className="text-slate-400" />
              메시지를 보내면 Playground용 요청 미리보기가 여기에 표시됩니다.
            </p>
          )}

          {requestPreview && (
            <>
              <div className="flex flex-wrap gap-2 text-[11px]">
                <span className="px-2 py-1 rounded-full bg-slate-800 text-sky-300 border border-slate-700 font-mono">
                  {requestPreview.model}
                </span>
                {summary?.hasAttachments && (
                  <span className="px-2 py-1 rounded-full bg-indigo-900/40 text-indigo-200 border border-indigo-700/50 font-mono">
                    Attachments
                  </span>
                )}
                {summary?.caps.map((cap) => (
                  <span
                    key={cap}
                    className="px-2 py-1 rounded-full bg-slate-800 text-slate-200 border border-slate-700 font-mono"
                  >
                    {cap}
                  </span>
                ))}
              </div>

              <div className="bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 text-[11px] text-slate-400 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Globe size={12} />
                    Request payload
                  </div>
                  <button
                    onClick={copyJson}
                    className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-sky-300"
                  >
                    <Clipboard size={12} /> Copy JSON
                  </button>
                </div>
                <pre className="p-3 text-xs font-mono text-slate-200 overflow-x-auto whitespace-pre-wrap bg-slate-950">
                  {formatJson(requestPreview)}
                </pre>
              </div>

              {usage && (
                <div className="flex flex-wrap gap-2 text-[11px] text-slate-400">
                  <span className="flex items-center gap-1 px-2 py-1 bg-slate-900/50 rounded border border-slate-800">
                    <CheckCircle2 size={12} className="text-emerald-400" /> Prompt {usage.promptTokenCount.toLocaleString()} tok
                  </span>
                  <span className="flex items-center gap-1 px-2 py-1 bg-slate-900/50 rounded border border-slate-800">
                    <CheckCircle2 size={12} className="text-sky-400" /> Completion {usage.candidatesTokenCount.toLocaleString()} tok
                  </span>
                  <span className="flex items-center gap-1 px-2 py-1 bg-slate-900/50 rounded border border-slate-800">
                    <Activity size={12} className="text-amber-400" /> Total {usage.totalTokenCount.toLocaleString()} tok
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export type { PlaygroundRequestPreview };
