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
    <div className="border-b border-[var(--border-default)]">
      <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-5">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-[-0.02em]">{title}</h1>
          {description !== undefined && (
            <p className="mt-1 max-w-2xl text-[13.5px] leading-relaxed text-secondary">
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
  return <div className="mx-auto max-w-5xl px-6 py-6">{children}</div>;
}
