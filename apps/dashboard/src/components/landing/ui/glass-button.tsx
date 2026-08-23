import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const glassButtonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-full text-sm font-semibold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 relative overflow-hidden backdrop-blur-md border border-white/30 bg-white/20 hover:bg-white/30 text-[#111111] shadow-[0_8px_32px_rgba(0,0,0,0.08)]',
  {
    variants: {
      size: {
        default: 'h-11 px-8 py-2',
        sm: 'h-9 px-4',
        lg: 'h-12 px-10 text-base',
        icon: 'h-11 w-11',
      },
    },
    defaultVariants: {
      size: 'default',
    },
  },
);

export interface GlassButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof glassButtonVariants> {
  asChild?: boolean;
  contentClassName?: string;
}

const GlassButton = React.forwardRef<HTMLButtonElement, GlassButtonProps>(
  ({ className, size, asChild = false, contentClassName, children, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp className={cn(glassButtonVariants({ size, className }))} ref={ref} {...props}>
        <span className={cn('relative z-10 flex items-center justify-center', contentClassName)}>
          {children}
        </span>
        <div className="absolute inset-0 z-0 bg-gradient-to-tr from-white/0 via-white/40 to-white/0 opacity-0 hover:opacity-100 transition-opacity duration-500" />
      </Comp>
    );
  },
);
GlassButton.displayName = 'GlassButton';

export { GlassButton, glassButtonVariants };
