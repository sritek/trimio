'use client';

/**
 * Notice Component
 * A reusable component for displaying important information with different severity levels.
 * Use for status messages, warnings, errors, success confirmations, and informational notices.
 */

import { type ReactNode } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type NoticeSeverity = 'success' | 'error' | 'warning' | 'info';

interface NoticeProps {
  /** The severity/type of the notice */
  severity: NoticeSeverity;
  /** Title of the notice */
  title: string;
  /** Optional description text */
  description?: string;
  /** Optional custom icon (overrides default severity icon) */
  icon?: LucideIcon;
  /** Optional children for custom content */
  children?: ReactNode;
  /** Optional action button/link */
  action?: ReactNode;
  /** Additional CSS classes */
  className?: string;
}

const severityConfig: Record<
  NoticeSeverity,
  {
    icon: LucideIcon;
    containerClass: string;
    iconBgClass: string;
    iconClass: string;
    titleClass: string;
    descriptionClass: string;
  }
> = {
  success: {
    icon: CheckCircle,
    containerClass: 'border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950',
    iconBgClass: 'bg-green-100 dark:bg-green-900',
    iconClass: 'text-green-600 dark:text-green-400',
    titleClass: 'text-green-800 dark:text-green-200',
    descriptionClass: 'text-green-700 dark:text-green-300',
  },
  error: {
    icon: XCircle,
    containerClass: 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950',
    iconBgClass: 'bg-red-100 dark:bg-red-900',
    iconClass: 'text-red-600 dark:text-red-400',
    titleClass: 'text-red-800 dark:text-red-200',
    descriptionClass: 'text-red-700 dark:text-red-300',
  },
  warning: {
    icon: AlertTriangle,
    containerClass: 'border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950',
    iconBgClass: 'bg-yellow-100 dark:bg-yellow-900',
    iconClass: 'text-yellow-600 dark:text-yellow-400',
    titleClass: 'text-yellow-800 dark:text-yellow-200',
    descriptionClass: 'text-yellow-700 dark:text-yellow-300',
  },
  info: {
    icon: Info,
    containerClass: 'border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950',
    iconBgClass: 'bg-blue-100 dark:bg-blue-900',
    iconClass: 'text-blue-600 dark:text-blue-400',
    titleClass: 'text-blue-800 dark:text-blue-200',
    descriptionClass: 'text-blue-700 dark:text-blue-300',
  },
};

export function Notice({
  severity,
  title,
  description,
  icon,
  children,
  action,
  className,
}: NoticeProps) {
  const config = severityConfig[severity];
  const Icon = icon || config.icon;

  return (
    <div className={cn('rounded-lg border p-4', config.containerClass, className)} role="alert">
      <div className="flex items-start gap-3">
        <div className={cn('rounded-full p-2 shrink-0', config.iconBgClass)}>
          <Icon className={cn('h-5 w-5', config.iconClass)} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className={cn('font-semibold', config.titleClass)}>{title}</h4>
          {description && (
            <p className={cn('text-sm mt-1', config.descriptionClass)}>{description}</p>
          )}
          {children && <div className="mt-2">{children}</div>}
          {action && <div className="mt-2">{action}</div>}
        </div>
      </div>
    </div>
  );
}
