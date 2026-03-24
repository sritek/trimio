/**
 * Internal Admin Login Page
 */

'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { Shield } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';
import { useAdminStore } from '@/stores/admin-store';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface AdminLoginResponse {
  success: boolean;
  data: {
    accessToken: string;
    admin: {
      email: string;
    };
  };
}

export default function InternalLoginPage() {
  const router = useRouter();
  const setAuth = useAdminStore((state) => state.setAuth);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/internal/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data: AdminLoginResponse = await response.json();

      if (!response.ok) {
        throw new Error((data as any).error?.message || 'Invalid credentials');
      }

      setAuth(data.data.admin.email, data.data.accessToken);

      toast.success('Welcome, Admin!');

      // Small delay to ensure cookie is written
      await new Promise((resolve) => setTimeout(resolve, 100));

      router.push('/internal/tenants');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Invalid credentials');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-white border-slate-200 shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-amber-100 rounded-full">
              <Shield className="h-8 w-8 text-amber-600" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-slate-900">trimio Admin</CardTitle>
          <CardDescription className="text-slate-500">
            Internal Tenant Management Portal
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-700">
                Admin Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@trimio.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-400"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-700">
                Password
              </Label>
              <PasswordInput
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-white border-slate-300 text-slate-900"
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold"
              disabled={isLoading}
            >
              {isLoading ? 'Signing in...' : 'Sign in as Admin'}
            </Button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-200">
            <p className="text-xs text-slate-500 text-center">
              This portal is for internal use only. Unauthorized access is prohibited.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
