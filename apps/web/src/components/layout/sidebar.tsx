/**
 * Sidebar - Collapsible navigation sidebar
 *
 * Layout:
 * - Top: Brand (trimio × Tenant Logo)
 * - Below brand: Branch Selector
 * - Middle: Main navigation
 * - Bottom: Settings, Language, User Profile
 */

'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
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
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  UserCog,
  CalendarCheck,
  Wallet,
  CreditCard,
  Gift,
  Crown,
  Gauge,
  FileText,
  LogOut,
  Building2,
  Check,
} from 'lucide-react';
import { useTranslations } from 'next-intl';

import { PERMISSIONS } from '@salon-ops/shared';

import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/common';
import { usePermissions } from '@/hooks/use-permissions';
import { useBranchContext } from '@/hooks/use-branch-context';
import { useBranches } from '@/hooks/queries/use-branches';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api/client';
import { useUIStore } from '@/stores/ui-store';
import { useAuthStore } from '@/stores/auth-store';
import { useAppointmentsUIStore } from '@/stores/appointments-ui-store';
import { type FeatureFlags, isFeatureEnabled } from '@/config/features';
import { useLocale } from 'next-intl';
import { locales, localeNames, type Locale } from '@/i18n/config';
import Image from 'next/image';

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

// ============================================
// Nav Link Component
// ============================================

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
  const isActive = isChildItem
    ? pathname === item.href
    : pathname === item.href || pathname.startsWith(item.href + '/');

  const title = t(item.titleKey);

  const link = (
    <Link
      href={item.href}
      onClick={() => onNavigate?.(item.href)}
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
        <TooltipContent side="right">{title}</TooltipContent>
      </Tooltip>
    );
  }

  return link;
}

// ============================================
// Nav Group Component (expandable)
// ============================================

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
  const isChildActive =
    item.children?.some(
      (child) => pathname === child.href || pathname.startsWith(child.href + '/')
    ) ?? false;
  const isParentPathActive = pathname.startsWith(item.href + '/') || pathname === item.href;
  const isActive = isChildActive || isParentPathActive;

  const [isOpen, setIsOpen] = useState(isActive);
  const [hasUserToggled, setHasUserToggled] = useState(false);
  const title = t(item.titleKey);

  useEffect(() => {
    if (isActive && !isOpen && !hasUserToggled) setIsOpen(true);
    if (!isActive) setHasUserToggled(false);
  }, [isActive, isOpen, hasUserToggled]);

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
          {visibleChildren.map((child) => (
            <Link
              key={child.href}
              href={child.href}
              className={cn(
                'text-sm hover:text-foreground',
                pathname === child.href ? 'text-foreground font-medium' : 'text-muted-foreground'
              )}
              onClick={() => onNavigate?.(child.href)}
            >
              {t(child.titleKey)}
            </Link>
          ))}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div>
      <button
        onClick={() => {
          setHasUserToggled(true);
          setIsOpen(!isOpen);
        }}
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

// ============================================
// Branch Selector (inline in sidebar)
// ============================================

function SidebarBranchSelector({ isCollapsed }: { isCollapsed: boolean }) {
  const { branchId, branchIds, setSelectedBranch, canSwitchBranches } = useBranchContext();
  const { data: branches, isLoading } = useBranches(branchIds);

  const selectedBranch = branches?.find((b) => b.id === branchId);

  if (!canSwitchBranches) {
    // Single branch - just show the name
    if (isCollapsed) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <div className="flex items-center justify-center p-2">
              <Building2 className="h-5 w-5 text-muted-foreground" />
            </div>
          </TooltipTrigger>
          <TooltipContent side="right">{selectedBranch?.name || 'Branch'}</TooltipContent>
        </Tooltip>
      );
    }
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
        <Building2 className="h-4 w-4" />
        <span className="truncate">{selectedBranch?.name || 'Branch'}</span>
      </div>
    );
  }

  // Multi-branch - show dropdown
  if (isCollapsed) {
    return (
      <DropdownMenu>
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <button className="flex w-full items-center justify-center p-2 rounded-lg hover:bg-accent">
                <Building2 className="h-5 w-5 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="right">Switch Branch</TooltipContent>
        </Tooltip>
        <DropdownMenuContent side="right" align="start" className="w-48">
          <DropdownMenuLabel>Switch Branch</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {isLoading ? (
            <div className="p-2">
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
// User Profile Card
// ============================================

function UserProfileCard({ isCollapsed }: { isCollapsed: boolean }) {
  const pathname = usePathname();
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
    router.push('/login');
  };

  const handleLanguageToggle = () => {
    // Cycle through locales
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

  const isSettingsActive = pathname.startsWith('/settings');

  if (isCollapsed) {
    // Collapsed: Stack of icon buttons
    return (
      <>
        <div className="flex flex-col items-center gap-1">
          {/* User Avatar with tooltip */}
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <div className="p-1">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {getInitials(user?.name)}
                  </AvatarFallback>
                </Avatar>
              </div>
            </TooltipTrigger>
            <TooltipContent side="right">
              <div>
                <p className="font-medium">{user?.name}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {user?.role?.replace(/_/g, ' ')}
                </p>
              </div>
            </TooltipContent>
          </Tooltip>

          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Link
                href="/settings"
                className={cn(
                  'flex items-center justify-center rounded-lg px-2 py-2 text-sm transition-all',
                  isSettingsActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <Settings className="h-5 w-5" />
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">Settings</TooltipContent>
          </Tooltip>

          {/* Language Toggle */}
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <button
                onClick={handleLanguageToggle}
                className="flex items-center justify-center w-8 h-8 rounded-lg text-xs font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              >
                {locale.toUpperCase()}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">
              Switch to{' '}
              {
                localeNames[
                  locales[(locales.indexOf(locale as Locale) + 1) % locales.length] as Locale
                ]
              }
            </TooltipContent>
          </Tooltip>

          {/* Logout */}
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <button
                onClick={() => setShowLogoutConfirm(true)}
                className="flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:bg-accent hover:text-red-600"
              >
                <LogOut className="size-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Sign out</TooltipContent>
          </Tooltip>
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

  // Expanded: Horizontal layout
  return (
    <>
      <div className="flex items-center justify-center gap-4 p-2">
        {/* Settings Button */}
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <Link
              href="/settings"
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all',
                isSettingsActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <Settings className="h-5 w-5" />
            </Link>
          </TooltipTrigger>
          <TooltipContent>Settings</TooltipContent>
        </Tooltip>

        {/* Language Toggle Button */}
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <button
              onClick={handleLanguageToggle}
              className="flex items-center justify-center h-8 px-2 rounded-md text-xs font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground border"
            >
              {locale.toUpperCase()}
            </button>
          </TooltipTrigger>
          <TooltipContent>
            Switch to{' '}
            {
              localeNames[
                locales[(locales.indexOf(locale as Locale) + 1) % locales.length] as Locale
              ]
            }
          </TooltipContent>
        </Tooltip>

        {/* Logout Button */}
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:bg-accent hover:text-red-600"
            >
              <LogOut className="size-4 text-destructive" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Sign out</TooltipContent>
        </Tooltip>
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
// Main Sidebar Component
// ============================================

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const t = useTranslations('navigation');
  const { sidebarCollapsed, toggleSidebarCollapse } = useUIStore();
  const { user, tenant } = useAuthStore();
  const { hasPermission } = usePermissions();
  const resetAppointmentsToToday = useAppointmentsUIStore((state) => state.resetToToday);

  const visibleMainNavItems = useMemo(
    () =>
      mainNavItems.filter(
        (item) =>
          (!item.permission || hasPermission(item.permission)) &&
          (!item.featureFlag || isFeatureEnabled(item.featureFlag))
      ),
    [hasPermission]
  );

  const handleNavigate = useCallback(
    (href: string) => {
      if (href === '/appointments') resetAppointmentsToToday();
    },
    [resetAppointmentsToToday]
  );

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    const parts = name.split(' ');
    return parts.length >= 2
      ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
      : name.slice(0, 2).toUpperCase();
  };

  return (
    <TooltipProvider>
      <aside
        className={cn(
          'flex h-screen flex-col border-r bg-card transition-[width] duration-300 ease-in-out',
          sidebarCollapsed ? 'w-16' : 'w-56',
          className
        )}
      >
        {/* Brand */}
        <div
          className={cn(
            'flex h-14 items-center border-b px-3',
            sidebarCollapsed ? 'justify-center' : 'justify-between'
          )}
        >
          <Link href="/today" className="flex items-center gap-2 font-bold text-lg">
            {sidebarCollapsed ? (
              tenant?.logoUrl ? (
                <Image
                  src={tenant.logoUrl}
                  alt={tenant.name}
                  width={32}
                  height={32}
                  className="rounded object-contain"
                />
              ) : (
                <span className="text-primary">T</span>
              )
            ) : (
              <>
                <span>trimio</span>
                {tenant?.logoUrl && (
                  <>
                    <span className="text-muted-foreground text-sm">×</span>
                    <Image
                      src={tenant.logoUrl}
                      alt={tenant.name}
                      width={24}
                      height={24}
                      className="rounded object-contain"
                    />
                  </>
                )}
              </>
            )}
          </Link>
          {!sidebarCollapsed && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={toggleSidebarCollapse}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Branch Selector */}
        <div className="border-b px-2 py-2">
          <SidebarBranchSelector isCollapsed={sidebarCollapsed} />
        </div>

        {/* Main Navigation */}
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

        {/* Bottom Section */}
        <div className="border-t p-2 space-y-1 flex flex-col items-center">
          {/* Settings */}
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2">
              <Avatar className="h-9 w-9 shrink-0">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  {getInitials(user?.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.name}</p>
                <p className="text-xs text-muted-foreground truncate capitalize">
                  {user?.role?.replace(/_/g, ' ')}
                </p>
              </div>
            </div>
          )}

          {/* Expand toggle when collapsed */}
          {sidebarCollapsed && (
            <Button
              variant="ghost"
              size="icon"
              className="w-full h-8"
              onClick={toggleSidebarCollapse}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}

          {/* User Profile */}
          <UserProfileCard isCollapsed={sidebarCollapsed} />
        </div>
      </aside>
    </TooltipProvider>
  );
}
