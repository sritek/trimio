'use client';

/**
 * Appointments Page - Calendar-First
 * Default view is calendar, with list view as secondary option.
 */

import { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Calendar, List, Plus, UserX } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { PERMISSIONS } from '@salon-ops/shared';

import {
  useAppointments,
  useMarkNoShow,
  useUnassignedCount,
} from '@/hooks/queries/use-appointments';
import { useResourceCalendar, useMoveAppointment } from '@/hooks/queries/use-resource-calendar';
import { useDebounce } from '@/hooks/use-debounce';
import { usePermissions } from '@/hooks/use-permissions';
import { useBranchContext } from '@/hooks/use-branch-context';
import { useAppointmentsUIStore, type ListFiltersState } from '@/stores/appointments-ui-store';
import { useCalendarStore } from '@/stores/calendar-store';
import { useOpenPanel } from '@/components/ux/slide-over/slide-over-registry';
import { useMediaQuery } from '@/hooks/use-media-query';

import {
  AccessDenied,
  ConfirmDialog,
  PageContainer,
  PageContent,
  PageHeader,
  PermissionGuard,
} from '@/components/common';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  ResourceCalendar,
  CalendarFiltersSheet,
  MobileCalendar,
} from '@/app/(protected)/appointments/calendar/components';

import { AppointmentTable, ListFiltersSheet } from './components';

import type {
  AppointmentFilters as AppointmentFiltersType,
  AppointmentStatus,
  BookingType,
} from '@/types/appointments';

const VIEW_PREFERENCE_KEY = 'appointments-view-preference';

type ViewMode = 'calendar' | 'list';

export default function AppointmentsPage() {
  const t = useTranslations('appointments');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { hasPermission } = usePermissions();
  const canWrite = hasPermission(PERMISSIONS.APPOINTMENTS_WRITE);
  const { openAppointmentDetails, openNewAppointment, openUnassignedAppointments } = useOpenPanel();
  const isMobile = useMediaQuery('(max-width: 768px)');

  // View mode state
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [viewLoaded, setViewLoaded] = useState(false);

  useEffect(() => {
    const urlView = searchParams.get('view') as ViewMode | null;
    if (urlView === 'calendar' || urlView === 'list') {
      setViewMode(urlView);
      localStorage.setItem(VIEW_PREFERENCE_KEY, urlView);
    }
    setViewLoaded(true);
  }, [searchParams]);

  const handleViewChange = useCallback(
    (value: string) => {
      if (value === 'calendar' || value === 'list') {
        setViewMode(value);
        localStorage.setItem(VIEW_PREFERENCE_KEY, value);
        const params = new URLSearchParams(searchParams.toString());
        params.set('view', value);
        router.replace(`/appointments?${params.toString()}`, { scroll: false });
      }
    },
    [router, searchParams]
  );

  // Dialog states
  const [noShowId, setNoShowId] = useState<string | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [listFilterOpen, setListFilterOpen] = useState(false);
  const [confirmMove, setConfirmMove] = useState<{
    appointmentId: string;
    newStylistId: string;
    newDate: string;
    newTime: string;
    stylistName?: string;
  } | null>(null);

  // Store state
  const {
    listFilters,
    listSearch,
    listPage,
    listLimit,
    setListFilters,
    setListSearch,
    setListPage,
    setListLimit,
    syncDateFromCalendar,
  } = useAppointmentsUIStore();

  const { selectedDate, filters: calendarFilters } = useCalendarStore();
  const { branchId } = useBranchContext();

  // Track previous view mode to detect view switches
  const prevViewModeRef = useRef<ViewMode | null>(null);

  // Sync list view date with calendar date when switching from calendar to list
  useEffect(() => {
    // On initial mount or when switching from calendar to list, sync the date
    if (viewLoaded) {
      const prevView = prevViewModeRef.current;

      // If switching from calendar to list, or if list filters have no date set
      if (
        (prevView === 'calendar' && viewMode === 'list') ||
        (viewMode === 'list' && !listFilters.dateFrom)
      ) {
        syncDateFromCalendar(selectedDate);
      }

      prevViewModeRef.current = viewMode;
    }
  }, [viewMode, viewLoaded, selectedDate, listFilters.dateFrom, syncDateFromCalendar]);

  const debouncedSearch = useDebounce(listSearch, 300);

  // Build query filters for list view
  // Multi-select within group = OR, across groups = AND
  const queryFilters: AppointmentFiltersType = useMemo(
    () => ({
      page: listPage,
      limit: listLimit,
      branchId: branchId || undefined,
      search: debouncedSearch || undefined,
      dateFrom: listFilters.dateFrom,
      dateTo: listFilters.dateTo,
      // Arrays for multi-select (backend handles as OR within each)
      status:
        listFilters.statuses.length > 0
          ? (listFilters.statuses as AppointmentStatus | AppointmentStatus[])
          : undefined,
      bookingType:
        listFilters.bookingTypes.length > 0
          ? (listFilters.bookingTypes as BookingType | BookingType[])
          : undefined,
      // Backend now supports stylistId as array
      stylistId:
        listFilters.stylistIds.length > 0
          ? (listFilters.stylistIds as string | string[])
          : undefined,
      // Sort by date and time ascending (backend handles both fields)
      sortOrder: 'asc',
    }),
    [listPage, listLimit, branchId, debouncedSearch, listFilters]
  );

  // Queries
  const { data: appointmentsData, isLoading: isLoadingList } = useAppointments(queryFilters, {
    enabled: viewMode === 'list',
  });
  const { data: calendarData, isLoading: isLoadingCalendar } = useResourceCalendar(
    {
      branchId: branchId || '',
      date: selectedDate,
      view: 'day',
    },
    { enabled: viewMode === 'calendar' && !!branchId }
  );

  // Badge counts
  const { data: unassignedCountData } = useUnassignedCount(branchId || '');
  const unassignedCount = unassignedCountData?.count || 0;

  // Mutations
  const markNoShow = useMarkNoShow();
  const moveAppointment = useMoveAppointment();

  // Handlers
  const handleView = useCallback(
    (id: string) => openAppointmentDetails(id),
    [openAppointmentDetails]
  );

  const handleFiltersChange = useCallback(
    (newFilters: ListFiltersState) => setListFilters(newFilters),
    [setListFilters]
  );

  const handlePageChange = useCallback((newPage: number) => setListPage(newPage), [setListPage]);

  const handlePageSizeChange = useCallback(
    (newLimit: number) => {
      setListLimit(newLimit);
      setListPage(1);
    },
    [setListLimit, setListPage]
  );

  const confirmNoShow = useCallback(async () => {
    if (noShowId) {
      await markNoShow.mutateAsync(noShowId);
      setNoShowId(null);
    }
  }, [markNoShow, noShowId]);

  const handleAppointmentClick = useCallback(
    (appointmentId: string) => openAppointmentDetails(appointmentId),
    [openAppointmentDetails]
  );

  const handleSlotClick = useCallback(
    (stylistId: string, date: string, time: string) => {
      if (!canWrite) return;
      openNewAppointment({ stylistId, date, time });
    },
    [canWrite, openNewAppointment]
  );

  const handleAppointmentMove = useCallback(
    (appointmentId: string, newStylistId: string | undefined, newDate: string, newTime: string) => {
      if (newStylistId) {
        const stylist = calendarData?.stylists.find((s) => s.id === newStylistId);
        setConfirmMove({
          appointmentId,
          newStylistId,
          newDate,
          newTime,
          stylistName: stylist?.name,
        });
      } else {
        moveAppointment.mutate({ appointmentId, newDate, newTime });
      }
    },
    [calendarData?.stylists, moveAppointment]
  );

  const handleConfirmMove = useCallback(() => {
    if (!confirmMove) return;
    moveAppointment.mutate({
      appointmentId: confirmMove.appointmentId,
      newStylistId: confirmMove.newStylistId,
      newDate: confirmMove.newDate,
      newTime: confirmMove.newTime,
    });
    setConfirmMove(null);
  }, [confirmMove, moveAppointment]);

  const handleNewAppointment = useCallback(() => openNewAppointment(), [openNewAppointment]);

  const listFilterCount =
    (listFilters.statuses.length > 0 ? 1 : 0) +
    (listFilters.bookingTypes.length > 0 ? 1 : 0) +
    (listFilters.stylistIds.length > 0 ? 1 : 0);
  const calendarFilterCount =
    (calendarFilters.stylistIds.length > 0 ? 1 : 0) + (calendarFilters.statuses.length > 0 ? 1 : 0);
  const hasListFilters = listFilterCount > 0;
  const appointments = appointmentsData?.data || [];
  const meta = appointmentsData?.meta;

  if (!viewLoaded) return null;

  return (
    <PermissionGuard permission={PERMISSIONS.APPOINTMENTS_READ} fallback={<AccessDenied />}>
      <PageContainer>
        <PageHeader
          title={t('list.title')}
          description={t('list.description')}
          actions={
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 mr-2">
                {unassignedCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1.5"
                    onClick={() => openUnassignedAppointments()}
                  >
                    <UserX className="h-4 w-4" />
                    <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                      {unassignedCount}
                    </Badge>
                  </Button>
                )}
              </div>

              <ToggleGroup
                type="single"
                value={viewMode}
                onValueChange={handleViewChange}
                className="rounded-lg border"
              >
                <ToggleGroupItem value="calendar" aria-label="Calendar view">
                  <Calendar className="h-4 w-4" />
                </ToggleGroupItem>
                <ToggleGroupItem value="list" aria-label="List view">
                  <List className="h-4 w-4" />
                </ToggleGroupItem>
              </ToggleGroup>

              {canWrite && (
                <Button onClick={handleNewAppointment}>
                  <Plus className="mr-2 h-4 w-4" />
                  {t('list.newAppointment')}
                </Button>
              )}
            </div>
          }
        />

        <PageContent className={viewMode === 'calendar' ? 'flex-1 overflow-hidden p-0' : ''}>
          {viewMode === 'calendar' ? (
            isMobile ? (
              <MobileCalendar
                data={calendarData}
                isLoading={isLoadingCalendar}
                onAppointmentClick={handleAppointmentClick}
                onSlotClick={handleSlotClick}
              />
            ) : (
              <ResourceCalendar
                data={calendarData}
                isLoading={isLoadingCalendar}
                onAppointmentClick={handleAppointmentClick}
                onSlotClick={handleSlotClick}
                onAppointmentMove={handleAppointmentMove}
                onFilterClick={() => setFilterOpen(true)}
                activeFilterCount={calendarFilterCount}
              />
            )
          ) : (
            <AppointmentTable
              data={appointments}
              meta={meta}
              isLoading={isLoadingList}
              page={listPage}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
              onView={handleView}
              hasFilters={hasListFilters || !!debouncedSearch}
              onFilterClick={() => setListFilterOpen(true)}
              activeFilterCount={listFilterCount}
              search={listSearch}
              onSearchChange={setListSearch}
            />
          )}
        </PageContent>

        <CalendarFiltersSheet
          open={filterOpen}
          onOpenChange={setFilterOpen}
          stylists={calendarData?.stylists || []}
        />

        <ListFiltersSheet
          open={listFilterOpen}
          onOpenChange={setListFilterOpen}
          filters={listFilters}
          onFiltersChange={handleFiltersChange}
        />

        <ConfirmDialog
          open={!!noShowId}
          onOpenChange={(open) => !open && setNoShowId(null)}
          title={t('list.confirmNoShowTitle')}
          description={t('list.confirmNoShowDescription')}
          variant="destructive"
          onConfirm={confirmNoShow}
          isLoading={markNoShow.isPending}
        />

        <ConfirmDialog
          open={!!confirmMove}
          onOpenChange={(open) => !open && setConfirmMove(null)}
          title="Change Stylist"
          description={`Are you sure you want to reassign this appointment to ${confirmMove?.stylistName || 'another stylist'}?`}
          confirmText="Reassign"
          onConfirm={handleConfirmMove}
          isLoading={moveAppointment.isPending}
        />
      </PageContainer>
    </PermissionGuard>
  );
}
