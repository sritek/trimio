'use client';

import { useState, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

import { PERMISSIONS } from '@trimio/shared';

import { useWaitlist, useDeleteWaitlistEntry } from '@/hooks/queries/use-waitlist';
import { usePermissions } from '@/hooks/use-permissions';
import { useBranchContext } from '@/hooks/use-branch-context';

import {
  AccessDenied,
  ConfirmDialog,
  PageContainer,
  PageContent,
  PageHeader,
  PermissionGuard,
  SearchInput,
} from '@/components/common';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { WaitlistTable } from './components/waitlist-table';
import { AddWaitlistDialog } from './components/add-waitlist-dialog';

import type { WaitlistEntry, WaitlistStatus } from '@/types/waitlist';

export default function WaitlistPage() {
  const { hasPermission } = usePermissions();
  const { branchId: activeBranchId } = useBranchContext();
  const canWrite = hasPermission(PERMISSIONS.APPOINTMENTS_WRITE);

  // State
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<WaitlistStatus | 'all'>('active');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_selectedEntry, setSelectedEntry] = useState<WaitlistEntry | null>(null);

  // Queries
  const { data: waitlistData, isLoading } = useWaitlist({
    branchId: activeBranchId || undefined,
    status: status !== 'all' ? status : undefined,
    page,
    limit,
  });
  const deleteWaitlistEntry = useDeleteWaitlistEntry();

  // Handlers
  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  const handleStatusChange = useCallback((value: string) => {
    setStatus(value as WaitlistStatus | 'all');
    setPage(1);
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const handlePageSizeChange = useCallback((newLimit: number) => {
    setLimit(newLimit);
    setPage(1);
  }, []);

  const handleDelete = useCallback((id: string) => {
    setDeleteId(id);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (deleteId) {
      try {
        await deleteWaitlistEntry.mutateAsync(deleteId);
        toast.success('Entry removed from waitlist');
        setDeleteId(null);
      } catch {
        toast.error('Failed to remove entry');
      }
    }
  }, [deleteId, deleteWaitlistEntry]);

  const handleCreateAppointment = useCallback((entry: WaitlistEntry) => {
    setSelectedEntry(entry);
    // TODO: Open new appointment panel with pre-filled data
    toast.info('Create appointment from waitlist - coming soon');
  }, []);

  const hasFilters = search !== '' || status !== 'active';

  return (
    <PermissionGuard permission={PERMISSIONS.APPOINTMENTS_READ} fallback={<AccessDenied />}>
      <PageContainer>
        <PageHeader
          title="Waitlist"
          description="Customers waiting for appointment slots"
          actions={
            canWrite && (
              <Button onClick={() => setAddDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add to Waitlist
              </Button>
            )
          }
        />

        <PageContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-4 flex-shrink-0">
            <SearchInput
              value={search}
              onChange={handleSearchChange}
              placeholder="Search by name or phone..."
              className="w-full sm:w-64"
            />
            <Select value={status} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="converted">Converted</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="removed">Removed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <WaitlistTable
            data={waitlistData?.data || []}
            meta={waitlistData?.meta}
            isLoading={isLoading}
            canWrite={canWrite}
            page={page}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            onCreateAppointment={handleCreateAppointment}
            onDelete={handleDelete}
            hasFilters={hasFilters}
          />
        </PageContent>

        {/* Add Dialog */}
        <AddWaitlistDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} />

        {/* Delete Confirmation */}
        <ConfirmDialog
          open={!!deleteId}
          onOpenChange={(open) => !open && setDeleteId(null)}
          title="Remove from Waitlist"
          description="Are you sure you want to remove this entry from the waitlist? This action cannot be undone."
          variant="destructive"
          onConfirm={confirmDelete}
          isLoading={deleteWaitlistEntry.isPending}
        />
      </PageContainer>
    </PermissionGuard>
  );
}
