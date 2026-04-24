/**
 * LoadingSpinner - Consistent loading indicator with CVA variants
 */

import { Loader2Icon } from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const spinnerVariants = cva('animate-spin', {
  variants: {
    size: {
      xs: 'h-3 w-3',
      sm: 'h-4 w-4',
      default: 'h-6 w-6',
      lg: 'h-8 w-8',
      xl: 'h-12 w-12',
    },
    variant: {
      default: 'text-muted-foreground',
      primary: 'text-primary',
      secondary: 'text-secondary-foreground',
      destructive: 'text-destructive',
      inherit: '', // Inherits color from parent
    },
  },
  defaultVariants: {
    size: 'default',
    variant: 'default',
  },
});

export interface LoadingSpinnerProps
  extends Omit<React.ComponentProps<'svg'>, 'ref'>, VariantProps<typeof spinnerVariants> {
  text?: string;
}

export function LoadingSpinner({ size, variant, text, className, ...props }: LoadingSpinnerProps) {
  if (text) {
    return (
      <div className={cn('flex items-center justify-center gap-2', className)}>
        <Loader2Icon
          role="status"
          aria-label="Loading"
          className={cn(spinnerVariants({ size, variant }))}
          {...props}
        />
        <span className="text-sm text-muted-foreground">{text}</span>
      </div>
    );
  }

  return (
    <Loader2Icon
      role="status"
      aria-label="Loading"
      className={cn(spinnerVariants({ size, variant }), className)}
      {...props}
    />
  );
}

export { spinnerVariants };
