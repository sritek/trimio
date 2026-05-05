'use client';

/**
 * Station Type Form Panel
 * SlideOver panel for creating/editing station types
 */

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useCreateStationType, useUpdateStationType } from '@/hooks/queries/use-stations';
import type { StationType } from '@/types/stations';

const stationTypeFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format'),
  displayOrder: z.coerce.number().int().min(0).default(0),
});

type StationTypeFormValues = z.infer<typeof stationTypeFormSchema>;

interface StationTypeFormPanelProps {
  stationType: StationType | null;
  open: boolean;
  onClose: () => void;
}

export function StationTypeFormPanel({ stationType, open, onClose }: StationTypeFormPanelProps) {
  const createMutation = useCreateStationType();
  const updateMutation = useUpdateStationType();
  const isEditing = !!stationType;

  const form = useForm<StationTypeFormValues>({
    resolver: zodResolver(stationTypeFormSchema),
    defaultValues: {
      name: '',
      color: '#6B7280',
      displayOrder: 0,
    },
  });

  useEffect(() => {
    if (stationType) {
      form.reset({
        name: stationType.name,
        color: stationType.color,
        displayOrder: stationType.displayOrder,
      });
    } else {
      form.reset({
        name: '',
        color: '#6B7280',
        displayOrder: 0,
      });
    }
  }, [stationType, form]);

  const onSubmit = async (data: StationTypeFormValues) => {
    try {
      if (isEditing) {
        await updateMutation.mutateAsync({
          id: stationType.id,
          data: {
            name: data.name,
            color: data.color,
            displayOrder: data.displayOrder,
          },
        });
        toast.success('Station type updated');
      } else {
        await createMutation.mutateAsync({
          name: data.name,
          color: data.color,
          displayOrder: data.displayOrder,
        });
        toast.success('Station type created');
        form.reset()
      }
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save station type');
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent className="sm:max-w-md p-6">
        <SheetHeader className="mb-4">
          <SheetTitle>{isEditing ? 'Edit Station Type' : 'New Station Type'}</SheetTitle>
          <SheetDescription>
            {isEditing ? 'Update station type details' : 'Create a new station type for your salon'}
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Styling Chair" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Color</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-2">
                      <Input type="color" className="w-12 h-10 p-1" {...field} />
                      <Input placeholder="#6B7280" {...field} className="flex-1" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-2 pt-4">
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? 'Save Changes' : 'Create'}
              </Button>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
