'use client';

import { useState } from 'react';
import {
  Bot,
  MessageSquare,
  Ticket,
  Settings2,
  BarChart2,
  Zap,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { useRouter } from 'next/navigation';

export function ShopifyDashboard() {
  const router = useRouter();

  // Mock data for UI development
  const [isSyncing, setIsSyncing] = useState(false);
  const syncProgress = {
    isTraining: false,
    progressPct: 0,
    processedCount: 0,
    totalProducts: 0,
    estimatedMinutes: 0,
  };
  const stats = { totalConversations: 142, liveCount: 3, totalConversions: 45, minutesUsed: 312 };
  const agentName = 'Web Agent (Shopify)';
  const isAgentEnabled = true;

  const startSync = () => {
    setIsSyncing(true);
    setTimeout(() => setIsSyncing(false), 2000);
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Welcome to Voomate | AI voice agent
          </h1>
          <p className="text-[14px] text-muted-foreground mt-1">
            Manage your Shopify Web Agent and monitor customer conversations.
          </p>
        </div>
        <div className="px-3 py-1.5 bg-blue-500/10 text-blue-500 text-[12px] font-bold rounded-lg border border-blue-500/20">
          Trial: 14 days left
        </div>
      </div>

      {/* COMPLIANT REVIEW PROMPT BANNER */}
      <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-foreground text-[15px] mb-1">We value your feedback!</h3>
          <p className="text-[13px] text-muted-foreground">
            It helps us make our product better and keeps our team energized. Let us know how we're
            doing by sharing your experience!
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-[13px] font-bold rounded-lg transition-colors">
            Share Feedback
          </button>
          <button className="px-4 py-2 hover:bg-black/5 dark:hover:bg-white/5 text-muted-foreground hover:text-foreground text-[13px] font-bold rounded-lg transition-colors">
            Dismiss
          </button>
        </div>
      </div>

      {/* HERO STATUS CARD */}
      <div className="p-6 rounded-2xl border border-border/50 bg-card shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-4">
            <div
              className={cn(
                'w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border',
                isAgentEnabled
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                  : 'bg-muted border-border text-muted-foreground',
              )}
            >
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-xl font-bold text-foreground">{agentName}</h2>
                <span
                  className={cn(
                    'px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider',
                    isAgentEnabled
                      ? 'bg-emerald-500/10 text-emerald-500'
                      : 'bg-amber-500/10 text-amber-500',
                  )}
                >
                  {isAgentEnabled ? 'Active' : 'Offline'}
                </span>
              </div>
              <p className="text-[13px] text-muted-foreground">
                {isAgentEnabled
                  ? 'Agent is active and handling customer queries on your Shopify store.'
                  : 'Agent is offline. Activate it to start assisting customers.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              onClick={startSync}
              disabled={isSyncing || syncProgress.isTraining}
              className="flex-1 md:flex-none px-5 py-2.5 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-foreground text-[13px] font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <Zap className="w-4 h-4" />
              {syncProgress.isTraining
                ? `Training… ${syncProgress.progressPct}%`
                : isSyncing
                  ? 'Syncing...'
                  : 'Sync Store Data'}
            </button>
            <button
              onClick={() => router.push('/agents/web/settings?niche=shopify')}
              className="flex-1 md:flex-none px-5 py-2.5 bg-foreground text-background hover:bg-foreground/90 text-[13px] font-bold rounded-xl transition-colors"
            >
              Manage Agent
            </button>
          </div>
        </div>

        {syncProgress.isTraining && (
          <div className="mt-6 p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 flex flex-col gap-3">
            <div className="flex items-center justify-between text-[13px] font-bold text-foreground">
              <span>Training Store Brain</span>
              <span className="text-blue-500">{syncProgress.progressPct}%</span>
            </div>
            <div className="w-full h-2 bg-blue-500/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all duration-500"
                style={{ width: `${syncProgress.progressPct}%` }}
              />
            </div>
            <div className="text-[12px] text-muted-foreground font-medium">
              {syncProgress.processedCount}/{syncProgress.totalProducts} products · ~
              {syncProgress.estimatedMinutes} min left
            </div>
          </div>
        )}
      </div>

      {/* STATS ROW */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Total Chats */}
        <div
          onClick={() => router.push('/agents/web/conversations?niche=shopify')}
          className="group cursor-pointer rounded-2xl border border-border/50 bg-card overflow-hidden hover:border-blue-500/50 hover:shadow-md transition-all"
        >
          <div className="h-1 w-full bg-blue-500" />
          <div className="p-5">
            <div className="flex justify-between items-start mb-4">
              <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
                <MessageSquare className="w-4 h-4" />
              </div>
              {stats.liveCount > 0 && (
                <span className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-500 text-[11px] font-bold flex items-center gap-1.5 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Live
                </span>
              )}
            </div>
            <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2">
              Total Chats
            </div>
            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-3xl font-bold text-foreground leading-none">
                {stats.totalConversations}
              </span>
            </div>
            <div className="text-[12px] font-bold text-blue-500 group-hover:text-blue-600 flex items-center gap-1">
              View chat logs <ArrowRight className="w-3 h-3" />
            </div>
          </div>
        </div>

        {/* Card 2: Order Conversion */}
        <div className="group rounded-2xl border border-border/50 bg-card overflow-hidden hover:border-emerald-500/50 hover:shadow-md transition-all">
          <div className="h-1 w-full bg-emerald-500" />
          <div className="p-5">
            <div className="flex justify-between items-start mb-4">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
            </div>
            <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2">
              Order Conversions
            </div>
            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-3xl font-bold text-foreground leading-none">
                {stats.totalConversions}
              </span>
            </div>
            <div className="text-[12px] font-bold text-emerald-500 flex items-center gap-1">
              View sales reports <ArrowRight className="w-3 h-3" />
            </div>
          </div>
        </div>

        {/* Card 3: Minutes Used */}
        <div className="group rounded-2xl border border-border/50 bg-card overflow-hidden hover:border-purple-500/50 hover:shadow-md transition-all">
          <div className="h-1 w-full bg-purple-500" />
          <div className="p-5">
            <div className="flex justify-between items-start mb-4">
              <div className="w-9 h-9 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center">
                <BarChart2 className="w-5 h-5" />
              </div>
            </div>
            <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2">
              Minutes Used
            </div>
            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-3xl font-bold text-foreground leading-none">
                {stats.minutesUsed}
              </span>
            </div>
            <div className="text-[12px] font-bold text-purple-500 flex items-center gap-1">
              View billing <ArrowRight className="w-3 h-3" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
