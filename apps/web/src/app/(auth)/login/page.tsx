'use client';

import { Loader2, Scissors } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';
import { api } from '@/lib/api/client';
import { useAuthStore } from '@/stores/auth-store';

interface LoginResponse {
  user: {
    id: string;
    email?: string;
    phone: string;
    name: string;
    role: string;
    tenantId: string;
    branchIds: string[];
    permissions: string[];
  };
  tenant: {
    id: string;
    name: string;
    slug: string;
  };
  accessToken: string;
  refreshToken: string;
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await api.post<LoginResponse>('/auth/login', {
        email,
        password,
      });

      setAuth(response.user, response.tenant, response.accessToken, response.refreshToken);

      toast.success('Welcome back!');

      // Small delay to ensure cookie is written before navigation
      // This prevents race condition with middleware reading old cookie
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Redirect to the original page or default to /today
      const redirectUrl = searchParams.get('redirect') || '/today';
      // Ensure redirect URL is a relative path (security: prevent open redirect)
      const safeRedirectUrl = redirectUrl.startsWith('/') ? redirectUrl : '/today';
      router.push(safeRedirectUrl);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <div className="flex justify-center mb-2">
          <div className="flex items-center gap-2">
            <Scissors className="size-6" />
            <span className="text-2xl font-bold">trimio</span>
          </div>
        </div>
        <CardDescription className="text-center">
          Sign in to your account to continue
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@salon.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <PasswordInput
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign in'
            )}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          Need help?{' '}
          <a href="mailto:support@trimio.in" className="text-primary hover:underline">
            Contact support
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
