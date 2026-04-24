/**
 * Common Components - Barrel Export
 *
 * Import from this file for all common wrapper components.
 * Example: import { PageHeader, DataTable, StatusBadge } from '@/components/common';
 */

// Page components
export { PageContainer } from './page-container';
export { PageHeader } from './page-header';
export { PageContent } from './page-content';

// Data display
export { DataTable, SortableHeader, getSelectionColumn } from './data-table';
export type { DataTableProps, PaginationMeta, ColumnDef, SortingState, Row } from './data-table';
export { StatCard } from './stat-card';
export { StatusBadge } from './status-badge';
export { EmptyState } from './empty-state';
export { ErrorState } from './error-state';

// Form components
export { FormSection } from './form-section';
export { FormActions } from './form-actions';
export { CurrencyInput } from './currency-input';
export { PhoneInput } from './phone-input';

// Interaction components
export { ConfirmDialog } from './confirm-dialog';
export { ActionMenu } from './action-menu';
export { SearchInput } from './search-input';
export { FilterBar } from './filter-bar';
export { FilterButton } from './filter-button';
export { FilterSheet } from './filter-sheet';
export { DatePicker } from './date-picker';
export { TimePicker } from './time-picker';
export { TimeSlotPicker } from './time-slot-picker';
export { WorkingHoursEditor, DEFAULT_WORKING_HOURS } from './working-hours-editor';
export type { DayWorkingHours, WeeklyWorkingHours } from './working-hours-editor';
export { StylistBreaksEditor } from './stylist-breaks-editor';
export type { StylistBreak } from './stylist-breaks-editor';

// Combobox components
export { CustomerCombobox } from './customer-combobox';
export type { CustomerOption, CustomerComboboxProps } from './customer-combobox';
export { ServiceCombobox } from './service-combobox';
export type { ServiceOption, ServiceComboboxProps } from './service-combobox';

// Payment components
export { SplitPaymentInput, SplitPaymentRow } from './split-payment-input';
export type { SplitPaymentInputProps, SplitPaymentRowProps } from './split-payment-input';

// Feedback components
export { LoadingSpinner } from './loading-spinner';
export { LoadingOverlay } from './loading-overlay';
export { Notice } from './notice';
export type { NoticeSeverity } from './notice';

// Access control components
export { PermissionGuard } from './permission-guard';
export { AccessDenied } from './access-denied';
export { FeatureGate } from './feature-gate';
export { UpgradePrompt } from './upgrade-prompt';
export { LimitBanner, isLimitReached } from './limit-banner';
export type { LimitType } from './limit-banner';
export { TrialBanner } from './trial-banner';
export { SubscriptionStatusBanner } from './subscription-status-banner';
export { SuspendedOverlay } from './suspended-overlay';

// i18n components
export { LanguageSwitcher, LanguageSwitcherCompact } from './language-switcher';
