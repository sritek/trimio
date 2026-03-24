/**
 * Auth Guard Component
 * Shows loading state while checking authentication
 * Prevents flash of protected content for unauthenticated users
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { LoadingSpinner } from '@/components/common';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  // Always start with false to match server render, then update after mount
  const [isHydrated, setIsHydrated] = useState(false);

  // Wait for hydration to complete (only runs on client)
  useEffect(() => {
    // Check if already hydrated
    if (useAuthStore.persist.hasHydrated()) {
      setIsHydrated(true);
      return;
    }

    // Subscribe to finish hydration event
    const unsubscribe = useAuthStore.persist.onFinishHydration(() => {
      setIsHydrated(true);
    });

    // Fallback timeout in case hydration event doesn't fire
    const timeoutId = setTimeout(() => {
      setIsHydrated(true);
    }, 500);

    return () => {
      unsubscribe();
      clearTimeout(timeoutId);
    };
  }, []);

  // Redirect to login if not authenticated (after hydration)
  useEffect(() => {
    if (isHydrated && !isAuthenticated) {
      const loginUrl = `/login?redirect=${encodeURIComponent(pathname)}`;
      router.replace(loginUrl);
    }
  }, [isHydrated, isAuthenticated, pathname, router]);

  // Show loading while not hydrated (matches server render)
  if (!isHydrated) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <LoadingSpinner size="lg" text="Loading..." />
      </div>
    );
  }

  // Show redirecting message if not authenticated (will redirect)
  if (!isAuthenticated) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <LoadingSpinner size="lg" text="Redirecting to login..." />
      </div>
    );
  }

  return <>{children}</>;
}
