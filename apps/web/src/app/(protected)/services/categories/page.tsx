'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Folder, FolderPlus, Pencil, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import {
  useCategories,
  useCreateCategory,
  useDeleteCategory,
  useUpdateCategory,
} from '@/hooks/queries/use-categories';

import {
  ActionMenu,
  ConfirmDialog,
  EmptyState,
  PageContainer,
  PageContent,
  PageHeader,
} from '@/components/common';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

import type { ServiceCategory } from '@/types/services';

const categorySchema = z.object({
  name: z.string().min(1, 'Name is required').min(2, 'Name must be at least 2 characters'),
  description: z.string().optional(),
  color: z.string().default('#6B7280'),
  isActive: z.boolean().default(true),
});

type CategoryFormData = z.infer<typeof categorySchema>;

export default function CategoriesPage() {
  const t = useTranslations('common');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ServiceCategory | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: categories, isLoading } = useCategories({
    includeInactive: true,
    flat: true,
  });
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();

  const form = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: '',
      description: '',
      color: '#6B7280',
      isActive: true,
    },
  });

  // Reset form when dialog opens/closes or editing category changes
  useEffect(() => {
    if (isDialogOpen) {
      if (editingCategory) {
        form.reset({
          name: editingCategory.name,
          description: editingCategory.description || '',
          color: editingCategory.color || '#6B7280',
          isActive: editingCategory.isActive,
        });
      } else {
        form.reset({
          name: '',
          description: '',
          color: '#6B7280',
          isActive: true,
        });
      }
    }
  }, [isDialogOpen, editingCategory, form]);

  const handleOpenCreate = () => {
    setEditingCategory(null);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (category: ServiceCategory) => {
    setEditingCategory(category);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setDeleteId(id);
  };

  const confirmDelete = async () => {
    if (deleteId) {
      await deleteCategory.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  const onSubmit = async (data: CategoryFormData) => {
    try {
      if (editingCategory) {
        await updateCategory.mutateAsync({ id: editingCategory.id, data });
      } else {
        await createCategory.mutateAsync(data);
      }
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Failed to save category:', error);
    }
  };

  const isPending = createCategory.isPending || updateCategory.isPending;

  return (
    <PageContainer>
      <PageHeader
        title="Service Categories"
        description="Organize your services into categories"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/services">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Services
              </Link>
            </Button>
            <Button onClick={handleOpenCreate}>
              <FolderPlus className="mr-2 h-4 w-4" />
              Add Category
            </Button>
          </div>
        }
      />

      <PageContent>
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        ) : !categories || categories.length === 0 ? (
          <EmptyState
            icon={Folder}
            title="No categories"
            description="Create your first category to start organizing services."
            action={
              <Button onClick={handleOpenCreate}>
                <FolderPlus className="mr-2 h-4 w-4" />
                Add Category
              </Button>
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => (
              <div
                key={category.id}
                className="group relative rounded-lg border p-4 hover:shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-10 w-10 rounded-lg"
                      style={{ backgroundColor: category.color + '20' }}
                    >
                      <div
                        className="flex h-full w-full items-center justify-center rounded-lg"
                        style={{ color: category.color }}
                      >
                        <span className="text-lg font-bold">{category.name.charAt(0)}</span>
                      </div>
                    </div>
                    <div>
                      <h3 className="font-medium">{category.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {category._count?.services || 0} services
                      </p>
                    </div>
                  </div>

                  <ActionMenu
                    items={[
                      {
                        label: 'Edit',
                        icon: Pencil,
                        onClick: () => handleOpenEdit(category),
                      },
                      {
                        label: 'Delete',
                        icon: Trash2,
                        onClick: () => handleDelete(category.id),
                        variant: 'destructive',
                        separator: true,
                      },
                    ]}
                  />
                </div>

                {category.description && (
                  <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                    {category.description}
                  </p>
                )}

                <div className="mt-3 flex gap-2">
                  <Badge variant={category.isActive ? 'default' : 'secondary'}>
                    {category.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </PageContent>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'Edit Category' : 'Create Category'}</DialogTitle>
            <DialogDescription>
              {editingCategory
                ? 'Update the category details below.'
                : 'Add a new category to organize your services.'}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Hair Services" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Brief description..."
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Color</FormLabel>
                    <FormControl>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={field.value}
                          onChange={field.onChange}
                          className="h-10 w-20 p-1"
                        />
                        <Input
                          type="text"
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="#6B7280"
                          className="flex-1"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel className="font-normal">Active</FormLabel>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? 'Saving...' : editingCategory ? 'Save Changes' : 'Create Category'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title={t('confirmDelete.title')}
        description={t('confirmDelete.description')}
        variant="destructive"
        onConfirm={confirmDelete}
        isLoading={deleteCategory.isPending}
      />
    </PageContainer>
  );
}
