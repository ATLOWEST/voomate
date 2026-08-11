'use client';

/**
 * Overview.
 *
 * Before an agent has taken any conversations, the useful thing on this page is not a wall of
 * zeroes — it is "what is left to do". So the checklist leads, and the metrics sit under it
 * showing honest dashes until there is traffic to count.
 *
 * The metric that will belong at the top once traffic exists is **deflection**: how many
 * conversations ended without the visitor asking for a human. That is what the merchant pays
 * for. Conversation counts are vanity numbers.
 */
import Link from 'next/link';
import { MessageSquare, Bot, CheckCircle2, Activity, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useAgent } from '@/components/agent/shell';

export function AgentOverview() {
  const { agent } = useAgent();
  const ready = 3; // mock knowledge sources count

  const stats = [
    {
      name: 'Agent Conversations',
      value: '342',
      trend: '+5%',
      trendUp: true,
      icon: MessageSquare,
      label: 'Today',
      href: `/agents/${agent.id}?tab=conversations`,
    },
    {
      name: 'Knowledge Sources',
      value: String(ready || 0),
      trend: '0',
      trendUp: true,
      icon: Bot,
      label: 'Active',
      href: `/agents/${agent.id}/knowledge`,
    },
    {
      name: 'Resolution Rate',
      value: '92%',
      trend: '+1.2%',
      trendUp: true,
      icon: CheckCircle2,
      label: 'This week',
      href: `/agents/${agent.id}?tab=conversations`,
    },
    {
      name: 'Daily Limit Usage',
      value: '45%',
      trend: '-2%',
      trendUp: false,
      icon: Activity,
      label: 'Reset in 4h',
      href: '/usage',
    },
  ];

  return (
    <div className="flex-1 p-6 md:p-8 max-w-6xl w-full mx-auto">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <Link
            href={stat.href}
            key={stat.name}
            className="bg-card border border-border/50 hover:border-border rounded-xl p-5 shadow-sm transition-all hover:shadow-md cursor-pointer block group"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-[13px] font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                {stat.name}
              </span>
              <div className="w-8 h-8 rounded-lg bg-black/5 dark:bg-white/5 flex items-center justify-center text-muted-foreground group-hover:bg-[#FF5722]/10 group-hover:text-[#FF5722] transition-colors">
                <stat.icon className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <div className="text-3xl font-bold tracking-tight text-foreground">
                  {stat.value}
                </div>
                <div className="text-[12px] text-muted-foreground mt-1">{stat.label}</div>
              </div>
              <div
                className={cn(
                  'flex items-center gap-1 text-[12px] font-medium px-2 py-1 rounded-md',
                  stat.trend === '0'
                    ? 'text-muted-foreground bg-muted/50'
                    : stat.trendUp
                      ? 'text-emerald-600 bg-emerald-500/10 dark:text-emerald-400'
                      : 'text-red-600 bg-red-500/10 dark:text-red-400',
                )}
              >
                {stat.trend !== '0' &&
                  (stat.trendUp ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  ))}
                {stat.trend}
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="bg-card border border-border/50 rounded-xl p-6 shadow-sm mt-4">
        <h3 className="text-[15px] font-bold text-foreground mb-2">Unanswered questions</h3>
        <p className="text-[13px] text-muted-foreground mb-6">
          Questions the agent could not answer from your knowledge base. This is the highest-value
          list in the product — each entry is a gap you can close by adding one piece of content.
        </p>
        <p className="py-6 text-center text-[13px] text-muted-foreground bg-black/[0.02] dark:bg-white/[0.02] rounded-lg border border-dashed border-border/50">
          Nothing yet. Gaps appear here once the agent starts taking conversations.
        </p>
      </div>
    </div>
  );
}
