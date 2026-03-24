/**
 * BranchForm - Reusable branch form fields
 * Used in both Add Branch and Edit Branch dialogs
 */

'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { BranchFormData, FormErrors } from '../types';

interface BranchFormProps {
  data: BranchFormData;
  errors: FormErrors;
  onChange: (data: BranchFormData) => void;
  onClearError: (field: string) => void;
}

export function BranchForm({ data, errors, onChange, onClearError }: BranchFormProps) {
  const handleChange = (field: keyof BranchFormData, value: string) => {
    onChange({ ...data, [field]: value });
    onClearError(field);
  };

  const handlePhoneChange = (value: string) => {
    handleChange('phone', value.replace(/\D/g, '').slice(0, 10));
  };

  const handlePincodeChange = (value: string) => {
    handleChange('pincode', value.replace(/\D/g, '').slice(0, 6));
  };

  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-slate-700">
            Branch Name <span className="text-red-500">*</span>
          </Label>
          <Input
            value={data.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="Main Branch"
            className={`border-slate-300 ${errors.name ? 'border-red-500' : ''}`}
          />
          {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
        </div>
        <div className="space-y-2">
          <Label className="text-slate-700">GSTIN</Label>
          <Input
            value={data.gstin}
            onChange={(e) => handleChange('gstin', e.target.value)}
            placeholder="22AAAAA0000A1Z5"
            className="border-slate-300"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-slate-700">
          Address <span className="text-red-500">*</span>
        </Label>
        <Input
          value={data.address}
          onChange={(e) => handleChange('address', e.target.value)}
          placeholder="123 Main Street, Shop No. 5"
          className={`border-slate-300 ${errors.address ? 'border-red-500' : ''}`}
        />
        {errors.address && <p className="text-xs text-red-500">{errors.address}</p>}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label className="text-slate-700">
            City <span className="text-red-500">*</span>
          </Label>
          <Input
            value={data.city}
            onChange={(e) => handleChange('city', e.target.value)}
            placeholder="Mumbai"
            className={`border-slate-300 ${errors.city ? 'border-red-500' : ''}`}
          />
          {errors.city && <p className="text-xs text-red-500">{errors.city}</p>}
        </div>
        <div className="space-y-2">
          <Label className="text-slate-700">
            State <span className="text-red-500">*</span>
          </Label>
          <Input
            value={data.state}
            onChange={(e) => handleChange('state', e.target.value)}
            placeholder="Maharashtra"
            className={`border-slate-300 ${errors.state ? 'border-red-500' : ''}`}
          />
          {errors.state && <p className="text-xs text-red-500">{errors.state}</p>}
        </div>
        <div className="space-y-2">
          <Label className="text-slate-700">
            Pincode <span className="text-red-500">*</span>
          </Label>
          <Input
            value={data.pincode}
            onChange={(e) => handlePincodeChange(e.target.value)}
            placeholder="400001"
            className={`border-slate-300 ${errors.pincode ? 'border-red-500' : ''}`}
            maxLength={6}
          />
          {errors.pincode && <p className="text-xs text-red-500">{errors.pincode}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
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
        <div className="space-y-2">
          <Label className="text-slate-700">Email</Label>
          <Input
            type="email"
            value={data.email}
            onChange={(e) => handleChange('email', e.target.value)}
            placeholder="branch@example.com"
            className={`border-slate-300 ${errors.email ? 'border-red-500' : ''}`}
          />
          {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
        </div>
      </div>
    </>
  );
}
