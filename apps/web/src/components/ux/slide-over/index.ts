/**
 * Slide-Over Panel System
 */

// Hooks
export { useClosePanel, useSlideOverUnsavedChanges } from '@/stores/slide-over-store';
export { useOpenPanel, PANEL_IDS } from './slide-over-registry';

// Components
export { SlideOverContainer } from './slide-over-container';
export { SlideOverRegistry } from './slide-over-registry';
export { SlideOverContent } from './slide-over-content';
export { SlideOverFooter } from './slide-over-footer';
