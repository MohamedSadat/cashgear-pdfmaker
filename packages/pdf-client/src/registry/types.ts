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
  kind: FileKind;
  /** File name (without extension) used when the user gives none. */
  defaultBaseName: string;
}

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
  /** Ids of tools linked from this tool's page. */
  related: readonly string[];
  /** lucide-react icon name. */
  icon: string;
}

export function defineTool<const T extends ToolDefinition>(tool: T): T {
  return tool;
}
