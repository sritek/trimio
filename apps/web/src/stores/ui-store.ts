/**
 * UI Store
 * Based on: .cursor/rules/14-frontend-implementation.mdc lines 600-630
 * Updated for UX Redesign: .kiro/specs/ux-redesign/design.md
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type ActiveView = 'calendar' | 'analytics' | 'default';
export type OwnerDashboardView = 'overview' | 'floor';

interface UIState {
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  mobileNavOpen: boolean;

  // Active view for role-based dashboards
  activeView: ActiveView;

  // Owner dashboard view toggle (Overview vs Floor View)
  ownerDashboardView: OwnerDashboardView;

  // Mobile FAB menu state
  fabMenuOpen: boolean;

  // Actions
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebarCollapse: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setMobileNavOpen: (open: boolean) => void;

  // View actions
  setActiveView: (view: ActiveView) => void;
  setOwnerDashboardView: (view: OwnerDashboardView) => void;

  // FAB actions
  setFabMenuOpen: (open: boolean) => void;
  toggleFabMenu: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      sidebarCollapsed: false,
      mobileNavOpen: false,
      activeView: 'default',
      ownerDashboardView: 'overview',
      fabMenuOpen: false,

      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebarCollapse: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      setMobileNavOpen: (open) => set({ mobileNavOpen: open }),

      // View actions
      setActiveView: (view) => set({ activeView: view }),
      setOwnerDashboardView: (view) => set({ ownerDashboardView: view }),

      // FAB actions
      setFabMenuOpen: (open) => set({ fabMenuOpen: open }),
      toggleFabMenu: () => set((state) => ({ fabMenuOpen: !state.fabMenuOpen })),
    }),
    {
      name: 'ui-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        activeView: state.activeView,
        ownerDashboardView: state.ownerDashboardView,
      }),
    }
  )
);

// Selector hooks for common use cases
export const useActiveView = () => useUIStore((state) => state.activeView);
export const useFabMenuOpen = () => useUIStore((state) => state.fabMenuOpen);
export const useSidebarCollapsed = () => useUIStore((state) => state.sidebarCollapsed);
export const useOwnerDashboardView = () => useUIStore((state) => state.ownerDashboardView);
