import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-foreground text-background hover:opacity-90',
  secondary: 'bg-[var(--surface-sunken)] text-foreground hover:bg-[var(--surface-hover)]',
  ghost: 'text-muted-foreground hover:bg-[var(--surface-sunken)] hover:text-foreground',
  danger: 'bg-red-600 text-white hover:bg-red-700',
};

const SIZES: Record<Size, string> = {
  sm: 'h-8 px-3 text-[13px] gap-1.5 rounded-lg',
  md: 'h-9.5 px-4 text-sm gap-2 rounded-lg',
  lg: 'h-11 px-5 text-[15px] gap-2 rounded-xl',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  /** Renders a spinner and blocks interaction. Prefer this over disabling with no feedback. */
  loading?: boolean;
  icon?: ReactNode;
}

export function Button({
  variant = 'secondary',
  size = 'md',
  loading = false,
  icon,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      // Buttons inside a <form> default to type="submit", which submits on Enter from any
      // field. That has caused an accidental publish more than once in products like this.
      type={rest.type ?? 'button'}
      disabled={disabled === true || loading}
      aria-busy={loading}
      className={cn(
        'inline-flex items-center justify-center font-medium whitespace-nowrap',
        'transition-[background-color,color,opacity,transform] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:translate-y-px',
        'disabled:cursor-not-allowed disabled:opacity-60',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...rest}
    >
      {loading ? <Spinner /> : icon}
      {children}
    </button>
  );
}

function Spinner() {
  return (
    <svg className="size-4 animate-spin" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2.5" />
      <path
        d="M14.5 8A6.5 6.5 0 0 0 8 1.5"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
