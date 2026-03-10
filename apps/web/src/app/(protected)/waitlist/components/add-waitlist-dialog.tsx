'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, addDays } from 'date-fns';
import { CalendarIcon, Loader2, Search } from 'lucide-react';
import { toast } from 'sonner';

import { useCustomerSearch } from '@/hooks/queries/use-customers';
import { useServices } from '@/hooks/queries/use-services';
import { useStaffList } from '@/hooks/queries/use-staff';
import { useCreateWaitlistEntry } from '@/hooks/queries/use-waitlist';
import { useDebounce } from '@/hooks/use-debounce';
import { useBranchContext } from '@/hooks/use-branch-context';
import { cn } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

import type { TimePeriod } from '@/types/waitlist';
import type { Customer } from '@/types/customers';

// ============================================
// Schema
// ============================================

const formSchema = z
  .object({
    customerId: z.string().optional(),
    customerName: z.string().min(1, 'Customer name is required'),
    customerPhone: z
      .string()
      .regex(/^[6-9]\d{9}$/, 'Invalid phone number')
      .optional()
      .or(z.literal('')),
    serviceIds: z.array(z.string()).min(1, 'At least one service is required'),
    preferredStylistId: z.string().optional(),
    preferredStartDate: z.date({ required_error: 'Start date is required' }),
    preferredEndDate: z.date({ required_error: 'End date is required' }),
    timePreferences: z
      .array(z.enum(['morning', 'afternoon', 'evening']))
      .min(1, 'Select at least one time preference'),
    notes: z.string().optional(),
  })
  .refine((data) => data.preferredEndDate >= data.preferredStartDate, {
    message: 'End date must be on or after start date',
    path: ['preferredEndDate'],
  });

type FormValues = z.infer<typeof formSchema>;

// ============================================
// Types
// ============================================

interface AddWaitlistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TIME_PERIODS: { value: TimePeriod; label: string; range: string }[] = [
  { value: 'morning', label: 'Morning', range: '9:00 AM - 12:00 PM' },
  { value: 'afternoon', label: 'Afternoon', range: '12:00 PM - 5:00 PM' },
  { value: 'evening', label: 'Evening', range: '5:00 PM - 9:00 PM' },
];

// ============================================
// Component
// ============================================

export function AddWaitlistDialog({ open, onOpenChange }: AddWaitlistDialogProps) {
  const { branchId: activeBranchId } = useBranchContext();
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const debouncedSearch = useDebounce(customerSearch, 300);

  const createWaitlistEntry = useCreateWaitlistEntry();
  const { data: customers } = useCustomerSearch({ q: debouncedSearch, limit: 5 });
  const { data: servicesData } = useServices({ limit: 100 });
  const { data: staffData } = useStaffList({ role: 'stylist', limit: 50 });

  const services = servicesData?.data || [];
  const stylists = staffData?.data || [];

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customerName: '',
      customerPhone: '',
      serviceIds: [],
      timePreferences: [],
      preferredStartDate: new Date(),
      preferredEndDate: addDays(new Date(), 7),
      notes: '',
    },
  });

  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer);
    form.setValue('customerId', customer.id);
    form.setValue('customerName', customer.name);
    form.setValue('customerPhone', customer.phone || '');
    setCustomerSearch('');
  };

  const handleSubmit = async (values: FormValues) => {
    if (!activeBranchId) {
      toast.error('No branch selected');
      return;
    }

    try {
      await createWaitlistEntry.mutateAsync({
        branchId: activeBranchId,
        customerId: values.customerId,
        customerName: values.customerName,
        customerPhone: values.customerPhone || undefined,
        serviceIds: values.serviceIds,
        preferredStylistId: values.preferredStylistId || undefined,
        preferredStartDate: format(values.preferredStartDate, 'yyyy-MM-dd'),
        preferredEndDate: format(values.preferredEndDate, 'yyyy-MM-dd'),
        timePreferences: values.timePreferences,
        notes: values.notes || undefined,
      });
      toast.success('Customer added to waitlist');
      onOpenChange(false);
      form.reset();
      setSelectedCustomer(null);
    } catch {
      toast.error('Failed to add to waitlist');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add to Waitlist</DialogTitle>
          <DialogDescription>
            Add a customer to the waitlist. They will be contacted when a matching slot opens.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Customer Search */}
            <div className="space-y-2">
              <FormLabel>Search Customer</FormLabel>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name or phone..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              {customers && customers.length > 0 && customerSearch && (
                <div className="border rounded-md divide-y">
                  {customers.map((customer) => (
                    <button
                      key={customer.id}
                      type="button"
                      className="w-full px-3 py-2 text-left hover:bg-muted text-sm"
                      onClick={() => handleCustomerSelect(customer)}
                    >
                      <div className="font-medium">{customer.name}</div>
                      <div className="text-muted-foreground">{customer.phone}</div>
                    </button>
                  ))}
                </div>
              )}
              {selectedCustomer && (
                <div className="text-sm text-muted-foreground">
                  Selected: {selectedCustomer.name} ({selectedCustomer.phone})
                </div>
              )}
            </div>

            {/* Customer Name */}
            <FormField
              control={form.control}
              name="customerName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Customer Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter customer name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Customer Phone */}
            <FormField
              control={form.control}
              name="customerPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <Input placeholder="10-digit mobile number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Services */}
            <FormField
              control={form.control}
              name="serviceIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Services *</FormLabel>
                  <div className="border rounded-md p-3 max-h-32 overflow-y-auto space-y-2">
                    {services.map((service) => (
                      <label key={service.id} className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={field.value.includes(service.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              field.onChange([...field.value, service.id]);
                            } else {
                              field.onChange(field.value.filter((id) => id !== service.id));
                            }
                          }}
                        />
                        <span className="text-sm">{service.name}</span>
                      </label>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Preferred Stylist */}
            <FormField
              control={form.control}
              name="preferredStylistId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Preferred Stylist</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Any stylist" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {stylists.map((stylist) => (
                        <SelectItem key={stylist.userId} value={stylist.userId}>
                          {stylist.user?.name || 'Unknown'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="preferredStartDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>From Date *</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              'w-full pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? format(field.value, 'MMM d, yyyy') : 'Pick a date'}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date()}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="preferredEndDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>To Date *</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              'w-full pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? format(field.value, 'MMM d, yyyy') : 'Pick a date'}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < form.getValues('preferredStartDate')}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Time Preferences */}
            <FormField
              control={form.control}
              name="timePreferences"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Time Preferences *</FormLabel>
                  <div className="space-y-2">
                    {TIME_PERIODS.map((period) => (
                      <label key={period.value} className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={field.value.includes(period.value)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              field.onChange([...field.value, period.value]);
                            } else {
                              field.onChange(field.value.filter((v) => v !== period.value));
                            }
                          }}
                        />
                        <span className="text-sm">
                          {period.label}{' '}
                          <span className="text-muted-foreground">({period.range})</span>
                        </span>
                      </label>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Any additional notes..."
                      className="resize-none"
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createWaitlistEntry.isPending}>
                {createWaitlistEntry.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add to Waitlist
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
