'use client';

/**
 * Slide-Over Panel Component
 *
 * Uses Sheet internally with added features:
 * - Global state management (open from anywhere)
 * - Dynamic component registry
 * - Unsaved changes tracking with confirmation dialog
 * - Variable widths (narrow, medium, wide, extra-wide)
 * - Proper close animation (delays unmount until animation completes)
 */

import { Suspense, useState, useCallback, useEffect } from 'react';
import { ChevronLeft } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-media-query';
import {
  useSlideOverStore,
  type SlideOverPanel as SlideOverPanelType,
  type SlideOverWidth,
} from '@/stores/slide-over-store';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetBody } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

interface SlideOverPanelProps {
  panel: SlideOverPanelType;
  getComponent: (id: string) => React.ComponentType<Record<string, unknown>> | undefined;
}

// Map store width to Sheet size variant
const widthToSize: Record<SlideOverWidth, 'narrow' | 'medium' | 'wide' | 'extra-wide'> = {
  narrow: 'narrow',
  medium: 'medium',
  wide: 'wide',
  'extra-wide': 'extra-wide',
};

// Animation duration matches Sheet's data-[state=closed]:duration-300
const CLOSE_ANIMATION_DURATION = 300;

function PanelSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <div className="space-y-2 pt-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );
}

export function SlideOverPanel({ panel, getComponent }: SlideOverPanelProps) {
  const isMobile = useIsMobile();
  const close = useSlideOverStore((s) => s.close);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  // Control Sheet's open state separately to allow close animation
  const [isSheetOpen, setIsSheetOpen] = useState(true);

  // When panel changes (new panel opened), ensure sheet is open
  useEffect(() => {
    setIsSheetOpen(true);
  }, [panel.componentId]);

  const handleClose = useCallback(() => {
    // First, trigger the close animation by setting Sheet to closed
    setIsSheetOpen(false);
    // Then, after animation completes, actually remove from store
    setTimeout(() => {
      close();
    }, CLOSE_ANIMATION_DURATION);
  }, [close]);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        if (panel.hasUnsavedChanges) {
          setShowUnsavedDialog(true);
        } else {
          handleClose();
        }
      }
    },
    [panel.hasUnsavedChanges, handleClose]
  );

  const handleConfirmClose = useCallback(() => {
    setShowUnsavedDialog(false);
    handleClose();
  }, [handleClose]);

  const Component = getComponent(panel.componentId);

  return (
    <>
      <Sheet open={isSheetOpen} onOpenChange={handleOpenChange}>
        <SheetContent
          side="right"
          size={isMobile ? 'full' : widthToSize[panel.width]}
          hideCloseButton={isMobile}
          className={cn(
            isMobile && 'w-full max-w-full',
            'p-0' // Remove default padding, let SheetHeader/SheetBody handle it
          )}
        >
          {/* Unsaved changes indicator */}
          {panel.hasUnsavedChanges && (
            <div className="absolute left-0 top-0 h-1 w-full bg-yellow-500 z-10" />
          )}

          {/* Header */}
          <SheetHeader className="border-b px-4 py-3 sm:px-6 flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-2">
              {isMobile && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleOpenChange(false)}
                  className="h-8 w-8"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
              )}
              <SheetTitle>{panel.title}</SheetTitle>
            </div>
          </SheetHeader>

          {/* Content */}
          <SheetBody className="px-0 py-0">
            {Component ? (
              <Suspense
                fallback={
                  <div className="p-6">
                    <PanelSkeleton />
                  </div>
                }
              >
                <Component {...panel.props} />
              </Suspense>
            ) : (
              <div className="p-6 text-center text-muted-foreground">
                Component not found: {panel.componentId}
              </div>
            )}
          </SheetBody>
        </SheetContent>
      </Sheet>

      {/* Unsaved changes dialog */}
      <AlertDialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Are you sure you want to close? Your changes will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmClose}>Discard Changes</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
