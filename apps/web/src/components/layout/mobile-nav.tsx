/**
 * MobileNav - Mobile navigation drawer
 *
 * Features:
 * - Sheet drawer from left side
 * - Same navigation items as desktop sidebar with nested menus
 * - Closes on route change
 * - Resets page-specific state on navigation
 * - Permission-based navigation filtering
 */

'use client';

import { useEffect, useCallback, useState, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
  UserPlus,
  UserCog,
  CalendarCheck,
  CalendarOff,
  Wallet,
  CreditCard,
  Gift,
  Crown,
  ChevronDown,
  Gauge,
  ClipboardList,
  FileText,
} from 'lucide-react';
import { useTranslations } from 'next-intl';

import { PERMISSIONS } from '@salon-ops/shared';

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores/ui-store';
import { useAppointmentsUIStore } from '@/stores/appointments-ui-store';
import { usePermissions } from '@/hooks/use-permissions';

interface NavItem {
  titleKey: string;
  href: string;
  icon: React.ElementType;
  permission?: string;
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
  },
  {
    titleKey: 'marketing',
    href: '/marketing',
    icon: Megaphone,
    permission: PERMISSIONS.MARKETING_READ,
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

function MobileNavLink({
  item,
  t,
  onNavigate,
  isChildItem = false,
}: {
  item: NavItem;
  t: (key: string) => string;
  onNavigate?: (href: string) => void;
  isChildItem?: boolean;
}) {
  const pathname = usePathname();

  // For child items, check exact match or if pathname starts with item.href
  // For parent items without children, check if pathname starts with item.href
  const isActive = isChildItem
    ? pathname === item.href || (pathname.startsWith(item.href + '/') && item.href !== '/')
    : pathname === item.href || pathname.startsWith(item.href + '/');

  return (
    <Link
      href={item.href}
      onClick={() => onNavigate?.(item.href)}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
        isActive
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
      )}
    >
      <item.icon className="h-5 w-5" />
      {t(item.titleKey)}
    </Link>
  );
}

function MobileNavGroup({
  item,
  t,
  onNavigate,
  hasPermission,
}: {
  item: NavItem;
  t: (key: string) => string;
  onNavigate?: (href: string) => void;
  hasPermission: (permission: string) => boolean;
}) {
  const pathname = usePathname();

  // Check if any child is active
  const isChildActive =
    item.children?.some(
      (child) => pathname === child.href || pathname.startsWith(child.href + '/')
    ) ?? false;

  // Check if the parent path itself is active
  const isParentPathActive = pathname.startsWith(item.href + '/') || pathname === item.href;

  // Parent is considered active if any child is active or the parent path matches
  const isActive = isChildActive || isParentPathActive;

  // Auto-expand if any child is active on initial render
  const [isOpen, setIsOpen] = useState(isActive);
  const [hasUserToggled, setHasUserToggled] = useState(false);

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

  return (
    <div>
      <button
        onClick={handleToggle}
        className={cn(
          'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
          isActive
            ? 'bg-accent text-accent-foreground'
            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
        )}
      >
        <item.icon className="h-5 w-5" />
        <span className="flex-1 text-left">{t(item.titleKey)}</span>
        <ChevronDown className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-180')} />
      </button>
      {isOpen && (
        <ul className="ml-4 mt-1 space-y-1 border-l pl-4">
          {visibleChildren.map((child) => (
            <li key={child.href}>
              <MobileNavLink item={child} t={t} onNavigate={onNavigate} isChildItem />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  const t = useTranslations('navigation');
  const { mobileNavOpen, setMobileNavOpen } = useUIStore();
  const resetAppointmentsToToday = useAppointmentsUIStore((state) => state.resetToToday);
  const { hasPermission } = usePermissions();

  // Close on route change
  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname, setMobileNavOpen]);

  // Handle navigation - reset page-specific state
  const handleNavigate = useCallback(
    (href: string) => {
      if (href === '/appointments') {
        resetAppointmentsToToday();
      }
    },
    [resetAppointmentsToToday]
  );

  // Filter nav items based on user permissions
  const visibleMainNavItems = useMemo(
    () => mainNavItems.filter((item) => !item.permission || hasPermission(item.permission)),
    [hasPermission]
  );

  const visibleBottomNavItems = useMemo(
    () => bottomNavItems.filter((item) => !item.permission || hasPermission(item.permission)),
    [hasPermission]
  );

  return (
    <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
      <SheetContent side="left" className="w-72 p-0">
        <SheetHeader className="border-b px-4 py-4">
          <SheetTitle asChild>
            <Link href="/today" className="flex items-center gap-2 text-xl font-bold">
              <span className="text-primary">Salon</span>
              <span>Ops</span>
            </Link>
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-65px)]">
          <nav className="p-4">
            {/* Main navigation */}
            <div className="space-y-1">
              {visibleMainNavItems.map((item) => (
                <div key={item.href}>
                  {item.children ? (
                    <MobileNavGroup
                      item={item}
                      t={t}
                      onNavigate={handleNavigate}
                      hasPermission={hasPermission}
                    />
                  ) : (
                    <MobileNavLink item={item} t={t} onNavigate={handleNavigate} />
                  )}
                </div>
              ))}
            </div>

            {/* Divider */}
            <div className="my-4 border-t" />

            {/* Bottom navigation */}
            <div className="space-y-1">
              {visibleBottomNavItems.map((item) => (
                <MobileNavLink key={item.href} item={item} t={t} onNavigate={handleNavigate} />
              ))}
            </div>
          </nav>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
