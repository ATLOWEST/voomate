import type { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  /** Say what to do next, not just that the list is empty. */
  description: string;
  action?: ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div
        className="mb-4 flex size-11 items-center justify-center rounded-xl"
        style={{ backgroundColor: 'var(--surface-sunken)' }}
        aria-hidden="true"
      >
        <svg viewBox="0 0 20 20" fill="none" className="size-5 text-[var(--text-muted)]">
          <path
            d="M3.5 6.5h13M3.5 10h13M3.5 13.5h8"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-secondary">{description}</p>
      {action !== undefined && <div className="mt-5">{action}</div>}
    </div>
  );
}
