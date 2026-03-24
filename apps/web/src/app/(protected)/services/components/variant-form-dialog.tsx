'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
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

import type { ServiceVariant, CreateVariantInput } from '@/types/services';

// Validation schema
const variantFormSchema = z
  .object({
    name: z
      .string()
      .min(1, 'Variant name is required')
      .max(100, 'Variant name must be 100 characters or less'),
    priceAdjustmentType: z.enum(['absolute', 'percentage']),
    priceAdjustment: z.coerce
      .number({ invalid_type_error: 'Price adjustment must be a number' })
      .refine((val) => !isNaN(val), 'Price adjustment is required'),
    durationAdjustment: z.coerce
      .number({ invalid_type_error: 'Duration must be a number' })
      .int('Duration must be a whole number')
      .default(0),
    isActive: z.boolean().default(true),
  })
  .refine(
    (data) => {
      // For percentage type, validate range
      if (data.priceAdjustmentType === 'percentage') {
        return data.priceAdjustment >= -100 && data.priceAdjustment <= 500;
      }
      return true;
    },
    {
      message: 'Percentage must be between -100% and 500%',
      path: ['priceAdjustment'],
    }
  );

type VariantFormValues = z.infer<typeof variantFormSchema>;

interface VariantFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variant?: ServiceVariant | null;
  onSubmit: (data: CreateVariantInput) => Promise<void>;
  isLoading?: boolean;
}

export function VariantFormDialog({
  open,
  onOpenChange,
  variant,
  onSubmit,
  isLoading = false,
}: VariantFormDialogProps) {
  const isEditing = !!variant;

  const form = useForm<VariantFormValues>({
    resolver: zodResolver(variantFormSchema),
    defaultValues: {
      name: '',
      priceAdjustmentType: 'absolute',
      priceAdjustment: 0,
      durationAdjustment: 0,
      isActive: true,
    },
  });

  // Reset form when dialog opens/closes or variant changes
  useEffect(() => {
    if (open) {
      if (variant) {
        form.reset({
          name: variant.name,
          priceAdjustmentType: variant.priceAdjustmentType,
          priceAdjustment: variant.priceAdjustment,
          durationAdjustment: variant.durationAdjustment,
          isActive: variant.isActive,
        });
      } else {
        form.reset({
          name: '',
          priceAdjustmentType: 'absolute',
          priceAdjustment: 0,
          durationAdjustment: 0,
          isActive: true,
        });
      }
    }
  }, [open, variant, form]);

  const handleSubmit = async (values: VariantFormValues) => {
    await onSubmit(values);
  };

  const priceAdjustmentType = form.watch('priceAdjustmentType');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Variant' : 'Add Variant'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the variant details below.'
              : 'Add a new variant option for this service (e.g., Short Hair, Medium Hair, Long Hair).'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Variant Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Short Hair, Medium, Large" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="priceAdjustmentType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Adjustment Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="absolute">Absolute (₹)</SelectItem>
                        <SelectItem value="percentage">Percentage (%)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="priceAdjustment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Price Adjustment {priceAdjustmentType === 'percentage' ? '(%)' : '(₹)'}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step={priceAdjustmentType === 'percentage' ? '1' : '0.01'}
                        placeholder="0"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription className="text-xs">Use negative for discount</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="durationAdjustment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Duration Adjustment (minutes)</FormLabel>
                  <FormControl>
                    <Input type="number" step="1" placeholder="0" {...field} />
                  </FormControl>
                  <FormDescription className="text-xs">
                    Additional time needed. Use negative to reduce duration.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="font-normal">Active</FormLabel>
                    <FormDescription className="text-xs">
                      Inactive variants won&apos;t be available for selection
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Variant'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
