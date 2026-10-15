'use client';

import { CircleCheck, Download, RotateCcw } from 'lucide-react';
import { Button } from '../components/button';
import { formatMegabytes } from '../lib/format';
import { useLocale, useTranslations } from '../lib/i18n';
import type { RunnerResult } from './useToolRunner';

export function ResultPanel({ result, onReset }: { result: RunnerResult; onReset: () => void }) {
  const t = useTranslations('ui');
  const locale = useLocale();
  return (
    <div className="flex min-h-64 flex-col items-center justify-center gap-4 rounded-xl border bg-card p-8 text-center">
      <CircleCheck aria-hidden className="size-10 text-success" />
      <p className="text-lg font-semibold" role="status">
        {t('result.ready')}
      </p>
      <p className="text-sm text-muted-foreground">
        <bdi>{result.fileName}</bdi> · {formatMegabytes(result.size, locale)}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button asChild size="lg">
          <a href={result.url} download={result.fileName}>
            <Download aria-hidden />
            {t('result.download')}
          </a>
        </Button>
        <Button type="button" variant="outline" size="lg" onClick={onReset}>
          <RotateCcw aria-hidden />
          {t('result.startOver')}
        </Button>
      </div>
    </div>
  );
}
