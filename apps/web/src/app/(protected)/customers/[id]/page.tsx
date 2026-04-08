'use client';

import { useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { AlertTriangle, ArrowLeft, Pencil, User, X } from 'lucide-react';

import { PERMISSIONS } from '@trimio/shared';

import {
  useCustomer,
  useCustomerLoyalty,
  useCustomerNotes,
  useCustomerStats,
  useCustomerWallet,
  useAdjustLoyalty,
  useAdjustWallet,
  useAddCustomerNote,
  useCustomTags,
  useAddCustomerTags,
  useRemoveCustomerTag,
} from '@/hooks/queries/use-customers';
import { usePermissions } from '@/hooks/use-permissions';

import {
  AccessDenied,
  EmptyState,
  LoadingSpinner,
  PageContainer,
  PageContent,
  PageHeader,
  PermissionGuard,
} from '@/components/common';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { CustomerForm } from '../components/customer-form';
import {
  OverviewTab,
  LoyaltyTab,
  WalletTab,
  NotesTab,
  HistoryTab,
  LoyaltyAdjustDialog,
  WalletAdjustDialog,
  AddTagDialog,
} from './components';

import type { BookingStatus, AdjustLoyaltyInput, AdjustWalletInput } from '@/types/customers';
import { CUSTOMER_SOURCE_LABELS } from '@/types/customers';

// ============================================
// Constants
// ============================================

const SYSTEM_TAGS = ['New', 'Regular', 'VIP', 'Inactive'];

// ============================================
// Helpers
// ============================================

function getStatusBadgeVariant(
  status: BookingStatus
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'normal':
      return 'secondary';
    case 'blocked':
      return 'destructive';
    case 'prepaid_only':
      return 'outline';
    default:
      return 'secondary';
  }
}

// ============================================
// Component
// ============================================

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const customerId = params.id as string;
  const isEditMode = searchParams.get('edit') === 'true';

  const { hasPermission } = usePermissions();
  const canWrite = hasPermission(PERMISSIONS.CUSTOMERS_WRITE);
  const canManage = hasPermission(PERMISSIONS.CUSTOMERS_MANAGE);

  // Dialog states
  const [showLoyaltyDialog, setShowLoyaltyDialog] = useState(false);
  const [showWalletDialog, setShowWalletDialog] = useState(false);
  const [showAddTagDialog, setShowAddTagDialog] = useState(false);
  const [noteContent, setNoteContent] = useState('');

  // Queries
  const { data: customer, isLoading, error } = useCustomer(customerId);
  const { data: loyaltyData } = useCustomerLoyalty(customerId);
  const { data: walletData } = useCustomerWallet(customerId);
  const { data: notesData } = useCustomerNotes(customerId);
  const { data: statsData } = useCustomerStats(customerId);
  const { data: customTags } = useCustomTags();

  // Mutations
  const adjustLoyalty = useAdjustLoyalty();
  const adjustWallet = useAdjustWallet();
  const addNote = useAddCustomerNote();
  const addTags = useAddCustomerTags();
  const removeTag = useRemoveCustomerTag();

  // Available tags for adding (exclude already assigned)
  const availableTags = customer
    ? [
        ...SYSTEM_TAGS.filter((t) => !customer.tags.includes(t)),
        ...(customTags?.map((t) => t.name).filter((t) => !customer.tags.includes(t)) || []),
      ]
    : [];

  // Handlers
  const handleAdjustLoyalty = async (data: AdjustLoyaltyInput) => {
    await adjustLoyalty.mutateAsync({ customerId, data });
    setShowLoyaltyDialog(false);
  };

  const handleAdjustWallet = async (data: AdjustWalletInput) => {
    await adjustWallet.mutateAsync({ customerId, data });
    setShowWalletDialog(false);
  };

  const handleAddNote = async () => {
    if (!noteContent.trim()) return;
    await addNote.mutateAsync({ customerId, data: { content: noteContent } });
    setNoteContent('');
  };

  const handleAddTag = async (tag: string) => {
    await addTags.mutateAsync({ customerId, data: { tags: [tag] } });
    setShowAddTagDialog(false);
  };

  const handleRemoveTag = async (tag: string) => {
    if (SYSTEM_TAGS.includes(tag)) return;
    await removeTag.mutateAsync({ customerId, tag });
  };

  // Loading state
  if (isLoading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner />
        </div>
      </PageContainer>
    );
  }

  // Error state
  if (error || !customer) {
    return (
      <PageContainer>
        <EmptyState
          icon={User}
          title="Customer not found"
          description="The customer you're looking for doesn't exist or has been removed."
          action={
            <Button onClick={() => router.push('/customers')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Customers
            </Button>
          }
        />
      </PageContainer>
    );
  }

  // Edit mode - show form
  if (isEditMode && canWrite) {
    return (
      <PermissionGuard permission={PERMISSIONS.CUSTOMERS_WRITE} fallback={<AccessDenied />}>
        <PageContainer>
          <PageHeader
            title={`Edit ${customer.name}`}
            description="Update customer information"
            backHref={`/customers/${customerId}`}
            actions={
              <Button variant="outline" onClick={() => router.push(`/customers/${customerId}`)}>
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
            }
          />
          <PageContent>
            <CustomerForm
              customer={customer}
              onSuccess={() => router.push(`/customers/${customerId}`)}
            />
          </PageContent>
        </PageContainer>
      </PermissionGuard>
    );
  }

  return (
    <PermissionGuard permission={PERMISSIONS.CUSTOMERS_READ} fallback={<AccessDenied />}>
      <PageContainer>
        <PageHeader
          title={customer.name}
          description={
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={getStatusBadgeVariant(customer.bookingStatus)}>
                {customer.bookingStatus.charAt(0).toUpperCase() + customer.bookingStatus.slice(1)}
              </Badge>
              <Badge variant="outline" className="text-muted-foreground">
                {CUSTOMER_SOURCE_LABELS[customer.source as keyof typeof CUSTOMER_SOURCE_LABELS] ||
                  'Manual Entry'}
              </Badge>
              {customer.allergies && customer.allergies.length > 0 && (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="size-3" />
                  Allergies
                </Badge>
              )}
            </div>
          }
          backHref="/customers"
          actions={
            canWrite && (
              <Button onClick={() => router.push(`/customers/${customerId}?edit=true`)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Button>
            )
          }
        />

        <PageContent>
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="loyalty">Loyalty</TabsTrigger>
              <TabsTrigger value="wallet">Wallet</TabsTrigger>
              {canWrite && <TabsTrigger value="notes">Notes</TabsTrigger>}
              {canManage && <TabsTrigger value="history">History</TabsTrigger>}
            </TabsList>

            <TabsContent value="overview">
              <OverviewTab
                customer={customer}
                stats={statsData}
                customTags={customTags}
                canWrite={canWrite}
                onAddTag={() => setShowAddTagDialog(true)}
                onRemoveTag={handleRemoveTag}
              />
            </TabsContent>

            <TabsContent value="loyalty">
              <LoyaltyTab
                balance={customer.loyaltyPoints}
                loyaltyData={loyaltyData}
                canManage={canManage}
                onAdjust={() => setShowLoyaltyDialog(true)}
              />
            </TabsContent>

            <TabsContent value="wallet">
              <WalletTab
                balance={customer.walletBalance}
                walletData={walletData}
                canManage={canManage}
                onAdjust={() => setShowWalletDialog(true)}
              />
            </TabsContent>

            {canWrite && (
              <TabsContent value="notes">
                <NotesTab
                  notes={notesData?.data}
                  noteContent={noteContent}
                  onNoteContentChange={setNoteContent}
                  onAddNote={handleAddNote}
                  isAdding={addNote.isPending}
                />
              </TabsContent>
            )}

            {canManage && (
              <TabsContent value="history">
                <HistoryTab
                  stats={statsData}
                  loyaltyPoints={customer.loyaltyPoints}
                  walletBalance={customer.walletBalance}
                />
              </TabsContent>
            )}
          </Tabs>
        </PageContent>

        {/* Dialogs */}
        <LoyaltyAdjustDialog
          open={showLoyaltyDialog}
          onOpenChange={setShowLoyaltyDialog}
          onSubmit={handleAdjustLoyalty}
          isPending={adjustLoyalty.isPending}
        />

        <WalletAdjustDialog
          open={showWalletDialog}
          onOpenChange={setShowWalletDialog}
          onSubmit={handleAdjustWallet}
          isPending={adjustWallet.isPending}
        />

        <AddTagDialog
          open={showAddTagDialog}
          onOpenChange={setShowAddTagDialog}
          availableTags={availableTags}
          onSubmit={handleAddTag}
          isPending={addTags.isPending}
        />
      </PageContainer>
    </PermissionGuard>
  );
}
