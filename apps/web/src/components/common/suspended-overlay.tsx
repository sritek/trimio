'use client';

/**
 * SuspendedOverlay - Full-page block when subscription is suspended
 * Only allows: logout, view subscription page, contact support
 */

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertOctagon, LogOut, CreditCard, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth-store';

interface SuspendedOverlayProps {
  planName: string | null;
}

export function SuspendedOverlay({ planName }: SuspendedOverlayProps) {
  const router = useRouter();
  const logout = useAuthStore((state) => state.logout);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm">
      <div className="mx-4 max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-2xl border border-red-100 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-red-600 to-red-500 px-6 py-8 text-center text-white">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/20">
              <AlertOctagon className="h-8 w-8" />
            </div>
            <h1 className="text-2xl font-bold">Account Suspended</h1>
            {planName && <p className="mt-1 text-red-100 text-sm">{planName} Plan</p>}
          </div>

          {/* Content */}
          <div className="px-6 py-6">
            <p className="text-center text-muted-foreground mb-6">
              Your subscription has been suspended due to non-payment. Please contact our support
              team to restore access to your account.
            </p>

            <div className="space-y-3">
              {/* Contact Support - Primary action */}
              <Button className="w-full" size="lg" asChild>
                <a href="mailto:support@trimio.app">
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Contact Support
                </a>
              </Button>

              {/* View Subscription */}
              <Button variant="outline" className="w-full" size="lg" asChild>
                <Link href="/settings/subscription">
                  <CreditCard className="mr-2 h-4 w-4" />
                  View Subscription Details
                </Link>
              </Button>

              {/* Logout */}
              <Button
                variant="ghost"
                className="w-full text-muted-foreground"
                size="lg"
                onClick={handleLogout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 text-center">
            <p className="text-xs text-muted-foreground">
              Need help? Email us at{' '}
              <a href="mailto:support@trimio.app" className="text-primary hover:underline">
                support@trimio.app
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
