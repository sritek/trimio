'use client';

import { Loader2 } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { api, ApiError } from '@/lib/api/client';
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
  const [loginMode, setLoginMode] = useState<'phone' | 'email'>('phone');
  const identifierRef = useRef<HTMLInputElement>(null);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [phoneError, setPhoneError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setPhoneError('');

    if (loginMode === 'phone' && !/^[6-9]\d{9}$/.test(identifier)) {
      setPhoneError('Please enter a valid 10-digit mobile number');
      setIsLoading(false);
      return;
    }

    try {
      const payload = loginMode === 'phone'
        ? { phone: identifier, password }
        : { email: identifier, password };

      const response = await api.post<LoginResponse>('/auth/login', payload);

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
      if (error instanceof ApiError) {
        toast.error(
          loginMode === 'phone'
            ? 'Invalid phone number or password'
            : 'Invalid email or password'
        );
      } else {
        toast.error('Unable to connect. Please check your internet connection and try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <div className="flex justify-center mb-4">
          <span className="text-4xl font-bold tracking-tight">trimio.</span>
        </div>
        <CardDescription className="text-center">
          Sign in to your account to continue
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Tabs
            value={loginMode}
            onValueChange={(value) => {
              setLoginMode(value as 'phone' | 'email');
              setIdentifier('');
              setTimeout(() => identifierRef.current?.focus(), 0);
            }}
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="phone">Phone</TabsTrigger>
              <TabsTrigger value="email">Email</TabsTrigger>
            </TabsList>
          </Tabs>

          {loginMode === 'phone' ? (
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                placeholder="10-digit mobile number"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                ref={identifierRef}
              />
              {phoneError && (
                <p className="text-sm text-destructive">{phoneError}</p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@salon.com"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                autoComplete="email"
                ref={identifierRef}
              />
            </div>
          )}

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
