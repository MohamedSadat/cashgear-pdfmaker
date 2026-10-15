'use client';

import type { Progress as ProgressValue } from '@repo/pdf-client';
import { LoaderCircle } from 'lucide-react';
import { Button } from '../components/button';
import { Progress } from '../components/progress';
import { useTranslations } from '../lib/i18n';

interface RunPanelProps {
  toolId: string;
  running: boolean;
  progress: ProgressValue | null;
  disabled: boolean;
  /** Shown under the button while the selection is not ready (e.g. "Add at least 2 files"). */
  hint?: string | undefined;
  onRun: () => void;
  onCancel: () => void;
}

function percent(progress: ProgressValue | null): number {
  if (!progress) return 5;
  if (progress.phase === 'read') return 5;
  if (progress.phase === 'save') return 95;
  return 5 + Math.round((progress.current / Math.max(progress.total, 1)) * 85);
}

export function RunPanel({
  toolId,
  running,
  progress,
  disabled,
  hint,
  onRun,
  onCancel,
}: RunPanelProps) {
  const t = useTranslations('ui');

  if (running) {
    const status =
      progress?.phase === 'process'
        ? t('run.processing', { current: progress.current, total: progress.total })
        : progress?.phase === 'save'
          ? t('run.saving')
          : t('run.reading');
    return (
      <div className="flex flex-col gap-3">
        <Progress value={percent(progress)} aria-label={status} />
        <div className="flex items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-sm text-muted-foreground" aria-live="polite">
            <LoaderCircle aria-hidden className="size-4 animate-spin" />
            {status}
          </p>
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            {t('run.cancel')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-stretch gap-2 sm:items-start">
      <Button type="button" size="lg" disabled={disabled} onClick={onRun}>
        {t(`tools.${toolId}.action`)}
      </Button>
      {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
    </div>
  );
}
