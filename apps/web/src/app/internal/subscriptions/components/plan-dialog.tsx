/**
 * Plan Dialog - Create/Edit subscription plan
 */

'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import type { SubscriptionPlan, CreatePlanFormData, UpdatePlanFormData } from '../../types';

interface PlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: SubscriptionPlan | null;
  onSave: (data: CreatePlanFormData | UpdatePlanFormData) => Promise<void>;
  isLoading: boolean;
}

const DEFAULT_FEATURES: Record<string, unknown> = {
  onlineBooking: false,
  smsReminders: false,
  emailReminders: true,
  reports: 'basic',
  inventory: false,
  memberships: false,
  multiStaff: false,
  api: false,
  prioritySupport: false,
  customBranding: false,
};

const FEATURE_OPTIONS = [
  { key: 'onlineBooking', label: 'Online Booking', type: 'boolean' },
  { key: 'smsReminders', label: 'SMS Reminders', type: 'boolean' },
  { key: 'emailReminders', label: 'Email Reminders', type: 'boolean' },
  { key: 'reports', label: 'Reports', type: 'select', options: ['basic', 'advanced'] },
  { key: 'inventory', label: 'Inventory Management', type: 'boolean' },
  { key: 'memberships', label: 'Memberships & Packages', type: 'boolean' },
  { key: 'multiStaff', label: 'Multi-Staff Support', type: 'boolean' },
  { key: 'api', label: 'API Access', type: 'boolean' },
  { key: 'prioritySupport', label: 'Priority Support', type: 'boolean' },
  { key: 'customBranding', label: 'Custom Branding', type: 'boolean' },
];

export function PlanDialog({ open, onOpenChange, plan, onSave, isLoading }: PlanDialogProps) {
  const isEditing = !!plan;

  const [formData, setFormData] = useState<CreatePlanFormData>({
    name: '',
    code: '',
    tier: 'basic',
    description: '',
    monthlyPrice: 0,
    annualPrice: 0,
    currency: 'INR',
    maxUsers: 3,
    maxAppointmentsPerDay: 50,
    maxServices: 20,
    maxProducts: 50,
    features: DEFAULT_FEATURES,
    trialDays: 14,
    gracePeriodDays: 7,
    displayOrder: 0,
    isActive: true,
    isPublic: true,
  });

  // Reset form when dialog opens or plan changes
  useEffect(() => {
    if (open) {
      if (plan) {
        setFormData({
          name: plan.name,
          code: plan.code,
          tier: plan.tier,
          description: plan.description || '',
          monthlyPrice: plan.monthlyPrice,
          annualPrice: plan.annualPrice,
          currency: plan.currency,
          maxUsers: plan.maxUsers,
          maxAppointmentsPerDay: plan.maxAppointmentsPerDay,
          maxServices: plan.maxServices,
          maxProducts: plan.maxProducts,
          features: (plan.features as Record<string, boolean>) || DEFAULT_FEATURES,
          trialDays: plan.trialDays,
          gracePeriodDays: plan.gracePeriodDays,
          displayOrder: plan.displayOrder || 0,
          isActive: plan.isActive,
          isPublic: plan.isPublic,
        });
      } else {
        setFormData({
          name: '',
          code: '',
          tier: 'basic',
          description: '',
          monthlyPrice: 0,
          annualPrice: 0,
          currency: 'INR',
          maxUsers: 3,
          maxAppointmentsPerDay: 50,
          maxServices: 20,
          maxProducts: 50,
          features: DEFAULT_FEATURES,
          trialDays: 14,
          gracePeriodDays: 7,
          displayOrder: 0,
          isActive: true,
          isPublic: true,
        });
      }
    }
  }, [open, plan]);

  // Auto-generate code from name
  const handleNameChange = (name: string) => {
    setFormData((prev) => ({
      ...prev,
      name,
      // Only auto-generate code if creating new plan
      ...(!isEditing && {
        code: name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '_')
          .replace(/^_|_$/g, ''),
      }),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(formData);
  };

  const updateFeature = (key: string, value: boolean | string) => {
    setFormData((prev) => ({
      ...prev,
      features: {
        ...prev.features,
        [key]: value,
      },
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Plan' : 'Create Plan'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the subscription plan details'
              : 'Create a new subscription plan with pricing and features'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="limits">Limits</TabsTrigger>
              <TabsTrigger value="features">Features</TabsTrigger>
            </TabsList>

            {/* Basic Info Tab */}
            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Plan Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="e.g., Professional"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="code">Code</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="e.g., professional"
                    disabled={isEditing}
                    required
                  />
                  {isEditing && (
                    <p className="text-xs text-slate-500">Code cannot be changed after creation</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tier">Tier</Label>
                  <Select
                    value={formData.tier}
                    onValueChange={(value: 'basic' | 'professional' | 'enterprise') =>
                      setFormData({ ...formData, tier: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basic">Basic</SelectItem>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="displayOrder">Display Order</Label>
                  <Input
                    id="displayOrder"
                    type="number"
                    min={0}
                    value={formData.displayOrder}
                    onChange={(e) =>
                      setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of the plan..."
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="monthlyPrice">Monthly Price (₹)</Label>
                  <Input
                    id="monthlyPrice"
                    type="number"
                    min={0}
                    value={formData.monthlyPrice || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, monthlyPrice: parseFloat(e.target.value) || 0 })
                    }
                    placeholder="999"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="annualPrice">Annual Price (₹)</Label>
                  <Input
                    id="annualPrice"
                    type="number"
                    min={0}
                    value={formData.annualPrice || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, annualPrice: parseFloat(e.target.value) || 0 })
                    }
                    placeholder="9990"
                    required
                  />
                  {formData.monthlyPrice > 0 && formData.annualPrice > 0 && (
                    <p className="text-xs text-green-600">
                      {Math.round(
                        ((formData.monthlyPrice * 12 - formData.annualPrice) /
                          (formData.monthlyPrice * 12)) *
                          100
                      )}
                      % savings on annual
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="trialDays">Trial Days</Label>
                  <Input
                    id="trialDays"
                    type="number"
                    min={0}
                    value={formData.trialDays}
                    onChange={(e) =>
                      setFormData({ ...formData, trialDays: parseInt(e.target.value) || 0 })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gracePeriodDays">Grace Period Days</Label>
                  <Input
                    id="gracePeriodDays"
                    type="number"
                    min={0}
                    value={formData.gracePeriodDays}
                    onChange={(e) =>
                      setFormData({ ...formData, gracePeriodDays: parseInt(e.target.value) || 0 })
                    }
                  />
                </div>
              </div>

              <div className="flex gap-6 pt-2">
                <div className="flex items-center gap-2">
                  <Switch
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                  />
                  <Label htmlFor="isActive">Active</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="isPublic"
                    checked={formData.isPublic}
                    onCheckedChange={(checked) => setFormData({ ...formData, isPublic: checked })}
                  />
                  <Label htmlFor="isPublic">Public</Label>
                </div>
              </div>
            </TabsContent>

            {/* Limits Tab */}
            <TabsContent value="limits" className="space-y-4 mt-4">
              <p className="text-sm text-slate-500 mb-4">
                Set -1 for unlimited. These limits are enforced at the branch level.
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="maxUsers">Max Users</Label>
                  <Input
                    id="maxUsers"
                    type="number"
                    min={-1}
                    value={formData.maxUsers}
                    onChange={(e) =>
                      setFormData({ ...formData, maxUsers: parseInt(e.target.value) || 0 })
                    }
                  />
                  <p className="text-xs text-slate-500">
                    {formData.maxUsers === -1 ? 'Unlimited' : `${formData.maxUsers} users`}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxAppointmentsPerDay">Max Appointments/Day</Label>
                  <Input
                    id="maxAppointmentsPerDay"
                    type="number"
                    min={-1}
                    value={formData.maxAppointmentsPerDay}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        maxAppointmentsPerDay: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                  <p className="text-xs text-slate-500">
                    {formData.maxAppointmentsPerDay === -1
                      ? 'Unlimited'
                      : `${formData.maxAppointmentsPerDay} appointments`}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="maxServices">Max Services</Label>
                  <Input
                    id="maxServices"
                    type="number"
                    min={-1}
                    value={formData.maxServices}
                    onChange={(e) =>
                      setFormData({ ...formData, maxServices: parseInt(e.target.value) || 0 })
                    }
                  />
                  <p className="text-xs text-slate-500">
                    {formData.maxServices === -1 ? 'Unlimited' : `${formData.maxServices} services`}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxProducts">Max Products</Label>
                  <Input
                    id="maxProducts"
                    type="number"
                    min={-1}
                    value={formData.maxProducts}
                    onChange={(e) =>
                      setFormData({ ...formData, maxProducts: parseInt(e.target.value) || 0 })
                    }
                  />
                  <p className="text-xs text-slate-500">
                    {formData.maxProducts === -1 ? 'Unlimited' : `${formData.maxProducts} products`}
                  </p>
                </div>
              </div>
            </TabsContent>

            {/* Features Tab */}
            <TabsContent value="features" className="space-y-4 mt-4">
              <p className="text-sm text-slate-500 mb-4">Toggle features included in this plan.</p>

              <div className="space-y-3">
                {FEATURE_OPTIONS.map((feature) => (
                  <div
                    key={feature.key}
                    className="flex items-center justify-between p-3 rounded-lg bg-slate-50"
                  >
                    <Label htmlFor={feature.key} className="cursor-pointer">
                      {feature.label}
                    </Label>
                    {feature.type === 'boolean' ? (
                      <Switch
                        id={feature.key}
                        checked={!!formData.features[feature.key]}
                        onCheckedChange={(checked) => updateFeature(feature.key, checked)}
                      />
                    ) : (
                      <Select
                        value={String(formData.features[feature.key] || feature.options?.[0])}
                        onValueChange={(value) => updateFeature(feature.key, value)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {feature.options?.map((opt) => (
                            <SelectItem key={opt} value={opt}>
                              {opt.charAt(0).toUpperCase() + opt.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !formData.name || !formData.code}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : isEditing ? (
                'Update Plan'
              ) : (
                'Create Plan'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
