import type { z } from 'zod';
import { merge } from './tools/merge';
import { split } from './tools/split';
import type { ToolDefinition } from './types';

export * from './types';
export type { MergeOptions } from './tools/merge';
export type { SplitOptions } from './tools/split';

/** Every tool, in the order the home page lists them. */
export const tools = [merge, split] as const satisfies readonly ToolDefinition[];

export type Tool = (typeof tools)[number];
export type ToolId = Tool['id'];

/** `tools` widened to the common type, for code that iterates without caring which tool. */
export const allTools: readonly ToolDefinition[] = tools;

export function getToolById(id: string): ToolDefinition | undefined {
  return allTools.find((t) => t.id === id);
}

/** Like getToolById, for ids known at build time: a typo fails loudly instead of rendering nothing. */
export function requireTool(id: string): ToolDefinition {
  const tool = getToolById(id);
  if (!tool) throw new Error(`Tool "${id}" is missing from the registry`);
  return tool;
}

export function getToolBySlug(slug: string): ToolDefinition | undefined {
  return allTools.find((t) => t.slug === slug);
}

/** Tools that get a page on the website (server-only tools arrive in phase 2). */
export function webTools(): readonly ToolDefinition[] {
  return allTools.filter((t) => t.runtime !== 'server');
}

/**
 * Starting values for a tool's options form: each option's default, or '' for a required option
 * (one without a default) that the user must fill in. The schema blocks the run until they do.
 */
export function initialOptions(tool: Pick<ToolDefinition, 'options'>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(tool.options.shape).map(([name, field]: [string, z.ZodType]) => {
      const parsed = field.safeParse(undefined);
      return [name, parsed.success ? parsed.data : ''];
    }),
  );
}
