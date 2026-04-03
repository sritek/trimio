/**
 * Header - Top header with mobile menu button
 *
 * Features:
 * - Mobile: Hamburger menu
 */

'use client';

import { Menu } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useUIStore } from '@/stores/ui-store';
import { useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';

interface HeaderProps {
  className?: string;
}

export function Header({ className }: HeaderProps) {
  const { setMobileNavOpen } = useUIStore();
  const { user } = useAuthStore();

  // Stylists have the "More" button in the bottom nav, so hide the header hamburger
  if (user?.role === 'stylist') {
    return null;
  }

  return (
    <header
      className={cn(
        'sticky top-0 z-40 flex h-14 items-center border-b bg-background px-4 md:hidden',
        className
      )}
    >
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setMobileNavOpen(true)}
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </Button>
    </header>
  );
}
