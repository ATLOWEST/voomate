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
    <div className="bg-background">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-5 px-5 pb-4 pt-5 sm:flex-row sm:items-end sm:justify-between sm:px-8 sm:pt-8 lg:px-10">
        <div className="min-w-0">
          <h1 className="text-3xl font-semibold leading-tight text-foreground">{title}</h1>
          {description !== undefined && (
            <p className="mt-2 max-w-xl text-[13.5px] leading-6 text-muted-foreground">
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
  return <div className="mx-auto max-w-[1280px] px-5 pb-14 pt-5 sm:px-8 lg:px-10">{children}</div>;
}
