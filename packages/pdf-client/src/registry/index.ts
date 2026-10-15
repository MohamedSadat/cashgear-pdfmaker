import { merge } from './tools/merge';
import type { ToolDefinition } from './types';

export * from './types';
export type { MergeOptions } from './tools/merge';

/** Every tool, in the order the home page lists them. */
export const tools = [merge] as const satisfies readonly ToolDefinition[];

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
