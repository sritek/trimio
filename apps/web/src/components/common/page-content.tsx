/**
 * PageContent - Wrapper for main page content
 */

import { cn } from '@/lib/utils';

interface PageContentProps {
  children: React.ReactNode;
  className?: string;
}

export function PageContent({ children, className }: PageContentProps) {
  return (
    <div className={cn('flex flex-col flex-1 min-h-0', className)}>
      {children}
    </div>
  );
}
