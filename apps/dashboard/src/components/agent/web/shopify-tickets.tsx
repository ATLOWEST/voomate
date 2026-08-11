'use client';

import { useState } from 'react';
import { Ticket, Search, Filter, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { cn } from '@/lib/cn';

export function ShopifyTickets() {
  const [activeTab, setActiveTab] = useState('open');

  const tickets = [
    {
      id: 'TKT-1042',
      customer: 'Sarah Jenkins',
      email: 'sarah.j@example.com',
      subject: "Where is my order? It's been 2 weeks.",
      status: 'open',
      priority: 'high',
      createdAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    },
    {
      id: 'TKT-1041',
      customer: 'Michael Chen',
      email: 'm.chen99@example.com',
      subject: 'Received wrong size for the running shoes',
      status: 'open',
      priority: 'medium',
      createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    },
    {
      id: 'TKT-1040',
      customer: 'Emma Watson',
      email: 'emma.w@example.com',
      subject: 'Refund request for order #8821',
      status: 'resolved',
      priority: 'low',
      createdAt: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
    },
  ];

  const filteredTickets = tickets.filter((t) => t.status === activeTab);

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Support Tickets</h1>
          <p className="text-[14px] text-muted-foreground mt-1">
            Manage escalations that the AI couldn't resolve automatically.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="p-5 rounded-2xl border border-border/50 bg-card">
          <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2">
            Open Escalations
          </div>
          <div className="text-3xl font-bold text-foreground">2</div>
        </div>
        <div className="p-5 rounded-2xl border border-border/50 bg-card">
          <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2">
            Resolved (7d)
          </div>
          <div className="text-3xl font-bold text-emerald-500">14</div>
        </div>
        <div className="p-5 rounded-2xl border border-border/50 bg-card">
          <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2">
            Avg Resolution Time
          </div>
          <div className="text-3xl font-bold text-foreground">4.2h</div>
        </div>
        <div className="p-5 rounded-2xl border border-border/50 bg-card">
          <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2">
            AI Deflection Rate
          </div>
          <div className="text-3xl font-bold text-blue-500">82%</div>
        </div>
      </div>

      <div className="rounded-2xl border border-border/50 bg-card overflow-hidden flex flex-col">
        <div className="p-4 border-b border-border/50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-1 bg-black/5 dark:bg-white/5 p-1 rounded-xl w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('open')}
              className={cn(
                'px-4 py-1.5 text-[13px] font-bold rounded-lg transition-colors flex-1 sm:flex-none',
                activeTab === 'open'
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              Open (2)
            </button>
            <button
              onClick={() => setActiveTab('resolved')}
              className={cn(
                'px-4 py-1.5 text-[13px] font-bold rounded-lg transition-colors flex-1 sm:flex-none',
                activeTab === 'resolved'
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              Resolved (14)
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search tickets..."
              className="w-full pl-9 pr-4 py-2 bg-background border border-border/50 rounded-xl text-[13px] focus:outline-none focus:border-blue-500/50"
            />
          </div>
        </div>

        <div className="divide-y divide-border/50">
          {filteredTickets.map((ticket) => (
            <div
              key={ticket.id}
              className="p-5 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors cursor-pointer group"
            >
              <div className="flex flex-col md:flex-row justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-[12px] font-mono text-muted-foreground">{ticket.id}</span>
                    <h3 className="text-[15px] font-bold text-foreground group-hover:text-blue-500 transition-colors">
                      {ticket.subject}
                    </h3>
                    {ticket.priority === 'high' && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-red-500/10 text-red-500">
                        High Priority
                      </span>
                    )}
                  </div>
                  <div className="text-[13px] text-muted-foreground flex items-center gap-2">
                    <span className="font-medium text-foreground">{ticket.customer}</span>
                    <span>•</span>
                    <span>{ticket.email}</span>
                  </div>
                </div>

                <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-2">
                  <span className="text-[12px] text-muted-foreground flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    {new Date(ticket.createdAt).toLocaleString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  <button className="px-4 py-1.5 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-foreground text-[12px] font-bold rounded-lg transition-colors">
                    View Thread
                  </button>
                </div>
              </div>
            </div>
          ))}

          {filteredTickets.length === 0 && (
            <div className="p-12 text-center flex flex-col items-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-500/50 mb-4" />
              <h4 className="text-lg font-bold text-foreground mb-2">All caught up!</h4>
              <p className="text-[13px] text-muted-foreground">
                There are no {activeTab} tickets right now.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
