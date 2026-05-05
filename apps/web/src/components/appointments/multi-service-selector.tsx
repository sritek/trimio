'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  Plus,
  Trash2,
  User,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Layers,
} from 'lucide-react';
import { useTranslations } from 'next-intl';

import { formatCurrency } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Types
export interface ServiceSelection {
  id: string; // Unique ID for this selection (not the service ID)
  serviceId: string;
  serviceName: string;
  durationMinutes: number;
  basePrice: number;
  assignedStylistId?: string;
  sequence: number;
  runParallel: boolean;
  defaultRunParallel: 'always' | 'never' | 'optional';
  scheduledStartTime?: string; // HH:mm format
  scheduledEndTime?: string; // HH:mm format
}

export interface GapWarning {
  afterServiceIndex: number;
  gapMinutes: number;
  suggestion: string;
}

interface Service {
  id: string;
  name: string;
  durationMinutes: number;
  basePrice: number;
  defaultRunParallel?: string;
  category?: {
    id: string;
    name: string;
  };
}

interface Stylist {
  id: string;
  name: string;
  gender?: string | null;
  isAvailable?: boolean;
}

interface MultiServiceSelectorProps {
  services: Service[];
  stylists: Stylist[];
  selectedServices: ServiceSelection[];
  onServicesChange: (services: ServiceSelection[]) => void;
  appointmentStartTime?: string; // HH:mm format
  onGapWarningsChange?: (warnings: GapWarning[]) => void;
  disabled?: boolean;
}

/**
 * Generate a unique ID for service selections
 */
function generateId(): string {
  return `svc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Calculate scheduled times for services based on sequence and parallel settings
 */
function calculateScheduledTimes(
  services: ServiceSelection[],
  startTime: string
): ServiceSelection[] {
  if (!startTime || services.length === 0) return services;

  const [startHours, startMinutes] = startTime.split(':').map(Number);
  let currentMinutes = startHours * 60 + startMinutes;

  // Group services by sequence
  const sequenceGroups = new Map<number, ServiceSelection[]>();
  services.forEach((svc) => {
    const group = sequenceGroups.get(svc.sequence) || [];
    group.push(svc);
    sequenceGroups.set(svc.sequence, group);
  });

  // Sort sequences
  const sortedSequences = Array.from(sequenceGroups.keys()).sort((a, b) => a - b);

  const updatedServices: ServiceSelection[] = [];

  for (const seq of sortedSequences) {
    const group = sequenceGroups.get(seq)!;
    const groupStartMinutes = currentMinutes;

    // Find max duration in this group (for parallel services)
    const maxDuration = Math.max(...group.map((s) => s.durationMinutes));

    for (const svc of group) {
      const startHrs = Math.floor(groupStartMinutes / 60);
      const startMins = groupStartMinutes % 60;
      const endMinutes = groupStartMinutes + svc.durationMinutes;
      const endHrs = Math.floor(endMinutes / 60);
      const endMins = endMinutes % 60;

      updatedServices.push({
        ...svc,
        scheduledStartTime: `${startHrs.toString().padStart(2, '0')}:${startMins.toString().padStart(2, '0')}`,
        scheduledEndTime: `${endHrs.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`,
      });
    }

    // Move current time forward by max duration of this group
    currentMinutes += maxDuration;
  }

  return updatedServices;
}

/**
 * Detect gaps between sequential services
 */
function detectGaps(services: ServiceSelection[]): GapWarning[] {
  const warnings: GapWarning[] = [];

  // Group by sequence
  const sequenceGroups = new Map<number, ServiceSelection[]>();
  services.forEach((svc) => {
    const group = sequenceGroups.get(svc.sequence) || [];
    group.push(svc);
    sequenceGroups.set(svc.sequence, group);
  });

  const sortedSequences = Array.from(sequenceGroups.keys()).sort((a, b) => a - b);

  for (let i = 0; i < sortedSequences.length - 1; i++) {
    const currentSeq = sortedSequences[i];
    const nextSeq = sortedSequences[i + 1];

    // Check if there's a gap in sequence numbers
    if (nextSeq - currentSeq > 1) {
      warnings.push({
        afterServiceIndex: i,
        gapMinutes: 0, // Sequence gap, not time gap
        suggestion: `Services have non-consecutive sequence numbers (${currentSeq} → ${nextSeq})`,
      });
    }
  }

  return warnings;
}

export function MultiServiceSelector({
  services,
  stylists,
  selectedServices,
  onServicesChange,
  appointmentStartTime,
  onGapWarningsChange,
  disabled = false,
}: MultiServiceSelectorProps) {
  const t = useTranslations('appointments');
  const [expandedServices, setExpandedServices] = useState<Set<string>>(new Set());
  const [showServicePicker, setShowServicePicker] = useState(false);

  // Calculate totals
  const { totalDuration, totalPrice } = useMemo(() => {
    // Group by sequence to calculate parallel duration correctly
    const sequenceGroups = new Map<number, ServiceSelection[]>();
    selectedServices.forEach((svc) => {
      const group = sequenceGroups.get(svc.sequence) || [];
      group.push(svc);
      sequenceGroups.set(svc.sequence, group);
    });

    let duration = 0;
    sequenceGroups.forEach((group) => {
      // For parallel services, use max duration
      duration += Math.max(...group.map((s) => s.durationMinutes));
    });

    const price = selectedServices.reduce((sum, s) => sum + s.basePrice, 0);

    return { totalDuration: duration, totalPrice: price };
  }, [selectedServices]);

  // Detect gaps and notify parent
  useMemo(() => {
    const warnings = detectGaps(selectedServices);
    onGapWarningsChange?.(warnings);
  }, [selectedServices, onGapWarningsChange]);

  // Add a service
  const handleAddService = useCallback(
    (service: Service) => {
      const maxSequence = Math.max(0, ...selectedServices.map((s) => s.sequence));
      const newService: ServiceSelection = {
        id: generateId(),
        serviceId: service.id,
        serviceName: service.name,
        durationMinutes: service.durationMinutes,
        basePrice: service.basePrice,
        sequence: maxSequence + 1,
        runParallel: false,
        defaultRunParallel:
          (service.defaultRunParallel as 'always' | 'never' | 'optional') || 'optional',
      };

      const updatedServices = calculateScheduledTimes(
        [...selectedServices, newService],
        appointmentStartTime || '09:00'
      );
      onServicesChange(updatedServices);
      setShowServicePicker(false);
    },
    [selectedServices, appointmentStartTime, onServicesChange]
  );

  // Remove a service
  const handleRemoveService = useCallback(
    (id: string) => {
      const filtered = selectedServices.filter((s) => s.id !== id);
      // Recalculate sequences
      const resequenced = filtered.map((s, idx) => ({
        ...s,
        sequence: idx + 1,
      }));
      const updatedServices = calculateScheduledTimes(resequenced, appointmentStartTime || '09:00');
      onServicesChange(updatedServices);
    },
    [selectedServices, appointmentStartTime, onServicesChange]
  );

  // Update stylist for a service
  const handleStylistChange = useCallback(
    (id: string, stylistId: string | undefined) => {
      const updated = selectedServices.map((s) =>
        s.id === id ? { ...s, assignedStylistId: stylistId } : s
      );
      onServicesChange(updated);
    },
    [selectedServices, onServicesChange]
  );

  // Update parallel setting for a service
  const handleParallelChange = useCallback(
    (id: string, runParallel: boolean) => {
      const service = selectedServices.find((s) => s.id === id);
      if (!service) return;

      // If enabling parallel, set same sequence as previous service
      let updated: ServiceSelection[];
      if (runParallel && service.sequence > 1) {
        const prevSequence = service.sequence - 1;
        updated = selectedServices.map((s) =>
          s.id === id ? { ...s, runParallel, sequence: prevSequence } : s
        );
      } else if (!runParallel) {
        // If disabling parallel, give it its own sequence
        const maxSequence = Math.max(...selectedServices.map((s) => s.sequence));
        updated = selectedServices.map((s) =>
          s.id === id ? { ...s, runParallel, sequence: maxSequence + 1 } : s
        );
        // Resequence to remove gaps
        updated = updated
          .sort((a, b) => a.sequence - b.sequence)
          .map((s, idx) => ({ ...s, sequence: idx + 1 }));
      } else {
        updated = selectedServices.map((s) => (s.id === id ? { ...s, runParallel } : s));
      }

      const recalculated = calculateScheduledTimes(updated, appointmentStartTime || '09:00');
      onServicesChange(recalculated);
    },
    [selectedServices, appointmentStartTime, onServicesChange]
  );

  // Move service up in sequence
  const handleMoveUp = useCallback(
    (id: string) => {
      const index = selectedServices.findIndex((s) => s.id === id);
      if (index <= 0) return;

      const newServices = [...selectedServices];
      [newServices[index - 1], newServices[index]] = [newServices[index], newServices[index - 1]];

      // Resequence
      const resequenced = newServices.map((s, idx) => ({
        ...s,
        sequence: idx + 1,
        runParallel: false, // Reset parallel when reordering
      }));

      const recalculated = calculateScheduledTimes(resequenced, appointmentStartTime || '09:00');
      onServicesChange(recalculated);
    },
    [selectedServices, appointmentStartTime, onServicesChange]
  );

  // Move service down in sequence
  const handleMoveDown = useCallback(
    (id: string) => {
      const index = selectedServices.findIndex((s) => s.id === id);
      if (index < 0 || index >= selectedServices.length - 1) return;

      const newServices = [...selectedServices];
      [newServices[index], newServices[index + 1]] = [newServices[index + 1], newServices[index]];

      // Resequence
      const resequenced = newServices.map((s, idx) => ({
        ...s,
        sequence: idx + 1,
        runParallel: false, // Reset parallel when reordering
      }));

      const recalculated = calculateScheduledTimes(resequenced, appointmentStartTime || '09:00');
      onServicesChange(recalculated);
    },
    [selectedServices, appointmentStartTime, onServicesChange]
  );

  // Toggle expanded state
  const toggleExpanded = (id: string) => {
    setExpandedServices((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Available services (not already selected)
  const availableServices = useMemo(() => {
    const selectedIds = new Set(selectedServices.map((s) => s.serviceId));
    return services.filter((s) => !selectedIds.has(s.id));
  }, [services, selectedServices]);

  // Check for parallel service validation errors
  const parallelValidationErrors = useMemo(() => {
    const errors: Map<string, string> = new Map();

    // Group by sequence
    const sequenceGroups = new Map<number, ServiceSelection[]>();
    selectedServices.forEach((svc) => {
      const group = sequenceGroups.get(svc.sequence) || [];
      group.push(svc);
      sequenceGroups.set(svc.sequence, group);
    });

    // Check each group with multiple services
    sequenceGroups.forEach((group) => {
      if (group.length > 1) {
        // Check if parallel services have the same stylist
        const stylistIds = group.map((s) => s.assignedStylistId).filter((id): id is string => !!id);
        const uniqueStylists = new Set(stylistIds);

        if (stylistIds.length > 1 && uniqueStylists.size < stylistIds.length) {
          group.forEach((s) => {
            if (s.assignedStylistId) {
              errors.set(s.id, 'Parallel services must have different stylists');
            }
          });
        }
      }
    });

    return errors;
  }, [selectedServices]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            {t('form.services')}
          </span>
          <div className="text-sm font-normal text-muted-foreground">
            {selectedServices.length} service{selectedServices.length !== 1 ? 's' : ''} •{' '}
            {totalDuration} min • {formatCurrency(totalPrice)}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Selected Services List */}
        {selectedServices.length > 0 && (
          <div className="space-y-2">
            {selectedServices.map((service, index) => {
              const isExpanded = expandedServices.has(service.id);
              const validationError = parallelValidationErrors.get(service.id);
              const canRunParallel = service.defaultRunParallel !== 'never' && index > 0;
              const isParallelForced = service.defaultRunParallel === 'always';

              return (
                <Collapsible
                  key={service.id}
                  open={isExpanded}
                  onOpenChange={() => toggleExpanded(service.id)}
                >
                  <div
                    className={`border rounded-lg ${validationError ? 'border-destructive' : ''}`}
                  >
                    {/* Service Header */}
                    <div className="flex items-center gap-2 p-3">
                      <div className="flex flex-col gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleMoveUp(service.id)}
                          disabled={disabled || index === 0}
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleMoveDown(service.id)}
                          disabled={disabled || index === selectedServices.length - 1}
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {service.sequence}
                          </Badge>
                          <span className="font-medium">{service.serviceName}</span>
                          {service.runParallel && (
                            <Badge variant="secondary" className="text-xs">
                              Parallel
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                          <Clock className="h-3 w-3" />
                          {service.durationMinutes} min
                          {service.scheduledStartTime && (
                            <span>
                              • {service.scheduledStartTime} - {service.scheduledEndTime}
                            </span>
                          )}
                          <span>• {formatCurrency(service.basePrice)}</span>
                        </div>
                        {validationError && (
                          <div className="text-xs text-destructive flex items-center gap-1 mt-1">
                            <AlertTriangle className="h-3 w-3" />
                            {validationError}
                          </div>
                        )}
                      </div>

                      <CollapsibleTrigger asChild>
                        <Button type="button" variant="ghost" size="sm">
                          {isExpanded ? 'Less' : 'More'}
                        </Button>
                      </CollapsibleTrigger>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleRemoveService(service.id)}
                        disabled={disabled}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Expanded Options */}
                    <CollapsibleContent>
                      <div className="border-t p-3 space-y-4 bg-muted/30">
                        {/* Stylist Selection */}
                        <div className="space-y-2">
                          <Label className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            Assigned Stylist
                          </Label>
                          <Select
                            value={service.assignedStylistId || 'unassigned'}
                            onValueChange={(value) =>
                              handleStylistChange(
                                service.id,
                                value === 'unassigned' ? undefined : value
                              )
                            }
                            disabled={disabled}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select stylist (optional)" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="unassigned">
                                <span className="text-muted-foreground">Unassigned</span>
                              </SelectItem>
                              {stylists.map((stylist) => (
                                <SelectItem key={stylist.id} value={stylist.id}>
                                  {stylist.name}
                                  {stylist.gender && (
                                    <span className="text-muted-foreground ml-1">
                                      ({stylist.gender})
                                    </span>
                                  )}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Parallel Execution Toggle */}
                        {canRunParallel && (
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label>Run in Parallel</Label>
                              <p className="text-xs text-muted-foreground">
                                Execute simultaneously with previous service
                              </p>
                            </div>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div>
                                    <Switch
                                      checked={service.runParallel}
                                      onCheckedChange={(checked) =>
                                        handleParallelChange(service.id, checked)
                                      }
                                      disabled={
                                        disabled ||
                                        isParallelForced ||
                                        service.defaultRunParallel === 'never'
                                      }
                                    />
                                  </div>
                                </TooltipTrigger>
                                {(isParallelForced || service.defaultRunParallel === 'never') && (
                                  <TooltipContent>
                                    {isParallelForced
                                      ? 'This service always runs in parallel'
                                      : 'This service cannot run in parallel'}
                                  </TooltipContent>
                                )}
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        )}
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              );
            })}
          </div>
        )}

        {/* Add Service Button / Picker */}
        {showServicePicker ? (
          <div className="border rounded-lg p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium">Select a Service</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowServicePicker(false)}
              >
                Cancel
              </Button>
            </div>
            <div className="grid gap-2 max-h-64 overflow-y-auto">
              {availableServices.length > 0 ? (
                availableServices.map((service) => (
                  <div
                    key={service.id}
                    className="p-2 border rounded cursor-pointer hover:bg-muted transition-colors"
                    onClick={() => handleAddService(service)}
                  >
                    <div className="font-medium">{service.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {service.durationMinutes} min • {formatCurrency(service.basePrice)}
                      {service.category && <span className="ml-2">• {service.category.name}</span>}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-muted-foreground py-4">
                  All services have been added
                </div>
              )}
            </div>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => setShowServicePicker(true)}
            disabled={disabled || availableServices.length === 0}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Service
          </Button>
        )}

        {/* Summary */}
        {selectedServices.length > 0 && (
          <div className="flex items-center justify-between pt-4 border-t">
            <div>
              <div className="text-sm text-muted-foreground">Total Duration</div>
              <div className="text-lg font-semibold">{totalDuration} min</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Total Price</div>
              <div className="text-lg font-semibold">{formatCurrency(totalPrice)}</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default MultiServiceSelector;
