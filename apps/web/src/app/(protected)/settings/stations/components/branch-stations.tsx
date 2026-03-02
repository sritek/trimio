'use client';

/**
 * Branch Stations Management
 * Manage stations for a specific branch
 */

import { useState, useCallback, useMemo } from 'react';
import { Plus, Layers, Armchair } from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DataTable, EmptyState, ConfirmDialog } from '@/components/common';
import { useStations, useUpdateStation, useDeleteStation } from '@/hooks/queries/use-stations';
import { useBranches, type Branch } from '@/hooks/queries/use-branches';
import { useAuthStore } from '@/stores/auth-store';
import { getStationColumns } from './station-columns';
import { StationFormPanel } from './station-form-panel';
import { BulkCreatePanel } from './bulk-create-panel';
import type { Station } from '@/types/stations';

export function BranchStations() {
  const user = useAuthStore((state) => state.user);
  const branchIds = user?.branchIds || [];
  const role = user?.role;
  const canWrite = ['super_owner', 'regional_manager', 'branch_manager'].includes(role || '');

  const { data: branches } = useBranches(branchIds);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');

  // Auto-select first branch
  const activeBranchId = selectedBranchId || branches?.[0]?.id || '';

  const { data: stationsData, isLoading } = useStations(activeBranchId);
  const updateMutation = useUpdateStation(activeBranchId);
  const deleteMutation = useDeleteStation(activeBranchId);

  const [editingStation, setEditingStation] = useState<Station | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [deleteStation, setDeleteStation] = useState<Station | null>(null);

  const handleCreate = useCallback(() => {
    setEditingStation(null);
    setIsFormOpen(true);
  }, []);

  const handleBulkCreate = useCallback(() => {
    setIsBulkOpen(true);
  }, []);

  const handleEdit = useCallback((station: Station) => {
    setEditingStation(station);
    setIsFormOpen(true);
  }, []);

  const handleDelete = useCallback((station: Station) => {
    setDeleteStation(station);
  }, []);

  const handleToggleStatus = useCallback(
    async (station: Station) => {
      try {
        const newStatus = station.status === 'active' ? 'out_of_service' : 'active';
        await updateMutation.mutateAsync({
          id: station.id,
          data: { status: newStatus },
        });
        toast.success(
          newStatus === 'active' ? 'Station marked as active' : 'Station marked out of service'
        );
      } catch (error: any) {
        toast.error(error.message || 'Failed to update station status');
      }
    },
    [updateMutation]
  );

  const confirmDelete = useCallback(async () => {
    if (!deleteStation) return;
    try {
      await deleteMutation.mutateAsync(deleteStation.id);
      toast.success('Station deleted');
      setDeleteStation(null);
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete station');
    }
  }, [deleteStation, deleteMutation]);

  const handleFormClose = useCallback(() => {
    setIsFormOpen(false);
    setEditingStation(null);
  }, []);

  const columns = useMemo(
    () =>
      getStationColumns({
        canWrite,
        onEdit: handleEdit,
        onDelete: handleDelete,
        onToggleStatus: handleToggleStatus,
      }),
    [canWrite, handleEdit, handleDelete, handleToggleStatus]
  );

  const stations = stationsData?.data || [];

  const emptyState = (
    <EmptyState
      icon={Armchair}
      title="No stations"
      description={
        activeBranchId
          ? 'Add workstations to this branch to start managing your floor.'
          : 'Select a branch to manage its stations.'
      }
      action={
        canWrite && activeBranchId ? (
          <div className="flex gap-2">
            <Button onClick={handleCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Add Station
            </Button>
            <Button variant="outline" onClick={handleBulkCreate}>
              <Layers className="mr-2 h-4 w-4" />
              Bulk Create
            </Button>
          </div>
        ) : undefined
      }
    />
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Armchair className="h-5 w-5" />
            Branch Stations
          </CardTitle>
          <CardDescription>Manage workstations for each branch</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          {branches && branches.length > 1 && (
            <Select value={activeBranchId} onValueChange={setSelectedBranchId}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select branch" />
              </SelectTrigger>
              <SelectContent>
                {branches.map((branch: Branch) => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {canWrite && activeBranchId && (
            <>
              <Button variant="outline" onClick={handleBulkCreate}>
                <Layers className="mr-2 h-4 w-4" />
                Bulk
              </Button>
              <Button onClick={handleCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Add
              </Button>
            </>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <DataTable
          columns={columns}
          data={stations}
          isLoading={isLoading}
          loadingRows={5}
          emptyState={emptyState}
        />
      </CardContent>

      {/* Form Panel */}
      {activeBranchId && (
        <StationFormPanel
          branchId={activeBranchId}
          station={editingStation}
          open={isFormOpen}
          onClose={handleFormClose}
        />
      )}

      {/* Bulk Create Panel */}
      {activeBranchId && (
        <BulkCreatePanel
          branchId={activeBranchId}
          open={isBulkOpen}
          onClose={() => setIsBulkOpen(false)}
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteStation}
        onOpenChange={(open) => !open && setDeleteStation(null)}
        title="Delete Station"
        description={`Are you sure you want to delete "${deleteStation?.name}"? This action cannot be undone.`}
        variant="destructive"
        onConfirm={confirmDelete}
        isLoading={deleteMutation.isPending}
      />
    </Card>
  );
}
