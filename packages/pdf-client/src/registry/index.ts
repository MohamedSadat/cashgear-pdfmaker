import { z } from 'zod';
import { merge } from './tools/merge';
import { split } from './tools/split';
import type { ToolDefinition } from './types';

export * from './types';
export type { MergeOptions } from './tools/merge';
export type { SplitMode, SplitOptions } from './tools/split';

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

type ConditionalTool = Pick<ToolDefinition, 'options' | 'conditionalOptions'>;

/** False when `name` is a conditional option whose condition the current values don't meet. */
export function optionApplies(
  tool: ConditionalTool,
  name: string,
  values: Readonly<Record<string, unknown>>,
): boolean {
  const condition = tool.conditionalOptions?.[name];
  if (!condition) return true;
  return Object.entries(condition).every(([other, allowed]) => allowed.includes(values[other]));
}

/**
 * The values to validate and run with: the current value of each option that applies, and the
 * initial value of each that doesn't, so a hidden field can neither block the run nor reach it.
 */
export function effectiveOptions(
  tool: ConditionalTool,
  values: Readonly<Record<string, unknown>>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(initialOptions(tool)).map(([name, initial]) => [
      name,
      optionApplies(tool, name, values) ? values[name] : initial,
    ]),
  );
}

/** True for options typed into a field (text or number), where '' means "left empty". */
function isTypedIn(field: z.ZodType): boolean {
  let inner = field;
  while (inner instanceof z.ZodDefault || inner instanceof z.ZodOptional) {
    inner = inner.unwrap() as z.ZodType;
  }
  return inner instanceof z.ZodString || inner instanceof z.ZodNumber;
}

/**
 * Text and number options the user must fill in, given the other values: those that apply and
 * that the schema rejects when left empty. Covers options required only in some modes, which a
 * missing default alone can't express.
 */
export function requiredOptions(
  tool: ConditionalTool,
  values: Readonly<Record<string, unknown>>,
): string[] {
  const effective = effectiveOptions(tool, values);
  return Object.entries(tool.options.shape as Record<string, z.ZodType>)
    .filter(([name, field]) => optionApplies(tool, name, values) && isTypedIn(field))
    .map(([name]) => name)
    .filter((name) => {
      const result = tool.options.safeParse({ ...effective, [name]: '' });
      return result.error?.issues.some((issue) => issue.path[0] === name) ?? false;
    });
}
