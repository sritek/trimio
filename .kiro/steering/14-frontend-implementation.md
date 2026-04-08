---
# Frontend implementation patterns - Next.js, components, state management, and API integration
inclusion: fileMatch
fileMatchPattern: 'apps/web/**/*.tsx, apps/web/**/*.ts'
---

# Frontend Implementation Guide

## Overview

This document provides implementation patterns and setup guides for the Next.js frontend including project structure, component patterns, state management, API integration, authentication, theming, and internationalization.

---

## 1. Project Structure

```
trimio-web/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth route group (no layout)
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── register/
│   │   │   └── page.tsx
│   │   ├── forgot-password/
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   ├── (dashboard)/              # Dashboard route group (main layout)
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   ├── appointments/
│   │   │   ├── page.tsx
│   │   │   ├── [id]/
│   │   │   │   └── page.tsx
│   │   │   └── new/
│   │   │       └── page.tsx
│   │   ├── customers/
│   │   ├── staff/
│   │   ├── services/
│   │   ├── billing/
│   │   ├── inventory/
│   │   ├── reports/
│   │   ├── marketing/
│   │   ├── settings/
│   │   └── layout.tsx
│   ├── book/                     # Public booking pages
│   │   └── [slug]/
│   │       ├── page.tsx
│   │       └── confirm/
│   │           └── page.tsx
│   ├── api/                      # API routes (if needed)
│   ├── layout.tsx                # Root layout
│   ├── loading.tsx               # Global loading
│   ├── error.tsx                 # Global error boundary
│   ├── not-found.tsx             # 404 page
│   └── globals.css               # Global styles
├── components/
│   ├── ui/                       # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── dialog.tsx
│   │   └── ...
│   ├── forms/                    # Form components
│   │   ├── appointment-form.tsx
│   │   ├── customer-form.tsx
│   │   └── ...
│   ├── tables/                   # Data table components
│   │   ├── data-table.tsx
│   │   ├── columns/
│   │   │   ├── appointment-columns.tsx
│   │   │   └── ...
│   │   └── ...
│   ├── charts/                   # Chart components
│   │   ├── revenue-chart.tsx
│   │   ├── appointments-chart.tsx
│   │   └── ...
│   ├── calendar/                 # Calendar components
│   │   ├── appointment-calendar.tsx
│   │   └── ...
│   ├── dashboard/                # Dashboard widgets
│   │   ├── widget-container.tsx
│   │   ├── widgets/
│   │   │   ├── revenue-today.tsx
│   │   │   ├── appointments-today.tsx
│   │   │   └── ...
│   │   └── ...
│   ├── layout/                   # Layout components
│   │   ├── sidebar.tsx
│   │   ├── header.tsx
│   │   ├── mobile-nav.tsx
│   │   └── ...
│   └── shared/                   # Shared components
│       ├── loading-spinner.tsx
│       ├── error-message.tsx
│       ├── empty-state.tsx
│       └── ...
├── hooks/                        # Custom hooks
│   ├── use-auth.ts
│   ├── use-permissions.ts
│   ├── use-theme.ts
│   ├── use-debounce.ts
│   └── ...
├── lib/                          # Utility functions
│   ├── api/                      # API client
│   │   ├── client.ts
│   │   ├── endpoints.ts
│   │   └── types.ts
│   ├── utils.ts                  # General utilities
│   ├── format.ts                 # Formatting utilities
│   ├── validation.ts             # Zod schemas
│   └── constants.ts              # Constants
├── stores/                       # Zustand stores
│   ├── auth-store.ts
│   ├── ui-store.ts
│   ├── appointment-store.ts
│   └── ...
├── providers/                    # Context providers
│   ├── query-provider.tsx
│   ├── theme-provider.tsx
│   └── auth-provider.tsx
├── types/                        # TypeScript types
│   ├── api.ts
│   ├── models.ts
│   └── ...
├── messages/                     # i18n translations
│   ├── en.json
│   └── hi.json
├── middleware.ts                 # Next.js middleware
├── next.config.js
├── tailwind.config.ts
├── components.json               # shadcn/ui config
└── package.json
```

---

## 2. shadcn/ui Setup

### Initial Configuration

```bash
# Initialize shadcn/ui
npx shadcn-ui@latest init

# Add components
npx shadcn-ui@latest add button input card dialog dropdown-menu table tabs toast avatar badge calendar checkbox command form label popover select separator sheet skeleton switch textarea tooltip
```

### components.json

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "app/globals.css",
    "baseColor": "slate",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}
```

### Tailwind Configuration

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        // Semantic colors
        success: {
          DEFAULT: 'hsl(var(--success))',
          foreground: 'hsl(var(--success-foreground))',
        },
        warning: {
          DEFAULT: 'hsl(var(--warning))',
          foreground: 'hsl(var(--warning-foreground))',
        },
        info: {
          DEFAULT: 'hsl(var(--info))',
          foreground: 'hsl(var(--info-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
```

### Global CSS Variables

```css
/* app/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 239 84% 67%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 239 84% 67%;
    --radius: 0.5rem;
    
    /* Semantic colors */
    --success: 142 76% 36%;
    --success-foreground: 210 40% 98%;
    --warning: 38 92% 50%;
    --warning-foreground: 222.2 84% 4.9%;
    --info: 199 89% 48%;
    --info-foreground: 210 40% 98%;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
    --primary: 239 84% 67%;
    --primary-foreground: 222.2 47.4% 11.2%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 239 84% 67%;
    
    /* Dark semantic colors */
    --success: 142 76% 36%;
    --success-foreground: 210 40% 98%;
    --warning: 38 92% 50%;
    --warning-foreground: 222.2 84% 4.9%;
    --info: 199 89% 48%;
    --info-foreground: 210 40% 98%;
  }
}
```

---

## 3. Next.js App Router Patterns

### Root Layout

```typescript
// app/layout.tsx
import { Inter } from 'next/font/google';
import { Providers } from '@/providers';
import { Toaster } from '@/components/ui/sonner';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Trimio',
  description: 'Salon Management Platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          {children}
          <Toaster richColors position="top-right" />
        </Providers>
      </body>
    </html>
  );
}
```

### Dashboard Layout

```typescript
// app/(dashboard)/layout.tsx
import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { MobileNav } from '@/components/layout/mobile-nav';
import { getServerSession } from '@/lib/auth/session';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="flex min-h-screen">
      {/* Desktop Sidebar */}
      <Sidebar className="hidden lg:flex" />

      {/* Main Content */}
      <div className="flex flex-1 flex-col">
        <Header />
        <MobileNav className="lg:hidden" />
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
```

### Loading State

```typescript
// app/(dashboard)/appointments/loading.tsx
import { Skeleton } from '@/components/ui/skeleton';

export default function AppointmentsLoading() {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
      <Skeleton className="h-[400px]" />
    </div>
  );
}
```

### Error Boundary

```typescript
// app/(dashboard)/appointments/error.tsx
'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

export default function AppointmentsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Appointments error:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
      <AlertCircle className="h-12 w-12 text-destructive" />
      <h2 className="text-lg font-semibold">Something went wrong!</h2>
      <p className="text-muted-foreground text-center max-w-md">
        {error.message || 'Failed to load appointments. Please try again.'}
      </p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
```

### Middleware (Route Protection)

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const publicRoutes = ['/login', '/register', '/forgot-password', '/book'];
const authRoutes = ['/login', '/register', '/forgot-password'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('access_token')?.value;

  // Public booking pages
  if (pathname.startsWith('/book/')) {
    return NextResponse.next();
  }

  // Auth pages - redirect to dashboard if logged in
  if (authRoutes.some((route) => pathname.startsWith(route))) {
    if (token) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.next();
  }

  // Protected routes - redirect to login if not logged in
  if (!publicRoutes.some((route) => pathname.startsWith(route))) {
    if (!token) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
```

---

## 4. State Management (Zustand)

### Auth Store

```typescript
// stores/auth-store.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  tenantId: string;
  branchId?: string;
  permissions: string[];
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: true,

      setAuth: (user, accessToken, refreshToken) =>
        set({
          user,
          accessToken,
          refreshToken,
          isAuthenticated: true,
          isLoading: false,
        }),

      setTokens: (accessToken, refreshToken) =>
        set({ accessToken, refreshToken }),

      logout: () =>
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          isLoading: false,
        }),

      setLoading: (isLoading) => set({ isLoading }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
```

### UI Store

```typescript
// stores/ui-store.ts
import { create } from 'zustand';

interface UIState {
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  mobileNavOpen: boolean;
  currentBranchId: string | null;

  // Actions
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebarCollapse: () => void;
  setMobileNavOpen: (open: boolean) => void;
  setCurrentBranch: (branchId: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  sidebarCollapsed: false,
  mobileNavOpen: false,
  currentBranchId: null,

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebarCollapse: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setMobileNavOpen: (open) => set({ mobileNavOpen: open }),
  setCurrentBranch: (branchId) => set({ currentBranchId: branchId }),
}));
```

### Appointment Store

```typescript
// stores/appointment-store.ts
import { create } from 'zustand';

interface AppointmentFilters {
  date: Date;
  branchId?: string;
  stylistId?: string;
  status?: string;
}

interface AppointmentState {
  filters: AppointmentFilters;
  viewMode: 'calendar' | 'list';
  selectedAppointmentId: string | null;

  // Actions
  setFilters: (filters: Partial<AppointmentFilters>) => void;
  setViewMode: (mode: 'calendar' | 'list') => void;
  selectAppointment: (id: string | null) => void;
  resetFilters: () => void;
}

const defaultFilters: AppointmentFilters = {
  date: new Date(),
};

export const useAppointmentStore = create<AppointmentState>((set) => ({
  filters: defaultFilters,
  viewMode: 'calendar',
  selectedAppointmentId: null,

  setFilters: (filters) =>
    set((state) => ({
      filters: { ...state.filters, ...filters },
    })),

  setViewMode: (viewMode) => set({ viewMode }),

  selectAppointment: (selectedAppointmentId) => set({ selectedAppointmentId }),

  resetFilters: () => set({ filters: defaultFilters }),
}));
```

---

## 5. API Client (TanStack Query)

### Query Client Setup

```typescript
// providers/query-provider.tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            gcTime: 5 * 60 * 1000, // 5 minutes
            retry: 1,
            refetchOnWindowFocus: false,
          },
          mutations: {
            retry: 0,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

### API Client

```typescript
// lib/api/client.ts
import { useAuthStore } from '@/stores/auth-store';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function refreshAccessToken(): Promise<string | null> {
  const { refreshToken, setTokens, logout } = useAuthStore.getState();

  if (!refreshToken) {
    logout();
    return null;
  }

  try {
    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      logout();
      return null;
    }

    const data = await response.json();
    setTokens(data.data.accessToken, data.data.refreshToken);
    return data.data.accessToken;
  } catch {
    logout();
    return null;
  }
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { params, headers: customHeaders, ...init } = options;
  const { accessToken } = useAuthStore.getState();

  // Build URL with query params
  let url = `${API_URL}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }

  // Build headers
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...customHeaders,
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  // Make request
  let response = await fetch(url, { ...init, headers });

  // Handle 401 - try refresh
  if (response.status === 401 && accessToken) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers['Authorization'] = `Bearer ${newToken}`;
      response = await fetch(url, { ...init, headers });
    }
  }

  // Parse response
  const data = await response.json();

  if (!response.ok) {
    throw new ApiError(
      response.status,
      data.error?.code || 'UNKNOWN_ERROR',
      data.error?.message || 'An error occurred',
      data.error?.details
    );
  }

  return data.data as T;
}

// Convenience methods
export const api = {
  get: <T>(endpoint: string, params?: Record<string, any>) =>
    apiClient<T>(endpoint, { method: 'GET', params }),

  post: <T>(endpoint: string, body?: unknown) =>
    apiClient<T>(endpoint, { method: 'POST', body: JSON.stringify(body) }),

  put: <T>(endpoint: string, body?: unknown) =>
    apiClient<T>(endpoint, { method: 'PUT', body: JSON.stringify(body) }),

  patch: <T>(endpoint: string, body?: unknown) =>
    apiClient<T>(endpoint, { method: 'PATCH', body: JSON.stringify(body) }),

  delete: <T>(endpoint: string) =>
    apiClient<T>(endpoint, { method: 'DELETE' }),
};
```

### Query Keys

```typescript
// lib/api/query-keys.ts

export const queryKeys = {
  // Auth
  auth: {
    user: ['auth', 'user'] as const,
    session: ['auth', 'session'] as const,
  },

  // Appointments
  appointments: {
    all: ['appointments'] as const,
    list: (filters: Record<string, any>) =>
      ['appointments', 'list', filters] as const,
    detail: (id: string) => ['appointments', 'detail', id] as const,
    slots: (branchId: string, date: string) =>
      ['appointments', 'slots', branchId, date] as const,
  },

  // Customers
  customers: {
    all: ['customers'] as const,
    list: (filters: Record<string, any>) =>
      ['customers', 'list', filters] as const,
    detail: (id: string) => ['customers', 'detail', id] as const,
    search: (query: string) => ['customers', 'search', query] as const,
  },

  // Services
  services: {
    all: ['services'] as const,
    list: (filters?: Record<string, any>) =>
      ['services', 'list', filters] as const,
    detail: (id: string) => ['services', 'detail', id] as const,
    categories: ['services', 'categories'] as const,
  },

  // Staff
  staff: {
    all: ['staff'] as const,
    list: (filters?: Record<string, any>) =>
      ['staff', 'list', filters] as const,
    detail: (id: string) => ['staff', 'detail', id] as const,
    schedule: (staffId: string, date: string) =>
      ['staff', 'schedule', staffId, date] as const,
  },

  // Branches
  branches: {
    all: ['branches'] as const,
    list: ['branches', 'list'] as const,
    detail: (id: string) => ['branches', 'detail', id] as const,
  },

  // Reports
  reports: {
    dashboard: (branchId?: string) => ['reports', 'dashboard', branchId] as const,
    revenue: (params: Record<string, any>) =>
      ['reports', 'revenue', params] as const,
    appointments: (params: Record<string, any>) =>
      ['reports', 'appointments', params] as const,
  },
};
```

### Custom Query Hooks

```typescript
// hooks/queries/use-appointments.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { queryKeys } from '@/lib/api/query-keys';
import { toast } from 'sonner';

interface Appointment {
  id: string;
  customerId: string;
  branchId: string;
  stylistId: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  status: string;
  totalAmount: number;
  services: AppointmentService[];
  customer?: Customer;
  stylist?: User;
}

interface AppointmentFilters {
  branchId?: string;
  stylistId?: string;
  date?: string;
  status?: string;
  page?: number;
  limit?: number;
}

interface CreateAppointmentInput {
  customerId: string;
  branchId: string;
  stylistId?: string;
  appointmentDate: string;
  startTime: string;
  services: { serviceId: string; variantId?: string }[];
  notes?: string;
}

// List appointments
export function useAppointments(filters: AppointmentFilters) {
  return useQuery({
    queryKey: queryKeys.appointments.list(filters),
    queryFn: () =>
      api.get<{ items: Appointment[]; total: number }>('/appointments', filters),
  });
}

// Get single appointment
export function useAppointment(id: string) {
  return useQuery({
    queryKey: queryKeys.appointments.detail(id),
    queryFn: () => api.get<Appointment>(`/appointments/${id}`),
    enabled: !!id,
  });
}

// Create appointment
export function useCreateAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateAppointmentInput) =>
      api.post<Appointment>('/appointments', input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.appointments.all });
      toast.success('Appointment created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create appointment');
    },
  });
}

// Update appointment
export function useUpdateAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...input }: { id: string } & Partial<CreateAppointmentInput>) =>
      api.patch<Appointment>(`/appointments/${id}`, input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.appointments.all });
      queryClient.setQueryData(queryKeys.appointments.detail(data.id), data);
      toast.success('Appointment updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update appointment');
    },
  });
}

// Cancel appointment
export function useCancelAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      api.post<Appointment>(`/appointments/${id}/cancel`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.appointments.all });
      toast.success('Appointment cancelled');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to cancel appointment');
    },
  });
}

// Get available slots
export function useAvailableSlots(branchId: string, date: string, serviceIds: string[]) {
  return useQuery({
    queryKey: queryKeys.appointments.slots(branchId, date),
    queryFn: () =>
      api.get<{ slots: { time: string; available: boolean; stylists: any[] }[] }>(
        '/appointments/slots',
        { branchId, date, serviceIds: serviceIds.join(',') }
      ),
    enabled: !!branchId && !!date && serviceIds.length > 0,
  });
}
```

---

## 6. Form Handling (React Hook Form + Zod)

### Form Component Pattern

```typescript
// components/forms/appointment-form.tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCreateAppointment } from '@/hooks/queries/use-appointments';
import { useServices } from '@/hooks/queries/use-services';
import { useStaff } from '@/hooks/queries/use-staff';

const appointmentSchema = z.object({
  customerId: z.string().uuid('Please select a customer'),
  branchId: z.string().uuid('Please select a branch'),
  stylistId: z.string().uuid().optional(),
  appointmentDate: z.date({ required_error: 'Please select a date' }),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Please select a time'),
  services: z.array(
    z.object({
      serviceId: z.string().uuid(),
      variantId: z.string().uuid().optional(),
    })
  ).min(1, 'Please select at least one service'),
  notes: z.string().max(500).optional(),
});

type AppointmentFormValues = z.infer<typeof appointmentSchema>;

interface AppointmentFormProps {
  defaultValues?: Partial<AppointmentFormValues>;
  onSuccess?: () => void;
}

export function AppointmentForm({ defaultValues, onSuccess }: AppointmentFormProps) {
  const createAppointment = useCreateAppointment();
  const { data: services } = useServices({});
  const { data: staff } = useStaff({});

  const form = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      services: [],
      ...defaultValues,
    },
  });

  const onSubmit = async (values: AppointmentFormValues) => {
    try {
      await createAppointment.mutateAsync({
        ...values,
        appointmentDate: format(values.appointmentDate, 'yyyy-MM-dd'),
      });
      onSuccess?.();
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Customer Selection */}
        <FormField
          control={form.control}
          name="customerId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Customer</FormLabel>
              <FormControl>
                <CustomerSearch
                  value={field.value}
                  onChange={field.onChange}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Date Selection */}
        <FormField
          control={form.control}
          name="appointmentDate"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Date</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full pl-3 text-left font-normal',
                        !field.value && 'text-muted-foreground'
                      )}
                    >
                      {field.value ? (
                        format(field.value, 'PPP')
                      ) : (
                        <span>Pick a date</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    disabled={(date) => date < new Date()}
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Time Selection */}
        <FormField
          control={form.control}
          name="startTime"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Time</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select time" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {/* Generate time slots */}
                  {generateTimeSlots().map((time) => (
                    <SelectItem key={time} value={time}>
                      {formatTime(time)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Stylist Selection */}
        <FormField
          control={form.control}
          name="stylistId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Stylist (Optional)</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Any available stylist" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {staff?.items.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Service Selection */}
        <FormField
          control={form.control}
          name="services"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Services</FormLabel>
              <FormControl>
                <ServiceSelector
                  services={services?.items || []}
                  selected={field.value}
                  onChange={field.onChange}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={createAppointment.isPending}>
          {createAppointment.isPending ? 'Creating...' : 'Create Appointment'}
        </Button>
      </form>
    </Form>
  );
}
```

---

## 7. Authentication Flow

### Auth Hook

```typescript
// hooks/use-auth.ts
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api/client';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';

interface LoginInput {
  email: string;
  password: string;
}

interface RegisterInput {
  businessName: string;
  email: string;
  password: string;
  phone: string;
}

export function useAuth() {
  const router = useRouter();
  const { user, isAuthenticated, setAuth, logout: clearAuth } = useAuthStore();

  // Login mutation
  const login = useMutation({
    mutationFn: async (input: LoginInput) => {
      const response = await api.post<{
        user: any;
        accessToken: string;
        refreshToken: string;
      }>('/auth/login', input);
      return response;
    },
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken, data.refreshToken);
      router.push('/dashboard');
    },
  });

  // Register mutation
  const register = useMutation({
    mutationFn: async (input: RegisterInput) => {
      const response = await api.post<{
        user: any;
        accessToken: string;
        refreshToken: string;
      }>('/auth/register', input);
      return response;
    },
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken, data.refreshToken);
      router.push('/dashboard');
    },
  });

  // Logout
  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore errors
    }
    clearAuth();
    router.push('/login');
  };

  return {
    user,
    isAuthenticated,
    login,
    register,
    logout,
  };
}
```

### Login Page

```typescript
// app/(auth)/login/page.tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { login } = useAuth();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    await login.mutateAsync(values);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Sign in to Trimio
          </CardTitle>
          <CardDescription className="text-center">
            Enter your email and password to access your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="you@example.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {login.isError && (
                <p className="text-sm text-destructive">
                  {login.error?.message || 'Invalid email or password'}
                </p>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={login.isPending}
              >
                {login.isPending ? 'Signing in...' : 'Sign in'}
              </Button>
            </form>
          </Form>

          <div className="mt-4 text-center text-sm">
            <Link
              href="/forgot-password"
              className="text-primary hover:underline"
            >
              Forgot password?
            </Link>
          </div>

          <div className="mt-4 text-center text-sm">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-primary hover:underline">
              Register
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## 8. Role-Based UI

### Permissions Hook

```typescript
// hooks/use-permissions.ts
import { useAuthStore } from '@/stores/auth-store';

// Permission matrix (should match backend)
const ROLE_PERMISSIONS: Record<string, string[]> = {
  super_owner: [
    'tenant:manage',
    'branch:manage',
    'staff:manage',
    'customer:manage',
    'appointment:manage',
    'service:manage',
    'billing:manage',
    'inventory:manage',
    'reports:view_all',
    'marketing:manage',
    'settings:manage',
  ],
  regional_manager: [
    'branch:view',
    'staff:manage',
    'customer:manage',
    'appointment:manage',
    'service:view',
    'billing:manage',
    'inventory:manage',
    'reports:view_branch',
    'marketing:manage',
  ],
  branch_manager: [
    'staff:view',
    'customer:manage',
    'appointment:manage',
    'service:view',
    'billing:manage',
    'inventory:manage',
    'reports:view_branch',
  ],
  receptionist: [
    'customer:manage',
    'appointment:manage',
    'billing:create',
  ],
  stylist: [
    'appointment:view_own',
    'customer:view',
  ],
  accountant: [
    'billing:view',
    'reports:view_financial',
    'expense:manage',
  ],
};

export function usePermissions() {
  const { user } = useAuthStore();

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    const rolePermissions = ROLE_PERMISSIONS[user.role] || [];
    return rolePermissions.includes(permission);
  };

  const hasAnyPermission = (permissions: string[]): boolean => {
    return permissions.some(hasPermission);
  };

  const hasAllPermissions = (permissions: string[]): boolean => {
    return permissions.every(hasPermission);
  };

  const hasRole = (role: string): boolean => {
    return user?.role === role;
  };

  const hasAnyRole = (roles: string[]): boolean => {
    return roles.includes(user?.role || '');
  };

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    hasAnyRole,
    role: user?.role,
    permissions: user ? ROLE_PERMISSIONS[user.role] || [] : [],
  };
}
```

### Permission Guard Component

```typescript
// components/shared/permission-guard.tsx
'use client';

import { usePermissions } from '@/hooks/use-permissions';

interface PermissionGuardProps {
  permission?: string;
  permissions?: string[];
  requireAll?: boolean;
  role?: string;
  roles?: string[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function PermissionGuard({
  permission,
  permissions,
  requireAll = false,
  role,
  roles,
  fallback = null,
  children,
}: PermissionGuardProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions, hasRole, hasAnyRole } =
    usePermissions();

  let hasAccess = true;

  if (permission) {
    hasAccess = hasPermission(permission);
  } else if (permissions) {
    hasAccess = requireAll
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions);
  }

  if (role) {
    hasAccess = hasAccess && hasRole(role);
  } else if (roles) {
    hasAccess = hasAccess && hasAnyRole(roles);
  }

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
```

### Usage in Navigation

```typescript
// components/layout/sidebar.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { usePermissions } from '@/hooks/use-permissions';
import {
  LayoutDashboard,
  Calendar,
  Users,
  Scissors,
  Receipt,
  Package,
  BarChart3,
  Megaphone,
  Settings,
} from 'lucide-react';

const navItems = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    permission: null, // Everyone can access
  },
  {
    title: 'Appointments',
    href: '/appointments',
    icon: Calendar,
    permission: 'appointment:manage',
  },
  {
    title: 'Customers',
    href: '/customers',
    icon: Users,
    permission: 'customer:manage',
  },
  {
    title: 'Services',
    href: '/services',
    icon: Scissors,
    permission: 'service:view',
  },
  {
    title: 'Billing',
    href: '/billing',
    icon: Receipt,
    permission: 'billing:view',
  },
  {
    title: 'Inventory',
    href: '/inventory',
    icon: Package,
    permission: 'inventory:manage',
  },
  {
    title: 'Reports',
    href: '/reports',
    icon: BarChart3,
    permissions: ['reports:view_all', 'reports:view_branch', 'reports:view_financial'],
  },
  {
    title: 'Marketing',
    href: '/marketing',
    icon: Megaphone,
    permission: 'marketing:manage',
  },
  {
    title: 'Settings',
    href: '/settings',
    icon: Settings,
    permission: 'settings:manage',
  },
];

export function Sidebar({ className }: { className?: string }) {
  const pathname = usePathname();
  const { hasPermission, hasAnyPermission } = usePermissions();

  const visibleItems = navItems.filter((item) => {
    if (!item.permission && !item.permissions) return true;
    if (item.permission) return hasPermission(item.permission);
    if (item.permissions) return hasAnyPermission(item.permissions);
    return false;
  });

  return (
    <aside className={cn('w-64 border-r bg-card', className)}>
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/dashboard" className="text-xl font-bold">
          Trimio
        </Link>
      </div>
      <nav className="flex flex-col gap-1 p-4">
        {visibleItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.title}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
```

---

## 9. Theming (next-themes)

### Theme Provider Setup

```typescript
// providers/theme-provider.tsx
'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { useEffect, useState } from 'react';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
```

### Theme Switcher

```typescript
// components/shared/theme-switcher.tsx
'use client';

import { useTheme } from 'next-themes';
import { Moon, Sun, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme('light')}>
          <Sun className="mr-2 h-4 w-4" />
          Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('dark')}>
          <Moon className="mr-2 h-4 w-4" />
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('system')}>
          <Monitor className="mr-2 h-4 w-4" />
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

### Custom Theme Application

```typescript
// hooks/use-custom-theme.ts
import { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';

interface CustomTheme {
  primaryColor: string;
  logoUrl?: string;
}

export function useCustomTheme() {
  const { user } = useAuthStore();

  const { data: theme } = useQuery({
    queryKey: ['theme', user?.tenantId],
    queryFn: () => api.get<CustomTheme>('/settings/theme'),
    enabled: !!user,
  });

  useEffect(() => {
    if (theme?.primaryColor) {
      // Convert hex to HSL and set CSS variable
      const hsl = hexToHsl(theme.primaryColor);
      document.documentElement.style.setProperty('--primary', hsl);
    }

    return () => {
      // Reset to default on unmount
      document.documentElement.style.removeProperty('--primary');
    };
  }, [theme?.primaryColor]);

  return theme;
}

function hexToHsl(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '239 84% 67%'; // Default primary

  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}
```

---

## 10. Internationalization (next-intl)

### Setup

```typescript
// i18n.ts
import { getRequestConfig } from 'next-intl/server';

export default getRequestConfig(async ({ locale }) => ({
  messages: (await import(`./messages/${locale}.json`)).default,
}));
```

### Translation Files

```json
// messages/en.json
{
  "common": {
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "edit": "Edit",
    "loading": "Loading...",
    "error": "An error occurred",
    "success": "Success",
    "confirm": "Confirm",
    "search": "Search",
    "filter": "Filter",
    "clear": "Clear",
    "noResults": "No results found"
  },
  "auth": {
    "login": "Sign In",
    "logout": "Sign Out",
    "register": "Register",
    "forgotPassword": "Forgot Password?",
    "email": "Email",
    "password": "Password",
    "rememberMe": "Remember me"
  },
  "appointments": {
    "title": "Appointments",
    "new": "New Appointment",
    "customer": "Customer",
    "service": "Service",
    "date": "Date",
    "time": "Time",
    "stylist": "Stylist",
    "status": {
      "scheduled": "Scheduled",
      "confirmed": "Confirmed",
      "in_progress": "In Progress",
      "completed": "Completed",
      "cancelled": "Cancelled",
      "no_show": "No Show"
    }
  },
  "currency": {
    "symbol": "₹",
    "code": "INR"
  },
  "dateFormat": {
    "short": "dd/MM/yyyy",
    "long": "dd MMMM yyyy",
    "time": "hh:mm a"
  }
}
```

```json
// messages/hi.json
{
  "common": {
    "save": "सहेजें",
    "cancel": "रद्द करें",
    "delete": "हटाएं",
    "edit": "संपादित करें",
    "loading": "लोड हो रहा है...",
    "error": "एक त्रुटि हुई",
    "success": "सफल",
    "confirm": "पुष्टि करें",
    "search": "खोजें",
    "filter": "फ़िल्टर",
    "clear": "साफ़ करें",
    "noResults": "कोई परिणाम नहीं मिला"
  },
  "auth": {
    "login": "साइन इन करें",
    "logout": "साइन आउट",
    "register": "पंजीकरण करें",
    "forgotPassword": "पासवर्ड भूल गए?",
    "email": "ईमेल",
    "password": "पासवर्ड",
    "rememberMe": "मुझे याद रखें"
  },
  "appointments": {
    "title": "अपॉइंटमेंट",
    "new": "नया अपॉइंटमेंट",
    "customer": "ग्राहक",
    "service": "सेवा",
    "date": "तारीख",
    "time": "समय",
    "stylist": "स्टाइलिस्ट",
    "status": {
      "scheduled": "निर्धारित",
      "confirmed": "पुष्टि की गई",
      "in_progress": "प्रगति में",
      "completed": "पूर्ण",
      "cancelled": "रद्द",
      "no_show": "नहीं आए"
    }
  },
  "currency": {
    "symbol": "₹",
    "code": "INR"
  },
  "dateFormat": {
    "short": "dd/MM/yyyy",
    "long": "dd MMMM yyyy",
    "time": "hh:mm a"
  }
}
```

### Translation Hook Usage

```typescript
// Example component using translations
'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';

export function AppointmentActions() {
  const t = useTranslations('common');
  const tAppt = useTranslations('appointments');

  return (
    <div className="flex gap-2">
      <Button variant="outline" onClick={handleCancel}>
        {t('cancel')}
      </Button>
      <Button onClick={handleSave}>
        {t('save')}
      </Button>
    </div>
  );
}
```

---

## 11. Charts (Recharts)

### Revenue Chart Example

```typescript
// components/charts/revenue-chart.tsx
'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/format';

interface RevenueChartProps {
  data: { date: string; revenue: number }[];
  title?: string;
}

export function RevenueChart({ data, title = 'Revenue' }: RevenueChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="hsl(var(--primary))"
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="95%"
                    stopColor="hsl(var(--primary))"
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                className="text-xs"
                tickFormatter={(value) => formatDate(value, 'dd MMM')}
              />
              <YAxis
                className="text-xs"
                tickFormatter={(value) => formatCurrency(value, true)}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload?.length) {
                    return (
                      <div className="rounded-lg border bg-background p-2 shadow-sm">
                        <p className="text-sm font-medium">
                          {formatCurrency(payload[0].value as number)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(payload[0].payload.date, 'dd MMM yyyy')}
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="hsl(var(--primary))"
                fillOpacity={1}
                fill="url(#colorRevenue)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
```

---

## 12. Calendar (react-big-calendar)

### Appointment Calendar

```typescript
// components/calendar/appointment-calendar.tsx
'use client';

import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enIN } from 'date-fns/locale';
import { useCallback, useMemo, useState } from 'react';
import { useAppointments } from '@/hooks/queries/use-appointments';
import { AppointmentDialog } from './appointment-dialog';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const locales = { 'en-IN': enIN };

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales,
});

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: Appointment;
}

export function AppointmentCalendar() {
  const [date, setDate] = useState(new Date());
  const [view, setView] = useState(Views.WEEK);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const { data } = useAppointments({
    date: format(date, 'yyyy-MM-dd'),
  });

  const events: CalendarEvent[] = useMemo(() => {
    if (!data?.items) return [];

    return data.items.map((apt) => ({
      id: apt.id,
      title: `${apt.customer?.name || 'Customer'} - ${apt.services.map((s) => s.service.name).join(', ')}`,
      start: new Date(`${apt.appointmentDate}T${apt.startTime}`),
      end: new Date(`${apt.appointmentDate}T${apt.endTime}`),
      resource: apt,
    }));
  }, [data]);

  const eventStyleGetter = useCallback((event: CalendarEvent) => {
    const status = event.resource.status;
    let backgroundColor = 'hsl(var(--primary))';

    switch (status) {
      case 'confirmed':
        backgroundColor = 'hsl(var(--success))';
        break;
      case 'in_progress':
        backgroundColor = 'hsl(var(--warning))';
        break;
      case 'completed':
        backgroundColor = 'hsl(var(--muted))';
        break;
      case 'cancelled':
        backgroundColor = 'hsl(var(--destructive))';
        break;
    }

    return {
      style: {
        backgroundColor,
        borderRadius: '4px',
        color: 'white',
        border: 'none',
      },
    };
  }, []);

  return (
    <>
      <div className="h-[600px]">
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          date={date}
          onNavigate={setDate}
          view={view}
          onView={setView}
          onSelectEvent={(event) => setSelectedEvent(event)}
          eventPropGetter={eventStyleGetter}
          views={[Views.MONTH, Views.WEEK, Views.DAY]}
          step={15}
          timeslots={4}
          min={new Date(2024, 0, 1, 8, 0)}
          max={new Date(2024, 0, 1, 21, 0)}
          className="rounded-lg border bg-card p-4"
        />
      </div>

      {selectedEvent && (
        <AppointmentDialog
          appointment={selectedEvent.resource}
          open={!!selectedEvent}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </>
  );
}
```

---

## 13. Formatting Utilities

```typescript
// lib/format.ts
import { format, formatDistance, isToday, isTomorrow, isYesterday } from 'date-fns';
import { enIN } from 'date-fns/locale';

/**
 * Format currency in Indian format (₹X,XX,XXX.XX)
 */
export function formatCurrency(amount: number, compact = false): string {
  if (compact && amount >= 100000) {
    return `₹${(amount / 100000).toFixed(1)}L`;
  }
  if (compact && amount >= 1000) {
    return `₹${(amount / 1000).toFixed(1)}K`;
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format number in Indian format (X,XX,XXX)
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-IN').format(num);
}

/**
 * Format date
 */
export function formatDate(
  date: string | Date,
  formatStr: string = 'dd/MM/yyyy'
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, formatStr, { locale: enIN });
}

/**
 * Format relative date (Today, Tomorrow, Yesterday, or date)
 */
export function formatRelativeDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;

  if (isToday(d)) return 'Today';
  if (isTomorrow(d)) return 'Tomorrow';
  if (isYesterday(d)) return 'Yesterday';

  return format(d, 'dd MMM yyyy', { locale: enIN });
}

/**
 * Format time (12-hour with AM/PM)
 */
export function formatTime(time: string): string {
  const [hours, minutes] = time.split(':');
  const h = parseInt(hours, 10);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${minutes} ${period}`;
}

/**
 * Format duration
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

/**
 * Format phone number (Indian format)
 */
export function formatPhone(phone: string): string {
  if (phone.length === 10) {
    return `+91 ${phone.slice(0, 5)} ${phone.slice(5)}`;
  }
  return phone;
}

/**
 * Mask phone number (for privacy)
 */
export function maskPhone(phone: string): string {
  if (phone.length === 10) {
    return `${phone.slice(0, 2)}XXXX${phone.slice(6)}`;
  }
  return phone.replace(/\d(?=\d{4})/g, 'X');
}

/**
 * Format time ago
 */
export function formatTimeAgo(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return formatDistance(d, new Date(), { addSuffix: true, locale: enIN });
}
```

---

## 14. Common Wrapper Components

These components wrap shadcn/ui primitives to provide consistent patterns across the app. See `.cursor/docs/design/13-ui-components.md` for full API documentation.

### Component Directory Structure

```
components/
├── ui/                    # Raw shadcn/ui components (DO NOT MODIFY)
├── common/                # Wrapper components (USE THESE)
│   ├── page-container.tsx
│   ├── page-header.tsx
│   ├── page-content.tsx
│   ├── data-table.tsx
│   ├── stat-card.tsx
│   ├── status-badge.tsx
│   ├── empty-state.tsx
│   ├── error-state.tsx
│   ├── form-section.tsx
│   ├── form-actions.tsx
│   ├── currency-input.tsx
│   ├── phone-input.tsx
│   ├── date-range-picker.tsx
│   ├── confirm-dialog.tsx
│   ├── action-menu.tsx
│   ├── search-input.tsx
│   ├── filter-bar.tsx
│   ├── loading-spinner.tsx
│   ├── loading-overlay.tsx
│   └── index.ts           # Barrel export
└── layout/                # App shell components
```

### Usage Pattern

```typescript
// Import from common, not from ui
import { 
  PageContainer, 
  PageHeader, 
  DataTable, 
  StatusBadge,
  EmptyState,
  ConfirmDialog,
} from '@/components/common';

// Page structure
export default function CustomersPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Customers"
        description="Manage your customer database"
        actions={<Button>+ Add Customer</Button>}
      />
      
      <FilterBar>
        <SearchInput placeholder="Search..." />
      </FilterBar>
      
      <DataTable
        columns={columns}
        data={customers}
        isLoading={isLoading}
        emptyState={
          <EmptyState
            icon={Users}
            title="No customers yet"
            action={<Button>Add Customer</Button>}
          />
        }
      />
    </PageContainer>
  );
}
```

### Key Components

| Component | Purpose | When to Use |
|-----------|---------|-------------|
| `PageContainer` | Wraps page content | Every page |
| `PageHeader` | Page title + actions | Every page |
| `DataTable` | List data with sort/filter | List pages |
| `StatCard` | Dashboard metrics | Dashboard |
| `StatusBadge` | Status indicators | Tables, cards |
| `EmptyState` | No data message | Tables, lists |
| `ConfirmDialog` | Destructive confirmations | Delete actions |
| `ActionMenu` | Row/card actions | Tables, cards |
| `SearchInput` | Debounced search | Filter bars |
| `CurrencyInput` | Money input (₹) | Forms |
| `PhoneInput` | Phone with validation | Forms |

### Design Principles

Always follow these principles when using components:

1. **Import from `@/components/common`** - Never use raw shadcn for common patterns
2. **Every page uses `PageContainer` + `PageHeader`** - Consistent structure
3. **Every list has `EmptyState`** - No blank screens
4. **Every async action shows loading** - Use `isLoading` props
5. **Every destructive action confirms** - Use `ConfirmDialog`
6. **Every status uses `StatusBadge`** - Consistent colors

See `.cursor/rules/19-ui-ux-standards.mdc` for complete design guidelines.
