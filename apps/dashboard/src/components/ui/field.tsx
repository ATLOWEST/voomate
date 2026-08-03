import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

const CONTROL = cn(
  'w-full rounded-lg border border-[var(--border-default)] bg-[var(--surface-panel)]',
  'px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]',
  'transition-colors focus:border-accent-500',
  'disabled:cursor-not-allowed disabled:bg-[var(--surface-sunken)]',
);

interface FieldProps {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}

export function Field({ label, htmlFor, hint, error, children }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-[13px] font-medium">
        {label}
      </label>
      {children}
      {/*
        Hint disappears once there is an error, rather than stacking. Two lines of grey text
        under a red-bordered field is how people miss the actual problem.
      */}
      {error !== undefined ? (
        <p className="text-critical text-[12px]" role="alert">
          {error}
        </p>
      ) : (
        hint !== undefined && <p className="text-[12px] text-muted">{hint}</p>
      )}
    </div>
  );
}

export function TextInput({
  className,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { className?: string }) {
  return <input className={cn(CONTROL, 'h-9.5', className)} {...rest} />;
}

export function TextArea({
  className,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { className?: string }) {
  return (
    <textarea className={cn(CONTROL, 'min-h-24 resize-y leading-relaxed', className)} {...rest} />
  );
}
