import type { z } from 'zod';
import type { FileKind } from '../sniff';

/** Where a tool runs. Browser tools never upload; server tools go through the job API. */
export type ToolRuntime = 'browser' | 'server' | 'both';

export type ToolCategory = 'organize' | 'optimize' | 'convert' | 'edit' | 'security';

export interface ToolInput {
  accept: readonly FileKind[];
  minFiles: number;
  maxFiles: number;
  /** Combined size limit for all inputs, in bytes. */
  maxTotalBytes: number;
  /** True when the order of the inputs matters (the UI then offers reordering). */
  ordered: boolean;
}

export interface ToolOutput {
  /** Kind of the file a run returns, or of each file when a run returns several. */
  kind: FileKind;
  /** File name (without extension) used when the user gives none. */
  defaultBaseName: string;
  /**
   * For tools whose run can return several files. They download as one ZIP, named like a single
   * output but with this default, holding `<base>-1.<ext>`, `<base>-2.<ext>` and so on.
   */
  zipBaseName?: string;
}

/**
 * For each conditional option, the values other options must have for it to apply:
 * `{ every: { mode: ['every'] } }` shows `every` only while `mode` is 'every'.
 */
export type OptionConditions = Readonly<
  Record<string, Readonly<Record<string, readonly unknown[]>>>
>;

/**
 * One entry per tool. Routes, the sitemap, the home page, and later the desktop menu and the API
 * validation are generated from these entries. Page copy lives in the message files under
 * `tools.<id>`, not here.
 */
export interface ToolDefinition<O extends z.ZodObject = z.ZodObject> {
  /** Stable internal id and i18n namespace (`tools.<id>`). */
  id: string;
  /** URL segment. Permanent once published: changing it breaks search rankings. */
  slug: string;
  runtime: ToolRuntime;
  category: ToolCategory;
  input: ToolInput;
  output: ToolOutput;
  /** Validated in the UI, in the worker, and (later) by the API. */
  options: O;
  /**
   * Options that apply only for some values of other options. The form hides an option that
   * doesn't apply, and validation and the run use its initial value (see `effectiveOptions`).
   * The schema must still accept that initial value whatever the other options are.
   */
  conditionalOptions?: OptionConditions;
  /** Ids of tools linked from this tool's page. */
  related: readonly string[];
  /** lucide-react icon name. */
  icon: string;
}

export function defineTool<const T extends ToolDefinition>(tool: T): T {
  return tool;
}
