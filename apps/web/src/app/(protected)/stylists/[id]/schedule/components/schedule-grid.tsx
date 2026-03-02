'use client';

import { useState } from 'react';
import { format, isToday } from 'date-fns';
import { useTranslations } from 'next-intl';
import { Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/common';
import { cn } from '@/lib/utils';
import { useDeleteBreak, useDeleteBlockedSlot } from '@/hooks/queries/use-appointments';

import type { StylistBreak, StylistBlockedSlot } from '@/types/appointments';

interface ScheduleAppointment {
  id: string;
  scheduledDate: string;
  scheduledTime: string;
  endTime: string;
  customerName: string;
  services: string[];
  status: string;
}

interface ScheduleGridProps {
  weekDays: Date[];
  breaksByDay: Record<number, StylistBreak[]>;
  blockedByDate: Record<string, StylistBlockedSlot[]>;
  appointmentsByDate: Record<string, ScheduleAppointment[]>;
  onDayClick: (date: Date) => void;
  stylistId: string;
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function ScheduleGrid({
  weekDays,
  breaksByDay,
  blockedByDate,
  appointmentsByDate,
  onDayClick,
  stylistId,
}: ScheduleGridProps) {
  const t = useTranslations('stylistSchedule');
  const deleteBreak = useDeleteBreak();
  const deleteBlockedSlot = useDeleteBlockedSlot();

  const [deleteBreakId, setDeleteBreakId] = useState<string | null>(null);
  const [deleteBlockedSlotId, setDeleteBlockedSlotId] = useState<string | null>(null);

  const handleDeleteBreak = (breakId: string) => {
    setDeleteBreakId(breakId);
  };

  const confirmDeleteBreak = () => {
    if (deleteBreakId) {
      deleteBreak.mutate({ stylistId, breakId: deleteBreakId });
      setDeleteBreakId(null);
    }
  };

  const handleDeleteBlockedSlot = (slotId: string) => {
    setDeleteBlockedSlotId(slotId);
  };

  const confirmDeleteBlockedSlot = () => {
    if (deleteBlockedSlotId) {
      deleteBlockedSlot.mutate({ stylistId, slotId: deleteBlockedSlotId });
      setDeleteBlockedSlotId(null);
    }
  };

  return (
    <>
      <div className="grid grid-cols-7 gap-4">
        {weekDays.map((day, index) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const dayOfWeek = (day.getDay() + 6) % 7; // Convert to Monday=0
          const dayBreaks = breaksByDay[dayOfWeek] || [];
          const dayBlocked = blockedByDate[dateStr] || [];
          const dayAppointments = appointmentsByDate[dateStr] || [];
          const isFullDayBlocked = dayBlocked.some((b) => b.isFullDay);

          return (
            <Card
              key={dateStr}
              className={cn(
                'min-h-[300px] cursor-pointer hover:border-primary/50 transition-colors',
                isToday(day) && 'border-primary',
                isFullDayBlocked && 'bg-red-50 dark:bg-red-950/20'
              )}
              onClick={() => onDayClick(day)}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span className={cn(isToday(day) && 'text-primary font-bold')}>
                    {DAY_NAMES[index]}
                  </span>
                  <span className={cn('text-muted-foreground', isToday(day) && 'text-primary')}>
                    {format(day, 'd')}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs" onClick={(e) => e.stopPropagation()}>
                {/* Full day blocked indicator */}
                {isFullDayBlocked && (
                  <div className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 p-2 rounded text-center">
                    {t('fullDayBlocked')}
                  </div>
                )}

                {/* Recurring breaks */}
                {dayBreaks.map((brk) => (
                  <div
                    key={brk.id}
                    className="bg-amber-100 dark:bg-amber-900/30 p-2 rounded flex items-center justify-between group"
                  >
                    <div>
                      <div className="font-medium text-amber-700 dark:text-amber-300">
                        {brk.name}
                      </div>
                      <div className="text-amber-600 dark:text-amber-400">
                        {brk.startTime} - {brk.endTime}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100"
                      onClick={() => handleDeleteBreak(brk.id)}
                    >
                      <Trash2 className="h-3 w-3 text-red-500" />
                    </Button>
                  </div>
                ))}

                {/* Blocked slots (not full day) */}
                {dayBlocked
                  .filter((b) => !b.isFullDay)
                  .map((slot) => (
                    <div
                      key={slot.id}
                      className="bg-red-100 dark:bg-red-900/30 p-2 rounded flex items-center justify-between group"
                    >
                      <div>
                        <div className="font-medium text-red-700 dark:text-red-300">
                          {slot.reason || t('blocked')}
                        </div>
                        <div className="text-red-600 dark:text-red-400">
                          {slot.startTime} - {slot.endTime}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100"
                        onClick={() => handleDeleteBlockedSlot(slot.id)}
                      >
                        <Trash2 className="h-3 w-3 text-red-500" />
                      </Button>
                    </div>
                  ))}

                {/* Appointments */}
                {dayAppointments.map((apt) => (
                  <div key={apt.id} className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded">
                    <div className="font-medium text-blue-700 dark:text-blue-300">
                      {apt.customerName}
                    </div>
                    <div className="text-blue-600 dark:text-blue-400">
                      {apt.scheduledTime} - {apt.endTime}
                    </div>
                    <div className="text-blue-500 dark:text-blue-400 truncate">
                      {apt.services.join(', ')}
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        'mt-1 text-[10px]',
                        apt.status === 'booked' && 'bg-sky-100 text-sky-700',
                        apt.status === 'confirmed' && 'bg-emerald-100 text-emerald-700',
                        apt.status === 'checked_in' && 'bg-violet-100 text-violet-700',
                        apt.status === 'in_progress' && 'bg-amber-100 text-amber-700',
                        apt.status === 'completed' && 'bg-slate-100 text-slate-600',
                        apt.status === 'cancelled' && 'bg-red-100 text-red-600',
                        apt.status === 'no_show' && 'bg-rose-100 text-rose-600'
                      )}
                    >
                      {apt.status}
                    </Badge>
                  </div>
                ))}

                {/* Empty state */}
                {!isFullDayBlocked &&
                  dayBreaks.length === 0 &&
                  dayBlocked.length === 0 &&
                  dayAppointments.length === 0 && (
                    <div className="text-muted-foreground text-center py-4">{t('noSchedule')}</div>
                  )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Delete Break Confirmation */}
      <ConfirmDialog
        open={!!deleteBreakId}
        onOpenChange={(open) => !open && setDeleteBreakId(null)}
        title={t('deleteBreakTitle')}
        description={t('confirmDeleteBreak')}
        variant="destructive"
        onConfirm={confirmDeleteBreak}
        isLoading={deleteBreak.isPending}
      />

      {/* Delete Blocked Slot Confirmation */}
      <ConfirmDialog
        open={!!deleteBlockedSlotId}
        onOpenChange={(open) => !open && setDeleteBlockedSlotId(null)}
        title={t('deleteBlockTitle')}
        description={t('confirmDeleteBlock')}
        variant="destructive"
        onConfirm={confirmDeleteBlockedSlot}
        isLoading={deleteBlockedSlot.isPending}
      />
    </>
  );
}
