'use client';

/**
 * Owner Dashboard Component
 * For super_owner and regional_manager roles
 * Shows revenue metrics, appointment stats, inventory alerts, and quick links
 * Includes Floor View tab for station management
 */

import { useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useOwnerDashboard } from '@/hooks/queries/use-owner-dashboard';
import { useOpenPanel } from '@/components/ux/slide-over';
import { useStartAppointment, useCompleteAppointment } from '@/hooks/queries/use-appointments';
import { FloorViewTab } from './floor-view-tab';
import { useUIStore } from '@/stores/ui-store';

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
  const { ownerDashboardView } = useUIStore();
  const { openStationAssignment, openAppointmentDetails, openAddService, openCheckout } =
    useOpenPanel();
  const startMutation = useStartAppointment();
  const completeMutation = useCompleteAppointment();

  // Floor view action handlers
  const handleAssign = useCallback(
    (stationId: string) => {
      openStationAssignment(stationId);
    },
    [openStationAssignment]
  );

  const handleViewDetails = useCallback(
    (appointmentId: string) => {
      openAppointmentDetails(appointmentId);
    },
    [openAppointmentDetails]
  );

  const handleAddService = useCallback(
    (appointmentId: string) => {
      openAddService(appointmentId);
    },
    [openAddService]
  );

  const handleComplete = useCallback(
    async (appointmentId: string) => {
      try {
        await completeMutation.mutateAsync(appointmentId);
        toast.success('Appointment completed');
        openCheckout(appointmentId);
      } catch (error: any) {
        toast.error(error.message || 'Failed to complete appointment');
      }
    },
    [completeMutation, openCheckout]
  );

  const handleStartNow = useCallback(
    async (appointmentId: string) => {
      try {
        await startMutation.mutateAsync(appointmentId);
        toast.success('Appointment started');
      } catch (error: any) {
        toast.error(error.message || 'Failed to start appointment');
      }
    },
    [startMutation]
  );

  if (isLoading) {
    return <OwnerDashboardSkeleton />;
  }

  if (ownerDashboardView === 'floor') {
    return (
      <FloorViewTab
        branchId={branchId}
        onAssign={handleAssign}
        onViewDetails={handleViewDetails}
        onAddService={handleAddService}
        onComplete={handleComplete}
        onStartNow={handleStartNow}
      />
    );
  }

  return <OwnerOverviewContent data={data} />;
}

// Extracted overview content to keep the component clean
function OwnerOverviewContent({ data }: { data: ReturnType<typeof useOwnerDashboard>['data'] }) {
  return (
    <div className="space-y-6">
      {/* Revenue Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today&apos;s Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data?.revenue.today || 0)}</div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>vs yesterday:</span>
              <span
                className={cn(
                  'flex items-center',
                  (data?.revenue.percentChangeVsYesterday || 0) >= 0
                    ? 'text-green-600'
                    : 'text-red-600'
                )}
              >
                {(data?.revenue.percentChangeVsYesterday || 0) >= 0 ? (
                  <TrendingUp className="h-3 w-3 mr-1" />
                ) : (
                  <TrendingDown className="h-3 w-3 mr-1" />
                )}
                {formatPercent(data?.revenue.percentChangeVsYesterday || 0)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Yesterday</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data?.revenue.yesterday || 0)}</div>
            <p className="text-xs text-muted-foreground">Previous day revenue</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Week Same Day</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(data?.revenue.lastWeekSameDay || 0)}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>vs today:</span>
              <span
                className={cn(
                  'flex items-center',
                  (data?.revenue.percentChangeVsLastWeek || 0) >= 0
                    ? 'text-green-600'
                    : 'text-red-600'
                )}
              >
                {(data?.revenue.percentChangeVsLastWeek || 0) >= 0 ? (
                  <TrendingUp className="h-3 w-3 mr-1" />
                ) : (
                  <TrendingDown className="h-3 w-3 mr-1" />
                )}
                {formatPercent(data?.revenue.percentChangeVsLastWeek || 0)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Appointment Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Today&apos;s Appointments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{data?.appointments.total || 0}</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {data?.appointments.upcoming || 0}
              </div>
              <div className="text-xs text-muted-foreground">Upcoming</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {data?.appointments.inProgress || 0}
              </div>
              <div className="text-xs text-muted-foreground">In Progress</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {data?.appointments.completed || 0}
              </div>
              <div className="text-xs text-muted-foreground">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {data?.appointments.cancelled || 0}
              </div>
              <div className="text-xs text-muted-foreground">Cancelled</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {data?.appointments.noShows || 0}
              </div>
              <div className="text-xs text-muted-foreground">No Shows</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Inventory Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Inventory Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(data?.inventory.lowStockCount || 0) > 0 && (
                <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  <div>
                    <div className="font-medium text-yellow-800">Low Stock</div>
                    <div className="text-sm text-yellow-600">
                      {data?.inventory.lowStockCount} items below reorder level
                    </div>
                  </div>
                </div>
              )}
              {(data?.inventory.expiringCount || 0) > 0 && (
                <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <div>
                    <div className="font-medium text-red-800">Expiring Soon</div>
                    <div className="text-sm text-red-600">
                      {data?.inventory.expiringCount} batches expiring within 30 days
                    </div>
                  </div>
                </div>
              )}
              {(data?.inventory.lowStockCount || 0) === 0 &&
                (data?.inventory.expiringCount || 0) === 0 && (
                  <div className="text-center py-4 text-muted-foreground">No inventory alerts</div>
                )}
            </div>
          </CardContent>
        </Card>

        {/* Staff Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Staff Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {data?.staff.presentToday || 0}
                </div>
                <div className="text-xs text-muted-foreground">Present</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{data?.staff.onLeave || 0}</div>
                <div className="text-xs text-muted-foreground">On Leave</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{data?.staff.totalActive || 0}</div>
                <div className="text-xs text-muted-foreground">Total Active</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Quick Links
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link
              href="/reports"
              className="flex items-center gap-2 p-3 rounded-lg border hover:bg-muted transition-colors"
            >
              <FileText className="h-5 w-5 text-muted-foreground" />
              <span>Reports</span>
            </Link>
            <Link
              href="/billing"
              className="flex items-center gap-2 p-3 rounded-lg border hover:bg-muted transition-colors"
            >
              <DollarSign className="h-5 w-5 text-muted-foreground" />
              <span>Billing</span>
            </Link>
            <Link
              href="/inventory"
              className="flex items-center gap-2 p-3 rounded-lg border hover:bg-muted transition-colors"
            >
              <Package className="h-5 w-5 text-muted-foreground" />
              <span>Inventory</span>
            </Link>
            <Link
              href="/staff"
              className="flex items-center gap-2 p-3 rounded-lg border hover:bg-muted transition-colors"
            >
              <Users className="h-5 w-5 text-muted-foreground" />
              <span>Staff</span>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function OwnerDashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32 mb-2" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="text-center">
                <Skeleton className="h-8 w-12 mx-auto mb-1" />
                <Skeleton className="h-3 w-16 mx-auto" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
