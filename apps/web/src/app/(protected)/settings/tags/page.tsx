'use client';

import { useState } from 'react';
import { Plus, Trash2, Tag } from 'lucide-react';

import { PERMISSIONS } from '@trimio/shared';

import { useCustomTags, useCreateTag, useDeleteTag } from '@/hooks/queries/use-customers';
import { usePermissions } from '@/hooks/use-permissions';

import {
  AccessDenied,
  ConfirmDialog,
  EmptyState,
  PageContainer,
  PageContent,
  PageHeader,
  PermissionGuard,
} from '@/components/common';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';

const PRESET_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
];

const SYSTEM_TAGS = [
  { name: 'New', description: 'Automatically assigned to new customers' },
  { name: 'Regular', description: 'Customers with 5+ visits' },
  { name: 'VIP', description: 'High-value customers' },
  { name: 'Inactive', description: 'No visits in 90+ days' },
];

export default function TagsSettingsPage() {
  const { hasPermission } = usePermissions();
  const canManage = hasPermission(PERMISSIONS.CUSTOMERS_MANAGE);

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(PRESET_COLORS[0]);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: customTags, isLoading } = useCustomTags();
  const createTag = useCreateTag();
  const deleteTag = useDeleteTag();

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    await createTag.mutateAsync({ name: newTagName.trim(), color: newTagColor });
    setShowCreateDialog(false);
    setNewTagName('');
    setNewTagColor(PRESET_COLORS[0]);
  };

  const handleDeleteTag = (id: string) => {
    setDeleteId(id);
  };

  const confirmDeleteTag = async () => {
    if (deleteId) {
      await deleteTag.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  return (
    <PermissionGuard permission={PERMISSIONS.CUSTOMERS_READ} fallback={<AccessDenied />}>
      <PageContainer>
        <PageHeader
          title="Customer Tags"
          description="Manage tags for customer segmentation"
          actions={
            canManage && (
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Tag
              </Button>
            )
          }
        />

        <PageContent>
          <div className="grid gap-6 md:grid-cols-2">
            {/* System Tags */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">System Tags</CardTitle>
                <CardDescription>
                  These tags are automatically managed by the system
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {SYSTEM_TAGS.map((tag) => (
                    <div
                      key={tag.name}
                      className="flex items-center justify-between py-2 border-b last:border-0"
                    >
                      <div>
                        <Badge variant="secondary">{tag.name}</Badge>
                        <p className="text-sm text-muted-foreground mt-1">{tag.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Custom Tags */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Custom Tags</CardTitle>
                <CardDescription>Create your own tags for customer segmentation</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-10 w-full" />
                    ))}
                  </div>
                ) : !customTags || customTags.length === 0 ? (
                  <EmptyState
                    icon={Tag}
                    title="No custom tags"
                    description="Create custom tags to segment your customers"
                    action={
                      canManage && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowCreateDialog(true)}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Create Tag
                        </Button>
                      )
                    }
                  />
                ) : (
                  <div className="space-y-3">
                    {customTags.map((tag) => (
                      <div
                        key={tag.id}
                        className="flex items-center justify-between py-2 border-b last:border-0"
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: tag.color || '#6b7280' }}
                          />
                          <span className="font-medium">{tag.name}</span>
                        </div>
                        {canManage && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteTag(tag.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </PageContent>

        {/* Create Tag Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Custom Tag</DialogTitle>
              <DialogDescription>Create a new tag for customer segmentation</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Tag Name</Label>
                <Input
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder="e.g., Premium, Referral, Corporate"
                />
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex gap-2 flex-wrap">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewTagColor(color)}
                      className={`h-8 w-8 rounded-full border-2 transition-all ${
                        newTagColor === color ? 'border-foreground scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateTag}
                disabled={!newTagName.trim() || createTag.isPending}
              >
                {createTag.isPending ? 'Creating...' : 'Create Tag'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Tag Confirmation */}
        <ConfirmDialog
          open={!!deleteId}
          onOpenChange={(open) => !open && setDeleteId(null)}
          title="Delete Tag"
          description="Are you sure you want to delete this tag? It will be removed from all customers."
          variant="destructive"
          onConfirm={confirmDeleteTag}
          isLoading={deleteTag.isPending}
        />
      </PageContainer>
    </PermissionGuard>
  );
}
