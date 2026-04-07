'use client';

/**
 * Station Form Panel
 * SlideOver panel for creating/editing stations
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
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateStation, useUpdateStation, useStationTypes } from '@/hooks/queries/use-stations';
import type { Station } from '@/types/stations';

const stationFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  stationTypeId: z.string().uuid('Please select a station type'),
  displayOrder: z.coerce.number().int().min(0).default(0),
  notes: z.string().max(500).optional(),
});

type StationFormValues = z.infer<typeof stationFormSchema>;

interface StationFormPanelProps {
  branchId: string;
  station: Station | null;
  open: boolean;
  onClose: () => void;
}

export function StationFormPanel({ branchId, station, open, onClose }: StationFormPanelProps) {
  const { data: stationTypes } = useStationTypes();
  const createMutation = useCreateStation(branchId);
  const updateMutation = useUpdateStation(branchId);
  const isEditing = !!station;

  const form = useForm<StationFormValues>({
    resolver: zodResolver(stationFormSchema),
    defaultValues: {
      name: '',
      stationTypeId: '',
      displayOrder: 0,
      notes: '',
    },
  });

  useEffect(() => {
    if (station) {
      form.reset({
        name: station.name,
        stationTypeId: station.stationTypeId,
        displayOrder: station.displayOrder,
        notes: station.notes || '',
      });
    } else {
      form.reset({
        name: '',
        stationTypeId: stationTypes?.[0]?.id || '',
        displayOrder: 0,
        notes: '',
      });
    }
  }, [station, stationTypes, form]);

  const onSubmit = async (data: StationFormValues) => {
    try {
      if (isEditing) {
        await updateMutation.mutateAsync({
          id: station.id,
          data: {
            name: data.name,
            stationTypeId: data.stationTypeId,
            displayOrder: data.displayOrder,
            notes: data.notes || undefined,
          },
        });
        toast.success('Station updated');
      } else {
        await createMutation.mutateAsync({
          name: data.name,
          stationTypeId: data.stationTypeId,
          displayOrder: data.displayOrder,
          notes: data.notes || undefined,
        });
        toast.success('Station created');
      }
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save station');
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent className="sm:max-w-md p-6">
        <SheetHeader className="mb-4">
          <SheetTitle>{isEditing ? 'Edit Station' : 'New Station'}</SheetTitle>
          <SheetDescription>
            {isEditing ? 'Update station details' : 'Add a new workstation to this branch'}
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
                    <Input placeholder="e.g., Chair 1" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="stationTypeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Station Type *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {stationTypes?.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          <div className="flex items-center gap-2">
                            <div
                              className="h-3 w-3 rounded"
                              style={{ backgroundColor: type.color }}
                            />
                            {type.name}
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
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Optional notes about this station" {...field} />
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
