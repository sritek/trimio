'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  Clock,
  Phone,
  Play,
  RefreshCw,
  User,
  XCircle,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { PERMISSIONS } from '@salon-ops/shared';

import {
  useAppointment,
  useCheckIn,
  useStartAppointment,
  useCompleteAppointment,
  useCancelAppointment,
  useMarkNoShow,
} from '@/hooks/queries/use-appointments';
import { usePermissions } from '@/hooks/use-permissions';
import { formatCurrency } from '@/lib/format';

import {
  AccessDenied,
  ConfirmDialog,
  PageContainer,
  PageContent,
  PageHeader,
  PermissionGuard,
  LoadingSpinner,
} from '@/components/common';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

import { AppointmentStatusBadge } from '../components/appointment-status-badge';

export default function AppointmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations('appointments');
  const { hasPermission } = usePermissions();
  const canWrite = hasPermission(PERMISSIONS.APPOINTMENTS_WRITE);
  const canManage = hasPermission(PERMISSIONS.APPOINTMENTS_MANAGE);

  const id = params.id as string;
  const { data: appointment, isLoading, refetch } = useAppointment(id);

  // State for no-show confirmation dialog
  const [showNoShowDialog, setShowNoShowDialog] = useState(false);

  const checkIn = useCheckIn();
  const startAppointment = useStartAppointment();
  const completeAppointment = useCompleteAppointment();
  const cancelAppointment = useCancelAppointment();
  const markNoShow = useMarkNoShow();

  if (isLoading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner />
        </div>
      </PageContainer>
    );
  }

  if (!appointment) {
    return (
      <PageContainer>
        <PageContent>
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold">{t('detail.notFound')}</h2>
            <p className="text-muted-foreground mt-2">{t('detail.notFoundDesc')}</p>
            <Button className="mt-4" onClick={() => router.push('/appointments')}>
              {t('detail.backToList')}
            </Button>
          </div>
        </PageContent>
      </PageContainer>
    );
  }

  const { status } = appointment;
  const canCheckIn = status === 'booked' || status === 'confirmed';
  const canStart = status === 'checked_in';
  const canComplete = status === 'in_progress';
  const canCancel = ['booked', 'confirmed', 'checked_in'].includes(status);
  const canMarkNoShow = status === 'booked' || status === 'confirmed';
  const canReschedule = appointment.rescheduleCount < 3 && canCancel;

  const handleCheckIn = async () => {
    try {
      await checkIn.mutateAsync(id);
      toast.success('Customer checked in successfully');
      refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to check in');
    }
  };

  const handleStart = async () => {
    try {
      await startAppointment.mutateAsync(id);
      toast.success('Appointment started');
      refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to start appointment');
    }
  };

  const handleComplete = async () => {
    try {
      await completeAppointment.mutateAsync({ appointmentId: id });
      toast.success('Appointment completed');
      refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to complete appointment');
    }
  };

  const handleCancel = async () => {
    const reason = prompt(t('list.cancelReason'));
    if (reason) {
      try {
        await cancelAppointment.mutateAsync({ id, data: { reason } });
        toast.success('Appointment cancelled');
        refetch();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to cancel appointment');
      }
    }
  };

  const handleNoShow = async () => {
    setShowNoShowDialog(true);
  };

  const confirmNoShow = async () => {
    try {
      await markNoShow.mutateAsync(id);
      toast.success('Marked as no-show');
      setShowNoShowDialog(false);
      refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to mark as no-show');
    }
  };

  return (
    <PermissionGuard permission={PERMISSIONS.APPOINTMENTS_READ} fallback={<AccessDenied />}>
      <PageContainer>
        <PageHeader
          title={t('detail.title')}
          actions={
            <Button variant="outline" onClick={() => router.push('/appointments')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('detail.backToList')}
            </Button>
          }
        />

        <PageContent>
          <div className="grid gap-6 md:grid-cols-3">
            {/* Main Info */}
            <div className="md:col-span-2 space-y-6">
              {/* Appointment Info */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{t('detail.appointmentInfo')}</CardTitle>
                    <AppointmentStatusBadge status={appointment.status} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <div className="text-sm text-muted-foreground">{t('detail.date')}</div>
                        <div className="font-medium">
                          {format(new Date(appointment.scheduledDate), 'EEEE, MMMM d, yyyy')}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Clock className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <div className="text-sm text-muted-foreground">{t('detail.time')}</div>
                        <div className="font-medium">
                          {appointment.scheduledTime} - {appointment.endTime}
                        </div>
                      </div>
                    </div>
                  </div>

                  {appointment.tokenNumber && (
                    <div className="p-3 bg-muted rounded-md">
                      <span className="text-sm text-muted-foreground">{t('detail.token')}: </span>
                      <span className="font-bold text-lg">#{appointment.tokenNumber}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Customer Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    {t('detail.customerInfo')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="font-medium text-lg">
                      {appointment.customer?.name || appointment.customerName || 'Guest'}
                    </div>
                    {(appointment.customer?.phone || appointment.customerPhone) && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="h-4 w-4" />
                        {appointment.customer?.phone || appointment.customerPhone}
                      </div>
                    )}
                    {appointment.customer?.email && (
                      <div className="text-muted-foreground">{appointment.customer.email}</div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Services */}
              <Card>
                <CardHeader>
                  <CardTitle>{t('detail.services')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {appointment.services?.map((service) => (
                      <div
                        key={service.id}
                        className="flex items-center justify-between p-3 border rounded-md"
                      >
                        <div>
                          <div className="font-medium">{service.serviceName}</div>
                          <div className="text-sm text-muted-foreground">
                            {service.durationMinutes} min
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{formatCurrency(service.totalAmount)}</div>
                          {service.discountAmount > 0 && (
                            <div className="text-sm text-green-600">
                              -{formatCurrency(service.discountAmount)}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    <Separator />
                    <div className="flex justify-between font-semibold">
                      <span>{t('detail.total')}</span>
                      <span>{formatCurrency(appointment.totalAmount)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Status History */}
              {appointment.statusHistory && appointment.statusHistory.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>{t('detail.statusHistory')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {appointment.statusHistory.map((history) => (
                        <div key={history.id} className="flex items-start gap-3">
                          <div className="w-2 h-2 mt-2 rounded-full bg-primary" />
                          <div>
                            <div className="font-medium">
                              {history.fromStatus ? `${history.fromStatus} → ` : ''}
                              {history.toStatus}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {format(new Date(history.createdAt), 'PPp')}
                            </div>
                            {history.notes && <div className="text-sm mt-1">{history.notes}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Actions Sidebar */}
            <div className="space-y-6">
              {/* Quick Actions */}
              {canWrite && (
                <Card>
                  <CardHeader>
                    <CardTitle>{t('detail.actions')}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {canCheckIn && (
                      <Button
                        className="w-full"
                        onClick={handleCheckIn}
                        disabled={checkIn.isPending}
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        {t('actions.checkIn')}
                      </Button>
                    )}
                    {canStart && (
                      <Button
                        className="w-full"
                        onClick={handleStart}
                        disabled={startAppointment.isPending}
                      >
                        <Play className="mr-2 h-4 w-4" />
                        {t('actions.start')}
                      </Button>
                    )}
                    {canComplete && (
                      <Button
                        className="w-full"
                        onClick={handleComplete}
                        disabled={completeAppointment.isPending}
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        {t('actions.complete')}
                      </Button>
                    )}
                    {canReschedule && (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => router.push(`/appointments/${id}/reschedule`)}
                      >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        {t('actions.reschedule')}
                        {appointment.rescheduleCount > 0 && (
                          <span className="ml-1 text-xs">({appointment.rescheduleCount}/3)</span>
                        )}
                      </Button>
                    )}
                    {canCancel && (
                      <Button
                        variant="destructive"
                        className="w-full"
                        onClick={handleCancel}
                        disabled={cancelAppointment.isPending}
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        {t('actions.cancel')}
                      </Button>
                    )}
                    {canMarkNoShow && canManage && (
                      <Button
                        variant="outline"
                        className="w-full text-destructive"
                        onClick={handleNoShow}
                        disabled={markNoShow.isPending}
                      >
                        <Clock className="mr-2 h-4 w-4" />
                        {t('actions.noShow')}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Notes */}
              {(appointment.customerNotes || appointment.internalNotes) && (
                <Card>
                  <CardHeader>
                    <CardTitle>{t('detail.notes')}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {appointment.customerNotes && (
                      <div>
                        <div className="text-sm font-medium text-muted-foreground">
                          {t('detail.customerNotes')}
                        </div>
                        <div className="mt-1">{appointment.customerNotes}</div>
                      </div>
                    )}
                    {appointment.internalNotes && (
                      <div>
                        <div className="text-sm font-medium text-muted-foreground">
                          {t('detail.internalNotes')}
                        </div>
                        <div className="mt-1">{appointment.internalNotes}</div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Booking Info */}
              <Card>
                <CardHeader>
                  <CardTitle>{t('detail.bookingInfo')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('detail.bookingType')}</span>
                    <span>{t(`bookingType.${appointment.bookingType}`)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('detail.createdAt')}</span>
                    <span>{format(new Date(appointment.createdAt), 'PP')}</span>
                  </div>
                  {appointment.priceLockedAt && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('detail.priceLocked')}</span>
                      <span>{format(new Date(appointment.priceLockedAt), 'PP')}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </PageContent>

        <ConfirmDialog
          open={showNoShowDialog}
          onOpenChange={setShowNoShowDialog}
          title={t('list.confirmNoShowTitle')}
          description={t('list.confirmNoShowDescription')}
          variant="destructive"
          onConfirm={confirmNoShow}
          isLoading={markNoShow.isPending}
        />
      </PageContainer>
    </PermissionGuard>
  );
}
