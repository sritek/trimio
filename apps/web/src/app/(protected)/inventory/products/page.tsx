'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';

import {
  useProducts,
  useProductCategories,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
} from '@/hooks/queries/use-inventory';
import { useProductLimitStatus } from '@/hooks/use-limit-status';

import {
  ConfirmDialog,
  LimitBanner,
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import { ProductTable } from './components/product-table';

import type {
  Product,
  ProductFilters,
  CreateProductInput,
  ProductType,
  UnitOfMeasure,
} from '@/types/inventory';

export default function ProductsPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState<string>('all');
  const [productType, setProductType] = useState<string>('all');
  const [isActiveFilter, setIsActiveFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filters: ProductFilters = {
    page,
    limit,
    search: search || undefined,
    categoryId: categoryId !== 'all' ? categoryId : undefined,
    productType: productType !== 'all' ? (productType as ProductType) : undefined,
    isActive: isActiveFilter === 'all' ? undefined : isActiveFilter === 'active',
    sortBy: 'name',
    sortOrder: 'asc',
  };

  const { data: productsData, isLoading, error } = useProducts(filters);
  const { data: categories } = useProductCategories({ isActive: true });
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const {
    current: productCount,
    limit: productLimit,
    isAtLimit,
    isNearLimit,
  } = useProductLimitStatus();

  const hasFilters =
    !!search || categoryId !== 'all' || productType !== 'all' || isActiveFilter !== 'all';

  const handlePageSizeChange = useCallback((newLimit: number) => {
    setLimit(newLimit);
    setPage(1);
  }, []);

  const handleOpenCreate = useCallback(() => {
    setEditingProduct(null);
    setIsDialogOpen(true);
  }, []);

  const handleOpenEdit = useCallback((product: Product) => {
    setEditingProduct(product);
    setIsDialogOpen(true);
  }, []);

  const handleView = useCallback(
    (id: string) => {
      router.push(`/inventory/products/${id}`);
    },
    [router]
  );

  const handleDelete = useCallback((id: string) => {
    setDeleteId(id);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (deleteId) {
      await deleteProduct.mutateAsync(deleteId);
      setDeleteId(null);
    }
  }, [deleteId, deleteProduct]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const data: CreateProductInput = {
      categoryId: formData.get('categoryId') as string,
      name: formData.get('name') as string,
      sku: (formData.get('sku') as string) || null,
      barcode: (formData.get('barcode') as string) || null,
      description: (formData.get('description') as string) || null,
      productType: formData.get('productType') as ProductType,
      unitOfMeasure: formData.get('unitOfMeasure') as UnitOfMeasure,
      defaultPurchasePrice: parseFloat(formData.get('defaultPurchasePrice') as string) || 0,
      defaultSellingPrice: parseFloat(formData.get('defaultSellingPrice') as string) || 0,
      taxRate: parseFloat(formData.get('taxRate') as string) || 18,
      hsnCode: (formData.get('hsnCode') as string) || null,
      expiryTrackingEnabled: formData.get('expiryTrackingEnabled') === 'on',
      isActive: formData.get('isActive') === 'on',
    };

    try {
      if (editingProduct) {
        await updateProduct.mutateAsync({ id: editingProduct.id, data });
      } else {
        await createProduct.mutateAsync(data);
      }
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Failed to save product:', error);
    }
  };

  const isPending = createProduct.isPending || updateProduct.isPending;

  return (
    <PageContainer>
      <PageHeader
        title="Products"
        description="Manage your inventory products"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/inventory/categories">Categories</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/inventory/vendors">Vendors</Link>
            </Button>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button onClick={handleOpenCreate} disabled={isAtLimit}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Product
                    </Button>
                  </span>
                </TooltipTrigger>
                {isAtLimit && (
                  <TooltipContent>
                    <p>Product limit reached. Upgrade your plan to add more products.</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </div>
        }
      />

      <PageContent>
        {/* Limit Banner */}
        {(isAtLimit || isNearLimit) && (
          <LimitBanner
            type="products"
            current={productCount}
            limit={productLimit}
            className="mb-4"
          />
        )}
        {/* Filters */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4 flex-shrink-0">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search products..."
            className="flex-1 max-w-sm"
          />

          <div className="flex flex-wrap gap-2">
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories?.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.parentId ? `└ ${cat.name}` : cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={productType} onValueChange={setProductType}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="consumable">Consumable</SelectItem>
                <SelectItem value="retail">Retail</SelectItem>
                <SelectItem value="both">Both</SelectItem>
              </SelectContent>
            </Select>

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
        </div>

        {/* Table */}
        <ProductTable
          data={productsData?.data || []}
          meta={productsData?.meta}
          isLoading={isLoading}
          error={error}
          page={page}
          onPageChange={setPage}
          onPageSizeChange={handlePageSizeChange}
          onView={handleView}
          onEdit={handleOpenEdit}
          onDelete={handleDelete}
          onCreateNew={handleOpenCreate}
          hasFilters={hasFilters}
        />
      </PageContent>

      {/* Create/Edit Dialog */}
      <ProductDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        product={editingProduct}
        categories={categories || []}
        onSubmit={handleSubmit}
        isPending={isPending}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete Product"
        description="Are you sure you want to delete this product? This action cannot be undone."
        variant="destructive"
        onConfirm={confirmDelete}
        isLoading={deleteProduct.isPending}
      />
    </PageContainer>
  );
}

// Product Dialog Component
function ProductDialog({
  isOpen,
  onClose,
  product,
  categories,
  onSubmit,
  isPending,
}: {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  categories: { id: string; name: string; parentId?: string | null }[];
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  isPending: boolean;
}) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product ? 'Edit Product' : 'Create Product'}</DialogTitle>
          <DialogDescription>
            {product ? 'Update the product details below.' : 'Add a new product to your inventory.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit}>
          <div className="grid gap-4 py-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={product?.name || ''}
                  placeholder="e.g., Shampoo 500ml"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="categoryId">Category *</Label>
                <Select name="categoryId" defaultValue={product?.categoryId || ''} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.parentId ? `└ ${cat.name}` : cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* SKU and Barcode */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="sku">SKU</Label>
                <Input
                  id="sku"
                  name="sku"
                  defaultValue={product?.sku || ''}
                  placeholder="e.g., SHMP-001"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="barcode">Barcode</Label>
                <Input
                  id="barcode"
                  name="barcode"
                  defaultValue={product?.barcode || ''}
                  placeholder="e.g., 8901234567890"
                />
              </div>
            </div>

            {/* Type and Unit */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="productType">Product Type *</Label>
                <Select name="productType" defaultValue={product?.productType || 'retail'}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="consumable">Consumable (used in services)</SelectItem>
                    <SelectItem value="retail">Retail (sold to customers)</SelectItem>
                    <SelectItem value="both">Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="unitOfMeasure">Unit of Measure *</Label>
                <Select name="unitOfMeasure" defaultValue={product?.unitOfMeasure || 'pieces'}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ml">Milliliters (ml)</SelectItem>
                    <SelectItem value="gm">Grams (gm)</SelectItem>
                    <SelectItem value="pieces">Pieces</SelectItem>
                    <SelectItem value="bottles">Bottles</SelectItem>
                    <SelectItem value="sachets">Sachets</SelectItem>
                    <SelectItem value="tubes">Tubes</SelectItem>
                    <SelectItem value="boxes">Boxes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Pricing */}
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="defaultPurchasePrice">Purchase Price *</Label>
                <Input
                  id="defaultPurchasePrice"
                  name="defaultPurchasePrice"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={product?.defaultPurchasePrice || ''}
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="defaultSellingPrice">Selling Price *</Label>
                <Input
                  id="defaultSellingPrice"
                  name="defaultSellingPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={product?.defaultSellingPrice || ''}
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="taxRate">Tax Rate (%)</Label>
                <Input
                  id="taxRate"
                  name="taxRate"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  defaultValue={product?.taxRate || 18}
                  placeholder="18"
                />
              </div>
            </div>

            {/* HSN Code */}
            <div className="grid gap-2">
              <Label htmlFor="hsnCode">HSN Code</Label>
              <Input
                id="hsnCode"
                name="hsnCode"
                defaultValue={product?.hsnCode || ''}
                placeholder="e.g., 33051000"
              />
            </div>

            {/* Description */}
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                defaultValue={product?.description || ''}
                placeholder="Product description..."
                className="resize-none"
              />
            </div>

            {/* Checkboxes */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="expiryTrackingEnabled"
                  name="expiryTrackingEnabled"
                  defaultChecked={product?.expiryTrackingEnabled ?? false}
                />
                <Label htmlFor="expiryTrackingEnabled" className="font-normal">
                  Track Expiry Date
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="isActive"
                  name="isActive"
                  defaultChecked={product?.isActive ?? true}
                />
                <Label htmlFor="isActive" className="font-normal">
                  Active
                </Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving...' : product ? 'Save Changes' : 'Create Product'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
