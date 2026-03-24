'use client';

/**
 * FilterSheet Component
 * Reusable filter sidebar with consistent layout:
 * - Header with title and active filter count
 * - Scrollable content area for filter controls
 * - Footer with Apply/Reset buttons
 */

import { Filter, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';

interface FilterSheetProps {
  /** Controls sheet visibility */
  open: boolean;
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void;
  /** Sheet title (default: "Filters") */
  title?: string;
  /** Number of active filters to display in badge */
  activeFilterCount?: number;
  /** Filter content (form controls) */
  children: React.ReactNode;
  /** Callback when Apply button is clicked */
  onApply: () => void;
  /** Callback when Reset button is clicked */
  onReset: () => void;
  /** Apply button text (default: "Apply Filters") */
  applyText?: string;
  /** Reset button text (default: "Reset") */
  resetText?: string;
}

export function FilterSheet({
  open,
  onOpenChange,
  title = 'Filters',
  activeFilterCount = 0,
  children,
  onApply,
  onReset,
  applyText = 'Apply Filters',
  resetText = 'Reset',
}: FilterSheetProps) {
  const handleApply = () => {
    onApply();
    onOpenChange(false);
  };

  const handleReset = () => {
    onReset();
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex flex-col p-0 w-[320px] sm:w-[380px]">
        <SheetHeader className="px-4 py-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            {title}
            {activeFilterCount > 0 && (
              <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                {activeFilterCount}
              </span>
            )}
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">{children}</div>

        <SheetFooter className="px-4 py-4 border-t gap-2">
          <Button variant="outline" onClick={handleReset} className="flex-1">
            <RotateCcw className="h-4 w-4 mr-2" />
            {resetText}
          </Button>
          <Button onClick={handleApply} className="flex-1">
            {applyText}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
