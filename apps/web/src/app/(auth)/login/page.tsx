'use client';

import { Loader2 } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useMemo } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';
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

/**
 * Detect if the input looks like an email or phone number
 */
function detectInputType(value: string): 'email' | 'phone' | 'unknown' {
  const trimmed = value.trim();
  if (trimmed.includes('@')) {
    return 'email';
  }
  // Check if it's mostly digits (allowing for formatting like spaces, dashes)
  const digitsOnly = trimmed.replace(/\D/g, '');
  if (digitsOnly.length >= 10 && /^[6-9]/.test(digitsOnly)) {
    return 'phone';
  }
  return 'unknown';
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [isLoading, setIsLoading] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Detect input type for validation and UX hints
  const inputType = useMemo(() => detectInputType(identifier), [identifier]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const trimmedIdentifier = identifier.trim();

    // Validate based on detected type
    if (inputType === 'phone') {
      const digitsOnly = trimmedIdentifier.replace(/\D/g, '');
      if (!/^[6-9]\d{9}$/.test(digitsOnly)) {
        setError('Please enter a valid 10-digit mobile number');
        setIsLoading(false);
        return;
      }
    } else if (inputType === 'email') {
      // Basic email validation
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedIdentifier)) {
        setError('Please enter a valid email address');
        setIsLoading(false);
        return;
      }
    } else if (trimmedIdentifier.length === 0) {
      setError('Please enter your mobile number or email');
      setIsLoading(false);
      return;
    }

    try {
      // Send unified identifier to backend - it will detect the type
      const response = await api.post<LoginResponse>('/auth/login', {
        identifier: trimmedIdentifier,
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
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error('Invalid mobile number/email or password');
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
          <div className="space-y-2">
            <Label htmlFor="identifier">Mobile / Email</Label>
            <Input
              id="identifier"
              type={inputType === 'email' ? 'email' : 'text'}
              inputMode={inputType === 'phone' || inputType === 'unknown' ? 'tel' : 'email'}
              autoComplete={inputType === 'email' ? 'email' : 'tel'}
              placeholder="Enter mobile number or email"
              value={identifier}
              onChange={(e) => {
                setIdentifier(e.target.value);
                setError('');
              }}
              required
              autoFocus
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
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
          <a
            href={`mailto:${process.env.TRIMIO_SUPPORT_EMAIL}`}
            className="text-primary hover:underline"
          >
            Contact support
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
