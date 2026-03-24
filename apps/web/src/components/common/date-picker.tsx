'use client';

import { format as formatDate } from 'date-fns';
import { CalendarIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface DatePickerProps {
  value?: Date;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  format?: string;
  className?: string;
  align?: 'start' | 'center' | 'end';
  captionLayout?: 'dropdown' | 'label' | 'dropdown-months' | 'dropdown-years' | undefined;
}

export function DatePicker({
  value,
  onChange,
  placeholder = 'Select date',
  disabled = false,
  format = 'PPP',
  className,
  align = 'start',
  captionLayout,
}: DatePickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            'w-full justify-start text-left font-normal',
            !value && 'text-muted-foreground',
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? formatDate(value, format) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align={align}>
        <Calendar
          mode="single"
          selected={value}
          onSelect={onChange}
          autoFocus
          captionLayout={captionLayout}
        />
      </PopoverContent>
    </Popover>
  );
}
