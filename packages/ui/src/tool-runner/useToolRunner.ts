'use client';

import { arrayMove } from '@dnd-kit/sortable';
import {
  type FileKind,
  type PdfErrorCode,
  type Progress,
  type ToolDefinition,
  initialOptions,
  outputFileName,
  sniffFile,
  toPdfClientError,
  validateSelection,
} from '@repo/pdf-client';
import { runTool } from '@repo/pdf-client/runner';
import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { BRAND } from '../brand';

export interface FileEntry {
  id: string;
  file: File;
  kind: FileKind | null;
}

export interface RunnerError {
  code: PdfErrorCode;
  /** The file that caused the error, when there is one. */
  fileId?: string;
  fileName?: string;
}

export interface RunnerResult {
  url: string;
  fileName: string;
  size: number;
}

export interface RunnerState {
  files: FileEntry[];
  options: Record<string, unknown>;
  status: 'idle' | 'running' | 'done';
  progress: Progress | null;
  error: RunnerError | null;
  result: RunnerResult | null;
}

export type RunFn = typeof runTool;

type Action =
  | { type: 'add'; entries: FileEntry[]; rejected: FileEntry | null }
  | { type: 'remove'; id: string }
  | { type: 'move'; id: string; delta: -1 | 1 }
  | { type: 'reorder'; activeId: string; overId: string }
  | { type: 'option'; name: string; value: unknown }
  | { type: 'start' }
  | { type: 'progress'; progress: Progress }
  | { type: 'done'; result: RunnerResult }
  | { type: 'fail'; error: RunnerError }
  | { type: 'reset' };

function reducer(state: RunnerState, action: Action): RunnerState {
  switch (action.type) {
    case 'add':
      return {
        ...state,
        files: [...state.files, ...action.entries],
        error: action.rejected
          ? { code: 'UNSUPPORTED_TYPE', fileName: action.rejected.file.name }
          : null,
      };
    case 'remove':
      return {
        ...state,
        files: state.files.filter((f) => f.id !== action.id),
        error: state.error?.fileId === action.id ? null : state.error,
      };
    case 'move': {
      const from = state.files.findIndex((f) => f.id === action.id);
      const to = from + action.delta;
      if (from === -1 || to < 0 || to >= state.files.length) return state;
      return { ...state, files: arrayMove(state.files, from, to) };
    }
    case 'reorder': {
      const from = state.files.findIndex((f) => f.id === action.activeId);
      const to = state.files.findIndex((f) => f.id === action.overId);
      if (from === -1 || to === -1) return state;
      return { ...state, files: arrayMove(state.files, from, to) };
    }
    case 'option':
      return { ...state, options: { ...state.options, [action.name]: action.value } };
    case 'start':
      return { ...state, status: 'running', progress: null, error: null };
    case 'progress':
      return { ...state, progress: action.progress };
    case 'done':
      return { ...state, status: 'done', progress: null, result: action.result };
    case 'fail':
      return { ...state, status: 'idle', progress: null, error: action.error };
    case 'reset':
      return { ...state, files: [], status: 'idle', progress: null, error: null, result: null };
  }
}

let nextId = 0;
const newId = () => `file-${++nextId}`;

/**
 * State and actions for one tool's page: the selected files (in order), the options, and the
 * run lifecycle idle -> running -> done. A failed run goes back to idle with an error.
 * Options without a default start empty and must pass the schema before the run can start.
 */
export function useToolRunner(tool: ToolDefinition, run: RunFn = runTool) {
  const [state, dispatch] = useReducer(reducer, undefined, (): RunnerState => ({
    files: [],
    options: initialOptions(tool),
    status: 'idle',
    progress: null,
    error: null,
    result: null,
  }));
  const abortRef = useRef<AbortController | null>(null);

  // Free the result's memory when it is replaced or the page goes away.
  const resultUrl = state.result?.url;
  useEffect(() => {
    if (!resultUrl) return;
    return () => URL.revokeObjectURL(resultUrl);
  }, [resultUrl]);
  useEffect(() => () => abortRef.current?.abort(), []);

  const selectionError = useMemo(
    () =>
      validateSelection(
        tool,
        state.files.map((f) => ({ size: f.file.size, kind: f.kind })),
      ),
    [tool, state.files],
  );

  // Options that fail the schema, in schema order. The action stays disabled until there are none.
  const invalidOptions = useMemo(() => {
    const result = tool.options.safeParse(state.options);
    if (result.success) return [];
    return [...new Set(result.error.issues.map((issue) => String(issue.path[0])))];
  }, [tool, state.options]);

  const addFiles = useCallback(
    async (list: readonly File[]) => {
      const sniffed = await Promise.all(
        list.map(async (file) => ({ id: newId(), file, kind: await sniffFile(file) })),
      );
      const accepted = sniffed.filter((e) => e.kind !== null && tool.input.accept.includes(e.kind));
      const rejected = sniffed.find((e) => !accepted.includes(e)) ?? null;
      dispatch({ type: 'add', entries: accepted, rejected });
    },
    [tool],
  );

  const start = useCallback(async () => {
    if (selectionError || invalidOptions.length > 0) return;
    const controller = new AbortController();
    abortRef.current = controller;
    dispatch({ type: 'start' });
    const files = state.files;
    try {
      const bytes = await run(
        tool.id,
        files.map((f) => f.file),
        state.options,
        {
          signal: controller.signal,
          producer: BRAND.name,
          onProgress: (progress) => dispatch({ type: 'progress', progress }),
        },
      );
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const requested = state.options.outputName;
      dispatch({
        type: 'done',
        result: {
          url: URL.createObjectURL(blob),
          fileName: outputFileName(tool.output, typeof requested === 'string' ? requested : ''),
          size: blob.size,
        },
      });
    } catch (e) {
      const error = toPdfClientError(e);
      const file = error.fileIndex === undefined ? undefined : files[error.fileIndex];
      dispatch({
        type: 'fail',
        error: file
          ? { code: error.code, fileId: file.id, fileName: file.file.name }
          : { code: error.code },
      });
    } finally {
      abortRef.current = null;
    }
  }, [invalidOptions, run, selectionError, state.files, state.options, tool]);

  return {
    state,
    selectionError,
    invalidOptions,
    addFiles,
    start,
    cancel: useCallback(() => abortRef.current?.abort(), []),
    remove: useCallback((id: string) => dispatch({ type: 'remove', id }), []),
    move: useCallback((id: string, delta: -1 | 1) => dispatch({ type: 'move', id, delta }), []),
    reorder: useCallback(
      (activeId: string, overId: string) => dispatch({ type: 'reorder', activeId, overId }),
      [],
    ),
    setOption: useCallback(
      (name: string, value: unknown) => dispatch({ type: 'option', name, value }),
      [],
    ),
    reset: useCallback(() => dispatch({ type: 'reset' }), []),
  };
}
