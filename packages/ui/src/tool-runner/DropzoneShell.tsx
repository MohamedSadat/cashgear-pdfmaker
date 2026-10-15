'use client';

import { type ToolDefinition } from '@repo/pdf-client';
import { FileUp } from 'lucide-react';
import { buttonVariants } from '../components/button';
import { formatMegabytes } from '../lib/format';
import { useLocale, useTranslations } from '../lib/i18n';
import { cn } from '../lib/utils';

export const dropzoneClass =
  'flex min-h-64 w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed bg-muted/40 p-8 text-center transition-colors';

/** What the drop area shows. Shared by the live Dropzone and the static loading shell. */
export function DropzoneFace({ tool }: { tool: Pick<ToolDefinition, 'input'> }) {
  const t = useTranslations('ui');
  const locale = useLocale();
  return (
    <>
      <FileUp aria-hidden className="size-10 text-primary" />
      <span className="text-lg font-semibold">{t('dropzone.title')}</span>
      <span className={cn(buttonVariants({ size: 'lg' }), 'pointer-events-none')}>
        {t('dropzone.browse')}
      </span>
      <span className="text-sm text-muted-foreground">
        {t('dropzone.hint', {
          maxFiles: tool.input.maxFiles,
          maxSize: formatMegabytes(tool.input.maxTotalBytes, locale),
        })}
      </span>
    </>
  );
}

/**
 * Static look-alike of the Dropzone, rendered on the server while the tool's JavaScript loads,
 * so the page paints at full size immediately and nothing shifts when the real tool mounts.
 */
export function DropzoneShell({ tool }: { tool: Pick<ToolDefinition, 'input'> }) {
  return (
    <div className={dropzoneClass} aria-busy="true">
      <DropzoneFace tool={tool} />
    </div>
  );
}
