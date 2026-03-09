/**
 * Sidebar - Collapsible navigation sidebar
 *
 * Features:
 * - Expand/collapse toggle
 * - Icons only with tooltips when collapsed
 * - Smooth transition animation
 * - State persisted in localStorage
 * - Permission-based navigation filtering
 * - Feature flag-based module filtering
 * - Resets page-specific state on navigation (e.g., appointments filters)
 */

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo, useCallback, useState, useEffect } from 'react';
import {
  Calendar,
  Users,
  Scissors,
  Receipt,
  Package,
  BarChart3,
  Megaphone,
  Settings,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  UserPlus,
  UserCog,
  CalendarCheck,
  CalendarOff,
  Wallet,
  CreditCard,
  Gift,
  Crown,
  Gauge,
  ClipboardList,
  FileText,
} from 'lucide-react';
import { useTranslations } from 'next-intl';

import { PERMISSIONS } from '@salon-ops/shared';

import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { LanguageSwitcherCompact } from '@/components/common/language-switcher';
import { usePermissions } from '@/hooks/use-permissions';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores/ui-store';
import { useAppointmentsUIStore } from '@/stores/appointments-ui-store';
import { type FeatureFlags, isFeatureEnabled } from '@/config/features';

interface NavItem {
  titleKey: string;
  href: string;
  icon: React.ElementType;
  /** Permission required to view this nav item (undefined = always visible) */
  permission?: string;
  /** Feature flag required to view this nav item (undefined = always visible) */
  featureFlag?: Partial<FeatureFlags>;
  /** Sub-navigation items */
  children?: NavItem[];
}

const mainNavItems: NavItem[] = [
  { titleKey: 'today', href: '/today', icon: Gauge },
  {
    titleKey: 'appointments',
    href: '/appointments',
    icon: Calendar,
    permission: PERMISSIONS.APPOINTMENTS_READ,
  },
  {
    titleKey: 'walkIn',
    href: '/walk-in',
    icon: UserPlus,
    permission: PERMISSIONS.APPOINTMENTS_WRITE,
  },
  {
    titleKey: 'waitlist',
    href: '/waitlist',
    icon: ClipboardList,
    permission: PERMISSIONS.APPOINTMENTS_READ,
  },
  {
    titleKey: 'customers',
    href: '/customers',
    icon: Users,
    permission: PERMISSIONS.CUSTOMERS_READ,
  },
  {
    titleKey: 'services',
    href: '/services',
    icon: Scissors,
    permission: PERMISSIONS.SERVICES_READ,
  },
  {
    titleKey: 'invoices',
    href: '/billing',
    icon: Receipt,
    permission: PERMISSIONS.BILLS_READ,
  },
  {
    titleKey: 'staff',
    href: '/staff',
    icon: UserCog,
    permission: PERMISSIONS.USERS_READ,
    children: [
      { titleKey: 'staffList', href: '/staff', icon: UserCog, permission: PERMISSIONS.USERS_READ },
      {
        titleKey: 'attendance',
        href: '/staff/attendance',
        icon: CalendarCheck,
        permission: PERMISSIONS.USERS_READ,
      },
      {
        titleKey: 'leaves',
        href: '/staff/leaves',
        icon: CalendarOff,
        permission: PERMISSIONS.USERS_READ,
      },
      {
        titleKey: 'payroll',
        href: '/staff/payroll',
        icon: Wallet,
        permission: PERMISSIONS.USERS_WRITE,
      },
    ],
  },
  {
    titleKey: 'inventory',
    href: '/inventory/stock',
    icon: Package,
    permission: PERMISSIONS.INVENTORY_READ,
    featureFlag: 'inventory',
    children: [
      {
        titleKey: 'stock',
        href: '/inventory/stock',
        icon: Package,
        permission: PERMISSIONS.INVENTORY_READ,
      },
      {
        titleKey: 'products',
        href: '/inventory/products',
        icon: Package,
        permission: PERMISSIONS.INVENTORY_READ,
      },
      {
        titleKey: 'categories',
        href: '/inventory/categories',
        icon: Package,
        permission: PERMISSIONS.INVENTORY_READ,
      },
      {
        titleKey: 'vendors',
        href: '/inventory/vendors',
        icon: Package,
        permission: PERMISSIONS.INVENTORY_READ,
      },
      {
        titleKey: 'purchaseOrders',
        href: '/inventory/purchase-orders',
        icon: FileText,
        permission: PERMISSIONS.INVENTORY_WRITE,
      },
      {
        titleKey: 'goodsReceipts',
        href: '/inventory/goods-receipts',
        icon: FileText,
        permission: PERMISSIONS.INVENTORY_WRITE,
      },
      {
        titleKey: 'transfers',
        href: '/inventory/transfers',
        icon: Package,
        permission: PERMISSIONS.INVENTORY_WRITE,
      },
      {
        titleKey: 'audits',
        href: '/inventory/audits',
        icon: FileText,
        permission: PERMISSIONS.INVENTORY_WRITE,
      },
      {
        titleKey: 'inventoryReports',
        href: '/inventory/reports',
        icon: BarChart3,
        permission: PERMISSIONS.INVENTORY_READ,
      },
    ],
  },
  {
    titleKey: 'memberships',
    href: '/memberships',
    icon: Crown,
    permission: PERMISSIONS.SERVICES_READ,
    featureFlag: 'memberships',
    children: [
      {
        titleKey: 'membershipPlans',
        href: '/memberships/plans',
        icon: Crown,
        permission: PERMISSIONS.SERVICES_READ,
      },
      {
        titleKey: 'customerMemberships',
        href: '/memberships',
        icon: CreditCard,
        permission: PERMISSIONS.SERVICES_READ,
      },
      {
        titleKey: 'packages',
        href: '/memberships/packages',
        icon: Gift,
        permission: PERMISSIONS.SERVICES_READ,
      },
      {
        titleKey: 'customerPackages',
        href: '/memberships/customer-packages',
        icon: Gift,
        permission: PERMISSIONS.SERVICES_READ,
      },
    ],
  },
  {
    titleKey: 'reports',
    href: '/reports',
    icon: BarChart3,
    permission: PERMISSIONS.REPORTS_READ,
    featureFlag: 'reports',
  },
  {
    titleKey: 'marketing',
    href: '/marketing',
    icon: Megaphone,
    permission: PERMISSIONS.MARKETING_READ,
    featureFlag: 'marketing',
  },
];

const bottomNavItems: NavItem[] = [
  {
    titleKey: 'settings',
    href: '/settings',
    icon: Settings,
    // No permission required - all users can access settings (tabs are role-filtered)
  },
  { titleKey: 'help', href: '/help', icon: HelpCircle },
];

function NavLink({
  item,
  isCollapsed,
  t,
  onNavigate,
  isChildItem = false,
}: {
  item: NavItem;
  isCollapsed: boolean;
  t: (key: string) => string;
  onNavigate?: (href: string) => void;
  isChildItem?: boolean;
}) {
  const pathname = usePathname();

  // For child items, check exact match or if pathname starts with item.href and has more path segments
  // For parent items without children, check if pathname starts with item.href
  const isActive = isChildItem
    ? pathname === item.href || (pathname.startsWith(item.href + '/') && item.href !== '/')
    : pathname === item.href || pathname.startsWith(item.href + '/');

  const title = t(item.titleKey);

  const handleClick = () => {
    onNavigate?.(item.href);
  };

  const link = (
    <Link
      href={item.href}
      onClick={handleClick}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all',
        isActive
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
        isCollapsed && 'justify-center px-2'
      )}
    >
      <item.icon className="h-5 w-5 shrink-0" />
      {!isCollapsed && <span>{title}</span>}
    </Link>
  );

  if (isCollapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right" className="flex items-center gap-4">
          {title}
        </TooltipContent>
      </Tooltip>
    );
  }

  return link;
}

function NavGroup({
  item,
  isCollapsed,
  t,
  onNavigate,
  hasPermission,
}: {
  item: NavItem;
  isCollapsed: boolean;
  t: (key: string) => string;
  onNavigate?: (href: string) => void;
  hasPermission: (permission: string) => boolean;
}) {
  const pathname = usePathname();

  // Check if any child is active (for highlighting and auto-expand)
  const isChildActive =
    item.children?.some(
      (child) => pathname === child.href || pathname.startsWith(child.href + '/')
    ) ?? false;

  // Check if the parent path itself is active (exact match or starts with parent href)
  const isParentPathActive = pathname.startsWith(item.href + '/') || pathname === item.href;

  // Parent is considered active if any child is active or the parent path matches
  const isActive = isChildActive || isParentPathActive;

  // Auto-expand if any child is active on initial render or URL change
  const [isOpen, setIsOpen] = useState(isActive);
  const [hasUserToggled, setHasUserToggled] = useState(false);
  const title = t(item.titleKey);

  // Update isOpen when pathname changes (for direct URL navigation)
  // Only auto-expand if user hasn't manually toggled
  useEffect(() => {
    if (isActive && !isOpen && !hasUserToggled) {
      setIsOpen(true);
    }
    // Reset user toggle state when navigating to a different section
    if (!isActive) {
      setHasUserToggled(false);
    }
  }, [isActive, isOpen, hasUserToggled]);

  const handleToggle = () => {
    setHasUserToggled(true);
    setIsOpen(!isOpen);
  };

  const visibleChildren =
    item.children?.filter((child) => !child.permission || hasPermission(child.permission)) || [];

  if (isCollapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <Link
            href={item.href}
            className={cn(
              'flex items-center justify-center rounded-lg px-2 py-2 text-sm transition-all',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
          >
            <item.icon className="h-5 w-5 shrink-0" />
          </Link>
        </TooltipTrigger>
        <TooltipContent side="right" className="flex flex-col gap-1 p-2">
          <span className="font-medium">{title}</span>
          {visibleChildren.map((child) => {
            const childActive = pathname === child.href || pathname.startsWith(child.href + '/');
            return (
              <Link
                key={child.href}
                href={child.href}
                className={cn(
                  'text-sm hover:text-foreground',
                  childActive ? 'text-foreground font-medium' : 'text-muted-foreground'
                )}
                onClick={() => onNavigate?.(child.href)}
              >
                {t(child.titleKey)}
              </Link>
            );
          })}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div>
      <button
        onClick={handleToggle}
        className={cn(
          'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all',
          isActive
            ? 'bg-accent text-accent-foreground'
            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
        )}
      >
        <item.icon className="h-5 w-5 shrink-0" />
        <span className="flex-1 text-left">{title}</span>
        <ChevronDown className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-180')} />
      </button>
      {isOpen && (
        <ul className="ml-4 mt-1 space-y-1 border-l pl-4">
          {visibleChildren.map((child) => (
            <li key={child.href}>
              <NavLink item={child} isCollapsed={false} t={t} onNavigate={onNavigate} isChildItem />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const t = useTranslations('navigation');
  const { sidebarCollapsed, toggleSidebarCollapse } = useUIStore();
  const { hasPermission } = usePermissions();
  const resetAppointmentsToToday = useAppointmentsUIStore((state) => state.resetToToday);

  // Filter nav items based on user permissions and feature flags
  const visibleMainNavItems = useMemo(
    () =>
      mainNavItems.filter(
        (item) =>
          (!item.permission || hasPermission(item.permission)) &&
          (!item.featureFlag || isFeatureEnabled(item.featureFlag))
      ),
    [hasPermission, isFeatureEnabled]
  );

  const visibleBottomNavItems = useMemo(
    () =>
      bottomNavItems.filter(
        (item) =>
          (!item.permission || hasPermission(item.permission)) &&
          (!item.featureFlag || isFeatureEnabled(item.featureFlag))
      ),
    [hasPermission, isFeatureEnabled]
  );

  // Handle navigation - reset page-specific state when navigating via sidebar
  const handleNavigate = useCallback(
    (href: string) => {
      // Reset appointments state to today when navigating to appointments
      if (href === '/appointments') {
        resetAppointmentsToToday();
      }
      // Add similar resets for other pages as needed
    },
    [resetAppointmentsToToday]
  );

  return (
    <TooltipProvider>
      <aside
        className={cn(
          'flex h-screen flex-col border-r bg-card transition-[width] duration-300 ease-in-out',
          sidebarCollapsed ? 'w-16' : 'w-64',
          className
        )}
      >
        {/* Logo / Brand */}
        <div
          className={cn(
            'flex h-16 items-center border-b px-4',
            sidebarCollapsed ? 'justify-center' : 'justify-between'
          )}
        >
          <Link
            href="/today"
            className={cn(
              'flex items-center gap-2 font-bold',
              sidebarCollapsed ? 'text-lg' : 'text-xl'
            )}
          >
            {sidebarCollapsed ? (
              <span className="text-primary">SO</span>
            ) : (
              <>
                <span className="text-primary">Salon</span>
                <span>Ops</span>
              </>
            )}
          </Link>

          {/* Collapse toggle - only show on expanded */}
          {!sidebarCollapsed && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={toggleSidebarCollapse}
              aria-label="Collapse sidebar"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Main navigation */}
        <nav className="flex-1 overflow-y-auto p-2">
          <ul className="space-y-1">
            {visibleMainNavItems.map((item) => (
              <li key={item.href}>
                {item.children ? (
                  <NavGroup
                    item={item}
                    isCollapsed={sidebarCollapsed}
                    t={t}
                    onNavigate={handleNavigate}
                    hasPermission={hasPermission}
                  />
                ) : (
                  <NavLink
                    item={item}
                    isCollapsed={sidebarCollapsed}
                    t={t}
                    onNavigate={handleNavigate}
                  />
                )}
              </li>
            ))}
          </ul>
        </nav>

        {/* Bottom navigation */}
        <div className="border-t p-2">
          <ul className="space-y-1">
            {visibleBottomNavItems.map((item) => (
              <li key={item.href}>
                <NavLink
                  item={item}
                  isCollapsed={sidebarCollapsed}
                  t={t}
                  onNavigate={handleNavigate}
                />
              </li>
            ))}
          </ul>

          {/* Language Switcher */}
          {!sidebarCollapsed && (
            <div className="mt-2 px-1">
              <LanguageSwitcherCompact />
            </div>
          )}

          {/* Expand toggle - only show when collapsed */}
          {sidebarCollapsed && (
            <Button
              variant="ghost"
              size="icon"
              className="mt-2 h-8 w-full"
              onClick={toggleSidebarCollapse}
              aria-label="Expand sidebar"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
}
