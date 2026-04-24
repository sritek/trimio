/**
 * TenantForm - Reusable tenant form fields
 * Used in both Create Tenant wizard and Edit Tenant dialog
 */

'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { LogoUpload } from './logo-upload';
import type { TenantFormData, FormErrors } from '../types';

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
  /** Show billing fields (default: true) */
  showBillingFields?: boolean;
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
  showBillingFields = true,
}: TenantFormProps) {
  const handleChange = (field: keyof TenantFormData, value: string | number | boolean) => {
    onChange({ ...data, [field]: value });
    onClearError(field);
  };

  const handlePhoneChange = (value: string) => {
    handleChange('phone', value.replace(/\D/g, '').slice(0, 10));
  };

  const handleGstinChange = (value: string) => {
    // GSTIN is 15 characters, uppercase alphanumeric
    handleChange(
      'gstin',
      value
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .slice(0, 15)
    );
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

      {/* Billing Information */}
      {showBillingFields && (
        <>
          <div className="border-t border-slate-200 pt-4 mt-2">
            <h4 className="text-sm font-medium text-slate-700 mb-3">Billing Information</h4>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-700">Billing Email</Label>
              <Input
                type="email"
                value={data.billingEmail}
                onChange={(e) => handleChange('billingEmail', e.target.value)}
                placeholder="accounts@glamourstudio.com"
                className={`border-slate-300 ${errors.billingEmail ? 'border-red-500' : ''}`}
              />
              <p className="text-xs text-slate-500">
                Subscription notifications will be sent here. Falls back to business email if empty.
              </p>
              {errors.billingEmail && <p className="text-xs text-red-500">{errors.billingEmail}</p>}
            </div>
            <div className="space-y-2">
              <Label className="text-slate-700">GSTIN</Label>
              <Input
                value={data.gstin}
                onChange={(e) => handleGstinChange(e.target.value)}
                placeholder="22AAAAA0000A1Z5"
                className={`border-slate-300 font-mono ${errors.gstin ? 'border-red-500' : ''}`}
                maxLength={15}
              />
              {errors.gstin && <p className="text-xs text-red-500">{errors.gstin}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-slate-700">Billing Address</Label>
            <Textarea
              value={data.billingAddress}
              onChange={(e) => handleChange('billingAddress', e.target.value)}
              placeholder="123 Business Park, MG Road, Bangalore, Karnataka 560001"
              className={`border-slate-300 min-h-[80px] ${errors.billingAddress ? 'border-red-500' : ''}`}
            />
            {errors.billingAddress && (
              <p className="text-xs text-red-500">{errors.billingAddress}</p>
            )}
          </div>
        </>
      )}
    </>
  );
}
