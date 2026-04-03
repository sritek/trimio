/**
 * MobileNav - Mobile navigation drawer
 *
 * Features:
 * - Sheet drawer from left side
 * - Same navigation items as desktop sidebar with nested menus
 * - Closes on route change
 * - Resets page-specific state on navigation
 * - Permission-based navigation filtering
 * - Branch selector and user profile
 */

'use client';

import { useEffect, useCallback, useState, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Calendar,
  Users,
  Scissors,
  Receipt,
  Package,
  BarChart3,
  Megaphone,
  Settings,
  UserCog,
  CalendarCheck,
  Wallet,
  CreditCard,
  Gift,
  Crown,
  ChevronDown,
  Gauge,
  FileText,
  Building2,
  Check,
  LogOut,
} from 'lucide-react';
import { useTranslations } from 'next-intl';

import { PERMISSIONS } from '@salon-ops/shared';

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConfirmDialog } from '@/components/common';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api/client';
import { useUIStore } from '@/stores/ui-store';
import { useAuthStore } from '@/stores/auth-store';
import { useAppointmentsUIStore } from '@/stores/appointments-ui-store';
import { usePermissions } from '@/hooks/use-permissions';
import { useBranchContext } from '@/hooks/use-branch-context';
import { useBranches } from '@/hooks/queries/use-branches';
import { type FeatureFlags, isFeatureEnabled } from '@/config/features';
import { useLocale } from 'next-intl';
import { locales, localeNames, type Locale } from '@/i18n/config';

interface NavItem {
  titleKey: string;
  href: string;
  icon: React.ElementType;
  permission?: string;
  featureFlag?: Partial<FeatureFlags>;
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

// Settings nav item (no Help anymore)
const settingsNavItem: NavItem = {
  titleKey: 'settings',
  href: '/settings',
  icon: Settings,
};

// ============================================
// Mobile Branch Selector
// ============================================

function MobileBranchSelector() {
  const { branchId, branchIds, setSelectedBranch, canSwitchBranches } = useBranchContext();
  const { data: branches, isLoading } = useBranches(branchIds);

  const selectedBranch = branches?.find((b) => b.id === branchId);

  if (!canSwitchBranches) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
        <Building2 className="h-4 w-4" />
        <span className="truncate">{selectedBranch?.name || 'Branch'}</span>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex w-full items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-accent text-left">
          <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
          {isLoading ? (
            <Skeleton className="h-4 w-20" />
          ) : (
            <span className="flex-1 truncate">{selectedBranch?.name || 'Select Branch'}</span>
          )}
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        <DropdownMenuLabel>Switch Branch</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {isLoading ? (
          <div className="p-2 space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : (
          branches?.map((branch) => (
            <DropdownMenuItem
              key={branch.id}
              onClick={() => setSelectedBranch(branch.id)}
              className="flex items-center justify-between"
            >
              <span className="truncate">{branch.name}</span>
              {branch.id === branchId && <Check className="h-4 w-4 text-primary" />}
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ============================================
// Mobile User Profile
// ============================================

function MobileUserProfile({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const locale = useLocale();
  const { user, refreshToken, logout } = useAuthStore();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      if (refreshToken) {
        await api.post('/auth/logout', { refreshToken });
      }
    } catch {
      // Continue with logout even if API call fails
    }
    logout();
    onClose();
    router.push('/login');
  };

  const handleLanguageToggle = () => {
    const currentIndex = locales.indexOf(locale as Locale);
    const nextIndex = (currentIndex + 1) % locales.length;
    const newLocale = locales[nextIndex];
    document.cookie = `NEXT_LOCALE=${newLocale};path=/;max-age=31536000`;
    router.refresh();
  };

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    const parts = name.split(' ');
    return parts.length >= 2
      ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
      : name.slice(0, 2).toUpperCase();
  };

  const nextLocale = locales[(locales.indexOf(locale as Locale) + 1) % locales.length] as Locale;

  return (
    <>
      <div className="flex items-center gap-2 p-3 border-t">
        {/* Avatar + Info */}
        <Avatar className="h-10 w-10 shrink-0">
          <AvatarFallback className="bg-primary text-primary-foreground text-sm">
            {getInitials(user?.name)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{user?.name}</p>
          <p className="text-xs text-muted-foreground truncate capitalize">
            {user?.role?.replace(/_/g, ' ')}
          </p>
        </div>

        {/* Language Toggle */}
        <button
          onClick={handleLanguageToggle}
          className="flex items-center justify-center h-9 px-2.5 rounded-md text-xs font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground border"
          title={`Switch to ${localeNames[nextLocale]}`}
        >
          {locale.toUpperCase()}
        </button>

        {/* Logout */}
        <button
          onClick={() => setShowLogoutConfirm(true)}
          className="flex items-center justify-center h-9 w-9 rounded-md text-muted-foreground hover:bg-accent hover:text-red-600"
          aria-label="Sign out"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>

      <ConfirmDialog
        open={showLogoutConfirm}
        onOpenChange={setShowLogoutConfirm}
        title="Sign out"
        description="Are you sure you want to sign out?"
        confirmText="Sign out"
        variant="destructive"
        onConfirm={handleLogout}
        isLoading={isLoggingOut}
      />
    </>
  );
}

// ============================================
// Nav Link Component
// ============================================

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
    ? pathname === item.href
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
  const { tenant } = useAuthStore();
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

  // Filter nav items based on user permissions and feature flags
  const visibleMainNavItems = useMemo(
    () =>
      mainNavItems.filter(
        (item) =>
          (!item.permission || hasPermission(item.permission)) &&
          (!item.featureFlag || isFeatureEnabled(item.featureFlag))
      ),
    [hasPermission]
  );

  return (
    <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
      <SheetContent side="left" className="w-72 p-0 flex flex-col">
        {/* Header with Brand */}
        <SheetHeader className="border-b px-4 py-4">
          <SheetTitle asChild>
            <Link href="/today" className="flex items-center gap-2 text-xl font-bold">
              <span className="text-primary">trimio</span>
              {tenant?.logoUrl && (
                <>
                  <span className="text-muted-foreground text-sm">×</span>
                  <img
                    src={tenant.logoUrl}
                    alt={tenant.name}
                    className="h-6 w-6 rounded object-contain"
                  />
                </>
              )}
            </Link>
          </SheetTitle>
        </SheetHeader>

        {/* Branch Selector */}
        <div className="border-b px-2 py-2">
          <MobileBranchSelector />
        </div>

        {/* Main Navigation */}
        <ScrollArea className="flex-1">
          <nav className="p-4">
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

            {/* Settings */}
            <MobileNavLink item={settingsNavItem} t={t} onNavigate={handleNavigate} />
          </nav>
        </ScrollArea>

        {/* User Profile at Bottom */}
        <MobileUserProfile onClose={() => setMobileNavOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
