'use client';

/**
 * Edit Services Dialog
 *
 * Dialog for editing services on an appointment before it starts.
 * Uses ServiceCombobox for multi-select service selection.
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { Scissors, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ServiceCombobox } from '@/components/common';
import { Skeleton } from '@/components/ui/skeleton';
import { useUpdateAppointmentServices } from '@/hooks/queries/use-appointments';
import { useServices } from '@/hooks/queries/use-services';
import type { Appointment } from '@/types/appointments';

interface EditServicesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: Appointment;
  onSuccess?: () => void;
  canEdit: boolean;
}

export function EditServicesDialog({
  open,
  onOpenChange,
  appointment,
  onSuccess,
  canEdit,
}: EditServicesDialogProps) {
  const updateServicesMutation = useUpdateAppointmentServices();
  const { data: servicesData, isLoading: servicesLoading } = useServices({});

  // Track selected service IDs
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);

  // Initialize with current appointment services when dialog opens
  useEffect(() => {
    if (open && appointment.services) {
      setSelectedServiceIds(appointment.services.map((s) => s.serviceId));
    }
  }, [open, appointment.services]);

  // Map services for the combobox
  const serviceOptions = useMemo(() => {
    if (!servicesData?.data) return [];
    return servicesData.data.map((s) => ({
      id: s.id,
      name: s.name,
      basePrice: s.basePrice,
      categoryId: s.categoryId,
      categoryName: s.category?.name,
      duration: s.durationMinutes,
    }));
  }, [servicesData?.data]);

  // Calculate new total
  const newTotal = useMemo(() => {
    if (!servicesData?.data) return 0;
    return selectedServiceIds.reduce((total, serviceId) => {
      const service = servicesData.data.find((s) => s.id === serviceId);
      return total + (service?.basePrice || 0);
    }, 0);
  }, [selectedServiceIds, servicesData?.data]);

  // Check if services have changed
  const hasChanges = useMemo(() => {
    const currentIds = appointment.services?.map((s) => s.serviceId).sort() || [];
    const newIds = [...selectedServiceIds].sort();
    return JSON.stringify(currentIds) !== JSON.stringify(newIds);
  }, [appointment.services, selectedServiceIds]);

  const handleSave = useCallback(async () => {
    if (selectedServiceIds.length === 0) return;

    try {
      await updateServicesMutation.mutateAsync({
        id: appointment.id,
        services: selectedServiceIds.map((serviceId) => ({
          serviceId,
          stylistId: appointment.stylistId || undefined,
        })),
      });
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Failed to update services:', error);
    }
  }, [
    appointment.id,
    appointment.stylistId,
    selectedServiceIds,
    updateServicesMutation,
    onOpenChange,
    onSuccess,
  ]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scissors className="h-5 w-5" />
            Edit Services
          </DialogTitle>
          <DialogDescription>
            {canEdit
              ? 'Add or remove services for this appointment. Prices will be recalculated.'
              : 'Services cannot be edited after the appointment has started.'}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {!canEdit ? (
            <div className="text-center py-6 text-muted-foreground">
              <Scissors className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Services can only be edited before the appointment starts.</p>
            </div>
          ) : servicesLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : (
            <>
              <ServiceCombobox
                value={selectedServiceIds}
                onChange={setSelectedServiceIds}
                services={serviceOptions}
                hasError={selectedServiceIds.length === 0}
                showTotal={true}
              />

              {selectedServiceIds.length === 0 && (
                <p className="text-sm text-destructive">At least one service is required</p>
              )}

              {/* Price comparison */}
              {hasChanges && (
                <div className="p-3 rounded-lg bg-muted/50 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Current total:</span>
                    <span className="line-through">
                      ₹{appointment.totalAmount?.toLocaleString('en-IN') || 0}
                    </span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span>New total:</span>
                    <span>₹{newTotal.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={updateServicesMutation.isPending}
          >
            Cancel
          </Button>
          {canEdit && (
            <Button
              type="button"
              onClick={handleSave}
              disabled={
                updateServicesMutation.isPending || selectedServiceIds.length === 0 || !hasChanges
              }
            >
              {updateServicesMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
