'use client';

import { cn } from '@/lib/cn';
import { type ReactNode } from 'react';

export type PillStatus =
  'active' | 'connected' | 'not_connected' | 'beta' | 'paused' | 'draft' | 'error';

interface ActionPillProps {
  status: PillStatus;
  label: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: ReactNode;
  className?: string;
}

const statusStyles: Record<PillStatus, string> = {
  active: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400',
  connected: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400',
  not_connected: 'bg-black/5 dark:bg-white/10 text-muted-foreground border-transparent',
  beta: 'bg-purple-500/10 border-purple-500/20 text-purple-600 dark:text-purple-400',
  paused: 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400',
  draft: 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400',
  error: 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400',
};

export function ActionPill({
  status,
  label,
  actionLabel,
  onAction,
  icon,
  className,
}: ActionPillProps) {
  const needsAction = !!actionLabel && !!onAction;
  const isPrimaryAction = status === 'not_connected';

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div
        className={cn(
          'px-2.5 py-1 rounded-md border text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 whitespace-nowrap',
          statusStyles[status],
        )}
      >
        {icon}
        {label}
      </div>

      {needsAction && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAction();
          }}
          className={cn(
            'px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors shadow-sm whitespace-nowrap flex-shrink-0',
            isPrimaryAction
              ? 'bg-[#FF5722] hover:bg-[#E64A19] text-white'
              : 'border border-border/50 bg-card hover:bg-black/5 dark:hover:bg-white/5 text-foreground',
          )}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
