import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Tone = 'neutral' | 'positive' | 'caution' | 'critical' | 'accent';

const TONES: Record<Tone, string> = {
  neutral: 'bg-[var(--surface-sunken)] text-[var(--text-secondary)] border-[var(--border-default)]',
  positive: 'bg-positive-soft text-positive border-positive/20',
  caution: 'bg-caution-soft text-caution border-caution/20',
  critical: 'bg-critical-soft text-critical border-critical/20',
  accent: 'bg-accent-50 text-accent-700 border-accent-200',
};

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5',
        'text-[11px] font-medium tracking-wide uppercase',
        TONES[tone],
      )}
    >
      {children}
    </span>
  );
}

/**
 * A dot, not a coloured word. Status is scanned, not read — a merchant with forty agents
 * needs to spot the broken one without parsing text.
 */
export function StatusDot({ tone }: { tone: Tone }) {
  const colour: Record<Tone, string> = {
    neutral: 'var(--color-ink-400)',
    positive: 'var(--color-positive)',
    caution: 'var(--color-caution)',
    critical: 'var(--color-critical)',
    accent: 'var(--color-accent-500)',
  };
  return (
    <span
      aria-hidden="true"
      className="size-1.5 shrink-0 rounded-full"
      style={{ backgroundColor: colour[tone] }}
    />
  );
}
