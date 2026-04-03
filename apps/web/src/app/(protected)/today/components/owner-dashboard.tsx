'use client';

/**
 * Owner Dashboard Component
 * For super_owner and regional_manager roles
 * Shows revenue metrics, appointment stats, inventory alerts, and quick links
 * Includes Floor View tab for station management
 */

import { useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  AlertTriangle,
  Package,
  FileText,
  Users,
  DollarSign,
  LayoutGrid,
  BarChart3,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useOwnerDashboard } from '@/hooks/queries/use-owner-dashboard';
import { useDailyAttendance } from '@/hooks/queries/use-staff';
import { format } from 'date-fns';
import { useOpenPanel } from '@/components/ux/slide-over';
import { FloorViewTab } from './floor-view-tab';
import { useUIStore } from '@/stores/ui-store';
import { isInventoryEnabled } from '@/config/features';

interface OwnerDashboardProps {
  branchId: string;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

// View toggle component for the header
export function OwnerDashboardViewToggle() {
  const { ownerDashboardView, setOwnerDashboardView } = useUIStore();

  return (
    <ToggleGroup
      type="single"
      value={ownerDashboardView}
      onValueChange={(value) => value && setOwnerDashboardView(value as 'overview' | 'floor')}
      className="rounded-lg border"
    >
      <ToggleGroupItem value="overview" aria-label="Overview" className="px-3 py-1.5 text-sm">
        <BarChart3 className="h-4 w-4 mr-1.5" />
        Overview
      </ToggleGroupItem>
      <ToggleGroupItem value="floor" aria-label="Floor View" className="px-3 py-1.5 text-sm">
        <LayoutGrid className="h-4 w-4 mr-1.5" />
        Floor View
      </ToggleGroupItem>
    </ToggleGroup>
  );
}

export function OwnerDashboard({ branchId }: OwnerDashboardProps) {
  const { data, isLoading } = useOwnerDashboard({ branchId });
  const { data: attendanceData } = useDailyAttendance(format(new Date(), 'yyyy-MM-dd'));
  const staffSummary = attendanceData?.summary;
  const { ownerDashboardView } = useUIStore();
  const { openStationAssignment, openAppointmentDetails } = useOpenPanel();

  // Floor view action handlers
  const handleAssign = useCallback(
    (stationId: string) => {
      openStationAssignment(stationId);
    },
    [openStationAssignment]
  );

  const handleCheckout = useCallback(
    (appointmentId: string) => {
      openAppointmentDetails(appointmentId, {
        isCheckoutMode: true,
      });
    },
    [openAppointmentDetails]
  );

  if (isLoading) {
    return <OwnerDashboardSkeleton />;
  }

  if (ownerDashboardView === 'floor') {
    return (
      <FloorViewTab
        branchId={branchId}
        onAssign={handleAssign}
        onCheckout={handleCheckout}
      />
    );
  }

  return <OwnerOverviewContent data={data} staffSummary={staffSummary} />;
}

// Extracted overview content to keep the component clean
function OwnerOverviewContent({ data, staffSummary }: { data: ReturnType<typeof useOwnerDashboard>['data']; staffSummary?: { present: number; absent: number; onLeave: number; halfDay: number; holiday: number; weekOff: number; notMarked: number; total: number } }) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {/* Left Column - Revenue & Appointments */}
      <div className="lg:col-span-2 space-y-4">
        {/* Revenue Row - Compact cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Today</span>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold">{formatCurrency(data?.revenue.today || 0)}</div>
            <div className="flex items-center gap-1 mt-1">
              <span
                className={cn(
                  'flex items-center text-xs',
                  (data?.revenue.percentChangeVsYesterday || 0) >= 0
                    ? 'text-green-600'
                    : 'text-red-600'
                )}
              >
                {(data?.revenue.percentChangeVsYesterday || 0) >= 0 ? (
                  <TrendingUp className="h-3 w-3 mr-0.5" />
                ) : (
                  <TrendingDown className="h-3 w-3 mr-0.5" />
                )}
                {formatPercent(data?.revenue.percentChangeVsYesterday || 0)}
              </span>
              <span className="text-xs text-muted-foreground">vs yesterday</span>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Yesterday</span>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold">{formatCurrency(data?.revenue.yesterday || 0)}</div>
            <p className="text-xs text-muted-foreground mt-1">Previous day</p>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Last Week</span>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold">
              {formatCurrency(data?.revenue.lastWeekSameDay || 0)}
            </div>
            <div className="flex items-center gap-1 mt-1">
              <span
                className={cn(
                  'flex items-center text-xs',
                  (data?.revenue.percentChangeVsLastWeek || 0) >= 0
                    ? 'text-green-600'
                    : 'text-red-600'
                )}
              >
                {(data?.revenue.percentChangeVsLastWeek || 0) >= 0 ? (
                  <TrendingUp className="h-3 w-3 mr-0.5" />
                ) : (
                  <TrendingDown className="h-3 w-3 mr-0.5" />
                )}
                {formatPercent(data?.revenue.percentChangeVsLastWeek || 0)}
              </span>
              <span className="text-xs text-muted-foreground">same day</span>
            </div>
          </Card>
        </div>

        {/* Appointments - Horizontal compact layout */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">Today&apos;s Appointments</span>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            <div className="text-center p-2 rounded-lg bg-muted/50">
              <div className="text-xl font-bold">{data?.appointments.total || 0}</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </div>
            <div className="text-center p-2 rounded-lg bg-blue-50">
              <div className="text-xl font-bold text-blue-600">
                {data?.appointments.upcoming || 0}
              </div>
              <div className="text-xs text-blue-600/70">Upcoming</div>
            </div>
            <div className="text-center p-2 rounded-lg bg-purple-50">
              <div className="text-xl font-bold text-purple-600">
                {data?.appointments.inProgress || 0}
              </div>
              <div className="text-xs text-purple-600/70">In Progress</div>
            </div>
            <div className="text-center p-2 rounded-lg bg-green-50">
              <div className="text-xl font-bold text-green-600">
                {data?.appointments.completed || 0}
              </div>
              <div className="text-xs text-green-600/70">Completed</div>
            </div>
            <div className="text-center p-2 rounded-lg bg-red-50">
              <div className="text-xl font-bold text-red-600">
                {data?.appointments.cancelled || 0}
              </div>
              <div className="text-xs text-red-600/70">Cancelled</div>
            </div>
            <div className="text-center p-2 rounded-lg bg-orange-50">
              <div className="text-xl font-bold text-orange-600">
                {data?.appointments.noShows || 0}
              </div>
              <div className="text-xs text-orange-600/70">No Shows</div>
            </div>
          </div>
        </Card>

        {/* Inventory Alerts - only show if inventory module is enabled */}
        {isInventoryEnabled && (
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Inventory Alerts</span>
            </div>
            <div className="space-y-2">
              {(data?.inventory.lowStockCount || 0) > 0 && (
                <div className="flex items-center gap-3 p-2 bg-yellow-50 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-yellow-800">Low Stock: </span>
                    <span className="text-sm text-yellow-600">
                      {data?.inventory.lowStockCount} items below reorder level
                    </span>
                  </div>
                </div>
              )}
              {(data?.inventory.expiringCount || 0) > 0 && (
                <div className="flex items-center gap-3 p-2 bg-red-50 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-red-800">Expiring: </span>
                    <span className="text-sm text-red-600">
                      {data?.inventory.expiringCount} batches within 30 days
                    </span>
                  </div>
                </div>
              )}
              {(data?.inventory.lowStockCount || 0) === 0 &&
                (data?.inventory.expiringCount || 0) === 0 && (
                  <div className="text-center py-2 text-sm text-muted-foreground">
                    No inventory alerts
                  </div>
                )}
            </div>
          </Card>
        )}
      </div>

      {/* Right Column - Staff & Quick Links */}
      <div className="space-y-4">
        {/* Staff Summary - Vertical layout */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">Staff Today</span>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-2 rounded-lg bg-green-50">
              <span className="text-sm text-green-700">Present</span>
              <span className="text-lg font-bold text-green-600">
                {staffSummary?.present ?? 0}
              </span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-orange-50">
              <span className="text-sm text-orange-700">On Leave</span>
              <span className="text-lg font-bold text-orange-600">{staffSummary?.onLeave ?? 0}</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-red-50">
              <span className="text-sm text-red-700">Absent</span>
              <span className="text-lg font-bold text-red-600">
                {staffSummary?.absent ?? 0}
              </span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-gray-50">
              <span className="text-sm text-gray-700">Unmarked</span>
              <span className="text-lg font-bold text-gray-600">
                {staffSummary?.notMarked ?? 0}
              </span>
            </div>
          </div>
        </Card>

        {/* Quick Links - Grid layout */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">Quick Links</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Link
              href="/appointments"
              className="flex items-center gap-2 p-2 rounded-lg border hover:bg-muted transition-colors"
            >
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Appointments</span>
            </Link>
            <Link
              href="/billing"
              className="flex items-center gap-2 p-2 rounded-lg border hover:bg-muted transition-colors"
            >
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Billing</span>
            </Link>
            <Link
              href="/customers"
              className="flex items-center gap-2 p-2 rounded-lg border hover:bg-muted transition-colors"
            >
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Customers</span>
            </Link>
            <Link
              href="/staff"
              className="flex items-center gap-2 p-2 rounded-lg border hover:bg-muted transition-colors"
            >
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Staff</span>
            </Link>
            {isInventoryEnabled && (
              <Link
                href="/inventory"
                className="flex items-center gap-2 p-2 rounded-lg border hover:bg-muted transition-colors col-span-2"
              >
                <Package className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Inventory</span>
              </Link>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function OwnerDashboardSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {/* Left Column */}
      <div className="lg:col-span-2 space-y-4">
        {/* Revenue Row */}
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-4">
              <Skeleton className="h-4 w-16 mb-2" />
              <Skeleton className="h-8 w-24 mb-1" />
              <Skeleton className="h-3 w-20" />
            </Card>
          ))}
        </div>
        {/* Appointments */}
        <Card className="p-4">
          <Skeleton className="h-4 w-40 mb-4" />
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="text-center p-2">
                <Skeleton className="h-6 w-8 mx-auto mb-1" />
                <Skeleton className="h-3 w-12 mx-auto" />
              </div>
            ))}
          </div>
        </Card>
      </div>
      {/* Right Column */}
      <div className="space-y-4">
        <Card className="p-4">
          <Skeleton className="h-4 w-24 mb-4" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </Card>
        <Card className="p-4">
          <Skeleton className="h-4 w-24 mb-3" />
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
