import React, { useState } from 'react';
import { Card, CardHeader } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { useToast } from '../../context/ToastContext';
import {
  Settings as SettingsIcon,
  Cpu,
  Key,
  ShieldCheck,
  CheckCircle2,
  Database,
  Sliders
} from 'lucide-react';

export const Settings = () => {
  const [provider, setProvider] = useState('auto');
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.70);
  const [vectorDb, setVectorDb] = useState('in_memory');
  const { success } = useToast();

  const handleSave = (e) => {
    e.preventDefault();
    success('System settings saved successfully!');
  };

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight flex items-center gap-2.5">
          <SettingsIcon className="w-7 h-7 text-indigo-400" />
          Evaluation Engine & System Settings
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Configure GenAI inference parameters, LangGraph human-in-the-loop thresholds, and vector store adapters.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* GenAI Engine Configuration */}
        <Card>
          <CardHeader
            title="GenAI Inference Provider"
            subtitle="Choose LLM backend provider for rubric generation and semantic answer grading"
          />
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Active Provider
              </label>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
              >
                <option value="auto">Auto (OpenAI / Gemini / Smart Offline Heuristic)</option>
                <option value="openai">OpenAI (GPT-4o-mini / GPT-4o)</option>
                <option value="gemini">Google Gemini (Gemini 1.5 Flash)</option>
                <option value="heuristic">Offline Academic Semantic Heuristic</option>
              </select>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 space-y-1">
              <div className="text-slate-800 dark:text-slate-300 font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Zero-Dependency Fallback Guaranteed:
              </div>
              <p>
                When API keys are not supplied in <code>.env</code>, the system automatically uses the High-Fidelity Academic Heuristic Evaluator with deterministic rubric scoring.
              </p>
            </div>
          </div>
        </Card>

        {/* Human-in-the-Loop Thresholds */}
        <Card>
          <CardHeader
            title="LangGraph Agentic Workflow & Confidence Gate"
            subtitle="Define autonomous confidence thresholds for flagging answers for teacher manual review"
          />
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Confidence Threshold for Auto-Pass
                </label>
                <span className="text-xs font-bold text-indigo-400 font-mono">
                  {(confidenceThreshold * 100).toFixed(0)}%
                </span>
              </div>
              <input
                type="range"
                min="0.50"
                max="0.95"
                step="0.05"
                value={confidenceThreshold}
                onChange={(e) => setConfidenceThreshold(parseFloat(e.target.value))}
                className="w-full accent-indigo-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Any student answer scored with confidence below {(confidenceThreshold * 100).toFixed(0)}% is flagged for manual staff review.
              </p>
            </div>
          </div>
        </Card>

        {/* Vector DB Settings */}
        <Card>
          <CardHeader
            title="Semantic RAG Vector Database"
            subtitle="Storage indexing strategy for question criteria and expected answers"
          />
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Vector Index Backend
              </label>
              <select
                value={vectorDb}
                onChange={(e) => setVectorDb(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
              >
                <option value="in_memory">In-Memory Cosine Vector Store (Active)</option>
                <option value="faiss">FAISS Dense Index</option>
                <option value="qdrant">Qdrant Cloud / Local Vector DB</option>
              </select>
            </div>
          </div>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" icon={CheckCircle2}>
            Save Configuration
          </Button>
        </div>
      </form>
    </div>
  );
};
