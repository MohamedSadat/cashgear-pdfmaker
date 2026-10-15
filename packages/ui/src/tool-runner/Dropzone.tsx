'use client';

import { type ToolDefinition, acceptAttribute } from '@repo/pdf-client';
import { Plus } from 'lucide-react';
import { type DragEvent, useId, useState } from 'react';
import { buttonVariants } from '../components/button';
import { useTranslations } from '../lib/i18n';
import { cn } from '../lib/utils';
import { DropzoneFace, dropzoneClass } from './DropzoneShell';

interface DropzoneProps {
  tool: Pick<ToolDefinition, 'input'>;
  onFiles: (files: File[]) => void;
  disabled?: boolean;
  /** Small "Add more files" button once some files are selected. */
  compact?: boolean;
}

export function Dropzone({ tool, onFiles, disabled = false, compact = false }: DropzoneProps) {
  const t = useTranslations('ui');
  const inputId = useId();
  const [dragging, setDragging] = useState(false);

  const onDragOver = (e: DragEvent) => {
    e.preventDefault();
    if (!disabled) setDragging(true);
  };
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (!disabled) onFiles(Array.from(e.dataTransfer.files));
  };

  const input = (
    <input
      id={inputId}
      type="file"
      multiple={tool.input.maxFiles > 1}
      accept={acceptAttribute(tool.input.accept)}
      disabled={disabled}
      className="sr-only"
      onChange={(e) => {
        onFiles(Array.from(e.target.files ?? []));
        e.target.value = '';
      }}
    />
  );

  if (compact) {
    return (
      <label
        htmlFor={inputId}
        onDragOver={onDragOver}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          buttonVariants({ variant: 'outline' }),
          'cursor-pointer self-start focus-within:ring-2 focus-within:ring-ring',
          dragging && 'border-primary',
          disabled && 'pointer-events-none opacity-50',
        )}
      >
        <Plus aria-hidden />
        {t('dropzone.addMore')}
        {input}
      </label>
    );
  }

  return (
    <label
      htmlFor={inputId}
      onDragOver={onDragOver}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={cn(
        dropzoneClass,
        'cursor-pointer hover:border-primary focus-within:ring-2 focus-within:ring-ring',
        dragging && 'border-primary bg-primary/5',
      )}
    >
      <DropzoneFace tool={tool} />
      {input}
    </label>
  );
}
