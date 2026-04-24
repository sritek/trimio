/**
 * Internal Admin - Subscription Plans Management Page
 */

'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  Plus,
  Building2,
  LogOut,
  RefreshCw,
  CreditCard,
  Pencil,
  Crown,
  Sparkles,
  Zap,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useAdminStore } from '@/stores/admin-store';

import { useInternalApi } from '../hooks';
import type { SubscriptionPlan, CreatePlanFormData, UpdatePlanFormData } from '../types';
import { PlanDialog } from './components/plan-dialog';

const TIER_CONFIG = {
  basic: {
    icon: Zap,
    color: 'bg-blue-100 text-blue-700',
    borderColor: 'border-blue-200',
  },
  professional: {
    icon: Sparkles,
    color: 'bg-purple-100 text-purple-700',
    borderColor: 'border-purple-200',
  },
  enterprise: {
    icon: Crown,
    color: 'bg-amber-100 text-amber-700',
    borderColor: 'border-amber-200',
  },
};

const FEATURE_LABELS: Record<string, string> = {
  onlineBooking: 'Online Booking',
  smsReminders: 'SMS Reminders',
  emailReminders: 'Email Reminders',
  reports: 'Reports',
  inventory: 'Inventory Management',
  memberships: 'Memberships & Packages',
  multiStaff: 'Multi-Staff Support',
  api: 'API Access',
  prioritySupport: 'Priority Support',
  customBranding: 'Custom Branding',
};

export default function SubscriptionPlansPage() {
  const router = useRouter();
  const { accessToken, logout } = useAdminStore();
  const api = useInternalApi();

  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isHydrated, setIsHydrated] = useState(false);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const fetchPlans = useCallback(async () => {
    if (!accessToken) return;

    setIsLoading(true);
    try {
      const data = await api.listPlans();
      setPlans(data);
    } catch (error) {
      if (error instanceof Error && error.message === 'Session expired') {
        return;
      }
      toast.error(error instanceof Error ? error.message : 'Failed to fetch plans');
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, api]);

  useEffect(() => {
    if (isHydrated && accessToken) {
      fetchPlans();
    }
  }, [isHydrated, accessToken, fetchPlans]);

  const handleLogout = () => {
    logout();
    router.push('/internal/login');
  };

  const handleCreatePlan = () => {
    setEditingPlan(null);
    setDialogOpen(true);
  };

  const handleEditPlan = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setDialogOpen(true);
  };

  const handleSavePlan = async (data: CreatePlanFormData | UpdatePlanFormData) => {
    setIsSaving(true);
    try {
      if (editingPlan) {
        await api.updatePlan(editingPlan.id, data as UpdatePlanFormData);
        toast.success('Plan updated successfully');
      } else {
        await api.createPlan(data as CreatePlanFormData);
        toast.success('Plan created successfully');
      }
      setDialogOpen(false);
      fetchPlans();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save plan');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (plan: SubscriptionPlan) => {
    try {
      await api.updatePlan(plan.id, { isActive: !plan.isActive });
      toast.success(`Plan ${plan.isActive ? 'deactivated' : 'activated'}`);
      fetchPlans();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update plan');
    }
  };

  const handleTogglePublic = async (plan: SubscriptionPlan) => {
    try {
      await api.updatePlan(plan.id, { isPublic: !plan.isPublic });
      toast.success(`Plan ${plan.isPublic ? 'hidden' : 'made public'}`);
      fetchPlans();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update plan');
    }
  };

  const formatLimit = (value: number) => (value === -1 ? 'Unlimited' : value.toString());

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <CreditCard className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Subscription Plans</h1>
              <p className="text-sm text-slate-500">Manage pricing and features</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => router.push('/internal/tenants')}
              className="text-slate-600"
            >
              <Building2 className="h-4 w-4 mr-2" />
              Tenants
            </Button>
            <Button
              variant="ghost"
              onClick={handleLogout}
              className="text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        {/* Actions Bar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-slate-900">
              {plans.length} Plan{plans.length !== 1 ? 's' : ''}
            </h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={fetchPlans}
              className="text-slate-500 hover:text-slate-900"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          <Button
            onClick={handleCreatePlan}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Plan
          </Button>
        </div>

        {/* Plans Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="bg-white border-slate-200 animate-pulse shadow-sm">
                <CardHeader className="pb-2">
                  <div className="h-6 bg-slate-200 rounded w-3/4" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="h-8 bg-slate-100 rounded w-1/2" />
                    <div className="h-4 bg-slate-100 rounded w-full" />
                    <div className="h-4 bg-slate-100 rounded w-2/3" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : plans.length === 0 ? (
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <CreditCard className="h-12 w-12 text-slate-300 mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">No plans yet</h3>
              <p className="text-slate-500 mb-4">Create your first subscription plan</p>
              <Button
                onClick={handleCreatePlan}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Plan
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans
              .sort((a, b) => a.displayOrder - b.displayOrder)
              .map((plan) => {
                const tierConfig = TIER_CONFIG[plan.tier];
                const TierIcon = tierConfig.icon;

                return (
                  <Card
                    key={plan.id}
                    className={`bg-white border-2 ${tierConfig.borderColor} shadow-sm relative`}
                  >
                    {/* Edit Button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-3 right-3 h-8 w-8 text-slate-400 hover:text-slate-600"
                      onClick={() => handleEditPlan(plan)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>

                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${tierConfig.color}`}>
                          <TierIcon className="h-5 w-5" />
                        </div>
                        <div>
                          <CardTitle className="text-slate-900 text-lg">{plan.name}</CardTitle>
                          <p className="text-xs text-slate-500 font-mono">{plan.code}</p>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {/* Pricing */}
                      <div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-bold text-slate-900">
                            ₹{plan.monthlyPrice.toLocaleString('en-IN')}
                          </span>
                          <span className="text-slate-500">/month</span>
                        </div>
                        <p className="text-sm text-slate-500">
                          or ₹{plan.annualPrice.toLocaleString('en-IN')}/year
                        </p>
                      </div>

                      {/* Description */}
                      {plan.description && (
                        <p className="text-sm text-slate-600">{plan.description}</p>
                      )}

                      {/* Limits */}
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Users</span>
                          <span className="font-medium">{formatLimit(plan.maxUsers)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Appointments/day</span>
                          <span className="font-medium">
                            {formatLimit(plan.maxAppointmentsPerDay)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Services</span>
                          <span className="font-medium">{formatLimit(plan.maxServices)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Products</span>
                          <span className="font-medium">{formatLimit(plan.maxProducts)}</span>
                        </div>
                      </div>

                      {/* Features */}
                      <div className="border-t pt-3">
                        <p className="text-xs font-medium text-slate-500 mb-2">FEATURES</p>
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(plan.features as Record<string, unknown>).map(
                            ([key, value]) => {
                              if (typeof value === 'boolean' && value) {
                                return (
                                  <Badge
                                    key={key}
                                    variant="secondary"
                                    className="text-xs bg-slate-100"
                                  >
                                    {FEATURE_LABELS[key] || key}
                                  </Badge>
                                );
                              }
                              if (typeof value === 'string' && value) {
                                return (
                                  <Badge
                                    key={key}
                                    variant="secondary"
                                    className="text-xs bg-slate-100"
                                  >
                                    {FEATURE_LABELS[key] || key}: {value}
                                  </Badge>
                                );
                              }
                              return null;
                            }
                          )}
                        </div>
                      </div>

                      {/* Trial & Grace Period */}
                      <div className="flex gap-4 text-xs text-slate-500">
                        <span>{plan.trialDays} day trial</span>
                        <span>{plan.gracePeriodDays} day grace</span>
                      </div>

                      {/* Status Toggles */}
                      <div className="border-t pt-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-600">Active</span>
                          <Switch
                            checked={plan.isActive}
                            onCheckedChange={() => handleToggleActive(plan)}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-600">Public</span>
                          <Switch
                            checked={plan.isPublic}
                            onCheckedChange={() => handleTogglePublic(plan)}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
          </div>
        )}
      </main>

      {/* Plan Dialog */}
      <PlanDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        plan={editingPlan}
        onSave={handleSavePlan}
        isLoading={isSaving}
      />
    </div>
  );
}
