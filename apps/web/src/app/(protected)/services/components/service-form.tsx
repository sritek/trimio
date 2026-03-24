'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

import { useCategories } from '@/hooks/queries/use-categories';
import { useCreateService, useUpdateService } from '@/hooks/queries/use-services';
import { useErrorHandler } from '@/hooks/use-error-handler';

import { FormActions } from '@/components/common';
import { CurrencyInput } from '@/components/common/currency-input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormDescription,
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
import { Card, CardContent } from '@/components/ui/card';

import type { Service } from '@/types/services';

const serviceFormSchema = z
  .object({
    categoryId: z.string().min(1, 'Category is required'),
    name: z
      .string()
      .min(2, 'Name must be at least 2 characters')
      .max(255, 'Name must be at most 255 characters'),
    description: z.string().max(1000, 'Description must be at most 1000 characters').optional(),
    basePrice: z.coerce
      .number({ invalid_type_error: 'Price is required' })
      .positive('Price must be greater than 0'),
    taxRate: z.coerce
      .number()
      .min(0, 'Tax rate cannot be negative')
      .max(100, 'Tax rate cannot exceed 100%')
      .default(18),
    isTaxInclusive: z.boolean().default(false),
    durationMinutes: z.coerce
      .number({ invalid_type_error: 'Duration is required' })
      .int('Duration must be a whole number')
      .min(5, 'Duration must be at least 5 minutes')
      .max(480, 'Duration cannot exceed 8 hours'),
    activeTimeMinutes: z.coerce
      .number({ invalid_type_error: 'Active time is required' })
      .int('Active time must be a whole number')
      .min(5, 'Active time must be at least 5 minutes'),
    processingTimeMinutes: z.coerce
      .number()
      .int('Processing time must be a whole number')
      .min(0, 'Processing time cannot be negative')
      .default(0),
    genderApplicable: z.enum(['all', 'male', 'female']).default('all'),
    commissionType: z.enum(['percentage', 'fixed']).default('percentage'),
    commissionValue: z.coerce.number().min(0, 'Commission cannot be negative').default(0),
    isActive: z.boolean().default(true),
  })
  .refine((data) => data.activeTimeMinutes + data.processingTimeMinutes === data.durationMinutes, {
    message: 'Active time + Processing time must equal Total duration',
    path: ['durationMinutes'],
  })
  .refine((data) => data.commissionType !== 'percentage' || data.commissionValue <= 100, {
    message: 'Commission percentage cannot exceed 100%',
    path: ['commissionValue'],
  });

type ServiceFormValues = z.infer<typeof serviceFormSchema>;

interface ServiceFormProps {
  service?: Service;
  onSuccess?: () => void;
}

export function ServiceForm({ service, onSuccess }: ServiceFormProps) {
  const router = useRouter();
  const { data: categories, isLoading: categoriesLoading } = useCategories({
    flat: true,
  });
  const createService = useCreateService();
  const updateService = useUpdateService();
  const { handleError } = useErrorHandler();

  const isEditing = !!service;

  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: {
      categoryId: service?.categoryId || '',
      name: service?.name || '',
      description: service?.description || '',
      basePrice: service?.basePrice || 0,
      taxRate: service?.taxRate || 18,
      isTaxInclusive: service?.isTaxInclusive || false,
      durationMinutes: service?.durationMinutes || 30,
      activeTimeMinutes: service?.activeTimeMinutes || 30,
      processingTimeMinutes: service?.processingTimeMinutes || 0,
      genderApplicable: service?.genderApplicable || 'all',
      commissionType: service?.commissionType || 'percentage',
      commissionValue: service?.commissionValue || 0,
      isActive: service?.isActive ?? true,
    },
  });

  const onSubmit = async (data: ServiceFormValues) => {
    try {
      if (isEditing && service) {
        await updateService.mutateAsync({ id: service.id, data });
        toast.success('Service updated successfully');
      } else {
        await createService.mutateAsync(data);
        toast.success('Service created successfully');
      }
      onSuccess?.();
      router.push('/services');
    } catch (error) {
      handleError(error, {
        customMessage: isEditing
          ? 'Failed to update service. Please try again.'
          : 'Failed to create service. Please try again.',
      });
    }
  };

  const isPending = createService.isPending || updateService.isPending;
  const commissionType = form.watch('commissionType');

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={categoriesLoading}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories?.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            <div className="flex items-center gap-2">
                              <div
                                className="h-2 w-2 rounded-full"
                                style={{ backgroundColor: cat.color }}
                              />
                              {cat.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="lg:col-span-2">
                    <FormLabel>Service Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Haircut - Men" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="genderApplicable"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Applicable For</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="all">All Customers</SelectItem>
                        <SelectItem value="male">Male Only</SelectItem>
                        <SelectItem value="female">Female Only</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Brief description of the service..."
                        className="resize-none h-20"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Show SKU as read-only when editing */}
            {isEditing && service?.sku && (
              <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                <span>SKU:</span>
                <code className="rounded bg-muted px-2 py-0.5 font-mono">{service.sku}</code>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pricing & Duration - Side by Side */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Pricing */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-sm font-medium mb-4">Pricing</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="basePrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Base Price *</FormLabel>
                      <FormControl>
                        <CurrencyInput
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="0"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="taxRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tax Rate (%)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          step={0.5}
                          value={field.value}
                          onChange={(e) => field.onChange(e.target.value)}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isTaxInclusive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-end space-x-3 space-y-0 pb-2">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormLabel className="font-normal">Price includes tax</FormLabel>
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Duration */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-sm font-medium mb-4">Duration</h3>
              <div className="grid gap-4 sm:grid-cols-3">
                <FormField
                  control={form.control}
                  name="durationMinutes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total (min) *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          value={field.value}
                          onChange={(e) => field.onChange(e.target.value)}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                        />
                      </FormControl>
                      <FormDescription className="text-xs">Total service time</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="activeTimeMinutes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Active (min) *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          value={field.value}
                          onChange={(e) => field.onChange(e.target.value)}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                        />
                      </FormControl>
                      <FormDescription className="text-xs">Stylist working time</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="processingTimeMinutes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Processing (min)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          value={field.value}
                          onChange={(e) => field.onChange(e.target.value)}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                        />
                      </FormControl>
                      <FormDescription className="text-xs">Color/treatment wait</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Commission & Settings - Side by Side */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Commission */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-sm font-medium mb-1">Service Commission</h3>
              <p className="text-xs text-muted-foreground mb-4">
                This rate takes priority over staff&apos;s default commission
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="commissionType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="percentage">Percentage</SelectItem>
                          <SelectItem value="fixed">Fixed Amount</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="commissionValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Value {commissionType === 'percentage' ? '(%)' : '(₹)'}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          step={commissionType === 'percentage' ? 1 : 0.5}
                          value={field.value}
                          onChange={(e) => field.onChange(e.target.value)}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        Set to 0 to use staff&apos;s default rate
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Settings */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-sm font-medium mb-4">Settings</h3>
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Active Service</FormLabel>
                      <FormDescription>
                        Show this service in listings and allow bookings
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <FormActions>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending
              ? isEditing
                ? 'Saving...'
                : 'Creating...'
              : isEditing
                ? 'Save Changes'
                : 'Create Service'}
          </Button>
        </FormActions>
      </form>
    </Form>
  );
}
