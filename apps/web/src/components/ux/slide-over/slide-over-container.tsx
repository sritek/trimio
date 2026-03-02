'use client';

/**
 * SlideOver Container
 *
 * Renders the current slide-over panel.
 * Add this once in your layout.
 */

import { AnimatePresence } from 'framer-motion';
import { useSlideOverStore, getPanelComponent } from '@/stores/slide-over-store';
import { SlideOverPanel } from './slide-over-panel';

export function SlideOverContainer() {
  const panel = useSlideOverStore((s) => s.panel);

  return (
    <AnimatePresence>
      {panel && <SlideOverPanel panel={panel} getComponent={getPanelComponent} />}
    </AnimatePresence>
  );
}
