'use client';

/**
 * Edit Services Dialog
 *
 * Dialog for editing services on an appointment before it starts.
 * Features:
 * - Drag-and-drop reordering
 * - Per-service stylist assignment
 * - Parallel execution toggle
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Scissors, Loader2, GripVertical, ArrowRightLeft, User, Clock, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ServiceCombobox } from '@/components/common';
import { Skeleton } from '@/components/ui/skeleton';
import { useUpdateAppointmentServices } from '@/hooks/queries/use-appointments';
import { useServices } from '@/hooks/queries/use-services';
import { useStaffList } from '@/hooks/queries/use-staff';
import { useBranchContext } from '@/hooks/use-branch-context';
import { cn } from '@/lib/utils';
import type { Appointment } from '@/types/appointments';

interface ServiceItem {
  id: string; // appointmentServiceId or temp id for new services
  serviceId: string;
  serviceName: string;
  duration: number;
  price: number;
  stylistId?: string;
  runParallel: boolean;
  isNew?: boolean;
}

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
  const { branchId } = useBranchContext();
  const updateServicesMutation = useUpdateAppointmentServices();
  const { data: servicesData, isLoading: servicesLoading } = useServices({ limit: -1 });
  const { data: staffData, isLoading: staffLoading } = useStaffList({
    branchId: branchId || '',
    role: 'stylist',
  });

  // Track ordered services with their configuration
  const [serviceItems, setServiceItems] = useState<ServiceItem[]>([]);
  const [showAddService, setShowAddService] = useState(false);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Initialize with current appointment services when dialog opens
  useEffect(() => {
    if (open && appointment.services) {
      const items: ServiceItem[] = appointment.services
        .slice()
        .sort((a, b) => (a.sequence || 0) - (b.sequence || 0))
        .map((s) => ({
          id: s.id,
          serviceId: s.serviceId,
          serviceName: s.serviceName,
          duration: s.durationMinutes,
          price: s.unitPrice,
          stylistId: s.assignedStylistId || s.assignedStylist?.id,
          runParallel: s.runParallel || false,
        }));
      setServiceItems(items);
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

  const stylists = staffData?.data || [];

  // Calculate new total
  const newTotal = useMemo(() => {
    return serviceItems.reduce((total, item) => total + item.price, 0);
  }, [serviceItems]);

  // Check if services have changed
  const hasChanges = useMemo(() => {
    const currentIds = appointment.services?.map((s) => s.serviceId).sort() || [];
    const newIds = serviceItems.map((s) => s.serviceId).sort();
    if (JSON.stringify(currentIds) !== JSON.stringify(newIds)) return true;

    // Check if order, stylists, or parallel flags changed
    for (let i = 0; i < serviceItems.length; i++) {
      const item = serviceItems[i];
      const original = appointment.services?.find((s) => s.serviceId === item.serviceId);
      if (!original) return true;
      if (original.sequence !== i + 1) return true;
      if ((original.assignedStylistId || original.assignedStylist?.id) !== item.stylistId)
        return true;
      if ((original.runParallel || false) !== item.runParallel) return true;
    }

    return false;
  }, [appointment.services, serviceItems]);

  // Handle drag end
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setServiceItems((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }, []);

  // Handle stylist change for a service
  const handleStylistChange = useCallback((itemId: string, stylistId: string) => {
    setServiceItems((items) =>
      items.map((item) => (item.id === itemId ? { ...item, stylistId } : item))
    );
  }, []);

  // Handle parallel toggle for a service
  const handleParallelChange = useCallback((itemId: string, runParallel: boolean) => {
    setServiceItems((items) =>
      items.map((item) => (item.id === itemId ? { ...item, runParallel } : item))
    );
  }, []);

  // Handle removing a service
  const handleRemoveService = useCallback((itemId: string) => {
    setServiceItems((items) => items.filter((item) => item.id !== itemId));
  }, []);

  // Handle adding new services
  const handleAddServices = useCallback(
    (serviceIds: string[]) => {
      if (!servicesData?.data) return;

      const newItems: ServiceItem[] = serviceIds
        .filter((id) => !serviceItems.some((item) => item.serviceId === id))
        .map((serviceId) => {
          const service = servicesData.data.find((s) => s.id === serviceId);
          return {
            id: `new-${Date.now()}-${serviceId}`,
            serviceId,
            serviceName: service?.name || 'Unknown',
            duration: service?.durationMinutes || 30,
            price: service?.basePrice || 0,
            stylistId: appointment.stylistId || undefined,
            runParallel: false,
            isNew: true,
          };
        });

      setServiceItems((items) => [...items, ...newItems]);
      setShowAddService(false);
    },
    [servicesData?.data, serviceItems, appointment.stylistId]
  );

  const handleSave = useCallback(async () => {
    if (serviceItems.length === 0) return;

    try {
      await updateServicesMutation.mutateAsync({
        id: appointment.id,
        services: serviceItems.map((item, index) => ({
          serviceId: item.serviceId,
          stylistId: item.stylistId,
          sequence: index + 1,
          runParallel: item.runParallel,
        })),
      });
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Failed to update services:', error);
    }
  }, [appointment.id, serviceItems, updateServicesMutation, onOpenChange, onSuccess]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scissors className="h-5 w-5" />
            Edit Services
          </DialogTitle>
          <DialogDescription>
            {canEdit
              ? 'Drag to reorder, assign stylists, and set parallel execution.'
              : 'Services cannot be edited after the appointment has started.'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {!canEdit ? (
            <div className="text-center py-6 text-muted-foreground">
              <Scissors className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Services can only be edited before the appointment starts.</p>
            </div>
          ) : servicesLoading || staffLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : (
            <>
              {/* Service list with drag-and-drop */}
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={serviceItems.map((i) => i.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {serviceItems.map((item, index) => (
                      <SortableServiceItem
                        key={item.id}
                        item={item}
                        index={index}
                        stylists={stylists}
                        onStylistChange={handleStylistChange}
                        onParallelChange={handleParallelChange}
                        onRemove={handleRemoveService}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>

              {serviceItems.length === 0 && (
                <p className="text-sm text-destructive text-center py-4">
                  At least one service is required
                </p>
              )}

              {/* Add service section */}
              {showAddService ? (
                <div className="p-3 rounded-lg border bg-muted/20 space-y-3">
                  <p className="text-sm font-medium">Add services:</p>
                  <ServiceCombobox
                    value={serviceItems.map((i) => i.serviceId)}
                    onChange={handleAddServices}
                    services={serviceOptions}
                    hasError={false}
                    showTotal={false}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAddService(false)}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setShowAddService(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Service
                </Button>
              )}

              {/* Price comparison */}
              {hasChanges && (
                <div className="p-3 rounded-lg bg-muted/50 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Current total:</span>
                    <span className="line-through">
                      ₹{appointment.subtotal?.toLocaleString('en-IN') || 0}
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
                updateServicesMutation.isPending || serviceItems.length === 0 || !hasChanges
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

// ============================================
// Sortable Service Item Component
// ============================================

interface SortableServiceItemProps {
  item: ServiceItem;
  index: number;
  stylists: Array<{ userId: string; user?: { name?: string } | null }>;
  onStylistChange: (itemId: string, stylistId: string) => void;
  onParallelChange: (itemId: string, runParallel: boolean) => void;
  onRemove: (itemId: string) => void;
}

function SortableServiceItem({
  item,
  index,
  stylists,
  onStylistChange,
  onParallelChange,
  onRemove,
}: SortableServiceItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'p-3 rounded-lg border bg-background',
        isDragging && 'opacity-50 shadow-lg',
        item.isNew && 'border-primary/50 bg-primary/5'
      )}
    >
      <div className="flex items-start gap-2">
        {/* Drag handle */}
        <button
          type="button"
          className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-muted mt-1"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>

        {/* Sequence number */}
        <span className="flex items-center justify-center h-5 w-5 rounded-full bg-primary/10 text-primary text-xs font-medium mt-1">
          {index + 1}
        </span>

        {/* Service info and controls */}
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{item.serviceName}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {item.duration} min
                </span>
                <span>•</span>
                <span>₹{item.price.toLocaleString('en-IN')}</span>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
              onClick={() => onRemove(item.id)}
            >
              ×
            </Button>
          </div>

          {/* Stylist select */}
          <div className="flex items-center gap-2">
            <User className="h-3.5 w-3.5 text-muted-foreground" />
            <Select
              value={item.stylistId || ''}
              onValueChange={(value) => onStylistChange(item.id, value)}
            >
              <SelectTrigger className="h-8 text-xs flex-1">
                <SelectValue placeholder="Select stylist..." />
              </SelectTrigger>
              <SelectContent>
                {stylists.map((stylist) => (
                  <SelectItem key={stylist.userId} value={stylist.userId}>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-4 w-4">
                        <AvatarFallback className="text-[10px]">
                          {(stylist.user?.name || 'U').charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs">{stylist.user?.name || 'Unknown'}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Parallel execution toggle - only show for services after the first */}
          {index > 0 && (
            <label className="flex items-center gap-2 cursor-pointer">
              <Switch
                checked={item.runParallel}
                onCheckedChange={(checked) => onParallelChange(item.id, checked)}
                className="scale-75"
              />
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <ArrowRightLeft className="h-3 w-3" />
                Run parallel with previous
              </span>
            </label>
          )}
        </div>
      </div>
    </div>
  );
}
