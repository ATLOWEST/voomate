'use client';

import { cn } from '@/lib/cn';
import {
  CheckCircle,
  ShoppingCart,
  Calendar,
  MessageSquare,
  Webhook,
  Database,
} from 'lucide-react';
import { ActionPill, type PillStatus } from './action-pill';

export interface BentoItem {
  title: string;
  description: string;
  icon: React.ReactNode;
  status?: string;
  tags?: string[];
  meta?: string;
  cta?: string;
  colSpan?: number;
  hasPersistentHover?: boolean;
}

interface BentoGridProps {
  items?: BentoItem[];
}

const itemsSample: BentoItem[] = [
  {
    title: 'Shopify Sync',
    meta: 'v2.0',
    description:
      'Real-time order lookup, inventory syncing, and automated refunds for your Voice Agents.',
    icon: <ShoppingCart className="w-4 h-4 text-emerald-500" />,
    status: 'connected',
    tags: ['E-commerce', 'Orders'],
    colSpan: 2,
    hasPersistentHover: true,
  },
  {
    title: 'Cal.com Scheduler',
    meta: 'Connected',
    description: 'Allow your agents to automatically book appointments.',
    icon: <Calendar className="w-4 h-4 text-blue-500" />,
    status: 'connected',
    tags: ['Scheduling'],
  },
  {
    title: 'HubSpot CRM',
    meta: 'Not Configured',
    description: 'Sync caller transcripts and lead data directly to your CRM.',
    icon: <Database className="w-4 h-4 text-orange-500" />,
    status: 'not_connected',
    tags: ['Sales', 'CRM'],
    colSpan: 2,
  },
  {
    title: 'Custom Webhooks',
    meta: 'Unlimited',
    description: 'Trigger internal API endpoints during live calls.',
    icon: <Webhook className="w-4 h-4 text-purple-500" />,
    status: 'beta',
    tags: ['Developers', 'API'],
  },
];

export function IntegrationBento({ items = itemsSample }: BentoGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 max-w-7xl mx-auto">
      {items.map((item, index) => (
        <div
          key={index}
          className={cn(
            'group relative p-4 rounded-xl overflow-hidden transition-all duration-300',
            'border border-border/50 bg-card',
            'hover:shadow-[0_2px_12px_rgba(0,0,0,0.03)] dark:hover:shadow-[0_2px_12px_rgba(255,255,255,0.03)]',
            'hover:-translate-y-0.5 will-change-transform cursor-pointer',
            item.colSpan ? `col-span-${item.colSpan}` : 'col-span-1',
            item.colSpan === 2 ? 'md:col-span-2' : '',
            item.hasPersistentHover
              ? 'shadow-[0_2px_12px_rgba(0,0,0,0.03)] -translate-y-0.5 dark:shadow-[0_2px_12px_rgba(255,255,255,0.03)]'
              : '',
          )}
        >
          <div
            className={`absolute inset-0 ${
              item.hasPersistentHover ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            } transition-opacity duration-300`}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.02)_1px,transparent_1px)] dark:bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[length:4px_4px]" />
          </div>

          <div className="relative flex flex-col space-y-3 h-full justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-black/5 dark:bg-white/10 group-hover:bg-gradient-to-br transition-all duration-300">
                  {item.icon}
                </div>
                {/* Status badge removed from here, unified in ActionPill at the bottom */}
              </div>

              <div className="space-y-1.5">
                <h3 className="font-medium text-foreground tracking-tight text-[15px]">
                  {item.title}
                  <span className="ml-2 text-[10px] text-muted-foreground font-normal">
                    {item.meta}
                  </span>
                </h3>
                <p className="text-[13px] text-muted-foreground leading-snug">{item.description}</p>
              </div>
            </div>

            <div className="flex items-center justify-between mt-4 gap-2">
              <div className="flex items-center flex-wrap gap-2 text-[11px] text-muted-foreground font-medium">
                {item.tags?.map((tag, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded border border-border/50 bg-black/5 dark:bg-white/5 transition-all duration-200 hover:bg-black/10 dark:hover:bg-white/10"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <div className="flex-shrink-0">
                <ActionPill
                  status={(item.status as PillStatus) || 'not_connected'}
                  label={
                    item.status === 'connected'
                      ? 'Connected'
                      : item.status === 'beta'
                        ? 'Beta'
                        : 'Not Connected'
                  }
                  actionLabel={
                    item.status === 'connected'
                      ? 'Manage'
                      : item.status === 'beta'
                        ? 'Join Beta'
                        : 'Connect'
                  }
                  onAction={() => alert(`Opening modal for ${item.title}`)}
                />
              </div>
            </div>
          </div>

          <div
            className={`absolute inset-0 -z-10 rounded-xl p-px bg-gradient-to-br from-transparent via-black/5 to-transparent dark:via-white/5 ${
              item.hasPersistentHover ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            } transition-opacity duration-300`}
          />
        </div>
      ))}
    </div>
  );
}
