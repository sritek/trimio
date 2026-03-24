/**
 * FormDialog - Reusable dialog wrapper for forms
 */

'use client';

import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface FormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  onSubmit: () => void;
  isLoading?: boolean;
  submitText?: string;
  cancelText?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
}

const MAX_WIDTH_CLASSES = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
};

export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  onSubmit,
  isLoading = false,
  submitText = 'Save',
  cancelText = 'Cancel',
  maxWidth = 'lg',
}: FormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`bg-white border-slate-200 ${MAX_WIDTH_CLASSES[maxWidth]}`}>
        <DialogHeader>
          <DialogTitle className="text-slate-900">{title}</DialogTitle>
          {description && (
            <DialogDescription className="text-slate-500">{description}</DialogDescription>
          )}
        </DialogHeader>
        <div className="space-y-4 mt-4">
          {children}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-slate-300"
              disabled={isLoading}
            >
              {cancelText}
            </Button>
            <Button
              onClick={onSubmit}
              disabled={isLoading}
              className="bg-amber-500 hover:bg-amber-600 text-white"
            >
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {submitText}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
