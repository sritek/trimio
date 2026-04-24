/**
 * Internal Admin Portal - Constants
 */

// ============================================
// DEFAULT VALUES
// ============================================

export const EMPTY_TENANT_FORM = {
  name: '',
  legalName: '',
  email: '',
  phone: '',
  logoUrl: '',
  // Billing information
  billingEmail: '',
  billingAddress: '',
  gstin: '',
};

export const EMPTY_BRANCH_FORM = {
  name: '',
  address: '',
  city: '',
  state: '',
  pincode: '',
  phone: '',
  email: '',
  gstin: '',
};

export const EMPTY_OWNER_FORM = {
  name: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
};

// ============================================
// FILE UPLOAD
// ============================================

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
export const MAX_LOGO_SIZE_MB = 2;
export const MAX_LOGO_SIZE_BYTES = MAX_LOGO_SIZE_MB * 1024 * 1024;
