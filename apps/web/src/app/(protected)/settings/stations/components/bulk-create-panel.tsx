'use client';

/**
 * Bulk Create Stations Panel
 * SlideOver panel for bulk creating stations by type
 */

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Plus, Trash2 } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useBulkCreateStations, useStationTypes } from '@/hooks/queries/use-stations';

const bulkCreateSchema = z.object({
  stations: z
    .array(
      z.object({
        stationTypeId: z.string().uuid('Please select a station type'),
        count: z.coerce.number().int().min(1).max(50),
      })
    )
    .min(1, 'Add at least one station type'),
});

type BulkCreateFormValues = z.infer<typeof bulkCreateSchema>;

interface BulkCreatePanelProps {
  branchId: string;
  open: boolean;
  onClose: () => void;
}

export function BulkCreatePanel({ branchId, open, onClose }: BulkCreatePanelProps) {
  const { data: stationTypes } = useStationTypes();
  const bulkCreateMutation = useBulkCreateStations(branchId);

  const form = useForm<BulkCreateFormValues>({
    resolver: zodResolver(bulkCreateSchema),
    defaultValues: {
      stations: [{ stationTypeId: '', count: 1 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'stations',
  });

  const onSubmit = async (data: BulkCreateFormValues) => {
    try {
      const result = await bulkCreateMutation.mutateAsync(data);
      toast.success(`Created ${result.length} stations`);
      form.reset({ stations: [{ stationTypeId: '', count: 1 }] });
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create stations');
    }
  };

  const handleClose = () => {
    form.reset({ stations: [{ stationTypeId: '', count: 1 }] });
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <SheetContent className="sm:max-w-md p-6">
        <SheetHeader className="mb-4">
          <SheetTitle>Bulk Create Stations</SheetTitle>
          <SheetDescription>
            Quickly create multiple stations by type. Names will be auto-generated.
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {fields.map((field, index) => (
              <div key={field.id} className="flex items-end gap-2">
                <FormField
                  control={form.control}
                  name={`stations.${index}.stationTypeId`}
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      {index === 0 && <FormLabel>Station Type</FormLabel>}
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
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
                  name={`stations.${index}.count`}
                  render={({ field }) => (
                    <FormItem className="w-20">
                      {index === 0 && <FormLabel>Count</FormLabel>}
                      <FormControl>
                        <Input type="number" min={1} max={50} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {fields.length > 1 && (
                  <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ stationTypeId: '', count: 1 })}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Another Type
            </Button>

            <div className="flex gap-2 pt-4">
              <Button type="submit" disabled={bulkCreateMutation.isPending}>
                {bulkCreateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Stations
              </Button>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
