'use client';

/**
 * Business Profile Page
 * Display and edit tenant information
 */

import { Building2, Mail, Phone, CreditCard } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useTenant } from '@/hooks/queries/use-tenant';
import { useAuthStore } from '@/stores/auth-store';
import { ProfileForm } from './components/profile-form';

export default function ProfilePage() {
  const { data: tenant, isLoading, error } = useTenant();
  const { user } = useAuthStore();
  const canEdit = user?.role === 'super_owner';

  if (isLoading) {
    return <ProfileSkeleton />;
  }

  if (error || !tenant) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Failed to load business profile</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Business Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Business Information
          </CardTitle>
          <CardDescription>
            {canEdit ? 'View and update your business details' : 'View your business details'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {canEdit ? (
            <ProfileForm tenant={tenant} />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Business Name</label>
                <p className="mt-1">{tenant.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Legal Name</label>
                <p className="mt-1">{tenant.legalName || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Email</label>
                <p className="mt-1 flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  {tenant.email}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Phone</label>
                <p className="mt-1 flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  {tenant.phone || '-'}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Usage Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Usage
          </CardTitle>
          <CardDescription>Your current usage statistics</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Branches</p>
              <p className="text-lg font-semibold">{tenant.usage.branches.current}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Active Subscriptions</p>
              <p className="text-lg font-semibold">{tenant.usage.branches.active}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Users</p>
              <p className="text-lg font-semibold">{tenant.usage.users.current}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i}>
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-6 w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}
