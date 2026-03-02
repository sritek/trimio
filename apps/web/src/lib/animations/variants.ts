/**
 * Framer Motion Animation Variants
 * Based on: .kiro/specs/ux-redesign/design.md
 * Requirements: 10.1, 10.2, 10.11
 */

import type { Variants, Transition } from 'framer-motion';

// Default transition for most animations
export const defaultTransition: Transition = {
  type: 'spring',
  stiffness: 500,
  damping: 30,
};

// Ease-out transition for slide animations (300ms)
export const slideTransition: Transition = {
  type: 'tween',
  ease: 'easeOut',
  duration: 0.3,
};

// Slide-over panel variants
export const slideOverVariants: Variants = {
  hidden: {
    x: '100%',
    opacity: 0,
  },
  visible: {
    x: 0,
    opacity: 1,
    transition: slideTransition,
  },
  exit: {
    x: '100%',
    opacity: 0,
    transition: slideTransition,
  },
};

// Mobile full-screen modal variants
export const mobileModalVariants: Variants = {
  hidden: {
    y: '100%',
    opacity: 0,
  },
  visible: {
    y: 0,
    opacity: 1,
    transition: slideTransition,
  },
  exit: {
    y: '100%',
    opacity: 0,
    transition: slideTransition,
  },
};

// Backdrop/overlay variants
export const backdropVariants: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: { duration: 0.2 },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.2 },
  },
};

// List item variants for staggered animations
export const listItemVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 10,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: defaultTransition,
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: { duration: 0.15 },
  },
};

// Container variants for staggered children
export const staggerContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

// Fade variants
export const fadeVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.2 },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.15 },
  },
};

// Scale variants for buttons and interactive elements
export const scaleVariants: Variants = {
  initial: { scale: 1 },
  hover: { scale: 1.02 },
  tap: { scale: 0.98 },
};

// Pulse animation for status changes
export const pulseVariants: Variants = {
  initial: { scale: 1 },
  pulse: {
    scale: [1, 1.05, 1],
    transition: {
      duration: 0.3,
      ease: 'easeInOut',
    },
  },
};

// Shake animation for errors
export const shakeVariants: Variants = {
  initial: { x: 0 },
  shake: {
    x: [-10, 10, -10, 10, 0],
    transition: {
      duration: 0.4,
      ease: 'easeInOut',
    },
  },
};

// Bottom sheet variants
export const bottomSheetVariants: Variants = {
  hidden: {
    y: '100%',
  },
  visible: {
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 30,
    },
  },
  exit: {
    y: '100%',
    transition: {
      type: 'tween',
      ease: 'easeIn',
      duration: 0.2,
    },
  },
};

// Radial menu variants
export const radialMenuVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 20,
    },
  },
  exit: {
    opacity: 0,
    scale: 0,
    transition: { duration: 0.15 },
  },
};

// Notification toast variants
export const toastVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 50,
    scale: 0.9,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 25,
    },
  },
  exit: {
    opacity: 0,
    y: 20,
    scale: 0.9,
    transition: { duration: 0.2 },
  },
};

// Drag overlay variants
export const dragOverlayVariants: Variants = {
  initial: {
    opacity: 0.8,
    scale: 1.02,
    boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
  },
  dragging: {
    opacity: 0.9,
    scale: 1.05,
    boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
  },
};

// Number counting animation helper
export const countingTransition: Transition = {
  type: 'tween',
  duration: 0.5,
  ease: 'easeOut',
};
