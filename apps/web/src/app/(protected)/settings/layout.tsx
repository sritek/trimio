'use client';

/**
 * Settings Layout
 * Tabbed navigation for settings pages
 */

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Armchair, Building2, CreditCard, KeyRound } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';

interface SettingsTab {
  id: string;
  label: string;
  href: string;
  icon: React.ElementType;
  requiredRoles?: string[];
}

const settingsTabs: SettingsTab[] = [
  {
    id: 'profile',
    label: 'Business Profile',
    href: '/settings/profile',
    icon: Building2,
    requiredRoles: ['super_owner'],
  },
  {
    id: 'branches',
    label: 'Branches',
    href: '/settings/branches',
    icon: Building2,
    requiredRoles: ['super_owner', 'regional_manager'],
  },
  {
    id: 'subscription',
    label: 'Subscription',
    href: '/settings/subscription',
    icon: CreditCard,
    requiredRoles: ['super_owner'],
  },
  {
    id: 'stations',
    label: 'Stations',
    href: '/settings/stations',
    icon: Armchair,
    requiredRoles: ['super_owner'],
  },
  {
    id: 'account',
    label: 'Account',
    href: '/settings/account',
    icon: KeyRound,
    // No requiredRoles means all authenticated users can access
  },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const role = user?.role;

  // Filter tabs based on user role
  const visibleTabs = settingsTabs.filter((tab) => {
    if (!tab.requiredRoles) return true;
    return tab.requiredRoles.includes(role || '');
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-muted-foreground">Manage your business settings and preferences</p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b">
        <nav className="-mb-px flex space-x-8" aria-label="Settings tabs">
          {visibleTabs.map((tab) => {
            const isActive = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
            const Icon = tab.icon;

            return (
              <Link
                key={tab.id}
                href={tab.href}
                className={cn(
                  'flex items-center gap-2 border-b-2 px-1 py-4 text-sm font-medium transition-colors',
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:border-muted-foreground/30 hover:text-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div>{children}</div>
    </div>
  );
}
