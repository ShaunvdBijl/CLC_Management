import React, { useRef, useState } from 'react';
import { FileUp, ImagePlus } from 'lucide-react';

interface FileDropZoneProps {
  accept: string;
  title: string;
  subtitle: string;
  variant?: 'document' | 'image';
  disabled?: boolean;
  onFileSelected: (file: File) => void;
}

export function FileDropZone({
  accept,
  title,
  subtitle,
  variant = 'document',
  disabled = false,
  onFileSelected,
}: FileDropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = (files: FileList | null) => {
    if (disabled || !files || files.length === 0) return;
    onFileSelected(files[0]);
  };

  const Icon = variant === 'image' ? ImagePlus : FileUp;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => !disabled && inputRef.current?.click()}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        handleFiles(e.dataTransfer.files);
      }}
      className={`rounded-xl border-2 border-dashed p-5 text-center transition-all cursor-pointer select-none ${
        disabled
          ? 'opacity-50 cursor-not-allowed border-neutral-200 bg-neutral-50'
          : isDragging
            ? 'border-[#DB3335] bg-red-50/70 scale-[1.01]'
            : 'border-neutral-300 bg-[#FAFAFA] hover:border-[#DB3335] hover:bg-white'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        disabled={disabled}
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = '';
        }}
      />
      <div className="w-10 h-10 rounded-xl bg-[#161616] text-[#E9C00E] flex items-center justify-center mx-auto mb-2.5">
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-sm font-bold text-[#161616]">{title}</p>
      <p className="text-xs text-[#54595F] mt-0.5">{subtitle}</p>
    </div>
  );
}
