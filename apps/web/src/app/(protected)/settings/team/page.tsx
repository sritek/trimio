'use client';

/**
 * Team Management Page
 * List, create, edit, and delete users
 */

import { useState, useCallback, useMemo } from 'react';
import { Users, Plus } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DataTable, EmptyState, SearchInput, ConfirmDialog } from '@/components/common';
import { useUsers, useDeleteUser, type User } from '@/hooks/queries/use-users';
import { toast } from 'sonner';
import { getUserColumns } from './components/user-columns';
import { UserPanel } from './components/user-panel';

export default function TeamPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);

  const { data: usersData, isLoading } = useUsers({ page, limit, search });
  const deleteUser = useDeleteUser();

  const handleEdit = useCallback((user: User) => {
    setEditingUser(user);
  }, []);

  const handleDelete = useCallback((id: string) => {
    setDeleteUserId(id);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (deleteUserId) {
      try {
        await deleteUser.mutateAsync(deleteUserId);
        toast.success('User deleted successfully');
        setDeleteUserId(null);
      } catch (error: any) {
        toast.error(error.message || 'Failed to delete user');
      }
    }
  }, [deleteUserId, deleteUser]);

  const columns = useMemo(
    () => getUserColumns({ onEdit: handleEdit, onDelete: handleDelete }),
    [handleEdit, handleDelete]
  );

  const handlePageSizeChange = useCallback((newLimit: number) => {
    setLimit(newLimit);
    setPage(1);
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  const emptyState = (
    <EmptyState
      icon={Users}
      title="No team members"
      description={search ? 'No users match your search.' : 'Add your first team member.'}
      action={
        !search ? (
          <Button onClick={() => setIsCreating(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add User
          </Button>
        ) : undefined
      }
    />
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Team Members
              </CardTitle>
              <CardDescription>Manage your team and their access permissions</CardDescription>
            </div>
            <Button onClick={() => setIsCreating(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add User
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <SearchInput
            value={search}
            onChange={handleSearchChange}
            placeholder="Search by name, phone, or email..."
            className="max-w-sm"
          />

          <DataTable
            columns={columns}
            data={usersData?.data || []}
            isLoading={isLoading}
            loadingRows={5}
            emptyState={emptyState}
            pagination={
              usersData?.meta
                ? {
                    page,
                    limit: usersData.meta.limit,
                    total: usersData.meta.total,
                    totalPages: usersData.meta.totalPages,
                  }
                : undefined
            }
            onPageChange={setPage}
            onPageSizeChange={handlePageSizeChange}
          />
        </CardContent>
      </Card>

      {/* Create/Edit Panel */}
      <UserPanel
        user={editingUser}
        open={isCreating || !!editingUser}
        onClose={() => {
          setIsCreating(false);
          setEditingUser(null);
        }}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteUserId}
        onOpenChange={(open) => !open && setDeleteUserId(null)}
        title="Delete User"
        description="Are you sure you want to delete this user? This action cannot be undone."
        variant="destructive"
        onConfirm={confirmDelete}
        isLoading={deleteUser.isPending}
      />
    </div>
  );
}
