'use client';

import { useEffect, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * Modal chrome.
 *
 * Escape and the backdrop both close it, because different people reach for different ones.
 * The panel stops click propagation so a drag that starts inside and ends on the backdrop —
 * selecting text in a textarea, most often — does not close the dialog and lose the typing.
 */
export function Dialog({
  title,
  description,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-6 py-12"
      onClick={onClose}
    >
      <div
        className={cn('surface-panel w-full p-6 shadow-xl', wide ? 'max-w-xl' : 'max-w-md')}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="text-[15px] font-semibold tracking-[-0.01em]">{title}</h2>
        {description !== undefined && (
          <p className="mt-1 text-[13px] leading-relaxed text-secondary">{description}</p>
        )}
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}

/** Right-aligned action row. Cancel first, confirm last — the confirm sits under the cursor. */
export function DialogActions({ children }: { children: ReactNode }) {
  return <div className="mt-5 flex justify-end gap-2">{children}</div>;
}
