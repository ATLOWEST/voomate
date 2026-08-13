'use client';

import { useState } from 'react';
import { useAgent } from '@/components/agent/shell';
import { AlertCircle, Trash2, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useApiAction } from '@/lib/hooks';

export default function ConfigurationPage() {
  const { agent } = useAgent();
  const router = useRouter();

  // Dummy state for inline editing
  const [model, setModel] = useState('gpt-4');
  const [language, setLanguage] = useState('en');
  const [systemPrompt, setSystemPrompt] = useState(
    'You are a helpful customer support agent for Voomate.',
  );

  // Toast state
  const [showToast, setShowToast] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const {
    run: deleteAgent,
    busy: deleting,
    error: deleteError,
  } = useApiAction(async (auth) => {
    await api.delete(`/v1/agents/${agent.id}`, auth);
    router.replace('/agents');
  });

  const triggerSave = () => {
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
    }, 2000);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 md:p-8 flex flex-col min-h-[calc(100vh-160px)]">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">Configuration</h2>
          <p className="text-[13.5px] text-muted-foreground mt-1">
            Manage core settings, models, and behaviour.
          </p>
        </div>

        {/* Auto-save Toast */}
        <div
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[13px] font-medium transition-all duration-300',
            showToast
              ? 'opacity-100 transform translate-y-0'
              : 'opacity-0 transform -translate-y-2 pointer-events-none',
          )}
        >
          <CheckCircle2 className="w-4 h-4" />
          Saved
        </div>
      </div>

      <div className="flex-1 space-y-8">
        {/* Basic Settings */}
        <div className="bg-card border border-border/50 rounded-xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-border/50 bg-black/[0.02] dark:bg-white/[0.02]">
            <h3 className="text-[14px] font-bold text-foreground">Model Settings</h3>
          </div>
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8">
              <div className="md:col-span-1">
                <label className="text-[13px] font-bold text-foreground block mb-1">
                  Language Model
                </label>
                <p className="text-[12px] text-muted-foreground">The LLM powering the responses.</p>
              </div>
              <div className="md:col-span-2">
                <select
                  value={model}
                  onChange={(e) => {
                    setModel(e.target.value);
                    triggerSave();
                  }}
                  className="w-full p-2.5 bg-black/[0.02] dark:bg-white/[0.02] border border-border/50 rounded-lg text-[13px] text-foreground outline-none focus:border-[#FF5722] focus:ring-1 focus:ring-[#FF5722] transition-colors"
                >
                  <option value="gpt-4">GPT-4 (Recommended)</option>
                  <option value="gpt-3.5">GPT-3.5 Turbo (Faster)</option>
                  <option value="claude">Claude 3.5 Sonnet</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8">
              <div className="md:col-span-1">
                <label className="text-[13px] font-bold text-foreground block mb-1">
                  Primary Language
                </label>
                <p className="text-[12px] text-muted-foreground">
                  Main spoken and understood language.
                </p>
              </div>
              <div className="md:col-span-2">
                <select
                  value={language}
                  onChange={(e) => {
                    setLanguage(e.target.value);
                    triggerSave();
                  }}
                  className="w-full p-2.5 bg-black/[0.02] dark:bg-white/[0.02] border border-border/50 rounded-lg text-[13px] text-foreground outline-none focus:border-[#FF5722] focus:ring-1 focus:ring-[#FF5722] transition-colors"
                >
                  <option value="en">English (US)</option>
                  <option value="es">Spanish (ES)</option>
                  <option value="fr">French (FR)</option>
                  <option value="jp">Japanese (JP)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Behaviour Settings */}
        <div className="bg-card border border-border/50 rounded-xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-border/50 bg-black/[0.02] dark:bg-white/[0.02]">
            <h3 className="text-[14px] font-bold text-foreground">Behaviour & Persona</h3>
          </div>
          <div className="p-6 space-y-6">
            <div className="flex flex-col gap-2">
              <label className="text-[13px] font-bold text-foreground">System Prompt</label>
              <p className="text-[12px] text-muted-foreground">
                The core instructions that dictate how the agent acts.
              </p>
              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                onBlur={triggerSave}
                className="w-full min-h-[150px] p-4 mt-2 bg-black/[0.02] dark:bg-white/[0.02] border border-border/50 rounded-lg text-[13px] text-foreground outline-none focus:border-[#FF5722] focus:ring-1 focus:ring-[#FF5722] transition-colors resize-y font-mono"
              />
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-red-500/5 border border-red-500/20 rounded-xl overflow-hidden shadow-sm mt-12">
          <div className="px-6 py-4 border-b border-red-500/20 bg-red-500/10">
            <h3 className="text-[14px] font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Danger Zone
            </h3>
          </div>
          <div className="p-6">
            <p className="text-[13px] text-red-600/80 dark:text-red-400/80 mb-4">
              Deleting this agent will permanently remove all its configurations and logs. This
              action cannot be undone.
            </p>
            {deleteError !== undefined && (
              <p className="mb-4 text-[13px] font-medium text-red-700 dark:text-red-300">
                {deleteError}
              </p>
            )}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <input
                type="text"
                placeholder={`Type "${agent.name}" to confirm`}
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                className="flex-1 max-w-sm p-2.5 bg-card border border-red-500/30 rounded-lg text-[13px] text-foreground outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors"
              />
              <button
                disabled={deleteConfirm !== agent.name || deleting}
                onClick={() => void deleteAgent()}
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-[13.5px] font-bold transition-colors shadow-sm disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" /> {deleting ? 'Deleting...' : 'Delete Agent'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
