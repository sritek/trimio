---
# Core architecture patterns, multi-tenancy, auth, project structure, and coding standards for Trimio
inclusion: always
---

# System Architecture

**Full documentation**: `.cursor/docs/design/00-architecture.md`

## Tech Stack

### Backend
- **Runtime**: Node.js (v22 LTS)
- **Framework**: Fastify (high-performance, low overhead)
- **Language**: TypeScript
- **ORM**: Prisma (type-safe database access, migrations)
- **Validation**: Zod (schema validation)
- **Authentication**: JWT with refresh tokens
- **Background Jobs**: BullMQ with Redis
- **File Storage**: AWS S3
- **Email**: AWS SES
- **SMS/WhatsApp**: Provider-agnostic (Twilio/MSG91/Gupshup)

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **UI Library**: React 18
- **Styling**: Tailwind CSS
- **Component Library**: shadcn/ui
- **Data Fetching**: TanStack Query with native fetch
- **Forms**: React Hook Form + Zod
- **Tables**: TanStack Table
- **State Management**: Zustand
- **Charts**: Recharts
- **Calendar**: react-big-calendar
- **Date Utils**: date-fns
- **i18n**: next-intl
- **Icons**: Lucide React
- **Toast/Notifications**: Sonner
- **Drag & Drop**: @dnd-kit

### Database
- **Primary**: PostgreSQL 15 (RLS for multi-tenancy)
- **Cache**: Redis (sessions, caching, job queues)
- **Search**: PostgreSQL Full-Text Search

### Infrastructure (AWS)
- **Compute**: ECS Fargate (containerized, auto-scaling)
- **Database**: RDS PostgreSQL (Multi-AZ for production)
- **Cache**: ElastiCache Redis
- **Storage**: S3 (files, receipts, images)
- **CDN**: CloudFront
- **Load Balancer**: ALB
- **DNS**: Route 53
- **Secrets**: AWS Secrets Manager
- **Monitoring**: CloudWatch + Sentry

## Multi-Tenancy Architecture

### Shared Database with Row-Level Security (RLS)

All tenants share a single PostgreSQL database. Data isolation at multiple levels:

```
Layer 1: API Middleware
  - Extract tenant_id from JWT token
  - Validate user belongs to tenant
  - Set tenant context for request

Layer 2: ORM/Repository Layer
  - Base repository adds tenant_id to all queries
  - Prisma middleware injects tenant filter

Layer 3: Database RLS (Final Safety Net)
  - PostgreSQL Row-Level Security policies
  - Cannot bypass even with direct DB access
```

### Database Session Context

```sql
-- Set tenant context at start of each request
SET app.current_tenant_id = 'uuid-of-tenant';
SET app.current_branch_id = 'uuid-of-branch';
SET app.current_user_id = 'uuid-of-user';

-- RLS Policy Example
CREATE POLICY tenant_isolation ON appointments
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
```

### Tenant Context in Fastify

```typescript
fastify.addHook('preHandler', async (request, reply) => {
  if (request.user) {
    const { tenantId, branchId, userId } = request.user;
    
    await request.db.$executeRaw`
      SELECT set_config('app.current_tenant_id', ${tenantId}, true),
             set_config('app.current_branch_id', ${branchId || ''}, true),
             set_config('app.current_user_id', ${userId}, true)
    `;
  }
});
```

## Database Design Principles

### 1. Primary Key Strategy
- Use UUIDs for all primary keys: `uuid_generate_v4()`

### 2. Tenant Scoping
```sql
tenant_id UUID NOT NULL REFERENCES tenants(id),
CREATE INDEX idx_tablename_tenant ON tablename(tenant_id);
```

### 3. Branch Scoping
```sql
tenant_id UUID NOT NULL REFERENCES tenants(id),
branch_id UUID NOT NULL REFERENCES branches(id),
CREATE INDEX idx_tablename_tenant_branch ON tablename(tenant_id, branch_id);
```

### 4. Soft Deletes
```sql
deleted_at TIMESTAMP NULL,
-- Query: WHERE deleted_at IS NULL
```

### 5. Audit Columns
```sql
created_at TIMESTAMP NOT NULL DEFAULT NOW(),
updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
created_by UUID REFERENCES users(id),
updated_by UUID REFERENCES users(id)
```

### 6. Optimistic Locking
```sql
version INTEGER NOT NULL DEFAULT 1
```

## Core Database Schema

```sql
-- Tenant (Business)
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  legal_name VARCHAR(255),
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  logo_url VARCHAR(500),
  settings JSONB DEFAULT '{}',
  subscription_plan VARCHAR(50) DEFAULT 'trial',
  subscription_status VARCHAR(20) DEFAULT 'active',
  trial_ends_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP
);

-- Branch
CREATE TABLE branches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) NOT NULL,
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  pincode VARCHAR(10),
  phone VARCHAR(20),
  email VARCHAR(255),
  gstin VARCHAR(20),
  timezone VARCHAR(50) DEFAULT 'Asia/Kolkata',
  currency VARCHAR(3) DEFAULT 'INR',
  working_hours JSONB,
  settings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP,
  UNIQUE(tenant_id, slug)
);

-- User (Staff)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  email VARCHAR(255),
  phone VARCHAR(20) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,
  gender VARCHAR(10),
  avatar_url VARCHAR(500),
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMP,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP,
  UNIQUE(tenant_id, phone)
);

-- User-Branch Assignment
CREATE TABLE user_branches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  branch_id UUID NOT NULL REFERENCES branches(id),
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, branch_id)
);

-- Customer
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  phone VARCHAR(20) NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  gender VARCHAR(10),
  date_of_birth DATE,
  anniversary_date DATE,
  address TEXT,
  notes TEXT,
  preferences JSONB DEFAULT '{}',
  allergies TEXT[],
  tags TEXT[],
  loyalty_points INTEGER DEFAULT 0,
  wallet_balance DECIMAL(10,2) DEFAULT 0,
  no_show_count INTEGER DEFAULT 0,
  booking_status VARCHAR(20) DEFAULT 'normal',
  first_visit_branch_id UUID REFERENCES branches(id),
  marketing_consent BOOLEAN DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP,
  UNIQUE(tenant_id, phone)
);
```

## API Design Patterns

### RESTful Structure
```
Base URL: https://api.salonapp.com/v1

Authentication:
  POST   /auth/login
  POST   /auth/refresh
  POST   /auth/logout
  POST   /auth/forgot-password
  POST   /auth/reset-password

Resources:
  GET    /resources           # List (with pagination)
  POST   /resources           # Create
  GET    /resources/:id       # Get single
  PATCH  /resources/:id       # Update
  DELETE /resources/:id       # Soft delete
```

### Request/Response Format

```typescript
// Success Response
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}

// Error Response
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      { "field": "email", "message": "Invalid email format" }
    ]
  }
}
```

### Pagination & Filtering
```
GET /customers?page=1&limit=20&sort=name&order=asc
GET /appointments?branch_id=xxx&status=booked&date=2024-01-15
```

## Authentication & Authorization

### JWT Token Structure

```typescript
// Access Token (15 minutes)
{
  "sub": "user-uuid",
  "tenantId": "tenant-uuid",
  "branchIds": ["branch-1", "branch-2"],
  "role": "branch_manager",
  "permissions": ["appointments:read", "appointments:write"],
  "iat": 1234567890,
  "exp": 1234568790
}

// Refresh Token (7 days)
{
  "sub": "user-uuid",
  "tenantId": "tenant-uuid",
  "type": "refresh",
  "iat": 1234567890,
  "exp": 1235172690
}
```

### Role-Permission Matrix

```typescript
const ROLE_PERMISSIONS = {
  super_owner: ['*'], // All permissions
  
  regional_manager: [
    'branches:read', 'branches:write',
    'users:read', 'users:write',
    'appointments:*', 'customers:*',
    'services:read', 'bills:*',
    'reports:read', 'inventory:*',
    'expenses:*', 'marketing:*'
  ],
  
  branch_manager: [
    'branches:read', 'users:read',
    'appointments:*', 'customers:*',
    'services:read', 'bills:*',
    'reports:read:branch', 'inventory:*',
    'expenses:write', 'marketing:write:branch'
  ],
  
  receptionist: [
    'appointments:*',
    'customers:read', 'customers:write',
    'bills:read', 'bills:write',
    'services:read'
  ],
  
  stylist: [
    'appointments:read:own',
    'customers:read:limited',
    'services:read',
    'bills:read:own'
  ],
  
  accountant: [
    'bills:read', 'reports:read',
    'expenses:read', 'inventory:read'
  ]
};
```

## Project Structure

```
salon-management/
├── apps/
│   ├── api/                    # Fastify Backend
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   │   ├── auth/
│   │   │   │   │   ├── auth.controller.ts
│   │   │   │   │   ├── auth.service.ts
│   │   │   │   │   ├── auth.schema.ts
│   │   │   │   │   └── auth.routes.ts
│   │   │   │   ├── tenants/
│   │   │   │   ├── branches/
│   │   │   │   ├── customers/
│   │   │   │   ├── appointments/
│   │   │   │   ├── services/
│   │   │   │   ├── bills/
│   │   │   │   ├── staff/
│   │   │   │   ├── inventory/
│   │   │   │   ├── memberships/
│   │   │   │   ├── expenses/
│   │   │   │   ├── reports/
│   │   │   │   ├── marketing/
│   │   │   │   └── booking/
│   │   │   ├── common/
│   │   │   │   ├── middleware/
│   │   │   │   ├── guards/
│   │   │   │   ├── decorators/
│   │   │   │   └── utils/
│   │   │   ├── database/
│   │   │   ├── jobs/
│   │   │   └── config/
│   │   └── package.json
│   │
│   ├── web/                    # Next.js Admin Dashboard
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── (auth)/
│   │   │   │   ├── (dashboard)/
│   │   │   │   └── layout.tsx
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── lib/
│   │   │   └── stores/
│   │   └── package.json
│   │
│   └── booking/                # Next.js Public Booking Page
│       ├── src/
│       │   ├── app/[tenant]/
│       │   └── components/
│       └── package.json
│
├── packages/
│   ├── shared/                 # Shared types, utils
│   └── ui/                     # Shared UI components
│
├── infrastructure/
│   ├── terraform/
│   └── docker/
│
├── package.json
└── turbo.json
```

## Error Handling

```typescript
enum ErrorCode {
  // Authentication (1xxx)
  INVALID_CREDENTIALS = 1001,
  TOKEN_EXPIRED = 1002,
  UNAUTHORIZED = 1003,
  
  // Validation (2xxx)
  VALIDATION_ERROR = 2001,
  INVALID_INPUT = 2002,
  
  // Business Logic (3xxx)
  SLOT_NOT_AVAILABLE = 3001,
  INSUFFICIENT_BALANCE = 3002,
  BOOKING_LIMIT_EXCEEDED = 3003,
  CUSTOMER_BLOCKED = 3004,
  
  // Resource (4xxx)
  NOT_FOUND = 4001,
  ALREADY_EXISTS = 4002,
  CONFLICT = 4003,
  
  // System (5xxx)
  INTERNAL_ERROR = 5001,
  DATABASE_ERROR = 5002,
  EXTERNAL_SERVICE_ERROR = 5003
}
```

## Audit Logging

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  branch_id UUID,
  user_id UUID,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_tenant_date ON audit_logs(tenant_id, created_at DESC);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
```

### Audited Actions
- Price changes
- Bill edits/voids/refunds
- Discount applications
- Commission changes
- Role changes
- Customer blocks/unblocks
- Period close/reopen
- Sensitive data access

## Security Measures

1. **Data Encryption**
   - TLS 1.3 for data in transit
   - AES-256 for sensitive data at rest
   - bcrypt for password hashing

2. **API Security**
   - Rate limiting per IP and per user
   - Request validation with Zod
   - SQL injection prevention via Prisma
   - XSS prevention in responses

3. **Infrastructure Security**
   - VPC with private subnets
   - Security groups with minimal access
   - Secrets in AWS Secrets Manager

4. **Compliance**
   - 7-year data retention for financial records
   - Audit logging for all sensitive actions
   - GDPR-ready data export/delete

## Design System

### Typography
- **Font Family**: Inter (Google Fonts)
- **Weights**: 400, 500, 600, 700

### Color Palette
| Token | Default | Usage |
|-------|---------|-------|
| `--primary` | #6366f1 | Buttons, links |
| `--success` | #22c55e | Completed |
| `--warning` | #f59e0b | Pending |
| `--error` | #ef4444 | Errors |
| `--info` | #3b82f6 | Information |

### Spacing Scale (4px grid)
```css
--space-1: 0.25rem;  /* 4px */
--space-2: 0.5rem;   /* 8px */
--space-4: 1rem;     /* 16px */
--space-6: 1.5rem;   /* 24px */
--space-8: 2rem;     /* 32px */
```

## Theming Architecture

### Preset Themes
| Theme | Primary | Description |
|-------|---------|-------------|
| Indigo Night | #6366f1 | Default |
| Rose Gold | #f43f5e | Warm |
| Ocean Breeze | #06b6d4 | Fresh |
| Forest Calm | #22c55e | Natural |
| Sunset Glow | #f97316 | Vibrant |
| Midnight Purple | #8b5cf6 | Creative |
| Classic Professional | #64748b | Corporate |

### Theme Precedence
1. User Preference (highest)
2. Branch Setting
3. Tenant Setting
4. Default (Indigo Night)

## Internationalization (i18n)

### Supported Locales
- English (en-IN)
- Hindi (hi-IN)

### Locale Utilities

```typescript
export function formatIndianNumber(num: number): string {
  // 100000 → "1,00,000"
}

export function formatCurrency(amount: number): string {
  return `₹${formatIndianNumber(amount)}`;
}

export function formatDate(date: Date, locale: string = 'en-IN'): string {
  return date.toLocaleDateString(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

export function formatTime(date: Date, locale: string = 'en-IN'): string {
  return date.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}
```

### Message Template Selection
```typescript
async function sendNotification(customerId: string, templateType: string) {
  const customer = await customerRepo.findById(customerId);
  const template = await templateRepo.findByType(templateType);
  
  const content = customer.preferredLanguage === 'hi' 
    ? template.contentHi 
    : template.contentEn;
    
  await whatsappService.send(customer.phone, content);
}
```
