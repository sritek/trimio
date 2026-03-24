'use client';

/**
 * Branch Edit Panel
 * SlideOver panel for editing branch details including working hours
 */

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Clock, Building2 } from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  WorkingHoursEditor,
  DEFAULT_WORKING_HOURS,
  type WeeklyWorkingHours,
} from '@/components/common';
import { useUpdateBranch, type Branch } from '@/hooks/queries/use-branches';

const branchFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(255),
  address: z.string().optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(100).optional().nullable(),
  pincode: z.string().max(10).optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  email: z.string().email('Invalid email').optional().nullable().or(z.literal('')),
  gstin: z.string().max(20).optional().nullable(),
});

type BranchFormValues = z.infer<typeof branchFormSchema>;

interface BranchEditPanelProps {
  branch: Branch | null;
  open: boolean;
  onClose: () => void;
}

// Convert API working hours format to editor format
function toEditorFormat(
  apiHours:
    | Record<string, { isOpen: boolean; open?: string | null; close?: string | null }>
    | undefined
): WeeklyWorkingHours {
  if (!apiHours) return DEFAULT_WORKING_HOURS;

  const result = { ...DEFAULT_WORKING_HOURS };
  const days = [
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday',
  ] as const;

  for (const day of days) {
    const dayData = apiHours[day];
    if (dayData) {
      result[day] = {
        isOpen: dayData.isOpen ?? true,
        openTime: dayData.open || '09:00',
        closeTime: dayData.close || '21:00',
      };
    }
  }

  return result;
}

// Convert editor format to API format
function toApiFormat(
  editorHours: WeeklyWorkingHours
): Record<string, { isOpen: boolean; open: string | null; close: string | null }> {
  const result: Record<string, { isOpen: boolean; open: string | null; close: string | null }> = {};
  const days = [
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday',
  ] as const;

  for (const day of days) {
    const dayData = editorHours[day];
    result[day] = {
      isOpen: dayData.isOpen,
      open: dayData.isOpen ? dayData.openTime : null,
      close: dayData.isOpen ? dayData.closeTime : null,
    };
  }

  return result;
}

export function BranchEditPanel({ branch, open, onClose }: BranchEditPanelProps) {
  const updateBranch = useUpdateBranch();
  const [workingHours, setWorkingHours] = useState<WeeklyWorkingHours>(DEFAULT_WORKING_HOURS);

  const form = useForm<BranchFormValues>({
    resolver: zodResolver(branchFormSchema),
    defaultValues: {
      name: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
      phone: '',
      email: '',
      gstin: '',
    },
  });

  // Reset form when branch changes
  useEffect(() => {
    if (branch) {
      form.reset({
        name: branch.name,
        address: branch.address || '',
        city: branch.city || '',
        state: branch.state || '',
        pincode: branch.pincode || '',
        phone: branch.phone || '',
        email: branch.email || '',
        gstin: branch.gstin || '',
      });
      setWorkingHours(toEditorFormat(branch.workingHours));
    }
  }, [branch, form]);

  const onSubmit = async (data: BranchFormValues) => {
    if (!branch) return;

    try {
      await updateBranch.mutateAsync({
        id: branch.id,
        data: {
          name: data.name,
          address: data.address || null,
          city: data.city || null,
          state: data.state || null,
          pincode: data.pincode || null,
          phone: data.phone || null,
          email: data.email || null,
          gstin: data.gstin || null,
          workingHours: toApiFormat(workingHours),
        },
      });
      toast.success('Branch updated successfully');
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update branch');
    }
  };

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent className="p-4 sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Edit Branch</SheetTitle>
          <SheetDescription>Update branch information and working hours</SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="details" className="mt-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Details
            </TabsTrigger>
            <TabsTrigger value="hours" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Working Hours
            </TabsTrigger>
          </TabsList>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <TabsContent value="details" className="space-y-4 mt-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Branch Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter branch name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter address"
                          {...field}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input placeholder="City" {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State</FormLabel>
                        <FormControl>
                          <Input placeholder="State" {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="pincode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pincode</FormLabel>
                      <FormControl>
                        <Input placeholder="Pincode" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="Phone number" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="Email address"
                          {...field}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="gstin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>GSTIN</FormLabel>
                      <FormControl>
                        <Input placeholder="GST Number" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="hours" className="mt-4">
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Set the operating hours for each day of the week. These hours are used for
                    appointment scheduling and availability.
                  </p>
                  <WorkingHoursEditor value={workingHours} onChange={setWorkingHours} compact />
                </div>
              </TabsContent>

              <div className="flex gap-2 pt-6">
                <Button type="submit" disabled={updateBranch.isPending}>
                  {updateBranch.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
