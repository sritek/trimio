'use client';

/**
 * ServiceCombobox - Multi-select service selection component
 *
 * Uses Popover + Command pattern for reliable combobox behavior.
 * Services are grouped by category with chips display for selected items.
 */

import { useState, useMemo, useCallback } from 'react';
import { Check, ChevronsUpDown, X } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

// ============================================
// Types
// ============================================

export interface ServiceOption {
  id: string;
  name: string;
  basePrice: number;
  categoryId: string;
  categoryName?: string;
  duration: number;
}

export interface ServiceComboboxProps {
  /** Array of selected service IDs */
  value: string[];
  /** Callback when selection changes */
  onChange: (serviceIds: string[]) => void;
  /** Services to display - parent component handles fetching */
  services: ServiceOption[];
  /** Placeholder text */
  placeholder?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Show error state */
  hasError?: boolean;
  /** Show total price */
  showTotal?: boolean;
}

// ============================================
// Helper Functions
// ============================================

function formatPrice(price: number): string {
  return `₹${price.toLocaleString('en-IN')}`;
}

// ============================================
// Main ServiceCombobox Component
// ============================================

export function ServiceCombobox({
  value,
  onChange,
  services,
  placeholder = 'Select services...',
  disabled = false,
  className,
  hasError = false,
  showTotal = true,
}: ServiceComboboxProps) {
  const [open, setOpen] = useState(false);

  // Group services by category
  const serviceGroups = useMemo(() => {
    const grouped: Record<string, ServiceOption[]> = {};
    services.forEach((service) => {
      const category = service.categoryName || 'Other';
      if (!grouped[category]) grouped[category] = [];
      grouped[category].push(service);
    });
    return Object.entries(grouped);
  }, [services]);

  // Get selected services for chips and total calculation
  const selectedServices = useMemo(() => {
    return services.filter((s) => value.includes(s.id));
  }, [services, value]);

  // Calculate total price
  const totalPrice = useMemo(() => {
    return selectedServices.reduce((sum, s) => sum + s.basePrice, 0);
  }, [selectedServices]);

  const handleSelect = useCallback(
    (serviceId: string) => {
      if (value.includes(serviceId)) {
        onChange(value.filter((id) => id !== serviceId));
      } else {
        onChange([...value, serviceId]);
      }
    },
    [value, onChange]
  );

  const handleRemove = useCallback(
    (serviceId: string) => {
      onChange(value.filter((id) => id !== serviceId));
    },
    [value, onChange]
  );

  return (
    <div className={cn('space-y-3', className)}>
      {/* Selected Services Chips */}
      {selectedServices.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedServices.map((service) => (
            <Badge key={service.id} variant="secondary" className="pl-2 pr-1 py-1 gap-1">
              <span>{service.name}</span>
              <span>&bull;</span>
              <span className="text-muted-foreground">{service.duration} mins</span>
              <span>&bull;</span>
              <span className="text-muted-foreground">{formatPrice(service.basePrice)}</span>
              <button
                type="button"
                onClick={() => handleRemove(service.id)}
                className="ml-1 rounded-full hover:bg-muted p-0.5"
                disabled={disabled}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Combobox */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              'w-full justify-between font-normal',
              value.length === 0 && 'text-muted-foreground',
              hasError && 'border-destructive'
            )}
          >
            {value.length === 0
              ? placeholder
              : `${value.length} service${value.length > 1 ? 's' : ''} selected`}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[--radix-popover-trigger-width] p-0"
          align="start"
          // onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <Command>
            <CommandInput placeholder="Search services..." />
            <CommandList className="max-h-[300px]">
              <CommandEmpty>No services found.</CommandEmpty>
              {serviceGroups.map(([category, categoryServices], index) => (
                <div key={category}>
                  <CommandGroup heading={category}>
                    {categoryServices.map((service) => (
                      <CommandItem
                        key={service.id}
                        value={`${service.name} ${category}`}
                        onSelect={() => handleSelect(service.id)}
                        className="py-2 cursor-pointer"
                      >
                        <Check
                          className={cn(
                            'mr-2 h-4 w-4',
                            value.includes(service.id) ? 'opacity-100' : 'opacity-0'
                          )}
                        />
                        <span className="flex-1">{service.name}</span>
                        <span className="text-muted-foreground">
                          {formatPrice(service.basePrice)}
                        </span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                  {index < serviceGroups.length - 1 && <CommandSeparator />}
                </div>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Total Price */}
      {showTotal && totalPrice > 0 && (
        <div className="flex justify-between items-center pt-2 border-t">
          <span className="text-sm text-muted-foreground">Estimated Total</span>
          <span className="font-semibold">{formatPrice(totalPrice)}</span>
        </div>
      )}
    </div>
  );
}
