/**
 * Mobile Bottom Navigation Component
 * Fixed navigation bar at the bottom of the screen for mobile devices
 * Requirements: 8.1
 */

'use client';

import { useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  Calendar,
  Users,
  Menu,
  Command,
  DollarSign,
  FileText,
  type LucideIcon,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import { useUIStore } from '@/stores/ui-store';
import type { UserRole } from '@/lib/role-views';

interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  href: string;
  badge?: number;
}

// Role-specific navigation items
const ROLE_NAV_ITEMS: Record<UserRole, NavItem[]> = {
  super_owner: [
    { id: 'home', label: 'Today', icon: Command, href: '/today' },
    { id: 'calendar', label: 'Calendar', icon: Calendar, href: '/appointments' },
    { id: 'customers', label: 'Customers', icon: Users, href: '/customers' },
    { id: 'reports', label: 'Reports', icon: FileText, href: '/reports' },
  ],
  regional_manager: [
    { id: 'home', label: 'Today', icon: Command, href: '/today' },
    { id: 'calendar', label: 'Calendar', icon: Calendar, href: '/appointments' },
    { id: 'customers', label: 'Customers', icon: Users, href: '/customers' },
    { id: 'reports', label: 'Reports', icon: FileText, href: '/reports' },
  ],
  branch_manager: [
    { id: 'home', label: 'Today', icon: Command, href: '/today' },
    { id: 'calendar', label: 'Calendar', icon: Calendar, href: '/appointments' },
    { id: 'customers', label: 'Customers', icon: Users, href: '/customers' },
    { id: 'billing', label: 'Billing', icon: DollarSign, href: '/billing' },
  ],
  receptionist: [
    { id: 'home', label: 'Today', icon: Command, href: '/today' },
    { id: 'calendar', label: 'Calendar', icon: Calendar, href: '/appointments' },
    { id: 'customers', label: 'Customers', icon: Users, href: '/customers' },
    { id: 'billing', label: 'Billing', icon: DollarSign, href: '/billing' },
  ],
  stylist: [
    { id: 'home', label: 'Today', icon: Command, href: '/today' },
  ],
  accountant: [
    { id: 'home', label: 'Today', icon: Command, href: '/today' },
    { id: 'billing', label: 'Billing', icon: DollarSign, href: '/billing' },
    { id: 'reports', label: 'Reports', icon: FileText, href: '/reports' },
  ],
};

interface BottomNavProps {
  className?: string;
  notificationCount?: number;
  attentionCount?: number;
}

export function BottomNav({ className, notificationCount, attentionCount }: BottomNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuthStore();
  const { setMobileNavOpen } = useUIStore();

  // Get navigation items based on user role
  const navItems = useMemo(() => {
    const role = (user?.role || 'receptionist') as UserRole;
    return ROLE_NAV_ITEMS[role] || ROLE_NAV_ITEMS.receptionist;
  }, [user?.role]);

  // Check if a nav item is active
  const isActive = (href: string) => {
    if (href === '/today') {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  return (
    <nav
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50 md:hidden',
        'bg-background border-t',
        'pb-safe', // Safe area for notched devices
        className
      )}
    >
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          const badge = item.id === 'home' ? attentionCount : undefined;

          return (
            <button
              key={item.id}
              onClick={() => router.push(item.href)}
              className={cn(
                'flex flex-col items-center justify-center flex-1 h-full',
                'transition-colors',
                active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <div className="relative">
                <Icon className={cn('h-5 w-5', active && 'stroke-[2.5]')} />
                {badge && badge > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-medium text-white">
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
              </div>
              <span className={cn('text-xs mt-1', active && 'font-medium')}>{item.label}</span>
            </button>
          );
        })}

        {/* More menu button */}
        <button
          onClick={() => setMobileNavOpen(true)}
          className={cn(
            'flex flex-col items-center justify-center flex-1 h-full',
            'text-muted-foreground hover:text-foreground transition-colors'
          )}
        >
          <div className="relative">
            <Menu className="h-5 w-5" />
            {notificationCount && notificationCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                {notificationCount > 9 ? '9+' : notificationCount}
              </span>
            )}
          </div>
          <span className="text-xs mt-1">More</span>
        </button>
      </div>
    </nav>
  );
}
