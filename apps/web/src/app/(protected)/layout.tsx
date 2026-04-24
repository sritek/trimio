/**
 * Dashboard Layout
 */

import { Header } from '@/components/layout/header';
import { Sidebar } from '@/components/layout/sidebar';
import { MobileNav } from '@/components/layout/mobile-nav';
import { ResponsiveLayout } from '@/components/layout/responsive-layout';
import { SlideOverContainer } from '@/components/ux/slide-over';
import { SlideOverRegistry } from '@/components/ux/slide-over/slide-over-registry';
import { AuthGuard } from '@/components/auth';
import { BranchChangeProvider } from '@/components/providers/branch-change-provider';
import { TrialBannerWrapper } from '@/components/layout/trial-banner-wrapper';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <BranchChangeProvider>
        <div className="flex flex-col h-screen overflow-hidden bg-background">
          {/* Trial Banner - Full width at top */}
          <TrialBannerWrapper />

          <div className="flex flex-1 min-h-0">
            {/* Desktop/Tablet Sidebar */}
            <Sidebar className="hidden md:flex flex-col" />

            {/* Mobile Navigation Drawer */}
            <MobileNav />

            {/* Main Content */}
            <div className="flex flex-1 flex-col min-w-0">
              <Header />
              <main className="flex-1 overflow-auto p-4 lg:p-6 pb-20 md:pb-6 min-h-0">
                <ResponsiveLayout>{children}</ResponsiveLayout>
              </main>
            </div>

            {/* Slide-over panels */}
            <SlideOverRegistry />
            <SlideOverContainer />
          </div>
        </div>
      </BranchChangeProvider>
    </AuthGuard>
  );
}
