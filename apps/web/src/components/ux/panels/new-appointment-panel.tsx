'use client';

/**
 * New Appointment Panel - Redesigned
 * Based on: .kiro/specs/ux-consolidation-slideover/design.md
 *
 * Features:
 * - Customer combobox with search + create new option
 * - Selected customer card with details
 * - Service multi-select combobox with categories
 * - Stylist avatar cards
 * - Booking type toggle buttons
 * - Time slot grid
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import {
  Calendar,
  User,
  Scissors,
  FileText,
  Phone,
  Globe,
  Footprints,
  X,
  Plus,
  UserPlus,
  UserX,
  CheckCircle2,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  DatePicker,
  CustomerCombobox,
  ServiceCombobox,
  TimeSlotPicker,
  PhoneInput,
} from '@/components/common';
import type { CustomerOption } from '@/components/common';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useClosePanel, useSlideOverUnsavedChanges } from '@/components/ux/slide-over';
import { useCreateAppointment, useStylistBusySlots } from '@/hooks/queries/use-appointments';
import { useCustomerSearch, useCustomerPhoneLookup } from '@/hooks/queries/use-customers';
import { useServices } from '@/hooks/queries/use-services';
import { useStaffList } from '@/hooks/queries/use-staff';
import { useBranchContext } from '@/hooks/use-branch-context';
import { useBranch } from '@/hooks/queries/use-branches';
import { useDebounce } from '@/hooks/use-debounce';
import { cn } from '@/lib/utils';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

// Form validation schema
const appointmentSchema = z
  .object({
    customerId: z.string().optional(),
    customerName: z.string().min(1, 'Customer name is required'),
    customerPhone: z
      .string()
      .optional()
      .refine(
        (val) => !val || /^[6-9]\d{9}$/.test(val),
        'Phone must be a valid 10-digit Indian mobile number'
      ),
    serviceIds: z.array(z.string()).min(1, 'At least one service is required'),
    stylistId: z.string().optional(),
    assignLater: z.boolean().default(false),
    date: z.string().min(1, 'Date is required'),
    time: z.string().min(1, 'Time is required'),
    notes: z.string().optional(),
    bookingType: z.enum(['online', 'phone', 'walk_in']).default('phone'),
  })
  .refine(
    (data) => {
      // Walk-ins cannot be unassigned
      if (data.bookingType === 'walk_in' && data.assignLater) {
        return false;
      }
      return true;
    },
    { message: 'Walk-in appointments cannot be unassigned', path: ['assignLater'] }
  )
  .refine(
    (data) => {
      // Stylist is required unless assignLater is true
      if (!data.assignLater && !data.stylistId) {
        return false;
      }
      return true;
    },
    { message: 'Stylist is required', path: ['stylistId'] }
  );

type AppointmentFormData = z.infer<typeof appointmentSchema>;

interface NewAppointmentPanelProps {
  stylistId?: string;
  date?: string;
  time?: string;
  customerId?: string;
  onSuccess?: (appointmentId: string) => void;
}

export function NewAppointmentPanel({
  stylistId: initialStylistId,
  date: initialDate,
  time: initialTime,
  customerId: initialCustomerId,
  onSuccess,
}: NewAppointmentPanelProps) {
  const closePanel = useClosePanel();
  const { setUnsavedChanges } = useSlideOverUnsavedChanges();
  const { branchId } = useBranchContext();

  // Fetch branch working hours
  const { data: branchData } = useBranch(branchId || '');

  // UI State
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');

  // Fetch data
  const { data: servicesData, isLoading: servicesLoading } = useServices({});
  const { data: staffData, isLoading: staffLoading } = useStaffList({
    branchId: branchId || '',
    role: 'stylist',
  });

  // Customer search query
  const { data: customerSearchData } = useCustomerSearch({
    q: customerSearchQuery,
    limit: 10,
  });

  // Map customer search results to CustomerOption format
  const customerOptions: CustomerOption[] = useMemo(() => {
    if (!customerSearchData) return [];
    return customerSearchData.map((c) => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      visitCount: c.visitCount,
      loyaltyPoints: c.loyaltyPoints,
      tags: c.tags,
    }));
  }, [customerSearchData]);

  const createMutation = useCreateAppointment();

  // Stable default values
  const stableDefaultValues = useMemo(
    () => ({
      stylistId: initialStylistId || '',
      assignLater: false,
      date: initialDate || format(new Date(), 'yyyy-MM-dd'),
      time: initialTime || '',
      customerId: initialCustomerId || '',
      customerName: '',
      customerPhone: '',
      serviceIds: [] as string[],
      notes: '',
      bookingType: 'phone' as const,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: stableDefaultValues,
  });

  const watchedDate = watch('date');
  const watchedTime = watch('time');
  const watchedStylistId = watch('stylistId');
  const watchedBookingType = watch('bookingType');
  const watchedAssignLater = watch('assignLater');
  const watchedCustomerPhone = watch('customerPhone');

  // Extract working hours for the selected date from branch data
  const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
  const branchWorkingHours = useMemo(() => {
    if (!branchData?.workingHours || !watchedDate) return { startHour: 9, endHour: 21 };
    const [year, month, day] = watchedDate.split('-').map(Number);
    const dayIndex = new Date(year, month - 1, day).getDay();
    const dayName = DAY_NAMES[dayIndex];
    const dayHours = branchData.workingHours[dayName] as
      | { isOpen?: boolean; openTime?: string | null; closeTime?: string | null; open?: string | null; close?: string | null }
      | undefined;
    if (!dayHours || !dayHours.isOpen) return { startHour: 9, endHour: 21 };
    const openStr = dayHours.openTime || dayHours.open || '09:00';
    const closeStr = dayHours.closeTime || dayHours.close || '21:00';
    return {
      startHour: parseInt(openStr.split(':')[0], 10),
      endHour: parseInt(closeStr.split(':')[0], 10),
    };
  }, [branchData?.workingHours, watchedDate]);

  // Debounce phone number to avoid excessive API calls while typing
  const debouncedPhone = useDebounce(watchedCustomerPhone || '', 600);

  // Phone lookup - check if customer exists when typing phone in new customer mode
  // Only triggers after user stops typing for 600ms
  const { data: phoneLookupData, isLoading: phoneLookupLoading } = useCustomerPhoneLookup(
    isNewCustomer ? debouncedPhone : ''
  );

  // When phone lookup finds existing customer, auto-fill the name
  useEffect(() => {
    if (isNewCustomer && phoneLookupData && debouncedPhone) {
      // Auto-fill the name from existing customer
      setValue('customerName', phoneLookupData.name);
    }
  }, [isNewCustomer, phoneLookupData, debouncedPhone, setValue]);

  // Fetch stylist busy slots when stylist and date are selected
  const { data: busySlotsData, isLoading: busySlotsLoading } = useStylistBusySlots(
    watchedStylistId || undefined,
    branchId || undefined,
    watchedDate || undefined
  );

  // Calculate total duration from selected services
  const totalDuration = useMemo(() => {
    if (!selectedServices.length || !servicesData?.data) return 30;
    const services = servicesData.data;
    return selectedServices.reduce((total, serviceId) => {
      const service = services.find((s) => s.id === serviceId);
      return total + (service?.durationMinutes || 30);
    }, 0);
  }, [selectedServices, servicesData?.data]);

  // Track unsaved changes
  useEffect(() => {
    if (isDirty) {
      setUnsavedChanges(true);
    }
    return () => setUnsavedChanges(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDirty]);

  // Handle customer selection from combobox
  const handleCustomerSelect = useCallback(
    (customer: CustomerOption | null) => {
      if (customer) {
        setSelectedCustomer(customer);
        setIsNewCustomer(false);
        setValue('customerId', customer.id);
        setValue('customerName', customer.name);
        setValue('customerPhone', customer.phone);
      } else {
        setSelectedCustomer(null);
        setValue('customerId', '');
        setValue('customerName', '');
        setValue('customerPhone', '');
      }
    },
    [setValue]
  );

  // Handle new customer mode toggle
  const handleNewCustomer = useCallback(() => {
    setSelectedCustomer(null);
    setIsNewCustomer(true);
    setValue('customerId', '');
    setValue('customerName', '');
    setValue('customerPhone', '');
  }, [setValue]);

  // Clear customer selection and return to search mode
  const handleClearCustomer = useCallback(() => {
    setSelectedCustomer(null);
    setIsNewCustomer(false);
    setValue('customerId', '');
    setValue('customerName', '');
    setValue('customerPhone', '');
  }, [setValue]);

  // Handle form submission
  const onSubmit = useCallback(
    async (data: AppointmentFormData) => {
      try {
        const result = await createMutation.mutateAsync({
          branchId: branchId || '',
          customerId: data.customerId || undefined,
          customerName: data.customerName,
          customerPhone: data.customerPhone || undefined,
          services: data.serviceIds.map((serviceId) => ({
            serviceId,
            stylistId: data.assignLater ? undefined : data.stylistId,
          })),
          stylistId: data.assignLater ? undefined : data.stylistId,
          scheduledDate: data.date,
          scheduledTime: data.time,
          customerNotes: data.notes || undefined,
          bookingType: data.bookingType,
          assignLater: data.assignLater,
        });

        // Toast is handled by the mutation hook
        if (onSuccess && result.appointment?.id) {
          onSuccess(result.appointment.id);
        }
        closePanel();
      } catch {
        // Error toast is handled by the mutation hook
      }
    },
    [branchId, createMutation, closePanel, onSuccess]
  );

  const services = servicesData?.data || [];
  const stylists = staffData?.data || [];

  console.log('stylists', stylists);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col h-full relative">
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {/* Customer Section */}
          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              Customer
            </Label>

            {/* New Customer Form */}
            {isNewCustomer && (
              <div className="space-y-3 p-4 rounded-lg border bg-muted/30">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {phoneLookupData ? 'Existing Customer' : 'New Customer'}
                  </span>
                  <button
                    type="button"
                    onClick={handleClearCustomer}
                    className="p-1 rounded-full hover:bg-muted"
                  >
                    <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>

                {/* Show existing customer card if found */}
                {phoneLookupData ? (
                  <div className="flex items-center gap-3 p-3 rounded-lg border-2 border-primary bg-primary/5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-medium">
                      {phoneLookupData.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{phoneLookupData.name}</p>
                      <p className="text-sm text-muted-foreground">
                        +91 {phoneLookupData.phone.slice(0, 5)} {phoneLookupData.phone.slice(5)}
                      </p>
                    </div>
                    <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                  </div>
                ) : (
                  <>
                    {/* Phone input */}
                    <div className="relative">
                      <PhoneInput
                        value={watchedCustomerPhone || ''}
                        onChange={(value) => setValue('customerPhone', value)}
                        placeholder="98765 43210"
                        showCountryCode
                      />
                      {phoneLookupLoading && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 z-10">
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        </div>
                      )}
                    </div>
                    {errors.customerPhone && (
                      <p className="text-xs text-destructive">{errors.customerPhone.message}</p>
                    )}

                    {/* Customer name input */}
                    <Input
                      placeholder="Customer name *"
                      {...register('customerName')}
                      className={cn(errors.customerName && 'border-destructive')}
                    />
                    {errors.customerName && (
                      <p className="text-xs text-destructive">{errors.customerName.message}</p>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Customer Search Combobox with Add New Button */}
            {!isNewCustomer && (
              <div className="flex gap-2">
                <div className="flex-1">
                  <CustomerCombobox
                    value={selectedCustomer}
                    onChange={handleCustomerSelect}
                    customers={customerOptions}
                    onSearchChange={setCustomerSearchQuery}
                    placeholder="Search customer..."
                    hasError={!!errors.customerName && !selectedCustomer}
                  />
                </div>
                {!selectedCustomer && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleNewCustomer}
                    className="shrink-0"
                    title="Add new customer"
                  >
                    <UserPlus className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
            {errors.customerName && !isNewCustomer && !selectedCustomer && (
              <p className="text-xs text-destructive">{errors.customerName.message}</p>
            )}
          </div>

          {/* Services Section */}
          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Scissors className="h-4 w-4 text-muted-foreground" />
              Services
            </Label>

            {/* Service Combobox */}
            {servicesLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <ServiceCombobox
                value={selectedServices}
                onChange={(serviceIds) => {
                  setSelectedServices(serviceIds);
                  setValue('serviceIds', serviceIds);
                }}
                services={services.map((s) => ({
                  id: s.id,
                  name: s.name,
                  basePrice: s.basePrice,
                  categoryId: s.categoryId,
                  categoryName: s.category?.name,
                  duration: s.durationMinutes,
                }))}
                hasError={!!errors.serviceIds}
                showTotal={true}
              />
            )}
            {errors.serviceIds && (
              <p className="text-xs text-destructive">{errors.serviceIds.message}</p>
            )}
          </div>

          {/* Stylist Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                Stylist
              </Label>
              {/* Assign Later Toggle - disabled for walk-in */}
              {watchedBookingType !== 'walk_in' && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-sm text-muted-foreground">Assign Later</span>
                  <Switch
                    checked={watchedAssignLater}
                    onCheckedChange={(checked) => {
                      setValue('assignLater', checked);
                      if (checked) {
                        setValue('stylistId', '');
                      }
                    }}
                  />
                </label>
              )}
            </div>

            {/* Assign Later Info */}
            {watchedAssignLater && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-dashed">
                <UserX className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm font-medium">No stylist assigned</p>
                  <p className="text-xs text-muted-foreground">
                    Stylist can be assigned later from the unassigned appointments panel
                  </p>
                </div>
              </div>
            )}

            {/* Stylist Selection - hidden when assignLater is true */}
            {!watchedAssignLater && (
              <>
                {staffLoading ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <Select
                    value={watchedStylistId || ''}
                    onValueChange={(value) => setValue('stylistId', value)}
                  >
                    <SelectTrigger
                      className={cn(errors.stylistId && !watchedStylistId && 'border-destructive')}
                    >
                      <SelectValue placeholder="Select a stylist..." />
                    </SelectTrigger>
                    <SelectContent>
                      {stylists.map((stylist) => (
                        <SelectItem key={stylist.userId} value={stylist.userId}>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-xs">
                                {(stylist.user?.name || 'U').charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span>{stylist.user?.name || 'Unknown'}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {errors.stylistId && (
                  <p className="text-xs text-destructive">{errors.stylistId.message}</p>
                )}
              </>
            )}
            {errors.assignLater && (
              <p className="text-xs text-destructive">{errors.assignLater.message}</p>
            )}
          </div>

          {/* Date & Time Section */}
          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              Date & Time
            </Label>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <DatePicker
                  value={watchedDate ? new Date(watchedDate) : undefined}
                  onChange={(date) => setValue('date', date ? format(date, 'yyyy-MM-dd') : '')}
                  placeholder="Select date"
                />
                {errors.date && (
                  <p className="text-xs text-destructive mt-1">{errors.date.message}</p>
                )}
              </div>
              <div>
                <TimeSlotPicker
                  value={watchedTime || ''}
                  onChange={(time) => setValue('time', time)}
                  placeholder="Select time"
                  startHour={branchWorkingHours.startHour}
                  endHour={branchWorkingHours.endHour}
                  hasError={!!errors.time}
                  busySlots={busySlotsData?.busySlots}
                  isLoadingBusySlots={busySlotsLoading}
                  appointmentDuration={totalDuration}
                />
                {errors.time && (
                  <p className="text-xs text-destructive mt-1">{errors.time.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Booking Type */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Booking Type</Label>
            <ToggleGroup
              type="single"
              value={watchedBookingType}
              onValueChange={(value) => {
                if (value) setValue('bookingType', value as 'phone' | 'walk_in' | 'online');
              }}
              className="justify-start"
            >
              <ToggleGroupItem value="phone" aria-label="Phone booking" className="gap-2">
                <Phone className="h-4 w-4" />
                Phone
              </ToggleGroupItem>
              <ToggleGroupItem value="walk_in" aria-label="Walk-in" className="gap-2">
                <Footprints className="h-4 w-4" />
                Walk-in
              </ToggleGroupItem>
              <ToggleGroupItem value="online" aria-label="Online booking" className="gap-2">
                <Globe className="h-4 w-4" />
                Online
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          {/* Notes */}
          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Notes
              <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Textarea
              placeholder="Add any special instructions..."
              {...register('notes')}
              rows={2}
              className="resize-none"
            />
          </div>
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t p-4 flex gap-3 bg-background">
        <Button type="button" variant="outline" className="flex-1" onClick={() => closePanel()}>
          Cancel
        </Button>
        <Button type="submit" className="flex-1" disabled={createMutation.isPending}>
          {createMutation.isPending ? (
            'Creating...'
          ) : (
            <>
              <Plus className="mr-2 h-4 w-4" />
              Create Appointment
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
