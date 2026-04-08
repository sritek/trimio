---
inclusion: manual
---

# Testing Journey Tracker

## Overview

Comprehensive end-to-end testing of Trimio SaaS platform.
Started: March 18, 2026

## Testing Approach

- Start with clean database (no seed data)
- Test as a real user would use the system
- Document bugs found and fixes applied
- Cover all implemented modules

---

## Pre-Testing Checklist

- [ ] Docker containers running (postgres, redis)
- [ ] Clean database (reset migrations)
- [ ] API server running
- [ ] Web app running
- [ ] Browser dev tools open for network inspection

---

## Testing Phases

### Phase 1: Authentication & Onboarding

- [x] Login page loads (rebranded to trimio)
- [x] Error handling for invalid credentials
- [x] Successful login flow
- [x] JWT token storage
- [x] Session persistence on refresh (fixed hydration mismatch)
- [x] Logout flow (with confirmation dialog)

### Phase 2: Dashboard & Navigation

- [x] Dashboard loads after login
- [x] Sidebar navigation works (redesigned with new layout)
- [x] Branch selector works (moved to sidebar)
- [ ] Role-based menu visibility
- [x] Mobile navigation updated (consistent with sidebar)

### Phase 3: Service Setup

- [ ] Create service categories
- [ ] Create services with pricing
- [ ] Service variants (gender-based pricing)
- [ ] Branch-specific pricing overrides

### Phase 4: Staff Setup

- [ ] Create staff members
- [ ] Assign roles
- [ ] Assign to branches
- [ ] Create shifts
- [ ] Assign shifts to staff

### Phase 5: Customer Management

- [ ] Create customers
- [ ] Customer search
- [ ] Customer tags
- [ ] Customer notes
- [ ] Loyalty points display
- [ ] Wallet balance display

### Phase 6: Appointments

- [ ] Create walk-in appointment
- [ ] Create scheduled appointment
- [ ] Appointment calendar view
- [ ] Check-in flow
- [ ] Start service flow
- [ ] Complete service flow
- [ ] Reschedule appointment
- [ ] Cancel appointment

### Phase 7: Billing

- [ ] Create invoice from appointment
- [ ] Add services to invoice
- [ ] Add products to invoice
- [ ] Apply discounts
- [ ] Process payment (cash)
- [ ] Process split payment
- [ ] Finalize invoice
- [ ] View invoice details
- [ ] Credit note creation

### Phase 8: Inventory (if enabled)

- [ ] Create product categories
- [ ] Create products
- [ ] Create vendors
- [ ] Create purchase order
- [ ] Receive goods (GRN)
- [ ] Stock levels display
- [ ] Stock consumption on billing

### Phase 9: Staff Operations

- [ ] Clock in/out
- [ ] Leave application
- [ ] Leave approval
- [ ] Commission tracking
- [ ] Payroll generation

### Phase 10: Memberships (if enabled)

- [ ] Create membership plans
- [ ] Create packages
- [ ] Sell membership to customer
- [ ] Sell package to customer
- [ ] Redemption during billing

---

## Bugs Found

| #   | Module         | Description                                                                | Severity | Status   | Fix                                        |
| --- | -------------- | -------------------------------------------------------------------------- | -------- | -------- | ------------------------------------------ |
| 1   | Internal Admin | Page refresh causes 401 error - Zustand store not hydrated before API call | Medium   | ✅ Fixed | Added hydration check before fetching data |

---

## Notes & Observations

(Add notes during testing)

---

## Environment Info

- OS: macOS
- Browser: Arc Browser
- Node: 22.x
- Database: PostgreSQL 15 (Docker)
- Redis: 7 (Docker)

## Testing Scope

- **Starting point**: Empty database (no seed data)
- **Modules enabled**: Core modules only (Phase 1)
  - Inventory: DISABLED
  - Memberships: DISABLED
  - Online Booking: DISABLED
  - Marketing: DISABLED
- **Testing method**: UI-focused
- **Error handling**: Deep testing of all error scenarios
- **Implementation**: Will implement missing features as we encounter them

---

## Implementation Tasks (Discovered During Testing)

### Task 1: Internal Admin Portal for Tenant Provisioning

**Status**: ✅ Complete

**Implementation**:

- [x] Backend: Admin auth middleware (`apps/api/src/modules/internal/`)
- [x] Backend: Admin login endpoint (`POST /api/v1/internal/login`)
- [x] Backend: Tenant CRUD (`GET/POST /api/v1/internal/tenants`)
- [x] Backend: Branch creation (`POST /api/v1/internal/branches`)
- [x] Backend: Super owner creation (`POST /api/v1/internal/users`)
- [x] Frontend: Admin store (`apps/web/src/stores/admin-store.ts`)
- [x] Frontend: Admin login page (`/internal/login`)
- [x] Frontend: Tenants list page (`/internal/tenants`)
- [x] Frontend: New tenant wizard (`/internal/tenants/new`)
- [x] Frontend: Tenant detail page (`/internal/tenants/[id]`)
- [x] Middleware: Route protection for `/internal/*`

**Admin Credentials** (in apps/api/.env):

- Email: `admin@trimio.com`
- Password: `admin123456`

### Task 2: Tenant Logo Upload

**Status**: ✅ Complete

**Implementation**:

- [x] Backend: S3 service (`apps/api/src/lib/s3.ts`)
- [x] Backend: Logo upload endpoint (`POST /api/v1/internal/upload/logo`)
- [x] Backend: Updated tenant schema to include `logoUrl`
- [x] Backend: Multipart file upload support
- [x] Frontend: Logo upload UI in tenant creation wizard
- [x] Frontend: Image preview before upload
- [x] Frontend: File validation (type, size)

**AWS Setup Required**:

- Create S3 bucket
- Add AWS credentials to `apps/api/.env`:
  - `AWS_REGION`
  - `AWS_ACCESS_KEY_ID`
  - `AWS_SECRET_ACCESS_KEY`
  - `S3_BUCKET_NAME`
  - `CDN_URL` (optional)

### Task 3: Tenant Logo Display (Branding)

**Status**: 🔴 Todo

**Requirement**: Display uploaded tenant logo on:

- [ ] Tenant's login page
- [ ] Dashboard header/sidebar
- [ ] Invoices/receipts
- [ ] Public booking page (future)

### Task 4: S3 File Organization for Other Uploads

**Status**: 🔴 Todo

**Requirement**: Extend S3 service with tenant-based folder structure for:

- [ ] Invoice PDFs: `tenants/{tenantId}/invoices/{invoice-id}.pdf`
- [ ] Receipt PDFs: `tenants/{tenantId}/receipts/{receipt-id}.pdf`
- [ ] Staff avatars: `tenants/{tenantId}/staff/{user-id}/avatar.{ext}`
- [ ] Customer photos: `tenants/{tenantId}/customers/{customer-id}/photo.{ext}`
- [ ] Product images: `tenants/{tenantId}/products/{product-id}.{ext}`

**Benefits**:

- Easy tenant data isolation and cleanup
- Per-tenant storage tracking
- Simplified backup/export per tenant

### Task 5: Subscription Plans Management

**Status**: 🔴 Todo

**Requirement**: Proper subscription plan management system

**Current State**:

- Plans hardcoded in UI dropdown: `trial`, `basic`, `professional`, `enterprise`
- DB field is just a string (no enum validation)
- No feature limits enforced

**Future Implementation**:

- [ ] Create `SubscriptionPlan` table with: name, price, features, limits
- [ ] Add Prisma enum or foreign key constraint
- [ ] Define feature limits per plan (branches, users, storage, etc.)
- [ ] Enforce limits in API (e.g., max branches per plan)
- [ ] Plan upgrade/downgrade flow
- [ ] Billing integration (Razorpay/Stripe)
- [ ] Usage tracking and alerts

---

## Schema Cleanup Tasks

Track unnecessary fields to remove or refactor during testing.

| Model | Field | Issue | Action | Status |
| ----- | ----- | ----- | ------ | ------ |
| -     | -     | -     | -      | -      |

### Cleanup Guidelines

- Remove unused fields discovered during testing
- Consolidate redundant fields
- Fix naming inconsistencies
- Add missing indexes for query patterns
- Document all schema changes for migration
