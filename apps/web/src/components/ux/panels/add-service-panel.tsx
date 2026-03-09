'use client';

/**
 * Add Service Panel
 * Panel for adding services to an in-progress appointment (upsell)
 */

import { useState, useCallback, useMemo } from 'react';
import { Search, Loader2, Plus, Check } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useClosePanel } from '@/components/ux/slide-over';
import { useServices } from '@/hooks/queries/use-services';
import { useAddAppointmentService } from '@/hooks/queries/use-stations';
import { useStaffList } from '@/hooks/queries/use-staff';
import { useBranchContext } from '@/hooks/use-branch-context';
import { cn } from '@/lib/utils';
import type { Service } from '@/types/services';

interface AddServicePanelProps {
  appointmentId: string;
}

export function AddServicePanel({ appointmentId }: AddServicePanelProps) {
  const closePanel = useClosePanel();
  const { branchId } = useBranchContext();
  const [search, setSearch] = useState('');
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedStylistId, setSelectedStylistId] = useState<string>('');

  // Fetch services
  const { data: servicesData, isLoading: servicesLoading } = useServices({
    isActive: true,
    limit: 100,
  });

  // Fetch stylists
  const { data: staffData } = useStaffList({
    branchId: branchId || '',
    role: 'stylist',
    isActive: true,
  });

  const addServiceMutation = useAddAppointmentService(branchId ?? undefined);

  // Filter services by search
  const filteredServices = useMemo(() => {
    if (!servicesData?.data) return [];
    if (!search) return servicesData.data;
    const searchLower = search.toLowerCase();
    return servicesData.data.filter(
      (service) =>
        service.name.toLowerCase().includes(searchLower) ||
        service.sku.toLowerCase().includes(searchLower)
    );
  }, [servicesData, search]);

  const stylists = staffData?.data || [];

  const handleSelectService = useCallback((service: Service) => {
    setSelectedService(service);
  }, []);

  const handleAddService = useCallback(async () => {
    if (!selectedService) return;

    try {
      await addServiceMutation.mutateAsync({
        appointmentId,
        serviceId: selectedService.id,
        stylistId: selectedStylistId || undefined,
      });
      toast.success(`Added ${selectedService.name}`);
      closePanel();
    } catch (error: any) {
      toast.error(error.message || 'Failed to add service');
    }
  }, [selectedService, selectedStylistId, appointmentId, addServiceMutation, closePanel]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b">
        <h3 className="text-lg font-semibold">Add Service</h3>
        <p className="text-sm text-muted-foreground">Select a service to add to this appointment</p>
      </div>

      {/* Search */}
      <div className="p-4 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search services..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Services List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {servicesLoading ? (
          <>
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </>
        ) : filteredServices.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No services found</p>
          </div>
        ) : (
          filteredServices.map((service) => (
            <Card
              key={service.id}
              className={cn(
                'cursor-pointer transition-all',
                selectedService?.id === service.id ? 'ring-2 ring-primary' : 'hover:bg-muted/50'
              )}
              onClick={() => handleSelectService(service)}
            >
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{service.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {service.durationMinutes} min • ₹{service.basePrice.toLocaleString('en-IN')}
                    </p>
                  </div>
                  {selectedService?.id === service.id && <Check className="h-5 w-5 text-primary" />}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Stylist Selection & Actions */}
      <div className="border-t p-4 space-y-4">
        {selectedService && stylists.length > 0 && (
          <div>
            <label className="text-sm font-medium mb-2 block">Assign Stylist (optional)</label>
            <Select value={selectedStylistId} onValueChange={setSelectedStylistId}>
              <SelectTrigger>
                <SelectValue placeholder="Same as appointment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Same as appointment</SelectItem>
                {stylists.map((stylist) => (
                  <SelectItem key={stylist.userId} value={stylist.userId}>
                    {stylist.user?.name || 'Unknown'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => closePanel()}>
            Cancel
          </Button>
          <Button
            className="flex-1"
            onClick={handleAddService}
            disabled={!selectedService || addServiceMutation.isPending}
          >
            {addServiceMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            Add Service
          </Button>
        </div>
      </div>
    </div>
  );
}
