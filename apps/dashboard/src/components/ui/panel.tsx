import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface PanelProps {
  children: ReactNode;
  className?: string;
}

export function Panel({ children, className }: PanelProps) {
  return (
    <section
      className={cn(
        'bg-card border border-border/50 rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.03)] dark:shadow-[0_2px_12px_rgba(255,255,255,0.03)] transition-shadow duration-300 hover:shadow-lg overflow-hidden',
        className,
      )}
    >
      {children}
    </section>
  );
}

interface PanelHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export function PanelHeader({ title, description, action }: PanelHeaderProps) {
  return (
    <header className="flex items-start justify-between gap-4 border-b border-border/50 px-6 py-5 bg-muted/10">
      <div className="min-w-0">
        <h2 className="text-[16px] font-semibold tracking-tight text-foreground">{title}</h2>
        {description !== undefined && (
          <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{description}</p>
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
        'flex items-center justify-end gap-3 border-t border-border/50 px-6 py-4 bg-muted/10',
        className,
      )}
    >
      {children}
    </footer>
  );
}
