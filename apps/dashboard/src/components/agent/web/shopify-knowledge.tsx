'use client';

import { useState } from 'react';
import {
  Book,
  Link as LinkIcon,
  FileText,
  CheckCircle2,
  RefreshCw,
  Trash2,
  Plus,
} from 'lucide-react';
import { cn } from '@/lib/cn';

export function ShopifyKnowledge() {
  const [sources, setSources] = useState([
    {
      id: '1',
      type: 'url',
      title: 'Shipping Policy',
      url: 'https://store.com/policies/shipping',
      status: 'synced',
      lastSync: '2 hours ago',
    },
    {
      id: '2',
      type: 'url',
      title: 'Return Policy',
      url: 'https://store.com/policies/returns',
      status: 'synced',
      lastSync: '2 hours ago',
    },
    {
      id: '3',
      type: 'text',
      title: 'Holiday Hours',
      url: '',
      status: 'syncing',
      lastSync: 'Syncing...',
    },
  ]);

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            AI Brain (Knowledge Base)
          </h1>
          <p className="text-[14px] text-muted-foreground mt-1">
            Feed your agent specific information about your policies, FAQs, and business details.
          </p>
        </div>
        <button className="px-5 py-2.5 bg-foreground text-background hover:bg-foreground/90 text-[13px] font-bold rounded-xl transition-colors flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Source
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Stats */}
        <div className="md:col-span-1 space-y-6">
          <div className="p-6 rounded-2xl border border-border/50 bg-card">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                <Book className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-[13px] font-bold text-muted-foreground uppercase tracking-widest">
                  Active Sources
                </h3>
                <div className="text-2xl font-bold text-foreground">{sources.length}</div>
              </div>
            </div>
            <p className="text-[12px] text-muted-foreground leading-relaxed">
              When a shopper asks a question, the agent searches these sources first before
              responding.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-blue-500/20 bg-blue-500/5">
            <h3 className="text-[14px] font-bold text-foreground mb-2 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-500" /> Shopify Catalog Synced
            </h3>
            <p className="text-[12px] text-muted-foreground leading-relaxed mb-4">
              Your entire Shopify product catalog (prices, inventory, descriptions) is automatically
              synced.
            </p>
            <button className="px-4 py-2 bg-background border border-border/50 hover:bg-black/5 dark:hover:bg-white/5 text-foreground text-[12px] font-bold rounded-lg transition-colors w-full">
              Force Re-sync Catalog
            </button>
          </div>
        </div>

        {/* Source List */}
        <div className="md:col-span-2">
          <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
            <div className="p-5 border-b border-border/50 flex justify-between items-center bg-black/5 dark:bg-white/5">
              <h3 className="text-[14px] font-bold text-foreground">Custom Knowledge Sources</h3>
            </div>

            {sources.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center">
                <Book className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
                <h4 className="text-lg font-bold text-foreground mb-2">No sources added yet</h4>
                <p className="text-[13px] text-muted-foreground max-w-sm mb-6">
                  Add links to your FAQ pages or paste text snippets to train your agent.
                </p>
                <button className="px-5 py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-[13px] font-bold rounded-xl transition-colors">
                  Add First Source
                </button>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {sources.map((source) => (
                  <div
                    key={source.id}
                    className="p-5 flex items-center justify-between hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-black/5 dark:bg-white/5 flex items-center justify-center text-muted-foreground">
                        {source.type === 'url' ? (
                          <LinkIcon className="w-5 h-5" />
                        ) : (
                          <FileText className="w-5 h-5" />
                        )}
                      </div>
                      <div>
                        <h4 className="text-[14px] font-bold text-foreground mb-1">
                          {source.title}
                        </h4>
                        {source.type === 'url' ? (
                          <a
                            href={source.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[12px] text-blue-500 hover:underline"
                          >
                            {source.url}
                          </a>
                        ) : (
                          <span className="text-[12px] text-muted-foreground">
                            Raw Text Snippet
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="flex flex-col items-end">
                        {source.status === 'synced' ? (
                          <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-500 uppercase tracking-widest">
                            <CheckCircle2 className="w-3 h-3" /> Ready
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[11px] font-bold text-blue-500 uppercase tracking-widest">
                            <RefreshCw className="w-3 h-3 animate-spin" /> Syncing
                          </span>
                        )}
                        <span className="text-[11px] text-muted-foreground mt-1">
                          {source.lastSync}
                        </span>
                      </div>

                      <button className="w-8 h-8 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500 flex items-center justify-center transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
