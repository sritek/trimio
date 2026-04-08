'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { AlertTriangle, CalendarIcon, Clock, User, X, Ban } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

import { PERMISSIONS } from '@trimio/shared';

import {
  useCreateAppointment,
  useAvailableSlots,
  useAppointments,
} from '@/hooks/queries/use-appointments';
import { useCustomerSearch } from '@/hooks/queries/use-customers';
import { useServices } from '@/hooks/queries/use-services';
import { useBranchContext } from '@/hooks/use-branch-context';
import { formatCurrency } from '@/lib/format';

import {
  AccessDenied,
  PageContainer,
  PageContent,
  PageHeader,
  PermissionGuard,
  SearchInput,
  DatePicker,
} from '@/components/common';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

import type {
  BookingType,
  GenderPreference,
  ConflictAction,
  ConflictActionType,
} from '@/types/appointments';

interface ConflictingAppointment {
  id: string;
  customerName: string;
  customerPhone?: string;
  scheduledTime: string;
  endTime: string;
  status: string;
  services: string[];
}

const appointmentSchema = z.object({
  customerId: z.string().optional(),
  customerName: z.string().min(2, 'Name is required').optional(),
  customerPhone: z.string().optional(),
  scheduledDate: z.date({ required_error: 'Date is required' }),
  scheduledTime: z.string().min(1, 'Time is required'),
  serviceIds: z.array(z.string()).min(1, 'Select at least one service'),
  stylistId: z.string().optional(),
  stylistGenderPreference: z.enum(['male', 'female', 'any']).optional(),
  bookingType: z.enum(['online', 'phone', 'walk_in']),
  customerNotes: z.string().optional(),
  internalNotes: z.string().optional(),
});

type AppointmentFormData = z.infer<typeof appointmentSchema>;

export default function NewAppointmentPage() {
  const t = useTranslations('appointments');
  const router = useRouter();

  const { branchId: contextBranchId } = useBranchContext();
  const branchId = contextBranchId || '';

  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<{
    id: string;
    name: string;
    phone: string;
  } | null>(null);
  const [conflictDialogOpen, setConflictDialogOpen] = useState(false);
  const [conflicts, setConflicts] = useState<ConflictingAppointment[]>([]);
  const [conflictActions, setConflictActions] = useState<Record<string, ConflictActionType>>({});
  const [overrideReason, setOverrideReason] = useState('');
  const [pendingFormData, setPendingFormData] = useState<AppointmentFormData | null>(null);

  const form = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      serviceIds: [],
      bookingType: 'phone',
      stylistGenderPreference: 'any',
    },
  });

  const selectedDate = form.watch('scheduledDate');
  const selectedServices = form.watch('serviceIds');
  const selectedTime = form.watch('scheduledTime');

  // Queries
  const { data: customers } = useCustomerSearch({ q: customerSearch, limit: 5 });
  const { data: servicesResult } = useServices({ isActive: true });
  const services = servicesResult?.data || [];

  const { data: slotsData } = useAvailableSlots({
    branchId,
    date: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '',
    serviceIds: selectedServices,
  });

  // Fetch existing appointments for the selected date
  const { data: existingAppointmentsData } = useAppointments({
    branchId,
    dateFrom: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : undefined,
    dateTo: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : undefined,
    status: ['booked', 'confirmed', 'checked_in', 'in_progress'],
    limit: 50,
  });

  const existingAppointments = existingAppointmentsData?.data || [];

  const createAppointment = useCreateAppointment();

  // Toggle service selection
  const toggleService = (serviceId: string) => {
    const currentServices = form.getValues('serviceIds');
    if (currentServices.includes(serviceId)) {
      form.setValue(
        'serviceIds',
        currentServices.filter((id) => id !== serviceId)
      );
    } else {
      form.setValue('serviceIds', [...currentServices, serviceId]);
    }
  };

  // Calculate totals
  const { totalDuration, totalPrice } = useMemo(() => {
    let duration = 0;
    let price = 0;
    selectedServices.forEach((serviceId) => {
      const service = services.find((s) => s.id === serviceId);

      if (service) {
        duration += service.durationMinutes || 0;
        price += service.basePrice || 0;
      }
    });
    return { totalDuration: duration, totalPrice: price };
  }, [selectedServices, services]);

  // Filter appointments that overlap with selected time
  const overlappingAppointments = useMemo(() => {
    if (!selectedTime || !selectedDate || totalDuration === 0) return [];

    const selectedStartMinutes =
      parseInt(selectedTime.split(':')[0]) * 60 + parseInt(selectedTime.split(':')[1]);
    const selectedEndMinutes = selectedStartMinutes + totalDuration;

    return existingAppointments.filter((apt) => {
      const aptStartMinutes =
        parseInt(apt.scheduledTime.split(':')[0]) * 60 + parseInt(apt.scheduledTime.split(':')[1]);
      const aptEndMinutes =
        parseInt(apt.scheduledEndTime.split(':')[0]) * 60 +
        parseInt(apt.scheduledEndTime.split(':')[1]);

      // Check for overlap
      return selectedStartMinutes < aptEndMinutes && selectedEndMinutes > aptStartMinutes;
    });
  }, [selectedTime, selectedDate, totalDuration, existingAppointments]);

  const onSubmit = async (
    data: AppointmentFormData,
    forceOverride = false,
    reason?: string,
    actions?: ConflictAction[]
  ) => {
    try {
      await createAppointment.mutateAsync({
        branchId,
        customerId: selectedCustomer?.id || data.customerId,
        customerName: selectedCustomer?.name || data.customerName,
        customerPhone: selectedCustomer?.phone || data.customerPhone,
        scheduledDate: format(data.scheduledDate, 'yyyy-MM-dd'),
        scheduledTime: data.scheduledTime,
        services: data.serviceIds.map((id) => ({ serviceId: id })),
        stylistId: data.stylistId,
        stylistGenderPreference: data.stylistGenderPreference as GenderPreference,
        bookingType: data.bookingType as BookingType,
        customerNotes: data.customerNotes,
        internalNotes: data.internalNotes,
        forceOverride,
        overrideReason: reason,
        conflictActions: actions,
      } as any);
      toast.success('Appointment created successfully');
      router.push('/appointments');
    } catch (error: any) {
      // Check if it's a conflict error (only show dialog if not already forcing override)
      const apiError = error as {
        code?: string;
        details?: { conflicts?: ConflictingAppointment[] };
      };
      if (!forceOverride && apiError?.code === 'APT_CONFLICT' && apiError?.details?.conflicts) {
        const conflictList = apiError.details.conflicts;
        setConflicts(conflictList);
        // Initialize all conflicts with 'keep' action by default
        const initialActions: Record<string, ConflictActionType> = {};
        conflictList.forEach((c) => {
          initialActions[c.id] = 'keep';
        });
        setConflictActions(initialActions);
        setPendingFormData(data);
        setConflictDialogOpen(true);
      } else {
        toast.error(error instanceof Error ? error.message : 'Failed to create appointment');
      }
    }
  };

  const handleForceCreate = async () => {
    if (!pendingFormData) {
      toast.error('No pending appointment data');
      return;
    }
    if (!overrideReason.trim()) {
      toast.error('Please provide a reason for overriding the conflict');
      return;
    }

    // Build conflict actions array
    const actions: ConflictAction[] = conflicts.map((c) => ({
      appointmentId: c.id,
      action: conflictActions[c.id] || 'keep',
    }));

    // Close dialog first and clear state
    const formData = pendingFormData;
    const reason = overrideReason;

    setConflictDialogOpen(false);
    setOverrideReason('');
    setPendingFormData(null);
    setConflicts([]);
    setConflictActions({});

    // Now submit with override
    await onSubmit(formData, true, reason, actions);
  };

  const handleCancelOverride = () => {
    setConflictDialogOpen(false);
    setOverrideReason('');
    setPendingFormData(null);
    setConflicts([]);
    setConflictActions({});
  };

  const toggleConflictAction = (conflictId: string) => {
    setConflictActions((prev) => ({
      ...prev,
      [conflictId]: prev[conflictId] === 'keep' ? 'cancel' : 'keep',
    }));
  };

  const handleFormSubmit = async (data: AppointmentFormData) => {
    await onSubmit(data, false);
  };

  const handleCustomerSelect = (customer: { id: string; name: string; phone: string }) => {
    setSelectedCustomer(customer);
    setCustomerSearch('');
  };

  return (
    <PermissionGuard permission={PERMISSIONS.APPOINTMENTS_WRITE} fallback={<AccessDenied />}>
      <PageContainer>
        <PageHeader title={t('form.title')} description={t('form.description')} />

        <PageContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                {/* Customer Selection */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      {t('form.customer')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {selectedCustomer ? (
                      <div className="p-3 border rounded-md">
                        <div className="font-medium">{selectedCustomer.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {selectedCustomer.phone}
                        </div>
                        <Button
                          type="button"
                          variant="link"
                          size="sm"
                          className="p-0 h-auto"
                          onClick={() => setSelectedCustomer(null)}
                        >
                          {t('form.changeCustomer')}
                        </Button>
                      </div>
                    ) : (
                      <>
                        <SearchInput
                          value={customerSearch}
                          onChange={setCustomerSearch}
                          placeholder={t('form.searchCustomer')}
                        />
                        {customers && customers.length > 0 && (
                          <div className="border rounded-md divide-y">
                            {customers.map((customer: any) => (
                              <div
                                key={customer.id}
                                className="p-2 cursor-pointer hover:bg-muted"
                                onClick={() => handleCustomerSelect(customer)}
                              >
                                <div className="font-medium">{customer.name}</div>
                                <div className="text-sm text-muted-foreground">
                                  {customer.phone}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="text-sm text-muted-foreground">
                          {t('form.orEnterDetails')}
                        </div>
                        <FormField
                          control={form.control}
                          name="customerName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t('form.customerName')}</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="customerPhone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t('form.customerPhone')}</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Date & Time */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CalendarIcon className="h-5 w-5" />
                      {t('form.dateTime')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="scheduledDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('form.date')}</FormLabel>
                          <FormControl>
                            <DatePicker
                              value={field.value}
                              onChange={field.onChange}
                              placeholder={t('form.selectDate')}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="scheduledTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('form.time')}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={t('form.selectTime')} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {slotsData?.slots
                                ?.filter((slot) => slot.available)
                                .map((slot) => (
                                  <SelectItem key={slot.time} value={slot.time}>
                                    {slot.time}
                                  </SelectItem>
                                )) ||
                                // Default time slots if no availability data
                                Array.from({ length: 24 }, (_, i) => {
                                  const hour = (9 + Math.floor(i / 2)).toString().padStart(2, '0');
                                  const min = i % 2 === 0 ? '00' : '30';
                                  return `${hour}:${min}`;
                                })
                                  .filter((t) => t >= '09:00' && t <= '20:00')
                                  .map((time) => (
                                    <SelectItem key={time} value={time}>
                                      {time}
                                    </SelectItem>
                                  ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Show overlapping appointments warning */}
                    {overlappingAppointments.length > 0 && (
                      <div className="p-3 border border-yellow-300 bg-yellow-50 rounded-md">
                        <div className="flex items-center gap-2 text-yellow-800 font-medium mb-2">
                          <AlertTriangle className="h-4 w-4" />
                          Existing appointments at this time:
                        </div>
                        <div className="space-y-2">
                          {overlappingAppointments.map((apt) => (
                            <div
                              key={apt.id}
                              className="text-sm text-yellow-700 flex items-center gap-2"
                            >
                              <Clock className="h-3 w-3" />
                              <span>
                                {apt.scheduledTime} - {apt.scheduledEndTime}:{' '}
                                {apt.customer?.name || apt.customerName || 'Guest'}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {apt.status.replace('_', ' ')}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Show existing appointments for the day */}
                    {selectedDate && existingAppointments.length > 0 && (
                      <div className="p-3 border rounded-md bg-muted/30">
                        <div className="text-sm font-medium mb-2">
                          {existingAppointments.length} appointment(s) on this day:
                        </div>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {existingAppointments.map((apt) => (
                            <div key={apt.id} className="text-xs text-muted-foreground">
                              {apt.scheduledTime} - {apt.scheduledEndTime}:{' '}
                              {apt.customer?.name || apt.customerName || 'Guest'}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <FormField
                      control={form.control}
                      name="bookingType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('form.bookingType')}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="phone">{t('bookingType.phone')}</SelectItem>
                              <SelectItem value="online">{t('bookingType.online')}</SelectItem>
                              <SelectItem value="walk_in">{t('bookingType.walk_in')}</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </div>

              {/* Services */}
              <Card>
                <CardHeader>
                  <CardTitle>{t('form.services')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="serviceIds"
                    render={({ field }) => (
                      <FormItem>
                        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                          {services.map((service: any) => {
                            const isSelected = field.value?.includes(service.id);
                            return (
                              <div
                                key={service.id}
                                onClick={() => toggleService(service.id)}
                                className={`p-3 border rounded-md cursor-pointer transition-colors ${
                                  isSelected
                                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                                    : 'hover:border-primary/50 hover:bg-muted/50'
                                }`}
                              >
                                <div className="flex items-start gap-3">
                                  <div
                                    className={`mt-0.5 h-4 w-4 rounded border flex items-center justify-center ${
                                      isSelected
                                        ? 'bg-primary border-primary'
                                        : 'border-muted-foreground'
                                    }`}
                                  >
                                    {isSelected && (
                                      <svg
                                        className="h-3 w-3 text-primary-foreground"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                        strokeWidth={3}
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          d="M5 13l4 4L19 7"
                                        />
                                      </svg>
                                    )}
                                  </div>
                                  <div className="flex-1">
                                    <div className="font-medium">{service.name}</div>
                                    <div className="text-sm text-muted-foreground">
                                      {service.durationMinutes} min •{' '}
                                      {formatCurrency(service.basePrice)}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Notes */}
              <Card>
                <CardHeader>
                  <CardTitle>{t('form.notes')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="customerNotes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('form.customerNotes')}</FormLabel>
                        <FormControl>
                          <Textarea {...field} rows={2} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="internalNotes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('form.internalNotes')}</FormLabel>
                        <FormControl>
                          <Textarea {...field} rows={2} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Summary & Submit */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-muted-foreground">{t('form.totalDuration')}</div>
                      <div className="text-lg font-semibold">{totalDuration} min</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">{t('form.totalPrice')}</div>
                      <div className="text-lg font-semibold">{formatCurrency(totalPrice)}</div>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button type="button" variant="outline" onClick={() => router.back()}>
                      {t('form.cancel')}
                    </Button>
                    <Button type="submit" disabled={createAppointment.isPending}>
                      {createAppointment.isPending ? t('form.creating') : t('form.create')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </form>
          </Form>
        </PageContent>

        {/* Conflict Dialog */}
        <AlertDialog open={conflictDialogOpen} onOpenChange={setConflictDialogOpen}>
          <AlertDialogContent className="max-w-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Appointment Conflict Detected
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-4">
                  <p>
                    The selected time slot conflicts with the following existing appointment(s).
                    Choose what to do with each conflicting appointment:
                  </p>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {conflicts.map((conflict) => {
                      const action = conflictActions[conflict.id] || 'keep';
                      return (
                        <div
                          key={conflict.id}
                          className={`p-3 border rounded-md text-sm transition-colors ${
                            action === 'cancel'
                              ? 'border-red-300 bg-red-50'
                              : 'border-yellow-300 bg-yellow-50'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="font-medium">{conflict.customerName}</div>
                              <div className="text-muted-foreground">
                                {conflict.scheduledTime} - {conflict.endTime}
                              </div>
                              <div className="text-muted-foreground">
                                Services: {conflict.services.join(', ')}
                              </div>
                              <div className="text-muted-foreground capitalize">
                                Status: {conflict.status.replace('_', ' ')}
                              </div>
                            </div>
                            <div className="flex flex-col gap-1">
                              <Button
                                type="button"
                                size="sm"
                                variant={action === 'keep' ? 'default' : 'outline'}
                                className="text-xs h-7"
                                onClick={() => toggleConflictAction(conflict.id)}
                              >
                                <Clock className="h-3 w-3 mr-1" />
                                Keep (Mark Conflict)
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant={action === 'cancel' ? 'destructive' : 'outline'}
                                className="text-xs h-7"
                                onClick={() => toggleConflictAction(conflict.id)}
                              >
                                <X className="h-3 w-3 mr-1" />
                                Cancel
                              </Button>
                            </div>
                          </div>
                          {action === 'keep' && (
                            <div className="mt-2 text-xs text-yellow-700 flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              Will be marked with conflict flag for manual resolution
                            </div>
                          )}
                          {action === 'cancel' && (
                            <div className="mt-2 text-xs text-red-700 flex items-center gap-1">
                              <Ban className="h-3 w-3" />
                              Will be cancelled automatically
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Reason for override (required):</label>
                    <Textarea
                      value={overrideReason}
                      onChange={(e) => setOverrideReason(e.target.value)}
                      placeholder="Enter reason for creating this appointment despite the conflict..."
                      rows={2}
                    />
                  </div>
                  <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                    <strong>Summary:</strong>{' '}
                    {Object.values(conflictActions).filter((a) => a === 'keep').length}{' '}
                    appointment(s) will be marked with conflict,{' '}
                    {Object.values(conflictActions).filter((a) => a === 'cancel').length} will be
                    cancelled.
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={handleCancelOverride}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleForceCreate}
                disabled={!overrideReason.trim()}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Override & Create
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </PageContainer>
    </PermissionGuard>
  );
}
