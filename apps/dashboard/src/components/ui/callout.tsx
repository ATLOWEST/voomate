import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Tone = 'info' | 'caution' | 'critical' | 'positive';

const TONES: Record<Tone, string> = {
  info: 'bg-accent-50 border-accent-200 text-accent-700',
  caution: 'bg-caution-soft border-caution/25 text-caution',
  critical: 'bg-critical-soft border-critical/25 text-critical',
  positive: 'bg-positive-soft border-positive/25 text-positive',
};

/**
 * An inline message attached to the thing it is about.
 *
 * Deliberately not a toast. A toast that says "publish failed because there is no knowledge
 * yet" disappears after four seconds, taking the only explanation with it.
 */
export function Callout({
  tone = 'info',
  title,
  children,
  action,
}: {
  tone?: Tone;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className={cn('flex items-start gap-3 rounded-xl border px-4 py-3', TONES[tone])}>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold">{title}</p>
        {children !== undefined && (
          <div className="mt-0.5 text-[13px] leading-relaxed opacity-90">{children}</div>
        )}
      </div>
      {action !== undefined && <div className="shrink-0">{action}</div>}
    </div>
  );
}
