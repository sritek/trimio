/**
 * PageContainer - Consistent page wrapper with max-width and padding
 */

import { cn } from '@/lib/utils';

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
}

export function PageContainer({ children, className }: PageContainerProps) {
  return <div className={cn('w-full space-y-6', className)}>{children}</div>;
}
