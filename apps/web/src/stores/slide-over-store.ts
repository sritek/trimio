/**
 * Slide-Over Panel Store
 *
 * Single panel slide-over state management using Zustand.
 */

import { create } from 'zustand';

export type SlideOverWidth = 'narrow' | 'medium' | 'wide' | 'extra-wide';

export interface SlideOverPanel {
  componentId: string;
  props: Record<string, unknown>;
  width: SlideOverWidth;
  title: string;
  hasUnsavedChanges: boolean;
}

interface SlideOverStore {
  panel: SlideOverPanel | null;
  open: (
    componentId: string,
    props: Record<string, unknown>,
    options: { width?: SlideOverWidth; title: string }
  ) => void;
  close: () => void;
  setUnsavedChanges: (hasChanges: boolean) => void;
}

export const PANEL_WIDTH_VALUES: Record<SlideOverWidth, number> = {
  narrow: 400,
  medium: 600,
  wide: 800,
  'extra-wide': 1000,
};

// Component registry - simple module-level map (not in Zustand since it's static)
const componentRegistry = new Map<string, React.ComponentType<Record<string, unknown>>>();

export function registerPanelComponent(
  id: string,
  component: React.ComponentType<Record<string, unknown>>
) {
  componentRegistry.set(id, component);
}

export function getPanelComponent(id: string) {
  return componentRegistry.get(id);
}

export const useSlideOverStore = create<SlideOverStore>((set) => ({
  panel: null,

  open: (componentId, props, options) => {
    set({
      panel: {
        componentId,
        props,
        width: options.width || 'medium',
        title: options.title,
        hasUnsavedChanges: false,
      },
    });
  },

  close: () => set({ panel: null }),

  setUnsavedChanges: (hasChanges) =>
    set((state) =>
      state.panel ? { panel: { ...state.panel, hasUnsavedChanges: hasChanges } } : state
    ),
}));

/**
 * Hook to close panel
 */
export function useClosePanel() {
  return useSlideOverStore((s) => s.close);
}

/**
 * Hook for forms to track unsaved changes
 */
export function useSlideOverUnsavedChanges() {
  const store = useSlideOverStore();
  return {
    hasUnsavedChanges: store.panel?.hasUnsavedChanges ?? false,
    setUnsavedChanges: store.setUnsavedChanges,
  };
}
