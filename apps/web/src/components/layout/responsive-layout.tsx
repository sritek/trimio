/**
 * Responsive Layout Component
 * Handles different layouts for mobile, tablet, and desktop
 * Requirements: 8.7
 */

'use client';

import { useEffect } from 'react';

import { useUIStore } from '@/stores/ui-store';
import { BottomNav } from '@/components/ux/mobile';

interface ResponsiveLayoutProps {
  children: React.ReactNode;
}

/**
 * Hook to detect viewport size and auto-collapse sidebar on tablet
 */
function useResponsiveLayout() {
  const { setSidebarCollapsed } = useUIStore();

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;

      // Tablet: 768px - 1024px - auto-collapse sidebar
      if (width >= 768 && width < 1024) {
        setSidebarCollapsed(true);
      }
    };

    // Initial check
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setSidebarCollapsed]);
}

export function ResponsiveLayout({ children }: ResponsiveLayoutProps) {
  useResponsiveLayout();

  return (
    <>
      {children}

      {/* Mobile Bottom Navigation - visible on screens < 768px */}
      <BottomNav className="md:hidden" />
    </>
  );
}
