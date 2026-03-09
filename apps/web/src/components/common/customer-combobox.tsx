'use client';

/**
 * CustomerCombobox - Customer search and selection component
 *
 * Uses Popover + Command pattern for reliable combobox behavior.
 * Supports async search - parent component handles fetching based on onSearchChange callback.
 */

import { useState, useCallback, useEffect } from 'react';
import { ChevronsUpDown, Star, X } from 'lucide-react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useDebounce } from '@/hooks/use-debounce';
import { cn } from '@/lib/utils';

// ============================================
// Types
// ============================================

export interface CustomerOption {
  id: string;
  name: string;
  phone: string;
  visitCount?: number;
  loyaltyPoints?: number;
  tags?: string[];
}

export interface CustomerComboboxProps {
  /** Currently selected customer */
  value: CustomerOption | null;
  /** Callback when customer is selected or cleared */
  onChange: (customer: CustomerOption | null) => void;
  /** Customer list to display - parent component handles fetching */
  customers: CustomerOption[];
  /** Callback when search input changes - for async search */
  onSearchChange?: (search: string) => void;
  /** Debounce delay in ms (default: 300) */
  debounceMs?: number;
  /** Placeholder text */
  placeholder?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Show error state */
  hasError?: boolean;
}

// ============================================
// Selected Customer Card Component
// ============================================

interface SelectedCustomerCardProps {
  customer: CustomerOption;
  onClear: () => void;
  disabled?: boolean;
}

function SelectedCustomerCard({ customer, onClear, disabled }: SelectedCustomerCardProps) {
  return (
    <div className="relative p-4 rounded-lg border bg-muted/30">
      <button
        type="button"
        onClick={onClear}
        disabled={disabled}
        className="absolute top-2 right-2 p-1 rounded-full hover:bg-muted disabled:opacity-50"
      >
        <X className="h-4 w-4 text-muted-foreground" />
      </button>
      <div className="flex items-start gap-3">
        <Avatar className="h-12 w-12">
          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
            {customer.name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate">{customer.name}</p>
          <p className="text-sm text-muted-foreground">{customer.phone}</p>
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            {customer.visitCount !== undefined && <span>{customer.visitCount} visits</span>}
            {customer.loyaltyPoints !== undefined && customer.loyaltyPoints > 0 && (
              <span className="flex items-center gap-1">
                <Star className="h-3 w-3 text-amber-500" />
                {customer.loyaltyPoints} pts
              </span>
            )}
          </div>
          {customer.tags && customer.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {customer.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// Main CustomerCombobox Component
// ============================================

export function CustomerCombobox({
  value,
  onChange,
  customers,
  onSearchChange,
  debounceMs = 300,
  placeholder = 'Search customer...',
  disabled = false,
  className,
  hasError = false,
}: CustomerComboboxProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');

  const debouncedSearch = useDebounce(inputValue, debounceMs);

  // Trigger search callback when debounced value changes
  useEffect(() => {
    onSearchChange?.(debouncedSearch);
  }, [debouncedSearch, onSearchChange]);

  const handleClear = useCallback(() => {
    onChange(null);
    setInputValue('');
  }, [onChange]);

  const handleSelect = useCallback(
    (customerId: string) => {
      const customer = customers.find((c) => c.id === customerId);
      onChange(customer || null);
      setOpen(false);
    },
    [customers, onChange]
  );

  // If a customer is selected, show the card
  if (value) {
    return <SelectedCustomerCard customer={value} onClear={handleClear} disabled={disabled} />;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'w-full justify-between font-normal',
            !value && 'text-muted-foreground',
            hasError && 'border-destructive',
            className
          )}
        >
          {placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0"
        align="start"
        // onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Command shouldFilter={!onSearchChange}>
          <CommandInput
            placeholder={placeholder}
            value={inputValue}
            onValueChange={setInputValue}
          />
          <CommandList className="max-h-[250px]">
            <CommandEmpty>
              {customers.length === 0 ? 'Type to search customers...' : 'No customers found.'}
            </CommandEmpty>
            <CommandGroup>
              {customers.map((customer) => (
                <CommandItem
                  key={customer.id}
                  value={customer.id}
                  onSelect={handleSelect}
                  className="py-2 cursor-pointer"
                >
                  <Avatar className="h-8 w-8 mr-2">
                    <AvatarFallback className="text-xs">
                      {customer.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate text-sm">{customer.name}</p>
                    <p className="text-xs text-muted-foreground">{customer.phone}</p>
                  </div>
                  {customer.loyaltyPoints !== undefined && customer.loyaltyPoints > 0 && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Star className="h-3 w-3 text-amber-500" />
                      {customer.loyaltyPoints}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
