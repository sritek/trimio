/**
 * PageContainer - Consistent page wrapper with max-width and padding
 */

import { cn } from '@/lib/utils';

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
}

export function PageContainer({ children, className }: PageContainerProps) {
  return (
    <div className={cn('flex flex-col h-full min-h-0', className)}>
      {children}
    </div>
  );
}
