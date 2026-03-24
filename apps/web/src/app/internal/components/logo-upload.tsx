/**
 * LogoUpload - Reusable logo upload component with preview
 */

'use client';

import { useRef, type ChangeEvent } from 'react';
import { toast } from 'sonner';
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ALLOWED_IMAGE_TYPES, MAX_LOGO_SIZE_MB, MAX_LOGO_SIZE_BYTES } from '../constants';

interface LogoUploadProps {
  preview: string | null;
  onFileSelect: (file: File, preview: string) => void;
  onRemove: () => void;
  uploading?: boolean;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_CLASSES = {
  sm: 'w-16 h-16',
  md: 'w-20 h-20',
  lg: 'w-24 h-24',
};

export function LogoUpload({
  preview,
  onFileSelect,
  onRemove,
  uploading = false,
  label = 'Business Logo',
  size = 'lg',
}: LogoUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast.error('Only JPEG, PNG, WebP, and SVG images are allowed');
      return;
    }

    // Validate file size
    if (file.size > MAX_LOGO_SIZE_BYTES) {
      toast.error(`Logo must be less than ${MAX_LOGO_SIZE_MB}MB`);
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      const previewUrl = e.target?.result as string;
      onFileSelect(file, previewUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRemove();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const sizeClass = SIZE_CLASSES[size];

  return (
    <div className="space-y-2">
      {label && <Label className="text-slate-700">{label}</Label>}
      <div className="flex items-start gap-4">
        <div
          className={`relative ${sizeClass} rounded-lg border-2 border-dashed flex items-center justify-center overflow-hidden ${
            preview
              ? 'border-amber-400 bg-amber-50'
              : 'border-slate-300 bg-slate-50 hover:border-slate-400 cursor-pointer'
          }`}
          onClick={() => !preview && fileInputRef.current?.click()}
        >
          {preview ? (
            <>
              <img src={preview} alt="Logo preview" className="w-full h-full object-contain" />
              <button
                type="button"
                onClick={handleRemove}
                className="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full text-white hover:bg-red-600"
              >
                <X className="h-3 w-3" />
              </button>
            </>
          ) : (
            <div className="text-center">
              <ImageIcon className="h-6 w-6 text-slate-400 mx-auto" />
              {size === 'lg' && <span className="text-xs text-slate-500 mt-1">No logo</span>}
            </div>
          )}
        </div>

        <div className="flex-1">
          <input
            ref={fileInputRef}
            type="file"
            accept={ALLOWED_IMAGE_TYPES.join(',')}
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="border-slate-300"
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            {preview ? 'Change' : 'Upload'}
          </Button>
          <p className="text-xs text-slate-500 mt-2">
            JPEG, PNG, WebP, or SVG. Max {MAX_LOGO_SIZE_MB}MB.
          </p>
        </div>
      </div>
    </div>
  );
}
