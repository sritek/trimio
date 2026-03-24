'use client';

/**
 * Working Hours Editor Component
 * Reusable component for editing weekly working hours
 */

import { useCallback } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { TimePicker } from './time-picker';
import { cn } from '@/lib/utils';

export interface DayWorkingHours {
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}

export interface WeeklyWorkingHours {
  monday: DayWorkingHours;
  tuesday: DayWorkingHours;
  wednesday: DayWorkingHours;
  thursday: DayWorkingHours;
  friday: DayWorkingHours;
  saturday: DayWorkingHours;
  sunday: DayWorkingHours;
}

const DAYS = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
] as const;

export const DEFAULT_WORKING_HOURS: WeeklyWorkingHours = {
  monday: { isOpen: true, openTime: '09:00', closeTime: '21:00' },
  tuesday: { isOpen: true, openTime: '09:00', closeTime: '21:00' },
  wednesday: { isOpen: true, openTime: '09:00', closeTime: '21:00' },
  thursday: { isOpen: true, openTime: '09:00', closeTime: '21:00' },
  friday: { isOpen: true, openTime: '09:00', closeTime: '21:00' },
  saturday: { isOpen: true, openTime: '09:00', closeTime: '21:00' },
  sunday: { isOpen: false, openTime: '09:00', closeTime: '21:00' },
};

interface WorkingHoursEditorProps {
  value: WeeklyWorkingHours;
  onChange: (value: WeeklyWorkingHours) => void;
  disabled?: boolean;
  compact?: boolean;
}

export function WorkingHoursEditor({
  value,
  onChange,
  disabled = false,
  compact = false,
}: WorkingHoursEditorProps) {
  const handleDayChange = useCallback(
    (day: keyof WeeklyWorkingHours, field: keyof DayWorkingHours, fieldValue: boolean | string) => {
      onChange({
        ...value,
        [day]: {
          ...value[day],
          [field]: fieldValue,
        },
      });
    },
    [value, onChange]
  );

  return (
    <div className={cn('space-y-3', compact && 'space-y-2')}>
      {DAYS.map(({ key, label }) => {
        const dayHours = value[key];
        return (
          <div
            key={key}
            className={cn(
              'flex items-center p-3 rounded-lg border bg-card',
              !dayHours.isOpen && 'bg-muted/50',
              compact && 'p-2 gap-2'
            )}
          >
            <div className="flex items-center flex-1 gap-2 min-w-[120px]">
              <Switch
                checked={dayHours.isOpen}
                onCheckedChange={(checked) => handleDayChange(key, 'isOpen', checked)}
                disabled={disabled}
              />
              <Label className={cn('font-medium', compact && 'text-sm')}>{label}</Label>
            </div>

            {dayHours.isOpen ? (
              <div className="flex items-center gap-2 flex-1">
                <TimePicker
                  value={dayHours.openTime}
                  onChange={(time) => handleDayChange(key, 'openTime', time)}
                  disabled={disabled}
                  className="w-24"
                />
                <span className="text-muted-foreground">to</span>
                <TimePicker
                  value={dayHours.closeTime}
                  onChange={(time) => handleDayChange(key, 'closeTime', time)}
                  disabled={disabled}
                  className="w-24"
                />
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">Closed</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
