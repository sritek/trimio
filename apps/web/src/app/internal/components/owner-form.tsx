/**
 * OwnerForm - Reusable owner form fields
 * Used in both Add Owner and Edit Owner dialogs
 */

'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';
import type { OwnerFormData, FormErrors } from '../types';

interface OwnerFormProps {
  data: OwnerFormData;
  errors: FormErrors;
  onChange: (data: OwnerFormData) => void;
  onClearError: (field: string) => void;
  /** If true, password fields are optional (for edit mode) */
  isEdit?: boolean;
}

export function OwnerForm({
  data,
  errors,
  onChange,
  onClearError,
  isEdit = false,
}: OwnerFormProps) {
  const handleChange = (field: keyof OwnerFormData, value: string) => {
    onChange({ ...data, [field]: value });
    onClearError(field);
  };

  const handlePhoneChange = (value: string) => {
    handleChange('phone', value.replace(/\D/g, '').slice(0, 10));
  };

  return (
    <>
      <div className="space-y-2">
        <Label className="text-slate-700">
          Full Name <span className="text-red-500">*</span>
        </Label>
        <Input
          value={data.name}
          onChange={(e) => handleChange('name', e.target.value)}
          placeholder="John Doe"
          className={`border-slate-300 ${errors.name ? 'border-red-500' : ''}`}
        />
        {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
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
            placeholder="owner@example.com"
            className={`border-slate-300 ${errors.email ? 'border-red-500' : ''}`}
          />
          {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
        </div>
        <div className="space-y-2">
          <Label className="text-slate-700">
            Phone <span className="text-red-500">*</span>
          </Label>
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
          <Label className="text-slate-700">
            {isEdit ? 'New Password' : 'Password'}{' '}
            {!isEdit && <span className="text-red-500">*</span>}
          </Label>
          <PasswordInput
            value={data.password}
            onChange={(e) => handleChange('password', e.target.value)}
            placeholder={isEdit ? 'Leave blank to keep' : 'Min 8 characters'}
            error={!!errors.password}
            className="border-slate-300"
          />
          {errors.password && <p className="text-xs text-red-500">{errors.password}</p>}
        </div>
        <div className="space-y-2">
          <Label className="text-slate-700">
            Confirm Password {!isEdit && <span className="text-red-500">*</span>}
          </Label>
          <PasswordInput
            value={data.confirmPassword}
            onChange={(e) => handleChange('confirmPassword', e.target.value)}
            placeholder={isEdit ? 'Confirm new password' : 'Confirm password'}
            error={!!errors.confirmPassword}
            className="border-slate-300"
          />
          {errors.confirmPassword && (
            <p className="text-xs text-red-500">{errors.confirmPassword}</p>
          )}
        </div>
      </div>
    </>
  );
}
