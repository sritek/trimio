'use client';

/**
 * Stations Settings Page
 * Manage station types (super_owner) and branch stations
 */

import { useState, useCallback, useMemo } from 'react';
import { Plus, Armchair } from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DataTable, EmptyState, ConfirmDialog } from '@/components/common';
import { useStationTypes, useDeleteStationType } from '@/hooks/queries/use-stations';
import { useAuthStore } from '@/stores/auth-store';
import { useBranchContext } from '@/hooks/use-branch-context';
import { getStationTypeColumns } from './components/station-type-columns';
import { StationTypeFormPanel } from './components/station-type-form-panel';
import { BranchStations } from './components/branch-stations';
import type { StationType } from '@/types/stations';

export default function StationsPage() {
  const user = useAuthStore((state) => state.user);
  const role = user?.role;
  const isSuperOwner = role === 'super_owner';
  const canManageStations = ['super_owner', 'regional_manager', 'branch_manager'].includes(
    role || ''
  );
  const { branchId } = useBranchContext();

  const { data: stationTypes, isLoading } = useStationTypes(branchId || undefined);
  const deleteMutation = useDeleteStationType();

  const [editingType, setEditingType] = useState<StationType | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deleteType, setDeleteType] = useState<StationType | null>(null);

  const handleCreate = useCallback(() => {
    setEditingType(null);
    setIsFormOpen(true);
  }, []);

  const handleEdit = useCallback((stationType: StationType) => {
    setEditingType(stationType);
    setIsFormOpen(true);
  }, []);

  const handleDelete = useCallback((stationType: StationType) => {
    setDeleteType(stationType);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!deleteType) return;
    try {
      await deleteMutation.mutateAsync(deleteType.id);
      toast.success('Station type deleted');
      setDeleteType(null);
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete station type');
    }
  }, [deleteType, deleteMutation]);

  const handleFormClose = useCallback(() => {
    setIsFormOpen(false);
    setEditingType(null);
  }, []);

  const columns = useMemo(
    () =>
      getStationTypeColumns({
        canWrite: isSuperOwner,
        onEdit: handleEdit,
        onDelete: handleDelete,
      }),
    [isSuperOwner, handleEdit, handleDelete]
  );

  const emptyState = (
    <EmptyState
      icon={Armchair}
      title="No station types"
      description="Create station types to categorize your workstations."
      action={
        isSuperOwner ? (
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add Station Type
          </Button>
        ) : undefined
      }
    />
  );

  return (
    <div className="space-y-6">
      {/* Station Types - super_owner only */}
      {isSuperOwner && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Armchair className="h-5 w-5" />
                Station Types
              </CardTitle>
              <CardDescription>
                Define types of workstations (e.g., Styling Chair, Wash Basin)
              </CardDescription>
            </div>
            <Button onClick={handleCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Add Type
            </Button>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={columns}
              data={stationTypes || []}
              isLoading={isLoading}
              loadingRows={5}
              emptyState={emptyState}
            />
          </CardContent>
        </Card>
      )}

      {/* Branch Stations - managers and above */}
      {canManageStations && <BranchStations />}

      {/* Form Panel */}
      <StationTypeFormPanel stationType={editingType} open={isFormOpen} onClose={handleFormClose} />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteType}
        onOpenChange={(open) => !open && setDeleteType(null)}
        title="Delete Station Type"
        description={`Are you sure you want to delete "${deleteType?.name}"? This action cannot be undone.`}
        variant="destructive"
        onConfirm={confirmDelete}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
