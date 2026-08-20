'use client';

import { BarChart2, TrendingUp, Users, Target, ShieldCheck } from 'lucide-react';

export function ShopifyInsights() {
  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">AI Insights</h1>
          <p className="text-[14px] text-muted-foreground mt-1">
            Data-driven analytics on how the AI agent is interacting with your customers.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="p-5 rounded-2xl border border-border/50 bg-card">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-blue-500" />
            <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
              Total Users
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-3xl font-bold text-foreground">1,245</div>
            <div className="text-[12px] font-bold text-emerald-500">+12%</div>
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-border/50 bg-card">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-emerald-500" />
            <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
              Conversion Rate
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-3xl font-bold text-foreground">4.2%</div>
            <div className="text-[12px] font-bold text-emerald-500">+0.5%</div>
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-border/50 bg-card">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="w-4 h-4 text-purple-500" />
            <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
              Resolution Rate
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-3xl font-bold text-foreground">88%</div>
            <div className="text-[12px] font-bold text-red-500">-2%</div>
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-border/50 bg-card">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-orange-500" />
            <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
              Revenue Impact
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-3xl font-bold text-foreground">$4,210</div>
            <div className="text-[12px] font-bold text-emerald-500">+$840</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl border border-border/50 bg-card">
          <h3 className="text-[14px] font-bold text-foreground mb-4">Top Customer Questions</h3>
          <div className="space-y-4">
            {[
              { q: 'What is your return policy?', count: 145, trend: 'up' },
              { q: 'Do you ship internationally?', count: 98, trend: 'down' },
              { q: 'Where is my order?', count: 76, trend: 'up' },
              { q: 'Are these true to size?', count: 54, trend: 'neutral' },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-[13px] font-medium text-foreground">{item.q}</span>
                <span className="text-[13px] text-muted-foreground bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded-lg">
                  {item.count}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 rounded-2xl border border-border/50 bg-card flex flex-col items-center justify-center text-center">
          <BarChart2 className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
          <h3 className="text-lg font-bold text-foreground mb-2">Detailed Analytics</h3>
          <p className="text-[13px] text-muted-foreground max-w-xs mb-4">
            Connect Google Analytics or PostHog to see deeper insights into chat behavior.
          </p>
          <button className="px-4 py-2 bg-background border border-border/50 hover:bg-black/5 dark:hover:bg-white/5 text-foreground text-[12px] font-bold rounded-lg transition-colors">
            Connect Analytics
          </button>
        </div>
      </div>
    </div>
  );
}
