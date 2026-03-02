/**
 * View Switcher Component
 * Allows users to switch between different dashboard views based on their role
 * Requirements: 7.9, 7.10
 */

'use client';

import { useCallback, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Command, BarChart3, Check } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';

interface ViewOption {
  id: string;
  label: string;
  description: string;
  icon: typeof Command;
  href: string;
  roles: string[];
}

const VIEW_OPTIONS: ViewOption[] = [
  {
    id: 'today',
    label: 'Today',
    description: 'Real-time salon operations',
    icon: Command,
    href: '/today',
    roles: [
      'super_owner',
      'regional_manager',
      'branch_manager',
      'receptionist',
      'accountant',
      'stylist',
    ],
  },
  {
    id: 'analytics',
    label: 'Analytics',
    description: 'Reports and insights',
    icon: BarChart3,
    href: '/reports',
    roles: ['super_owner', 'regional_manager', 'branch_manager', 'accountant'],
  },
];

interface ViewSwitcherProps {
  className?: string;
}

export function ViewSwitcher({ className }: ViewSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuthStore();

  // Filter views based on user role
  const availableViews = useMemo(() => {
    if (!user?.role) return [];
    return VIEW_OPTIONS.filter((view) => view.roles.includes(user.role));
  }, [user?.role]);

  // Get current view based on pathname
  const currentView = useMemo(() => {
    return availableViews.find((view) => pathname.startsWith(view.href)) || availableViews[0];
  }, [pathname, availableViews]);

  const handleViewChange = useCallback(
    (view: ViewOption) => {
      router.push(view.href);
    },
    [router]
  );

  // Don't show if only one view available
  if (availableViews.length <= 1) {
    return null;
  }

  const CurrentIcon = currentView?.icon || Command;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className={cn('gap-2', className)}>
          <CurrentIcon className="h-4 w-4" />
          <span className="hidden sm:inline">{currentView?.label || 'View'}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>Switch View</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {availableViews.map((view) => {
          const Icon = view.icon;
          const isActive = currentView?.id === view.id;

          return (
            <DropdownMenuItem
              key={view.id}
              onClick={() => handleViewChange(view)}
              className="flex items-start gap-3 py-2"
            >
              <Icon className={cn('h-4 w-4 mt-0.5', isActive && 'text-primary')} />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className={cn('font-medium', isActive && 'text-primary')}>
                    {view.label}
                  </span>
                  {isActive && <Check className="h-3 w-3 text-primary" />}
                </div>
                <p className="text-xs text-muted-foreground">{view.description}</p>
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
