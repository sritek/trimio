/**
 * Internal Admin - Tenants List Page
 */

'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Plus, Building2, Users, LogOut, RefreshCw, CreditCard } from 'lucide-react';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAdminStore } from '@/stores/admin-store';

import { useInternalApi } from '../hooks';
import type { Tenant } from '../types';

export default function TenantsPage() {
  const router = useRouter();
  const { accessToken, logout } = useAdminStore();
  const api = useInternalApi();

  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const fetchTenants = useCallback(async () => {
    if (!accessToken) return;

    setIsLoading(true);
    try {
      const response = await api.listTenants(search);
      setTenants(response.data);
    } catch (error) {
      if (error instanceof Error && error.message === 'Session expired') {
        return;
      }
      toast.error(error instanceof Error ? error.message : 'Failed to fetch tenants');
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, search, api]);

  useEffect(() => {
    if (isHydrated && accessToken) {
      fetchTenants();
    }
  }, [isHydrated, accessToken, fetchTenants]);

  const handleLogout = () => {
    logout();
    router.push('/internal/login');
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">trimio Admin</h1>
              <p className="text-sm text-slate-500">Tenant Management Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => router.push('/internal/subscriptions')}
              className="text-slate-600"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Plans
            </Button>
            <Button
              variant="ghost"
              onClick={handleLogout}
              className="text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        {/* Actions Bar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Input
              placeholder="Search tenants..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-64 bg-white border-slate-300 text-slate-900 placeholder:text-slate-400"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={fetchTenants}
              className="text-slate-500 hover:text-slate-900"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          <Button
            onClick={() => router.push('/internal/tenants/new')}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Tenant
          </Button>
        </div>

        {/* Tenants Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="bg-white border-slate-200 animate-pulse shadow-sm">
                <CardHeader className="pb-2">
                  <div className="h-6 bg-slate-200 rounded w-3/4" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="h-4 bg-slate-100 rounded w-1/2" />
                    <div className="h-4 bg-slate-100 rounded w-2/3" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : tenants.length === 0 ? (
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Building2 className="h-12 w-12 text-slate-300 mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">No tenants yet</h3>
              <p className="text-slate-500 mb-4">Create your first tenant to get started</p>
              <Button
                onClick={() => router.push('/internal/tenants/new')}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Tenant
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tenants.map((tenant) => (
              <Card
                key={tenant.id}
                className="bg-white border-slate-200 hover:border-slate-300 hover:shadow-md cursor-pointer transition-all shadow-sm"
                onClick={() => router.push(`/internal/tenants/${tenant.id}`)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {/* Logo */}
                      <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {tenant.logoUrl ? (
                          <img
                            src={tenant.logoUrl}
                            alt={tenant.name}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <Building2 className="h-5 w-5 text-slate-400" />
                        )}
                      </div>
                      <div>
                        <CardTitle className="text-slate-900 text-lg">{tenant.name}</CardTitle>
                        <p className="text-sm text-slate-500">{tenant.email}</p>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-slate-500">
                    <div className="flex items-center gap-1">
                      <Building2 className="h-4 w-4" />
                      <span>{tenant._count.branches} branches</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>{tenant._count.users} users</span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 mt-2">
                    Created: {format(new Date(tenant.createdAt), 'MMM d, yyyy')}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
