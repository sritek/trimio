/**
 * Internal Admin - Create New Tenant Page
 * Wizard-style form: Tenant → Branch → Super Owner
 */

'use client';

import { useRouter } from 'next/navigation';
import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, Building2, MapPin, User, Check, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { TenantForm, BranchForm, OwnerForm } from '../../components';
import {
  useInternalApi,
  validateTenantForm,
  validateBranchForm,
  validateOwnerForm,
  hasErrors,
} from '../../hooks';
import { EMPTY_TENANT_FORM, EMPTY_BRANCH_FORM, EMPTY_OWNER_FORM } from '../../constants';
import type {
  TenantFormData,
  BranchFormData,
  OwnerFormData,
  FormErrors,
  CreatedEntities,
  LogoState,
} from '../../types';

type Step = 'tenant' | 'branch' | 'owner' | 'complete';

export default function NewTenantPage() {
  const router = useRouter();
  const api = useInternalApi();

  const [step, setStep] = useState<Step>('tenant');
  const [isLoading, setIsLoading] = useState(false);

  const [logo, setLogo] = useState<LogoState>({
    file: null,
    preview: null,
    uploading: false,
  });

  const [created, setCreated] = useState<CreatedEntities>({
    tenant: null,
    branch: null,
    owner: null,
  });

  const [tenantData, setTenantData] = useState<TenantFormData>({
    ...EMPTY_TENANT_FORM,
  });

  const [branchData, setBranchData] = useState<BranchFormData>({
    ...EMPTY_BRANCH_FORM,
    name: 'Main Branch',
  });

  const [ownerData, setOwnerData] = useState<OwnerFormData>({
    ...EMPTY_OWNER_FORM,
  });

  // Form validation errors
  const [tenantErrors, setTenantErrors] = useState<FormErrors>({});
  const [branchErrors, setBranchErrors] = useState<FormErrors>({});
  const [ownerErrors, setOwnerErrors] = useState<FormErrors>({});

  // ============================================
  // LOGO HANDLERS
  // ============================================

  const handleLogoSelect = useCallback((file: File, preview: string) => {
    setLogo({ file, preview, uploading: false });
  }, []);

  const handleLogoRemove = useCallback(() => {
    setLogo({ file: null, preview: null, uploading: false });
    setTenantData((prev) => ({ ...prev, logoUrl: '' }));
  }, []);

  // ============================================
  // STEP HANDLERS
  // ============================================

  const handleCreateTenant = async () => {
    const errors = validateTenantForm(tenantData);
    setTenantErrors(errors);

    if (hasErrors(errors)) {
      toast.error('Please fix the validation errors');
      return;
    }

    setIsLoading(true);
    try {
      // Step 1: Create tenant
      const tenant = await api.createTenant(tenantData);

      // Step 2: Upload logo if selected
      if (logo.file) {
        setLogo((prev) => ({ ...prev, uploading: true }));
        const logoUrl = await api.uploadLogo(tenant.id, logo.file);
        if (logoUrl) {
          await api.updateTenant(tenant.id, { ...tenantData, logoUrl });
        }
        setLogo((prev) => ({ ...prev, uploading: false }));
      }

      setCreated((prev) => ({ ...prev, tenant }));
      setBranchData((prev) => ({ ...prev, email: tenantData.email }));
      setStep('branch');
      toast.success('Tenant created successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create tenant');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateBranch = async () => {
    const errors = validateBranchForm(branchData);
    setBranchErrors(errors);

    if (hasErrors(errors)) {
      toast.error('Please fix the validation errors');
      return;
    }

    if (!created.tenant) {
      toast.error('Missing tenant');
      return;
    }

    setIsLoading(true);
    try {
      const branch = await api.createBranch(created.tenant.id, branchData);
      setCreated((prev) => ({ ...prev, branch }));
      setOwnerData((prev) => ({ ...prev, email: tenantData.email }));
      setStep('owner');
      toast.success('Branch created successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create branch');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateOwner = async () => {
    const errors = validateOwnerForm(ownerData, false);
    setOwnerErrors(errors);

    if (hasErrors(errors)) {
      toast.error('Please fix the validation errors');
      return;
    }

    if (!created.tenant) {
      toast.error('Missing tenant');
      return;
    }

    setIsLoading(true);
    try {
      const owner = await api.createOwner(created.tenant.id, ownerData);
      setCreated((prev) => ({ ...prev, owner }));
      setStep('complete');
      toast.success('Super owner created successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create owner');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setStep('tenant');
    setCreated({ tenant: null, branch: null, owner: null });
    setLogo({ file: null, preview: null, uploading: false });
    setTenantData({ ...EMPTY_TENANT_FORM });
    setBranchData({ ...EMPTY_BRANCH_FORM, name: 'Main Branch' });
    setOwnerData({ ...EMPTY_OWNER_FORM });
    setTenantErrors({});
    setBranchErrors({});
    setOwnerErrors({});
  };

  // ============================================
  // RENDER
  // ============================================

  const steps = [
    { id: 'tenant', label: 'Tenant', icon: Building2 },
    { id: 'branch', label: 'Branch', icon: MapPin },
    { id: 'owner', label: 'Owner', icon: User },
    { id: 'complete', label: 'Done', icon: Check },
  ];

  const currentStepIndex = steps.findIndex((s) => s.id === step);

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
        <h1 className="text-2xl font-bold text-slate-900">Create New Tenant</h1>
        <p className="text-slate-500">Set up a new salon business with branch and owner</p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center mb-8">
        {steps.map((s, index) => {
          const Icon = s.icon;
          const isActive = s.id === step;
          const isComplete = index < currentStepIndex;

          return (
            <div key={s.id} className="flex items-center">
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors ${
                  isComplete
                    ? 'bg-primary border-primary text-primary-foreground'
                    : isActive
                      ? 'border-primary text-primary'
                      : 'border-slate-300 text-slate-400'
                }`}
              >
                {isComplete ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
              </div>
              <span
                className={`ml-2 text-sm font-medium ${isActive ? 'text-slate-900' : 'text-slate-500'}`}
              >
                {s.label}
              </span>
              {index < steps.length - 1 && (
                <div className={`w-12 h-0.5 mx-4 ${isComplete ? 'bg-primary' : 'bg-slate-200'}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Form Cards */}
      <div className="max-w-2xl mx-auto">
        {/* Step 1: Tenant */}
        {step === 'tenant' && (
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-slate-900">Business Information</CardTitle>
              <CardDescription className="text-slate-500">
                Enter the salon business details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <TenantForm
                data={tenantData}
                errors={tenantErrors}
                onChange={setTenantData}
                onClearError={(field) => setTenantErrors({ ...tenantErrors, [field]: null })}
                logoPreview={logo.preview}
                onLogoSelect={handleLogoSelect}
                onLogoRemove={handleLogoRemove}
                logoUploading={logo.uploading}
              />

              <div className="flex justify-end pt-4">
                <Button
                  onClick={handleCreateTenant}
                  disabled={isLoading}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <ArrowRight className="h-4 w-4 mr-2" />
                  )}
                  Create & Continue
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Branch */}
        {step === 'branch' && (
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-slate-900">Branch Information</CardTitle>
              <CardDescription className="text-slate-500">
                Set up the first branch for {created.tenant?.name}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <BranchForm
                data={branchData}
                errors={branchErrors}
                onChange={setBranchData}
                onClearError={(field) => setBranchErrors({ ...branchErrors, [field]: null })}
              />

              <div className="flex justify-end pt-4">
                <Button
                  onClick={handleCreateBranch}
                  disabled={isLoading}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <ArrowRight className="h-4 w-4 mr-2" />
                  )}
                  Create & Continue
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Owner */}
        {step === 'owner' && (
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-slate-900">Super Owner Account</CardTitle>
              <CardDescription className="text-slate-500">
                Create the admin user for {created.tenant?.name}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <OwnerForm
                data={ownerData}
                errors={ownerErrors}
                onChange={setOwnerData}
                onClearError={(field) => setOwnerErrors({ ...ownerErrors, [field]: null })}
                isEdit={false}
              />

              <div className="flex justify-end pt-4">
                <Button
                  onClick={handleCreateOwner}
                  disabled={isLoading}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4 mr-2" />
                  )}
                  Create Owner & Finish
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Complete */}
        {step === 'complete' && (
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardContent className="py-12 text-center">
              <div className="flex justify-center mb-6">
                <div className="p-4 bg-green-100 rounded-full">
                  <Check className="h-12 w-12 text-green-600" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">
                Tenant Created Successfully!
              </h2>
              <p className="text-slate-500 mb-8">
                The salon business has been set up and is ready to use.
              </p>

              <div className="bg-slate-50 rounded-lg p-4 mb-8 text-left max-w-md mx-auto border border-slate-200">
                <h3 className="text-sm font-medium text-slate-700 mb-3">Login Credentials</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Email:</span>
                    <span className="text-slate-900 font-mono">{created.owner?.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Password:</span>
                    <span className="text-slate-900 font-mono">{ownerData.password}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Login URL:</span>
                    <span className="text-primary font-mono">/login</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-center gap-4">
                <Button
                  variant="outline"
                  onClick={() => router.push('/internal/tenants')}
                  className="border-slate-300"
                >
                  View All Tenants
                </Button>
                <Button
                  onClick={handleReset}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                >
                  Create Another Tenant
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
