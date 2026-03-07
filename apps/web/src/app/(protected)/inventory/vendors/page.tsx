'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus } from 'lucide-react';

import {
  useVendors,
  useCreateVendor,
  useUpdateVendor,
  useDeleteVendor,
} from '@/hooks/queries/use-inventory';

import {
  ConfirmDialog,
  PageContainer,
  PageContent,
  PageHeader,
  SearchInput,
} from '@/components/common';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

import { VendorTable } from './components/vendor-table';

import type { Vendor, VendorFilters, CreateVendorInput } from '@/types/inventory';

export default function VendorsPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [isActiveFilter, setIsActiveFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filters: VendorFilters = {
    page,
    limit,
    search: search || undefined,
    isActive: isActiveFilter === 'all' ? undefined : isActiveFilter === 'active',
    sortBy: 'name',
    sortOrder: 'asc',
  };

  const { data: vendorsData, isLoading, error } = useVendors(filters);
  const createVendor = useCreateVendor();
  const updateVendor = useUpdateVendor();
  const deleteVendor = useDeleteVendor();

  const hasFilters = !!search || isActiveFilter !== 'all';

  const handlePageSizeChange = useCallback((newLimit: number) => {
    setLimit(newLimit);
    setPage(1);
  }, []);

  const handleOpenCreate = useCallback(() => {
    setEditingVendor(null);
    setIsDialogOpen(true);
  }, []);

  const handleOpenEdit = useCallback((vendor: Vendor) => {
    setEditingVendor(vendor);
    setIsDialogOpen(true);
  }, []);

  const handleViewProducts = useCallback(
    (id: string) => {
      router.push(`/inventory/vendors/${id}/products`);
    },
    [router]
  );

  const handleDelete = useCallback((id: string) => {
    setDeleteId(id);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (deleteId) {
      await deleteVendor.mutateAsync(deleteId);
      setDeleteId(null);
    }
  }, [deleteId, deleteVendor]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const data: CreateVendorInput = {
      name: formData.get('name') as string,
      contactPerson: formData.get('contactPerson') as string,
      phone: formData.get('phone') as string,
      email: (formData.get('email') as string) || null,
      address: (formData.get('address') as string) || null,
      city: (formData.get('city') as string) || null,
      state: (formData.get('state') as string) || null,
      pincode: (formData.get('pincode') as string) || null,
      gstin: (formData.get('gstin') as string) || null,
      paymentTermsDays: formData.get('paymentTermsDays')
        ? parseInt(formData.get('paymentTermsDays') as string)
        : null,
      leadTimeDays: formData.get('leadTimeDays')
        ? parseInt(formData.get('leadTimeDays') as string)
        : null,
      isActive: formData.get('isActive') === 'on',
    };

    try {
      if (editingVendor) {
        await updateVendor.mutateAsync({ id: editingVendor.id, data });
      } else {
        await createVendor.mutateAsync(data);
      }
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Failed to save vendor:', error);
    }
  };

  const isPending = createVendor.isPending || updateVendor.isPending;

  return (
    <PageContainer>
      <PageHeader
        title="Vendors"
        description="Manage your inventory suppliers"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/inventory/products">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Products
              </Link>
            </Button>
            <Button onClick={handleOpenCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Add Vendor
            </Button>
          </div>
        }
      />

      <PageContent>
        {/* Filters */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4 flex-shrink-0">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search vendors..."
            className="flex-1 max-w-sm"
          />

          <Select value={isActiveFilter} onValueChange={setIsActiveFilter}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <VendorTable
          data={vendorsData?.data || []}
          meta={vendorsData?.meta}
          isLoading={isLoading}
          error={error}
          page={page}
          onPageChange={setPage}
          onPageSizeChange={handlePageSizeChange}
          onViewProducts={handleViewProducts}
          onEdit={handleOpenEdit}
          onDelete={handleDelete}
          onCreateNew={handleOpenCreate}
          hasFilters={hasFilters}
        />
      </PageContent>

      {/* Create/Edit Dialog */}
      <VendorDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        vendor={editingVendor}
        onSubmit={handleSubmit}
        isPending={isPending}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete Vendor"
        description="Are you sure you want to delete this vendor? This action cannot be undone."
        variant="destructive"
        onConfirm={confirmDelete}
        isLoading={deleteVendor.isPending}
      />
    </PageContainer>
  );
}

// Vendor Dialog Component
function VendorDialog({
  isOpen,
  onClose,
  vendor,
  onSubmit,
  isPending,
}: {
  isOpen: boolean;
  onClose: () => void;
  vendor: Vendor | null;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  isPending: boolean;
}) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{vendor ? 'Edit Vendor' : 'Create Vendor'}</DialogTitle>
          <DialogDescription>
            {vendor
              ? 'Update the vendor details below.'
              : 'Add a new vendor to your supplier list.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit}>
          <div className="grid gap-4 py-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Company Name *</Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={vendor?.name || ''}
                  placeholder="e.g., ABC Supplies Pvt Ltd"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="contactPerson">Contact Person *</Label>
                <Input
                  id="contactPerson"
                  name="contactPerson"
                  defaultValue={vendor?.contactPerson || ''}
                  placeholder="e.g., John Doe"
                  required
                />
              </div>
            </div>

            {/* Contact Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="phone">Phone *</Label>
                <Input
                  id="phone"
                  name="phone"
                  defaultValue={vendor?.phone || ''}
                  placeholder="e.g., 9876543210"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={vendor?.email || ''}
                  placeholder="e.g., vendor@example.com"
                />
              </div>
            </div>

            {/* Address */}
            <div className="grid gap-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                name="address"
                defaultValue={vendor?.address || ''}
                placeholder="Street address..."
                className="resize-none"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  name="city"
                  defaultValue={vendor?.city || ''}
                  placeholder="e.g., Mumbai"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  name="state"
                  defaultValue={vendor?.state || ''}
                  placeholder="e.g., Maharashtra"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="pincode">Pincode</Label>
                <Input
                  id="pincode"
                  name="pincode"
                  defaultValue={vendor?.pincode || ''}
                  placeholder="e.g., 400001"
                />
              </div>
            </div>

            {/* Business Info */}
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="gstin">GSTIN</Label>
                <Input
                  id="gstin"
                  name="gstin"
                  defaultValue={vendor?.gstin || ''}
                  placeholder="e.g., 27AABCU9603R1ZM"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="paymentTermsDays">Payment Terms (Days)</Label>
                <Input
                  id="paymentTermsDays"
                  name="paymentTermsDays"
                  type="number"
                  min="0"
                  defaultValue={vendor?.paymentTermsDays || ''}
                  placeholder="e.g., 30"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="leadTimeDays">Lead Time (Days)</Label>
                <Input
                  id="leadTimeDays"
                  name="leadTimeDays"
                  type="number"
                  min="0"
                  defaultValue={vendor?.leadTimeDays || ''}
                  placeholder="e.g., 7"
                />
              </div>
            </div>

            {/* Status */}
            <div className="flex items-center gap-2">
              <Checkbox id="isActive" name="isActive" defaultChecked={vendor?.isActive ?? true} />
              <Label htmlFor="isActive" className="font-normal">
                Active
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving...' : vendor ? 'Save Changes' : 'Create Vendor'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
