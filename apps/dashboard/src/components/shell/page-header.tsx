import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
  /** Rendered flush against the bottom edge — used for the agent tab strip. */
  below?: ReactNode;
}

export function PageHeader({ title, description, action, below }: PageHeaderProps) {
  return (
    <div className="border-b border-border/50 bg-card/30">
      <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-5 max-w-7xl mx-auto">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
          {description !== undefined && (
            <p className="mt-1.5 max-w-2xl text-[14px] leading-relaxed text-muted-foreground">
              {description}
            </p>
          )}
        </div>
        {action !== undefined && <div className="shrink-0">{action}</div>}
      </div>
      {below}
    </div>
  );
}

export function PageBody({ children }: { children: ReactNode }) {
  return <div className="mx-auto max-w-7xl px-6 py-8">{children}</div>;
}
