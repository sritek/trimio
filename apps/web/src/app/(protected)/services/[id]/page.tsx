'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  AlertCircle,
  ArrowLeft,
  Clock,
  EditIcon,
  IndianRupee,
  Layers,
  Package,
  Percent,
  Plus,
  Trash2,
} from 'lucide-react';

import { useService } from '@/hooks/queries/use-services';
import {
  useVariants,
  useCreateVariant,
  useUpdateVariant,
  useDeleteVariant,
} from '@/hooks/queries/use-variants';
import {
  useServiceConsumables,
  useCreateServiceConsumable,
  useUpdateServiceConsumable,
  useDeleteServiceConsumable,
  useProducts,
} from '@/hooks/queries/use-inventory';
import { formatCurrency } from '@/lib/format';
import { isFeatureEnabled } from '@/config/features';

import {
  ConfirmDialog,
  EmptyState,
  PageContainer,
  PageContent,
  PageHeader,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { ServiceForm } from '../components/service-form';
import { VariantFormDialog } from '../components/variant-form-dialog';

import type { ServiceConsumableMapping } from '@/types/inventory';
import type { CreateVariantInput, ServiceVariant } from '@/types/services';

interface ServiceDetailPageProps {
  params: { id: string };
}

export default function ServiceDetailPage({ params }: ServiceDetailPageProps) {
  const id = params.id;
  const searchParams = useSearchParams();
  const isEditing = searchParams.get('edit') === 'true';
  const isInventoryEnabled = isFeatureEnabled('inventory');
  const t = useTranslations('common');

  // Consumable state
  const [addConsumableOpen, setAddConsumableOpen] = useState(false);
  const [editingConsumable, setEditingConsumable] = useState<ServiceConsumableMapping | null>(null);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [consumableQuantity, setConsumableQuantity] = useState('1');

  // Variant state
  const [variantDialogOpen, setVariantDialogOpen] = useState(false);
  const [editingVariant, setEditingVariant] = useState<ServiceVariant | null>(null);
  const [deleteVariantId, setDeleteVariantId] = useState<string | null>(null);

  const { data: service, isLoading, error } = useService(id);
  const { data: variants } = useVariants(id);

  // Variant mutations
  const createVariant = useCreateVariant();
  const updateVariant = useUpdateVariant();
  const deleteVariant = useDeleteVariant();

  // Only fetch consumables data if inventory is enabled
  const { data: consumables } = useServiceConsumables(isInventoryEnabled ? id : '');
  const { data: productsData } = useProducts(
    isInventoryEnabled ? { productType: 'consumable', isActive: true, limit: 100 } : {}
  );

  const createConsumableMutation = useCreateServiceConsumable();
  const updateConsumableMutation = useUpdateServiceConsumable();
  const deleteConsumableMutation = useDeleteServiceConsumable();

  // Variant handlers
  const handleOpenCreateVariant = () => {
    setEditingVariant(null);
    setVariantDialogOpen(true);
  };

  const handleOpenEditVariant = (variant: ServiceVariant) => {
    setEditingVariant(variant);
    setVariantDialogOpen(true);
  };

  const handleDeleteVariant = (variantId: string) => {
    setDeleteVariantId(variantId);
  };

  const confirmDeleteVariant = async () => {
    if (deleteVariantId) {
      await deleteVariant.mutateAsync({ serviceId: id, variantId: deleteVariantId });
      setDeleteVariantId(null);
    }
  };

  const handleVariantSubmit = async (data: CreateVariantInput) => {
    if (editingVariant) {
      await updateVariant.mutateAsync({
        serviceId: id,
        variantId: editingVariant.id,
        data,
      });
    } else {
      await createVariant.mutateAsync({ serviceId: id, data });
    }
    setVariantDialogOpen(false);
    setEditingVariant(null);
  };

  // Consumable handlers
  const handleAddConsumable = async () => {
    if (!selectedProductId || !consumableQuantity) return;
    try {
      await createConsumableMutation.mutateAsync({
        serviceId: id,
        productId: selectedProductId,
        quantityPerService: parseFloat(consumableQuantity),
      });
      setAddConsumableOpen(false);
      setSelectedProductId('');
      setConsumableQuantity('1');
    } catch (err) {
      console.error('Failed to add consumable:', err);
    }
  };

  const handleUpdateConsumable = async () => {
    if (!editingConsumable || !consumableQuantity) return;
    try {
      await updateConsumableMutation.mutateAsync({
        serviceId: id,
        productId: editingConsumable.productId,
        data: { quantityPerService: parseFloat(consumableQuantity) },
      });
      setEditingConsumable(null);
      setConsumableQuantity('1');
    } catch (err) {
      console.error('Failed to update consumable:', err);
    }
  };

  const handleDeleteConsumable = async (productId: string) => {
    try {
      await deleteConsumableMutation.mutateAsync({ serviceId: id, productId });
    } catch (err) {
      console.error('Failed to delete consumable:', err);
    }
  };

  const openEditConsumableDialog = (consumable: ServiceConsumableMapping) => {
    setEditingConsumable(consumable);
    setConsumableQuantity(consumable.quantityPerService.toString());
  };

  // Filter out already mapped products
  const availableProducts =
    productsData?.data?.filter(
      (product) => !consumables?.some((c) => c.productId === product.id)
    ) || [];

  const isVariantPending = createVariant.isPending || updateVariant.isPending;

  if (isLoading) {
    return (
      <PageContainer>
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-6 w-96" />
          <Skeleton className="h-64 w-full" />
        </div>
      </PageContainer>
    );
  }

  if (error || !service) {
    return (
      <PageContainer>
        <EmptyState
          icon={AlertCircle}
          title="Service not found"
          description="The service you're looking for doesn't exist or has been deleted."
          action={
            <Button asChild>
              <Link href="/services">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Services
              </Link>
            </Button>
          }
        />
      </PageContainer>
    );
  }

  if (isEditing) {
    return (
      <PageContainer>
        <PageHeader
          title="Edit Service"
          description={`Editing ${service.name}`}
          backHref={`/services/${id}`}
        />
        <PageContent>
          <ServiceForm service={service} />
        </PageContent>
      </PageContainer>
    );
  }

  // Build title with inline badges
  const titleWithBadges = (
    <div className="flex items-center gap-3">
      <span>{service.name}</span>
      <Badge variant={service.isActive ? 'default' : 'secondary'} className="text-xs">
        {service.isActive ? 'Active' : 'Inactive'}
      </Badge>
      {service.category && (
        <Badge
          variant="outline"
          className="text-xs"
          style={{ borderColor: service.category.color }}
        >
          {service.category.name}
        </Badge>
      )}
    </div>
  );

  return (
    <PageContainer>
      <PageHeader
        title={titleWithBadges}
        description={service.sku}
        backHref="/services"
        actions={
          <Button asChild>
            <Link href={`/services/${id}?edit=true`}>Edit Service</Link>
          </Button>
        }
      />

      <PageContent className="space-y-6">
        <Tabs defaultValue="details" className="w-full">
          <TabsList>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="variants">
              Variants {variants && variants.length > 0 && `(${variants.length})`}
            </TabsTrigger>
            {isInventoryEnabled && (
              <TabsTrigger value="consumables">
                Consumables {consumables && consumables.length > 0 && `(${consumables.length})`}
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="details" className="space-y-6">
            {/* Description */}
            {service.description && (
              <Card>
                <CardHeader>
                  <CardTitle>Description</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{service.description}</p>
                </CardContent>
              </Card>
            )}

            {/* Quick Info */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <IndianRupee className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Base Price</span>
                  </div>
                  <p className="mt-2 text-2xl font-bold">{formatCurrency(service.basePrice)}</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Duration</span>
                  </div>
                  <p className="mt-2 text-2xl font-bold">{service.durationMinutes} min</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <Percent className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Tax Rate</span>
                  </div>
                  <p className="mt-2 text-2xl font-bold">{service.taxRate}%</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <Percent className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Commission</span>
                  </div>
                  <p className="mt-2 text-2xl font-bold">
                    {service.commissionType === 'percentage'
                      ? `${service.commissionValue}%`
                      : formatCurrency(service.commissionValue)}
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 grid-cols-2">
              {/* Additional Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Additional Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <dt className="text-sm font-medium text-muted-foreground">Active Time</dt>
                      <dd className="mt-1">{service.activeTimeMinutes} minutes</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-muted-foreground">Processing Time</dt>
                      <dd className="mt-1">{service.processingTimeMinutes} minutes</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-muted-foreground">
                        Gender Applicable
                      </dt>
                      <dd className="mt-1 capitalize">{service.genderApplicable}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-muted-foreground">Tax Inclusive</dt>
                      <dd className="mt-1">{service.isTaxInclusive ? 'Yes' : 'No'}</dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>

              {/* Price Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>Price Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="space-y-4">
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Base Price</dt>
                      <dd className="font-medium">{formatCurrency(service.basePrice)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Tax ({service.taxRate}%)</dt>
                      <dd className="font-medium">
                        {service.isTaxInclusive
                          ? 'Included'
                          : formatCurrency(service.basePrice * (service.taxRate / 100))}
                      </dd>
                    </div>
                    <div className="border-t pt-4">
                      <div className="flex justify-between">
                        <dt className="font-medium">
                          {service.isTaxInclusive ? 'Total' : 'Total with Tax'}
                        </dt>
                        <dd className="text-lg font-bold">
                          {formatCurrency(
                            service.isTaxInclusive
                              ? service.basePrice
                              : service.basePrice * (1 + service.taxRate / 100)
                          )}
                        </dd>
                      </div>
                    </div>
                  </dl>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="variants" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={handleOpenCreateVariant}>
                <Plus className="mr-2 h-4 w-4" />
                Add Variant
              </Button>
            </div>

            {!variants || variants.length === 0 ? (
              <EmptyState
                icon={Layers}
                title="No variants"
                description="Add variants to offer different options for this service (e.g., hair length, style)."
                action={
                  <Button onClick={handleOpenCreateVariant}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Variant
                  </Button>
                }
              />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {variants.map((variant) => (
                  <div key={variant.id} className="group rounded-lg border p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{variant.name}</p>
                        <div className="mt-1 flex gap-2">
                          <Badge variant="outline">
                            {variant.priceAdjustmentType === 'percentage'
                              ? `${variant.priceAdjustment > 0 ? '+' : ''}${variant.priceAdjustment}%`
                              : `${variant.priceAdjustment > 0 ? '+' : ''}${formatCurrency(variant.priceAdjustment)}`}
                          </Badge>
                          {variant.durationAdjustment !== 0 && (
                            <Badge variant="outline">
                              {variant.durationAdjustment > 0 ? '+' : ''}
                              {variant.durationAdjustment} min
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1 items-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEditVariant(variant)}
                        >
                          <EditIcon className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteVariant(variant.id)}
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                    {!variant.isActive && (
                      <Badge variant="secondary" className="mt-2">
                        Inactive
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {isInventoryEnabled && (
            <TabsContent value="consumables" className="space-y-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Consumable Products</CardTitle>
                    <CardDescription>
                      Products that are automatically consumed when this service is completed
                    </CardDescription>
                  </div>
                  <Button onClick={() => setAddConsumableOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Consumable
                  </Button>
                </CardHeader>
                <CardContent>
                  {!consumables || consumables.length === 0 ? (
                    <EmptyState
                      icon={Package}
                      title="No consumables"
                      description="No products are linked to this service yet."
                    />
                  ) : (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Product</TableHead>
                            <TableHead className="text-center">Quantity per Service</TableHead>
                            <TableHead className="text-center">Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {consumables.map((consumable) => (
                            <TableRow key={consumable.id}>
                              <TableCell className="font-medium">
                                {consumable.product?.name || 'Unknown Product'}
                              </TableCell>
                              <TableCell className="text-center">
                                {consumable.quantityPerService}
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge variant={consumable.isActive ? 'default' : 'secondary'}>
                                  {consumable.isActive ? 'Active' : 'Inactive'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => openEditConsumableDialog(consumable)}
                                  >
                                    Edit
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteConsumable(consumable.productId)}
                                    disabled={deleteConsumableMutation.isPending}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </PageContent>

      {/* Variant Create/Edit Dialog */}
      <VariantFormDialog
        open={variantDialogOpen}
        onOpenChange={(open) => {
          setVariantDialogOpen(open);
          if (!open) setEditingVariant(null);
        }}
        variant={editingVariant}
        onSubmit={handleVariantSubmit}
        isLoading={isVariantPending}
      />

      {/* Delete Variant Confirmation */}
      <ConfirmDialog
        open={!!deleteVariantId}
        onOpenChange={(open) => !open && setDeleteVariantId(null)}
        title={t('confirmDelete.title')}
        description={t('confirmDelete.description')}
        variant="destructive"
        onConfirm={confirmDeleteVariant}
        isLoading={deleteVariant.isPending}
      />

      {/* Add Consumable Dialog - Only shown when inventory is enabled */}
      {isInventoryEnabled && (
        <Dialog open={addConsumableOpen} onOpenChange={setAddConsumableOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Consumable Product</DialogTitle>
              <DialogDescription>
                Select a product that will be consumed when this service is performed.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="product">Product</Label>
                <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a product..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableProducts.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name} ({product.unitOfMeasure})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="consumableQuantity">Quantity per Service</Label>
                <Input
                  id="consumableQuantity"
                  type="number"
                  min={0.01}
                  step={0.01}
                  value={consumableQuantity}
                  onChange={(e) => setConsumableQuantity(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddConsumableOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleAddConsumable}
                disabled={
                  !selectedProductId || !consumableQuantity || createConsumableMutation.isPending
                }
              >
                {createConsumableMutation.isPending ? 'Adding...' : 'Add Consumable'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Consumable Dialog - Only shown when inventory is enabled */}
      {isInventoryEnabled && (
        <Dialog
          open={!!editingConsumable}
          onOpenChange={(open) => !open && setEditingConsumable(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Consumable</DialogTitle>
              <DialogDescription>{editingConsumable?.product?.name}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-consumableQuantity">Quantity per Service</Label>
                <Input
                  id="edit-consumableQuantity"
                  type="number"
                  min={0.01}
                  step={0.01}
                  value={consumableQuantity}
                  onChange={(e) => setConsumableQuantity(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingConsumable(null)}>
                Cancel
              </Button>
              <Button
                onClick={handleUpdateConsumable}
                disabled={!consumableQuantity || updateConsumableMutation.isPending}
              >
                {updateConsumableMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </PageContainer>
  );
}
