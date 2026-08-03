import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface PanelProps {
  children: ReactNode;
  className?: string;
}

export function Panel({ children, className }: PanelProps) {
  return <section className={cn('surface-panel', className)}>{children}</section>;
}

interface PanelHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export function PanelHeader({ title, description, action }: PanelHeaderProps) {
  return (
    <header className="flex items-start justify-between gap-4 border-b border-[var(--border-default)] px-6 py-4">
      <div className="min-w-0">
        <h2 className="text-[15px] font-semibold tracking-[-0.01em]">{title}</h2>
        {description !== undefined && (
          <p className="mt-1 text-[13px] leading-relaxed text-secondary">{description}</p>
        )}
      </div>
      {action !== undefined && <div className="shrink-0">{action}</div>}
    </header>
  );
}

export function PanelBody({ children, className }: PanelProps) {
  return <div className={cn('px-6 py-5', className)}>{children}</div>;
}

export function PanelFooter({ children, className }: PanelProps) {
  return (
    <footer
      className={cn(
        'flex items-center justify-end gap-3 border-t border-[var(--border-default)] px-6 py-4',
        className,
      )}
      style={{ backgroundColor: 'var(--surface-sunken)' }}
    >
      {children}
    </footer>
  );
}
