/**
 * TenantForm - Reusable tenant form fields
 * Used in both Create Tenant wizard and Edit Tenant dialog
 */

'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { LogoUpload } from './logo-upload';
import { SUBSCRIPTION_PLANS, SUBSCRIPTION_STATUSES } from '../constants';
import type { TenantFormData, FormErrors, SubscriptionPlan, SubscriptionStatus } from '../types';
import { ChevronDown, Star } from 'lucide-react';
import { useState } from 'react';

interface TenantFormProps {
  data: TenantFormData;
  errors: FormErrors;
  onChange: (data: TenantFormData) => void;
  onClearError: (field: string) => void;
  /** Logo preview URL */
  logoPreview: string | null;
  /** Called when a logo file is selected */
  onLogoSelect: (file: File, preview: string) => void;
  /** Called when logo is removed */
  onLogoRemove: () => void;
  /** Whether logo is currently uploading */
  logoUploading?: boolean;
  /** If true, shows status field (for edit mode) */
  showStatus?: boolean;
  /** If true, shows trial days field when plan is trial */
  showTrialDays?: boolean;
  /** If true, shows loyalty config section */
  showLoyaltyConfig?: boolean;
}

export function TenantForm({
  data,
  errors,
  onChange,
  onClearError,
  logoPreview,
  onLogoSelect,
  onLogoRemove,
  logoUploading = false,
  showStatus = false,
  showTrialDays = true,
  showLoyaltyConfig = true,
}: TenantFormProps) {
  const [loyaltyOpen, setLoyaltyOpen] = useState(false);

  const handleChange = (field: keyof TenantFormData, value: string | number | boolean) => {
    onChange({ ...data, [field]: value });
    onClearError(field);
  };

  const handlePhoneChange = (value: string) => {
    handleChange('phone', value.replace(/\D/g, '').slice(0, 10));
  };

  return (
    <>
      {/* Logo Upload */}
      <LogoUpload
        preview={logoPreview}
        onFileSelect={onLogoSelect}
        onRemove={onLogoRemove}
        uploading={logoUploading}
        label="Business Logo"
      />

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-slate-700">
            Business Name <span className="text-red-500">*</span>
          </Label>
          <Input
            value={data.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="Glamour Studio"
            className={`border-slate-300 ${errors.name ? 'border-red-500' : ''}`}
          />
          {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
        </div>
        <div className="space-y-2">
          <Label className="text-slate-700">Legal Name</Label>
          <Input
            value={data.legalName}
            onChange={(e) => handleChange('legalName', e.target.value)}
            placeholder="Glamour Studio Pvt Ltd"
            className="border-slate-300"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-slate-700">
            Email <span className="text-red-500">*</span>
          </Label>
          <Input
            type="email"
            value={data.email}
            onChange={(e) => handleChange('email', e.target.value)}
            placeholder="contact@glamourstudio.com"
            className={`border-slate-300 ${errors.email ? 'border-red-500' : ''}`}
          />
          {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
        </div>
        <div className="space-y-2">
          <Label className="text-slate-700">Phone</Label>
          <div className="flex">
            <div className="flex items-center px-3 bg-slate-100 border border-r-0 border-slate-300 rounded-l-md text-slate-500 text-sm">
              +91
            </div>
            <Input
              value={data.phone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              placeholder="9876543210"
              className={`border-slate-300 rounded-l-none ${errors.phone ? 'border-red-500' : ''}`}
              maxLength={10}
            />
          </div>
          {errors.phone && <p className="text-xs text-red-500">{errors.phone}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-slate-700">Subscription Plan</Label>
          <Select
            value={data.subscriptionPlan}
            onValueChange={(v) => handleChange('subscriptionPlan', v as SubscriptionPlan)}
          >
            <SelectTrigger className="border-slate-300">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SUBSCRIPTION_PLANS.map((plan) => (
                <SelectItem key={plan.value} value={plan.value}>
                  {plan.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {showStatus && (
          <div className="space-y-2">
            <Label className="text-slate-700">Status</Label>
            <Select
              value={data.subscriptionStatus}
              onValueChange={(v) => handleChange('subscriptionStatus', v as SubscriptionStatus)}
            >
              <SelectTrigger className="border-slate-300">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SUBSCRIPTION_STATUSES.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {showTrialDays && data.subscriptionPlan === 'trial' && !showStatus && (
          <div className="space-y-2">
            <Label className="text-slate-700">Trial Days</Label>
            <Input
              type="number"
              value={data.trialDays || ''}
              onChange={(e) =>
                handleChange('trialDays', e.target.value ? parseInt(e.target.value) : 0)
              }
              onBlur={(e) => {
                if (!e.target.value || parseInt(e.target.value) <= 0) {
                  handleChange('trialDays', 14);
                }
              }}
              min={1}
              max={90}
              className="border-slate-300"
            />
          </div>
        )}
      </div>

      {/* Loyalty Program Configuration */}
      {showLoyaltyConfig && (
        <Collapsible open={loyaltyOpen} onOpenChange={setLoyaltyOpen} className="mt-4">
          <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-amber-500" />
              <span className="font-medium text-slate-700">Loyalty Program</span>
              {data.loyaltyEnabled && (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                  Enabled
                </span>
              )}
            </div>
            <ChevronDown
              className={`h-4 w-4 text-slate-500 transition-transform ${loyaltyOpen ? 'rotate-180' : ''}`}
            />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-4 space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
              <div>
                <Label className="text-slate-700">Enable Loyalty Program</Label>
                <p className="text-xs text-slate-500">
                  Allow customers to earn and redeem loyalty points
                </p>
              </div>
              <Switch
                checked={data.loyaltyEnabled}
                onCheckedChange={(checked) => handleChange('loyaltyEnabled', checked)}
              />
            </div>

            {data.loyaltyEnabled && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-700">Points per ₹100 spent</Label>
                    <Input
                      type="number"
                      value={data.loyaltyPointsPerUnit * 100 || ''}
                      onChange={(e) =>
                        handleChange(
                          'loyaltyPointsPerUnit',
                          e.target.value ? parseFloat(e.target.value) / 100 : 0
                        )
                      }
                      min={0}
                      max={100}
                      step={0.1}
                      className="border-slate-300"
                      placeholder="1"
                    />
                    <p className="text-xs text-slate-500">
                      e.g., 1 means customer earns 1 point per ₹100 spent
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700">₹ value per point</Label>
                    <Input
                      type="number"
                      value={data.loyaltyRedemptionValue || ''}
                      onChange={(e) =>
                        handleChange(
                          'loyaltyRedemptionValue',
                          e.target.value ? parseFloat(e.target.value) : 0
                        )
                      }
                      min={0}
                      max={100}
                      step={0.1}
                      className="border-slate-300"
                      placeholder="1"
                    />
                    <p className="text-xs text-slate-500">e.g., 1 means 1 point = ₹1 discount</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-700">Points Expiry (days)</Label>
                  <Input
                    type="number"
                    value={data.loyaltyExpiryDays || ''}
                    onChange={(e) =>
                      handleChange(
                        'loyaltyExpiryDays',
                        e.target.value ? parseInt(e.target.value) : 0
                      )
                    }
                    min={0}
                    max={3650}
                    className="border-slate-300"
                    placeholder="365"
                  />
                  <p className="text-xs text-slate-500">
                    0 = points never expire. Default is 365 days.
                  </p>
                </div>
              </>
            )}
          </CollapsibleContent>
        </Collapsible>
      )}
    </>
  );
}
