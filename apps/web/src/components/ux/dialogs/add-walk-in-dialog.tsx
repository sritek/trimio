'use client';

/**
 * Add Walk-In Dialog
 *
 * Dialog for adding a customer to the walk-in queue.
 * Follows the same customer selection pattern as NewAppointmentPanel.
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User, Scissors, X, UserPlus, CheckCircle2, Loader2, Users } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CustomerCombobox, ServiceCombobox, PhoneInput } from '@/components/common';
import type { CustomerOption } from '@/components/common';
import { Skeleton } from '@/components/ui/skeleton';
import { useAddToQueue } from '@/hooks/queries/use-appointments';
import { useCustomerSearch, useCustomerPhoneLookup } from '@/hooks/queries/use-customers';
import { useStaffList } from '@/hooks/queries/use-staff';
import { useBranchContext } from '@/hooks/use-branch-context';
import { useDebounce } from '@/hooks/use-debounce';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Form validation schema
const addWalkInSchema = z.object({
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
  stylistPreferenceId: z.string().optional(),
  genderPreference: z.enum(['male', 'female', 'any']).optional(),
});

type AddWalkInFormData = z.infer<typeof addWalkInSchema>;

interface AddWalkInDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (tokenNumber: number, estimatedWait: number) => void;
}

export function AddWalkInDialog({ open, onOpenChange, onSuccess }: AddWalkInDialogProps) {
  const { branchId } = useBranchContext();

  // UI State
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');

  // Fetch staff data
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

  const addToQueueMutation = useAddToQueue();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<AddWalkInFormData>({
    resolver: zodResolver(addWalkInSchema),
    defaultValues: {
      customerId: '',
      customerName: '',
      customerPhone: '',
      serviceIds: [],
      stylistPreferenceId: '',
      genderPreference: undefined,
    },
  });

  const watchedCustomerPhone = watch('customerPhone');
  const watchedStylistPreferenceId = watch('stylistPreferenceId');

  // Debounce phone number to avoid excessive API calls while typing
  const debouncedPhone = useDebounce(watchedCustomerPhone || '', 600);

  // Phone lookup - check if customer exists when typing phone in new customer mode
  const { data: phoneLookupData, isLoading: phoneLookupLoading } = useCustomerPhoneLookup(
    isNewCustomer ? debouncedPhone : ''
  );

  // When phone lookup finds existing customer, auto-fill the name
  useEffect(() => {
    if (isNewCustomer && phoneLookupData && debouncedPhone) {
      setValue('customerName', phoneLookupData.name);
      setValue('customerId', phoneLookupData.id);
    }
  }, [isNewCustomer, phoneLookupData, debouncedPhone, setValue]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      reset();
      setIsNewCustomer(false);
      setSelectedCustomer(null);
      setSelectedServices([]);
      setCustomerSearchQuery('');
    }
  }, [open, reset]);

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
    async (data: AddWalkInFormData) => {
      if (!branchId) {
        toast.error('Branch not selected');
        return;
      }

      try {
        const result = await addToQueueMutation.mutateAsync({
          branchId,
          customerId: data.customerId || undefined,
          customerName: data.customerName,
          customerPhone: data.customerPhone || undefined,
          serviceIds: data.serviceIds,
          stylistPreferenceId: data.stylistPreferenceId || undefined,
          genderPreference: data.genderPreference,
        });

        toast.success(`Added to queue - Token #${result.tokenNumber}`);

        if (onSuccess) {
          onSuccess(result.tokenNumber, result.estimatedWaitMinutes);
        }

        onOpenChange(false);
      } catch {
        toast.error('Failed to add to queue');
      }
    },
    [branchId, addToQueueMutation, onOpenChange, onSuccess]
  );

  const stylists = staffData?.data || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Add Walk-In
          </DialogTitle>
          <DialogDescription>Add a customer to the walk-in queue</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
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

            <ServiceCombobox
              value={selectedServices}
              onChange={(serviceIds) => {
                setSelectedServices(serviceIds);
                setValue('serviceIds', serviceIds);
              }}
              hasError={!!errors.serviceIds}
              showTotal={true}
            />
            {errors.serviceIds && (
              <p className="text-xs text-destructive">{errors.serviceIds.message}</p>
            )}
          </div>

          {/* Stylist Preference (Optional) */}
          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              Stylist Preference
              <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>

            {staffLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Select
                value={watchedStylistPreferenceId || 'any'}
                onValueChange={(value) =>
                  setValue('stylistPreferenceId', value === 'any' ? '' : value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Any available stylist" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any available stylist</SelectItem>
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
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={addToQueueMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={addToQueueMutation.isPending}>
              {addToQueueMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add to Queue'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
