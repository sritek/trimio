'use client';

/**
 * Branch Manager Dashboard Component
 * For branch_manager role
 * Similar to OwnerDashboard but branch-scoped with staff attendance
 */

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  AlertTriangle,
  Package,
  Users,
  DollarSign,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useOwnerDashboard } from '@/hooks/queries/use-owner-dashboard';
import { useDailyAttendance } from '@/hooks/queries/use-staff';
import { format } from 'date-fns';
import { WalkInQueueSection } from './walk-in-queue-section';
import { useOpenPanel } from '@/components/ux/slide-over';
import { StartServiceDialog } from '@/components/ux/dialogs/start-service-dialog';
import type { WalkInQueueEntry } from '@/types/appointments';

interface BranchManagerDashboardProps {
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

export function BranchManagerDashboard({ branchId }: BranchManagerDashboardProps) {
  const { data, isLoading } = useOwnerDashboard({ branchId });
  const { data: attendanceData } = useDailyAttendance(format(new Date(), 'yyyy-MM-dd'));
  const staffSummary = attendanceData?.summary;
  const { openNewAppointment } = useOpenPanel();

  // State for start service dialog
  const [startServiceDialogOpen, setStartServiceDialogOpen] = useState(false);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const [selectedCustomerName, setSelectedCustomerName] = useState<string | undefined>();

  // Handle serve from walk-in queue - opens new appointment panel with pre-filled data
  const handleServeWalkIn = useCallback(
    (entry: WalkInQueueEntry) => {
      // Get current time in HH:mm format for walk-ins
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

      // Open new appointment panel with customer, services, time, stylist preference, and booking type pre-filled
      openNewAppointment({
        customerId: entry.customerId || undefined,
        serviceIds: entry.serviceIds,
        walkInQueueId: entry.id,
        bookingType: 'walk_in',
        time: currentTime,
        stylistId: entry.stylistPreferenceId || undefined,
      });
    },
    [openNewAppointment]
  );

  if (isLoading) {
    return <BranchManagerDashboardSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Walk-In Queue Section */}
      <WalkInQueueSection onServe={handleServeWalkIn} />

      {/* Revenue Metrics - Compact */}
      <div className="grid gap-4 md:grid-cols-2">
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
            <CardTitle className="text-sm font-medium">Staff Attendance</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {staffSummary?.present ?? 0}/{staffSummary?.total ?? 0}
            </div>
            <div className="text-xs text-muted-foreground">
              {staffSummary?.onLeave ?? 0} on leave today
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
        {/* Staff Attendance Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Staff Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span className="text-sm font-medium">Present</span>
                </div>
                <span className="text-lg font-bold text-green-600">
                  {staffSummary?.present ?? 0}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-orange-500" />
                  <span className="text-sm font-medium">On Leave</span>
                </div>
                <span className="text-lg font-bold text-orange-600">
                  {staffSummary?.onLeave ?? 0}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-red-500" />
                  <span className="text-sm font-medium">Absent</span>
                </div>
                <span className="text-lg font-bold text-red-600">{staffSummary?.absent ?? 0}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-gray-400" />
                  <span className="text-sm font-medium">Unmarked</span>
                </div>
                <span className="text-lg font-bold text-gray-600">
                  {staffSummary?.notMarked ?? 0}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

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
      </div>

      {/* Start Service Dialog */}
      {selectedAppointmentId && (
        <StartServiceDialog
          open={startServiceDialogOpen}
          onOpenChange={setStartServiceDialogOpen}
          appointmentId={selectedAppointmentId}
          customerName={selectedCustomerName}
          onSuccess={() => {
            setSelectedAppointmentId(null);
            setSelectedCustomerName(undefined);
          }}
        />
      )}
    </div>
  );
}

function BranchManagerDashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        {[1, 2].map((i) => (
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
