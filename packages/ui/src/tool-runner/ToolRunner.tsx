'use client';

import type { ToolDefinition } from '@repo/pdf-client';
import { CircleAlert } from 'lucide-react';
import { Alert, AlertDescription } from '../components/alert';
import { formatMegabytes } from '../lib/format';
import { useLocale, useTranslations } from '../lib/i18n';
import { Dropzone } from './Dropzone';
import { FileList } from './FileList';
import { OptionsForm } from './OptionsForm';
import { ResultPanel } from './ResultPanel';
import { RunPanel } from './RunPanel';
import { type RunFn, type RunnerError, useToolRunner } from './useToolRunner';

interface ToolRunnerProps {
  tool: ToolDefinition;
  /** Injected in tests; defaults to the Web Worker runner. */
  run?: RunFn;
}

/** The interactive part of every browser tool page, driven entirely by the registry entry. */
export function ToolRunner({ tool, run }: ToolRunnerProps) {
  const t = useTranslations('ui');
  const locale = useLocale();
  const runner = useToolRunner(tool, run);
  const { files, status, error, result, progress, options } = runner.state;
  const running = status === 'running';

  if (status === 'done' && result) {
    return <ResultPanel result={result} onReset={runner.reset} />;
  }

  const params = {
    minFiles: tool.input.minFiles,
    maxFiles: tool.input.maxFiles,
    maxSize: formatMegabytes(tool.input.maxTotalBytes, locale),
  };
  const message = (e: RunnerError) =>
    t(`errors.${e.code}`, { ...params, fileName: e.fileName ?? '' });

  const selection = runner.selectionError;
  const shownError: RunnerError | null =
    error ?? (selection && selection.code !== 'TOO_FEW_FILES' ? { code: selection.code } : null);
  // An empty required option is not an error yet: the hint under the action asks for it.
  const missingOption = runner.invalidOptions.find(
    (name) => String(options[name] ?? '').trim() === '',
  );
  const hint =
    selection?.code === 'TOO_FEW_FILES' && files.length > 0
      ? message({ code: 'TOO_FEW_FILES' })
      : missingOption !== undefined
        ? t(`tools.${tool.id}.options.${missingOption}.required`)
        : undefined;

  return (
    <div className="flex flex-col gap-4">
      {files.length === 0 ? (
        <Dropzone tool={tool} onFiles={runner.addFiles} />
      ) : (
        <>
          <FileList
            files={files}
            ordered={tool.input.ordered}
            disabled={running}
            highlightId={error?.fileId}
            onMove={runner.move}
            onReorder={runner.reorder}
            onRemove={runner.remove}
          />
          {tool.input.maxFiles > 1 && (
            <Dropzone tool={tool} onFiles={runner.addFiles} disabled={running} compact />
          )}
        </>
      )}

      {shownError && (
        <Alert variant="destructive">
          <CircleAlert aria-hidden />
          <AlertDescription>{message(shownError)}</AlertDescription>
        </Alert>
      )}

      {files.length > 0 && (
        <>
          <OptionsForm
            tool={tool}
            values={options}
            invalid={runner.invalidOptions}
            onChange={runner.setOption}
            disabled={running}
          />
          <RunPanel
            toolId={tool.id}
            running={running}
            progress={progress}
            disabled={selection !== null || runner.invalidOptions.length > 0}
            hint={hint}
            onRun={() => void runner.start()}
            onCancel={runner.cancel}
          />
        </>
      )}
    </div>
  );
}
