/**
 * TenantForm - Reusable tenant form fields
 * Used in both Create Tenant wizard and Edit Tenant dialog
 */

'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
}: TenantFormProps) {
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
    </>
  );
}
