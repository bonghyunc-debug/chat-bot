
import React, { useState } from 'react';
import { ChatSettings } from '../types';
import { X, Copy, Check, Terminal } from 'lucide-react';

interface CodeExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  modelId: string;
  settings: ChatSettings;
}

const CodeExportModal: React.FC<CodeExportModalProps> = ({
  isOpen,
  onClose,
  modelId,
  settings,
}) => {
  const [copiedTab, setCopiedTab] = useState<'js' | 'py' | null>(null);

  if (!isOpen) return null;

  const handleCopy = async (text: string, tab: 'js' | 'py') => {
    await navigator.clipboard.writeText(text);
    setCopiedTab(tab);
    setTimeout(() => setCopiedTab(null), 2000);
  };

  // Construct JavaScript Snippet (Using modern @google/genai SDK as per guidelines)
  const toolsConfig = settings.useGoogleSearch ? `
    tools: [{ googleSearch: {} }],` : '';
    
  const jsonConfig = settings.jsonMode ? `
    responseMimeType: 'application/json',` : '';

  const safetySettingsConfig = settings.safetySettings ? `
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: '${settings.safetySettings}' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: '${settings.safetySettings}' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: '${settings.safetySettings}' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: '${settings.safetySettings}' },
    ],` : '';

  const jsSnippet = `import { GoogleGenAI } from "@google/genai";

const envApiKey = import.meta.env?.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey: envApiKey });

async function run() {
  const response = await ai.models.generateContent({
    model: '${modelId}',
    contents: [
      {
        role: 'user',
        parts: [{ text: 'INSERT_INPUT_HERE' }] 
      }
    ],
    config: {
      systemInstruction: ${JSON.stringify(settings.systemInstruction)},
      temperature: ${settings.temperature},
      topP: ${settings.topP},
      topK: ${settings.topK},
      maxOutputTokens: ${settings.maxOutputTokens},
      stopSequences: ${JSON.stringify(settings.stopSequences)},${toolsConfig}${jsonConfig}${safetySettingsConfig}
    }
  });

  console.log(response.text);
}

run().catch(console.error);`;

  // Construct Python Snippet (Modern google-genai library)
  const pyTools = settings.useGoogleSearch ? `,
    tools=[{'google_search': {}}]` : '';
  
  const pyJson = settings.jsonMode ? `,
    response_mime_type='application/json'` : '';

  const pySnippet = `from google import genai
from google.genai import types

client = genai.Client(api_key="GEMINI_API_KEY")

response = client.models.generate_content(
    model='${modelId}',
    contents='INSERT_INPUT_HERE',
    config=types.GenerateContentConfig(
        system_instruction=${JSON.stringify(settings.systemInstruction)},
        temperature=${settings.temperature},
        top_p=${settings.topP},
        top_k=${settings.topK},
        max_output_tokens=${settings.maxOutputTokens},
        stop_sequences=${JSON.stringify(settings.stopSequences)},
        safety_settings=[
            types.SafetySetting(
                category='HARM_CATEGORY_HATE_SPEECH',
                threshold='${settings.safetySettings}',
            ),
            # ... other categories
        ]${pyTools}${pyJson}
    )
)

print(response.text)`;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-w-4xl w-full flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
            <div className="flex items-center gap-2 text-slate-200">
                <div className="p-1.5 bg-indigo-500/20 rounded-md text-indigo-400">
                    <Terminal size={18} />
                </div>
                <h2 className="text-sm font-bold uppercase tracking-wide">Get Code</h2>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                <X size={20} />
            </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
            
            {/* JavaScript Section */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide">JavaScript / TypeScript (Node.js)</h3>
                    <button 
                        onClick={() => handleCopy(jsSnippet, 'js')}
                        className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-sky-400 transition-colors px-2 py-1 rounded bg-slate-800 border border-slate-700 hover:border-sky-500/50"
                    >
                        {copiedTab === 'js' ? <Check size={14} className="text-emerald-400"/> : <Copy size={14} />}
                        {copiedTab === 'js' ? 'Copied' : 'Copy'}
                    </button>
                </div>
                <div className="relative group">
                    <pre className="bg-slate-950 p-4 rounded-lg border border-slate-800 text-xs font-mono text-slate-300 overflow-x-auto">
                        <code>{jsSnippet}</code>
                    </pre>
                </div>
            </div>

            {/* Python Section */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide">Python (google-genai)</h3>
                    <button 
                         onClick={() => handleCopy(pySnippet, 'py')}
                         className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-sky-400 transition-colors px-2 py-1 rounded bg-slate-800 border border-slate-700 hover:border-sky-500/50"
                    >
                        {copiedTab === 'py' ? <Check size={14} className="text-emerald-400"/> : <Copy size={14} />}
                        {copiedTab === 'py' ? 'Copied' : 'Copy'}
                    </button>
                </div>
                <div className="relative group">
                    <pre className="bg-slate-950 p-4 rounded-lg border border-slate-800 text-xs font-mono text-slate-300 overflow-x-auto">
                        <code>{pySnippet}</code>
                    </pre>
                </div>
            </div>

        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/50 text-center">
            <p className="text-[10px] text-slate-500">
                * Generated code uses the modern <code>@google/genai</code> SDK and reflects your current parameters.
            </p>
        </div>
      </div>
    </div>
  );
};

export default CodeExportModal;
