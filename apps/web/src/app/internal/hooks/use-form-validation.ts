/**
 * Form Validation Hook for Internal Admin Portal
 * Uses validators from @/lib/validators.ts and provides form-specific validation
 */

'use client';

import { useCallback } from 'react';
import type { FormErrors, TenantFormData, BranchFormData, OwnerFormData } from '../types';

// Validation regex patterns
const INDIAN_PHONE_REGEX = /^[6-9]\d{9}$/;
const PINCODE_REGEX = /^\d{6}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// GSTIN regex: 15 characters alphanumeric (Indian GST format)
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

// ============================================
// FIELD VALIDATORS
// ============================================

export function validateRequired(value: string, fieldName: string): string | null {
  if (!value || !value.trim()) return `${fieldName} is required`;
  return null;
}

export function validateName(name: string, fieldName = 'Name'): string | null {
  if (!name || !name.trim()) return `${fieldName} is required`;
  if (name.trim().length < 2) return `${fieldName} must be at least 2 characters`;
  return null;
}

export function validateEmail(email: string, required = true): string | null {
  if (!email) return required ? 'Email is required' : null;
  if (!EMAIL_REGEX.test(email)) return 'Invalid email format';
  return null;
}

export function validatePhone(phone: string, required = false): string | null {
  if (!phone) return required ? 'Phone is required' : null;
  if (!INDIAN_PHONE_REGEX.test(phone)) return 'Phone must be 10 digits starting with 6-9';
  return null;
}

export function validatePassword(password: string, required = true): string | null {
  if (!password) return required ? 'Password is required' : null;
  if (password.length < 8) return 'Password must be at least 8 characters';
  return null;
}

export function validatePincode(pincode: string, required = false): string | null {
  if (!pincode) return required ? 'Pincode is required' : null;
  if (!PINCODE_REGEX.test(pincode)) return 'Pincode must be 6 digits';
  return null;
}

export function validateGstin(gstin: string, required = false): string | null {
  if (!gstin) return required ? 'GSTIN is required' : null;
  if (!GSTIN_REGEX.test(gstin)) return 'Invalid GSTIN format (e.g., 22AAAAA0000A1Z5)';
  return null;
}

// ============================================
// FORM VALIDATORS
// ============================================

export function validateTenantForm(data: TenantFormData): FormErrors {
  return {
    name: validateName(data.name, 'Business name'),
    email: validateEmail(data.email),
    phone: validatePhone(data.phone, false),
    // Billing fields - all optional
    billingEmail: data.billingEmail ? validateEmail(data.billingEmail, false) : null,
    gstin: data.gstin ? validateGstin(data.gstin, false) : null,
  };
}

export function validateBranchForm(data: BranchFormData): FormErrors {
  return {
    name: validateName(data.name, 'Branch name'),
    address: validateRequired(data.address, 'Address'),
    city: validateRequired(data.city, 'City'),
    state: validateRequired(data.state, 'State'),
    pincode: validatePincode(data.pincode, true),
    phone: validatePhone(data.phone, false),
    email: data.email ? validateEmail(data.email, false) : null,
  };
}

export function validateOwnerForm(data: OwnerFormData, isEdit = false): FormErrors {
  const errors: FormErrors = {
    name: validateName(data.name, 'Full name'),
    email: validateEmail(data.email),
    phone: validatePhone(data.phone, true),
  };

  // Password validation - required for create, optional for edit
  if (!isEdit || data.password) {
    errors.password = validatePassword(data.password, !isEdit);
    errors.confirmPassword =
      data.password !== data.confirmPassword ? 'Passwords do not match' : null;
  }

  return errors;
}

export function hasErrors(errors: FormErrors): boolean {
  return Object.values(errors).some((e) => e !== null);
}

// ============================================
// HOOK
// ============================================

export function useFormValidation() {
  const validateTenant = useCallback((data: TenantFormData) => {
    return validateTenantForm(data);
  }, []);

  const validateBranch = useCallback((data: BranchFormData) => {
    return validateBranchForm(data);
  }, []);

  const validateOwner = useCallback((data: OwnerFormData, isEdit = false) => {
    return validateOwnerForm(data, isEdit);
  }, []);

  return {
    validateTenant,
    validateBranch,
    validateOwner,
    hasErrors,
  };
}
