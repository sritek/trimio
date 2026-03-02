/**
 * Branch Selector Component
 * Dropdown for multi-branch users to switch between branches
 */

'use client';

import { Building2, Check, ChevronDown } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { useBranchContext } from '@/hooks/use-branch-context';
import { useBranches } from '@/hooks/queries/use-branches';
import { cn } from '@/lib/utils';

interface BranchSelectorProps {
  className?: string;
}

export function BranchSelector({ className }: BranchSelectorProps) {
  const { branchId, branchIds, setSelectedBranch, canSwitchBranches } = useBranchContext();
  const { data: branches, isLoading } = useBranches(branchIds);

  // Don't render if user can't switch branches
  if (!canSwitchBranches) {
    return null;
  }

  // Find the currently selected branch
  const selectedBranch = branches?.find((b) => b.id === branchId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className={cn('flex items-center gap-2', className)}>
          <Building2 className="h-4 w-4 shrink-0" />
          {isLoading ? (
            <Skeleton className="h-4 w-20" />
          ) : (
            <span className="max-w-[100px] sm:max-w-[180px] truncate">
              {selectedBranch?.name || 'Select Branch'}
            </span>
          )}
          <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>Switch Branch</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {isLoading ? (
          <div className="p-2 space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : (
          branches?.map((branch) => (
            <DropdownMenuItem
              key={branch.id}
              onClick={() => setSelectedBranch(branch.id)}
              className="flex items-center justify-between"
            >
              <span className="truncate">{branch.name}</span>
              {branch.id === branchId && <Check className="h-4 w-4 text-primary" />}
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
