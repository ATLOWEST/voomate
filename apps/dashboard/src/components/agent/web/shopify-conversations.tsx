'use client';

import { useState, useMemo } from 'react';
import { MessageSquare, Calendar, Download, Trash2, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/cn';

export function ShopifyConversations() {
  const [dateFilter, setDateFilter] = useState('7');
  const [viewTranscript, setViewTranscript] = useState<any[] | null>(null);

  // Mock sessions for demo
  const sessions = useMemo(
    () => [
      {
        id: '1',
        createdAt: new Date().toISOString(),
        duration: 124,
        isConverted: true,
        questionsCount: 4,
        transcript: [
          {
            role: 'user',
            content:
              'Hi, I ordered the black shirt but I need to change it to blue before it ships.',
          },
          {
            role: 'agent',
            content: 'I can help with that. Could you please provide your order number?',
          },
          { role: 'user', content: "It's 1004." },
          {
            role: 'agent',
            content:
              "Thanks! I've updated order 1004 to the blue shirt. You'll receive a new email confirmation shortly.",
          },
        ],
      },
      {
        id: '2',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        duration: 45,
        isConverted: false,
        questionsCount: 2,
        transcript: [
          { role: 'user', content: 'Do you ship to Canada?' },
          {
            role: 'agent',
            content: 'Yes, we ship to Canada! Standard shipping takes 5-7 business days.',
          },
        ],
      },
    ],
    [],
  );

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Voice Conversations</h1>
          <p className="text-[14px] text-muted-foreground mt-1">
            Full transcripts of every session your agent has had with shoppers.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="pl-9 pr-8 py-2 bg-card border border-border/50 rounded-xl text-[13px] font-medium text-foreground appearance-none focus:outline-none focus:border-blue-500/50"
            >
              <option value="1">Today</option>
              <option value="7">Last 7 Days</option>
              <option value="30">Last 30 Days</option>
              <option value="all">All Time</option>
            </select>
          </div>
          <button className="px-4 py-2 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-foreground text-[13px] font-bold rounded-xl transition-colors flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Conversations List */}
      <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
        {sessions.map((session, index) => {
          const preview = session.transcript[0]?.content || 'Session ended without exchange';

          return (
            <div
              key={session.id}
              className={cn(
                'p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors',
                index < sessions.length - 1 && 'border-b border-border/50',
              )}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-3">
                  <h3 className="text-[15px] font-bold text-foreground">
                    {new Date(session.createdAt).toLocaleString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </h3>
                  {session.isConverted ? (
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-500">
                      Converted
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-500">
                      Chatted
                    </span>
                  )}
                  <span className="text-[13px] font-medium text-muted-foreground">
                    {formatDuration(session.duration)} • {session.questionsCount} messages
                  </span>
                </div>

                <div className="p-3 bg-black/5 dark:bg-white/5 rounded-xl border-l-4 border-blue-500 truncate text-[13px] text-muted-foreground">
                  {preview}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 w-full md:w-auto">
                <button className="flex-1 md:flex-none px-4 py-2 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-foreground text-[13px] font-bold rounded-xl transition-colors">
                  Memory
                </button>
                <button
                  onClick={() => setViewTranscript(session.transcript)}
                  className="flex-1 md:flex-none px-4 py-2 bg-blue-500 text-white hover:bg-blue-600 text-[13px] font-bold rounded-xl transition-colors"
                >
                  Transcript
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Transcript Modal */}
      {viewTranscript && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-card w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-5 border-b border-border/50 flex justify-between items-center">
              <h2 className="text-lg font-bold text-foreground">Conversation Transcript</h2>
              <button
                onClick={() => setViewTranscript(null)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-muted-foreground"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-4">
              {viewTranscript.map((msg, i) => (
                <div
                  key={i}
                  className={cn(
                    'flex flex-col gap-1 max-w-[80%]',
                    msg.role === 'user' ? 'self-end items-end' : 'self-start items-start',
                  )}
                >
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                    {msg.role === 'user' ? 'Shopper' : 'Agent'}
                  </span>
                  <div
                    className={cn(
                      'px-4 py-3 rounded-2xl text-[14px]',
                      msg.role === 'user'
                        ? 'bg-blue-500 text-white rounded-br-sm'
                        : 'bg-black/5 dark:bg-white/5 text-foreground rounded-bl-sm',
                    )}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
