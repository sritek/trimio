/**
 * Drag Handle Component
 * Provides an explicit drag handle for appointment blocks
 * Separates click (open details) from drag (reschedule) interactions
 */

'use client';

import type { DraggableAttributes } from '@dnd-kit/core';
import type { SyntheticListenerMap } from '@dnd-kit/core/dist/hooks/utilities';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DragHandleProps {
  listeners: SyntheticListenerMap | undefined;
  attributes: DraggableAttributes;
  disabled?: boolean;
}

export function DragHandle({ listeners, attributes, disabled }: DragHandleProps) {
  if (disabled) return null;

  return (
    <div
      {...listeners}
      {...attributes}
      className={cn(
        'absolute left-0 top-0 bottom-0 w-5 flex items-center justify-center',
        'cursor-grab active:cursor-grabbing',
        'opacity-0 group-hover:opacity-100 transition-opacity duration-150',
        'hover:bg-black/10 dark:hover:bg-white/10 rounded-l-lg',
        'touch-none select-none',
        // Ensure minimum touch target on mobile (44x44px)
        'min-h-[44px]'
      )}
      onClick={(e) => {
        // Stop click propagation to prevent triggering parent onClick
        e.stopPropagation();
      }}
    >
      <GripVertical className="h-3 w-3 text-muted-foreground" />
    </div>
  );
}
