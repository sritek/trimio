/**
 * Internal Admin - Tenant Detail Page
 * With edit functionality and ability to add branches/owners
 */

'use client';

import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Building2,
  Users,
  MapPin,
  Calendar,
  Mail,
  Phone,
  Edit,
  Plus,
  Star,
} from 'lucide-react';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useAdminStore } from '@/stores/admin-store';

import {
  FormDialog,
  BranchForm,
  OwnerForm,
  TenantForm,
  SubscriptionSection,
} from '../../components';
import {
  useInternalApi,
  validateBranchForm,
  validateOwnerForm,
  validateTenantForm,
  hasErrors,
} from '../../hooks';
import { EMPTY_BRANCH_FORM, EMPTY_OWNER_FORM } from '../../constants';
import type {
  TenantDetail,
  Branch,
  Owner,
  TenantFormData,
  BranchFormData,
  OwnerFormData,
  FormErrors,
  LoyaltyConfig,
} from '../../types';

export default function TenantDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { accessToken } = useAdminStore();
  const api = useInternalApi();

  const [tenant, setTenant] = useState<TenantDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isHydrated, setIsHydrated] = useState(false);

  // Edit tenant state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isEditLoading, setIsEditLoading] = useState(false);
  const [editData, setEditData] = useState<TenantFormData>({
    name: '',
    legalName: '',
    email: '',
    phone: '',
    logoUrl: '',
    billingEmail: '',
    billingAddress: '',
    gstin: '',
  });
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [editErrors, setEditErrors] = useState<FormErrors>({});

  // Add branch state
  const [isBranchOpen, setIsBranchOpen] = useState(false);
  const [isBranchLoading, setIsBranchLoading] = useState(false);
  const [branchData, setBranchData] = useState<BranchFormData>({ ...EMPTY_BRANCH_FORM });
  const [branchErrors, setBranchErrors] = useState<FormErrors>({});

  // Add owner state
  const [isOwnerOpen, setIsOwnerOpen] = useState(false);
  const [isOwnerLoading, setIsOwnerLoading] = useState(false);
  const [ownerData, setOwnerData] = useState<OwnerFormData>({ ...EMPTY_OWNER_FORM });
  const [ownerErrors, setOwnerErrors] = useState<FormErrors>({});

  // Edit branch state
  const [isEditBranchOpen, setIsEditBranchOpen] = useState(false);
  const [isEditBranchLoading, setIsEditBranchLoading] = useState(false);
  const [editBranchId, setEditBranchId] = useState<string | null>(null);
  const [editBranchData, setEditBranchData] = useState<BranchFormData>({ ...EMPTY_BRANCH_FORM });
  const [editBranchErrors, setEditBranchErrors] = useState<FormErrors>({});

  // Edit owner state
  const [isEditOwnerOpen, setIsEditOwnerOpen] = useState(false);
  const [isEditOwnerLoading, setIsEditOwnerLoading] = useState(false);
  const [editOwnerId, setEditOwnerId] = useState<string | null>(null);
  const [editOwnerData, setEditOwnerData] = useState<OwnerFormData>({ ...EMPTY_OWNER_FORM });
  const [editOwnerErrors, setEditOwnerErrors] = useState<FormErrors>({});

  // Loyalty config state
  const [loyaltyConfig, setLoyaltyConfig] = useState<LoyaltyConfig | null>(null);
  const [isLoyaltyLoading, setIsLoyaltyLoading] = useState(false);
  const [isSavingLoyalty, setIsSavingLoyalty] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const fetchTenant = useCallback(async () => {
    if (!accessToken) return;

    setIsLoading(true);
    try {
      const data = await api.getTenant(params.id as string);
      setTenant(data);
    } catch (error) {
      if (error instanceof Error && error.message === 'Session expired') {
        return;
      }
      toast.error(error instanceof Error ? error.message : 'Failed to fetch tenant');
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, params.id, api]);

  useEffect(() => {
    if (isHydrated && accessToken) {
      fetchTenant();
    }
  }, [isHydrated, accessToken, fetchTenant]);

  // Fetch loyalty config when tenant is loaded
  const fetchLoyaltyConfig = useCallback(async () => {
    if (!accessToken || !tenant?.id) return;

    setIsLoyaltyLoading(true);
    try {
      const config = await api.getLoyaltyConfig(tenant.id);
      setLoyaltyConfig(config);
    } catch (error) {
      console.error('Failed to fetch loyalty config:', error);
    } finally {
      setIsLoyaltyLoading(false);
    }
  }, [accessToken, tenant?.id, api]);

  useEffect(() => {
    if (tenant?.id) {
      fetchLoyaltyConfig();
    }
  }, [tenant?.id, fetchLoyaltyConfig]);

  // ============================================
  // LOYALTY CONFIG
  // ============================================

  const handleLoyaltyChange = (field: keyof LoyaltyConfig, value: boolean | number) => {
    if (loyaltyConfig) {
      setLoyaltyConfig({ ...loyaltyConfig, [field]: value });
    }
  };

  const handleSaveLoyaltyConfig = async () => {
    if (!loyaltyConfig || !tenant) return;

    setIsSavingLoyalty(true);
    try {
      await api.updateLoyaltyConfig(tenant.id, {
        isEnabled: loyaltyConfig.isEnabled,
        pointsPerUnit: loyaltyConfig.pointsPerUnit,
        redemptionValuePerPoint: loyaltyConfig.redemptionValuePerPoint,
        expiryDays: loyaltyConfig.expiryDays,
      });
      toast.success('Loyalty configuration saved');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save loyalty config');
    } finally {
      setIsSavingLoyalty(false);
    }
  };

  // ============================================
  // EDIT TENANT
  // ============================================

  const openEditDialog = () => {
    if (tenant) {
      setEditData({
        name: tenant.name,
        legalName: tenant.legalName || '',
        email: tenant.email,
        phone: tenant.phone || '',
        logoUrl: tenant.logoUrl || '',
        billingEmail: tenant.billingEmail || '',
        billingAddress: tenant.billingAddress || '',
        gstin: tenant.gstin || '',
      });
      setLogoPreview(tenant.logoUrl);
      setLogoFile(null);
      setEditErrors({});
      setIsEditOpen(true);
    }
  };

  const handleLogoSelect = (file: File, preview: string) => {
    setLogoFile(file);
    setLogoPreview(preview);
  };

  const handleLogoRemove = () => {
    setLogoFile(null);
    setLogoPreview(null);
    setEditData({ ...editData, logoUrl: '' });
  };

  const handleUpdateTenant = async () => {
    const errors = validateTenantForm(editData);
    setEditErrors(errors);

    if (hasErrors(errors)) {
      toast.error('Please fix the validation errors');
      return;
    }

    setIsEditLoading(true);
    try {
      let logoUrl = editData.logoUrl;
      if (logoFile && tenant) {
        const uploadedUrl = await api.uploadLogo(tenant.id, logoFile);
        if (uploadedUrl) logoUrl = uploadedUrl;
      }

      await api.updateTenant(params.id as string, { ...editData, logoUrl });
      toast.success('Tenant updated successfully');
      setIsEditOpen(false);
      fetchTenant();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update tenant');
    } finally {
      setIsEditLoading(false);
    }
  };

  // ============================================
  // ADD BRANCH
  // ============================================

  const handleAddBranch = async () => {
    const errors = validateBranchForm(branchData);
    setBranchErrors(errors);

    if (hasErrors(errors)) {
      toast.error('Please fix the validation errors');
      return;
    }

    setIsBranchLoading(true);
    try {
      await api.createBranch(params.id as string, branchData);
      toast.success('Branch created successfully');
      setIsBranchOpen(false);
      setBranchData({ ...EMPTY_BRANCH_FORM });
      setBranchErrors({});
      fetchTenant();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create branch');
    } finally {
      setIsBranchLoading(false);
    }
  };

  // ============================================
  // ADD OWNER
  // ============================================

  const handleAddOwner = async () => {
    const errors = validateOwnerForm(ownerData, false);
    setOwnerErrors(errors);

    if (hasErrors(errors)) {
      toast.error('Please fix the validation errors');
      return;
    }

    setIsOwnerLoading(true);
    try {
      await api.createOwner(params.id as string, ownerData);
      toast.success('Super owner created successfully');
      setIsOwnerOpen(false);
      setOwnerData({ ...EMPTY_OWNER_FORM });
      setOwnerErrors({});
      fetchTenant();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create owner');
    } finally {
      setIsOwnerLoading(false);
    }
  };

  // ============================================
  // EDIT BRANCH
  // ============================================

  const openEditBranchDialog = (branch: Branch) => {
    setEditBranchId(branch.id);
    setEditBranchData({
      name: branch.name,
      address: branch.address || '',
      city: branch.city || '',
      state: branch.state || '',
      pincode: branch.pincode || '',
      phone: branch.phone || '',
      email: branch.email || '',
      gstin: branch.gstin || '',
    });
    setEditBranchErrors({});
    setIsEditBranchOpen(true);
  };

  const handleUpdateBranch = async () => {
    const errors = validateBranchForm(editBranchData);
    setEditBranchErrors(errors);

    if (hasErrors(errors)) {
      toast.error('Please fix the validation errors');
      return;
    }

    setIsEditBranchLoading(true);
    try {
      await api.updateBranch(editBranchId!, editBranchData);
      toast.success('Branch updated successfully');
      setIsEditBranchOpen(false);
      fetchTenant();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update branch');
    } finally {
      setIsEditBranchLoading(false);
    }
  };

  // ============================================
  // EDIT OWNER
  // ============================================

  const openEditOwnerDialog = (owner: Owner) => {
    setEditOwnerId(owner.id);
    setEditOwnerData({
      name: owner.name,
      email: owner.email || '',
      phone: owner.phone,
      password: '',
      confirmPassword: '',
    });
    setEditOwnerErrors({});
    setIsEditOwnerOpen(true);
  };

  const handleUpdateOwner = async () => {
    const errors = validateOwnerForm(editOwnerData, true);
    setEditOwnerErrors(errors);

    if (hasErrors(errors)) {
      toast.error('Please fix the validation errors');
      return;
    }

    setIsEditOwnerLoading(true);
    try {
      await api.updateOwner(editOwnerId!, editOwnerData);
      toast.success('Super owner updated successfully');
      setIsEditOwnerOpen(false);
      fetchTenant();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update owner');
    } finally {
      setIsEditOwnerLoading(false);
    }
  };

  // ============================================
  // RENDER
  // ============================================

  if (isLoading) {
    return (
      <div className="min-h-screen p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-slate-200 rounded w-48" />
          <div className="h-64 bg-slate-100 rounded" />
        </div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="min-h-screen p-6">
        <div className="text-center py-12">
          <h2 className="text-xl text-slate-900 mb-4">Tenant not found</h2>
          <Button
            onClick={() => router.push('/internal/tenants')}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            Back to Tenants
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => router.push('/internal/tenants')}
          className="text-slate-600 hover:text-slate-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Tenants
        </Button>

        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-lg bg-white border border-slate-200 flex items-center justify-center overflow-hidden shadow-sm">
            {tenant.logoUrl ? (
              <img
                src={tenant.logoUrl}
                alt={tenant.name}
                className="w-full h-full object-contain"
              />
            ) : (
              <Building2 className="h-8 w-8 text-slate-400" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-slate-900">{tenant.name}</h1>
            </div>
            <p className="text-slate-500">{tenant.slug}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tenant Info */}
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-slate-900 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Business Details
            </CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={openEditDialog}
              className="border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              <Edit className="h-4 w-4 mr-1" />
              Edit
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {tenant.legalName && (
              <div>
                <p className="text-xs text-slate-500 uppercase">Legal Name</p>
                <p className="text-slate-900">{tenant.legalName}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-slate-500 uppercase">Email</p>
              <p className="text-slate-900 flex items-center gap-2">
                <Mail className="h-4 w-4 text-slate-400" />
                {tenant.email}
              </p>
            </div>
            {tenant.phone && (
              <div>
                <p className="text-xs text-slate-500 uppercase">Phone</p>
                <p className="text-slate-900 flex items-center gap-2">
                  <Phone className="h-4 w-4 text-slate-400" />
                  +91 {tenant.phone}
                </p>
              </div>
            )}
            <div>
              <p className="text-xs text-slate-500 uppercase">Created</p>
              <p className="text-slate-900 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-slate-400" />
                {format(new Date(tenant.createdAt), 'MMM d, yyyy')}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Branches */}
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-slate-900 flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Branches ({tenant._count.branches})
            </CardTitle>
            <Button
              size="sm"
              onClick={() => setIsBranchOpen(true)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </CardHeader>
          <CardContent>
            {tenant.branches.length === 0 ? (
              <p className="text-slate-500 text-sm">No branches yet. Add one to continue setup.</p>
            ) : (
              <div className="space-y-3">
                {tenant.branches.map((branch) => (
                  <div
                    key={branch.id}
                    className="p-3 bg-slate-50 rounded-lg border border-slate-100"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-slate-900 font-medium">{branch.name}</p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditBranchDialog(branch)}
                          className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
                          title="Edit branch"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                        <Badge
                          variant="outline"
                          className={
                            branch.isActive
                              ? 'border-green-300 text-green-700 bg-green-50'
                              : 'border-slate-300 text-slate-500 bg-slate-50'
                          }
                        >
                          {branch.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </div>
                    {(branch.city || branch.state) && (
                      <p className="text-sm text-slate-500">
                        {[branch.city, branch.state].filter(Boolean).join(', ')}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Owners */}
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-slate-900 flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Super Owners
            </CardTitle>
            <Button
              size="sm"
              onClick={() => setIsOwnerOpen(true)}
              disabled={tenant.branches.length === 0}
              className="bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-50"
            >
              <Plus className="h-4 w-4 mr-1" />
              {tenant.users.length > 0 ? 'Add Another' : 'Add'}
            </Button>
          </CardHeader>
          <CardContent>
            {tenant.users.length === 0 ? (
              <p className="text-slate-500 text-sm">
                {tenant.branches.length === 0
                  ? 'Add a branch first, then create an owner.'
                  : 'No owners yet. Add one to complete setup.'}
              </p>
            ) : (
              <div className="space-y-3">
                {tenant.users.map((user) => (
                  <div key={user.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-slate-900 font-medium">{user.name}</p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditOwnerDialog(user)}
                          className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
                          title="Edit owner"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                        <Badge
                          variant="outline"
                          className={
                            user.isActive
                              ? 'border-green-300 text-green-700 bg-green-50'
                              : 'border-slate-300 text-slate-500 bg-slate-50'
                          }
                        >
                          {user.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-sm text-slate-500">{user.email}</p>
                    <p className="text-sm text-slate-500">+91 {user.phone}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Subscriptions */}
      <SubscriptionSection
        tenantId={tenant.id}
        branches={tenant.branches}
        onRefresh={fetchTenant}
      />

      {/* Loyalty Program Configuration */}
      <Card className="bg-white border-slate-200 shadow-sm mt-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-slate-900 flex items-center gap-2">
            <Star className="h-5 w-5 text-primary" />
            Loyalty Program
          </CardTitle>
          {loyaltyConfig && (
            <Badge
              variant="outline"
              className={
                loyaltyConfig.isEnabled
                  ? 'border-green-300 text-green-700 bg-green-50'
                  : 'border-slate-300 text-slate-500 bg-slate-50'
              }
            >
              {loyaltyConfig.isEnabled ? 'Enabled' : 'Disabled'}
            </Badge>
          )}
        </CardHeader>
        <CardContent>
          {isLoyaltyLoading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-10 bg-slate-100 rounded" />
              <div className="h-10 bg-slate-100 rounded" />
            </div>
          ) : loyaltyConfig ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                <div>
                  <Label className="text-slate-700">Enable Loyalty Program</Label>
                  <p className="text-xs text-slate-500">
                    Allow customers to earn and redeem loyalty points
                  </p>
                </div>
                <Switch
                  checked={loyaltyConfig.isEnabled}
                  onCheckedChange={(checked) => handleLoyaltyChange('isEnabled', checked)}
                />
              </div>

              {loyaltyConfig.isEnabled && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-700">Points per ₹100 spent</Label>
                    <Input
                      type="number"
                      value={loyaltyConfig.pointsPerUnit * 100}
                      onChange={(e) =>
                        handleLoyaltyChange(
                          'pointsPerUnit',
                          e.target.value ? parseFloat(e.target.value) / 100 : 0
                        )
                      }
                      min={0}
                      max={100}
                      step={0.1}
                      className="border-slate-300"
                    />
                    <p className="text-xs text-slate-500">
                      e.g., 1 means customer earns 1 point per ₹100 spent
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700">₹ value per point</Label>
                    <Input
                      type="number"
                      value={loyaltyConfig.redemptionValuePerPoint}
                      onChange={(e) =>
                        handleLoyaltyChange(
                          'redemptionValuePerPoint',
                          e.target.value ? parseFloat(e.target.value) : 0
                        )
                      }
                      min={0}
                      max={100}
                      step={0.1}
                      className="border-slate-300"
                    />
                    <p className="text-xs text-slate-500">e.g., 1 means 1 point = ₹1 discount</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700">Points Expiry (days)</Label>
                    <Input
                      type="number"
                      value={loyaltyConfig.expiryDays}
                      onChange={(e) =>
                        handleLoyaltyChange(
                          'expiryDays',
                          e.target.value ? parseInt(e.target.value) : 0
                        )
                      }
                      min={0}
                      max={3650}
                      className="border-slate-300"
                    />
                    <p className="text-xs text-slate-500">
                      0 = points never expire. Default is 365 days.
                    </p>
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <Button
                  onClick={handleSaveLoyaltyConfig}
                  disabled={isSavingLoyalty}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  {isSavingLoyalty ? 'Saving...' : 'Save Loyalty Settings'}
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-slate-500 text-sm">Failed to load loyalty configuration.</p>
          )}
        </CardContent>
      </Card>

      {/* Edit Tenant Dialog */}
      <FormDialog
        open={isEditOpen}
        onOpenChange={(open: boolean) => {
          setIsEditOpen(open);
          if (!open) {
            setEditErrors({});
            setLogoFile(null);
          }
        }}
        title="Edit Tenant"
        description="Update tenant information"
        onSubmit={handleUpdateTenant}
        isLoading={isEditLoading}
        submitText="Save Changes"
      >
        <TenantForm
          data={editData}
          errors={editErrors}
          onChange={setEditData}
          onClearError={(field: string) => setEditErrors({ ...editErrors, [field]: null })}
          logoPreview={logoPreview}
          onLogoSelect={handleLogoSelect}
          onLogoRemove={handleLogoRemove}
        />
      </FormDialog>

      {/* Add Branch Dialog */}
      <FormDialog
        open={isBranchOpen}
        onOpenChange={(open: boolean) => {
          setIsBranchOpen(open);
          if (!open) {
            setBranchData({ ...EMPTY_BRANCH_FORM });
            setBranchErrors({});
          }
        }}
        title="Add Branch"
        description={`Create a new branch for ${tenant.name}`}
        onSubmit={handleAddBranch}
        isLoading={isBranchLoading}
        submitText="Add Branch"
      >
        <BranchForm
          data={branchData}
          errors={branchErrors}
          onChange={setBranchData}
          onClearError={(field: string) => setBranchErrors({ ...branchErrors, [field]: null })}
        />
      </FormDialog>

      {/* Add Owner Dialog */}
      <FormDialog
        open={isOwnerOpen}
        onOpenChange={(open: boolean) => {
          setIsOwnerOpen(open);
          if (!open) {
            setOwnerData({ ...EMPTY_OWNER_FORM });
            setOwnerErrors({});
          }
        }}
        title="Add Super Owner"
        description={`Create a super owner for ${tenant.name}. They will have access to all branches.`}
        onSubmit={handleAddOwner}
        isLoading={isOwnerLoading}
        submitText="Add Owner"
      >
        <OwnerForm
          data={ownerData}
          errors={ownerErrors}
          onChange={setOwnerData}
          onClearError={(field: string) => setOwnerErrors({ ...ownerErrors, [field]: null })}
          isEdit={false}
        />
      </FormDialog>

      {/* Edit Branch Dialog */}
      <FormDialog
        open={isEditBranchOpen}
        onOpenChange={(open: boolean) => {
          setIsEditBranchOpen(open);
          if (!open) {
            setEditBranchErrors({});
            setEditBranchId(null);
          }
        }}
        title="Edit Branch"
        description="Update branch information"
        onSubmit={handleUpdateBranch}
        isLoading={isEditBranchLoading}
        submitText="Save Changes"
      >
        <BranchForm
          data={editBranchData}
          errors={editBranchErrors}
          onChange={setEditBranchData}
          onClearError={(field: string) =>
            setEditBranchErrors({ ...editBranchErrors, [field]: null })
          }
        />
      </FormDialog>

      {/* Edit Owner Dialog */}
      <FormDialog
        open={isEditOwnerOpen}
        onOpenChange={(open: boolean) => {
          setIsEditOwnerOpen(open);
          if (!open) {
            setEditOwnerErrors({});
            setEditOwnerId(null);
          }
        }}
        title="Edit Super Owner"
        description="Update super owner information. Leave password blank to keep current password."
        onSubmit={handleUpdateOwner}
        isLoading={isEditOwnerLoading}
        submitText="Save Changes"
      >
        <OwnerForm
          data={editOwnerData}
          errors={editOwnerErrors}
          onChange={setEditOwnerData}
          onClearError={(field: string) =>
            setEditOwnerErrors({ ...editOwnerErrors, [field]: null })
          }
          isEdit={true}
        />
      </FormDialog>
    </div>
  );
}
