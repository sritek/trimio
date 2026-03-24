/**
 * Internal Admin Hooks - Barrel Export
 */

export { useInternalApi } from './use-internal-api';
export {
  useFormValidation,
  validateTenantForm,
  validateBranchForm,
  validateOwnerForm,
  validateRequired,
  validateName,
  validateEmail,
  validatePhone,
  validatePassword,
  validatePincode,
  hasErrors,
} from './use-form-validation';
