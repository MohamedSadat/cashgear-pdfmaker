import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { operations } from '../src/engine/index';
import {
  allTools as tools,
  effectiveOptions,
  getToolById,
  getToolBySlug,
  initialOptions,
  optionApplies,
  requiredOptions,
  webTools,
} from '../src/registry/index';

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

describe('tool registry', () => {
  it('has unique ids and slugs', () => {
    const ids = tools.map((t) => t.id);
    const slugs = tools.map((t) => t.slug);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it.each(tools.map((t) => [t.id, t] as const))('%s is well formed', (_id, tool) => {
    expect(tool.slug).toMatch(SLUG);
    expect(tool.input.minFiles).toBeGreaterThanOrEqual(1);
    expect(tool.input.maxFiles).toBeGreaterThanOrEqual(tool.input.minFiles);
    expect(tool.input.accept.length).toBeGreaterThan(0);
    for (const related of tool.related) expect(getToolById(related)).toBeDefined();
    expect(getToolBySlug(tool.slug)).toBe(tool);
  });

  it.each(tools.map((t) => [t.id, t] as const))('%s starts with usable options', (_id, tool) => {
    const initial = initialOptions(tool);
    expect(Object.keys(initial)).toEqual(Object.keys(tool.options.shape));
    // Only required options may start invalid: they start empty for the user to fill in.
    const issues = tool.options.safeParse(initial).error?.issues ?? [];
    const required = requiredOptions(tool, initial);
    for (const issue of issues) {
      const name = String(issue.path[0]);
      expect(initial[name], name).toBe('');
      expect(required, name).toContain(name);
    }
  });

  it.each(tools.map((t) => [t.id, t] as const))(
    '%s only makes real options conditional on real values',
    (_id, tool) => {
      const shape = tool.options.shape as Record<string, z.ZodType>;
      for (const [name, condition] of Object.entries(tool.conditionalOptions ?? {})) {
        expect(shape, name).toHaveProperty(name);
        for (const [other, values] of Object.entries(condition)) {
          expect(shape, `${name} depends on ${other}`).toHaveProperty(other);
          expect(other, `${name} depends on itself`).not.toBe(name);
          for (const value of values) expect(shape[other]?.safeParse(value).success).toBe(true);
        }
      }
    },
  );

  it('gives every browser-capable tool a browser engine', () => {
    for (const tool of webTools()) {
      if (tool.runtime === 'server') continue;
      expect(operations[tool.id], `engine for ${tool.id}`).toBeTypeOf('function');
    }
  });

  it('returns undefined for unknown tools', () => {
    expect(getToolById('nope')).toBeUndefined();
    expect(getToolBySlug('nope-pdf')).toBeUndefined();
  });
});

describe('conditional options', () => {
  const tool = {
    options: z.object({
      mode: z.enum(['one', 'many']).default('one'),
      page: z.string(),
      count: z.int().min(1).default(2),
    }),
    conditionalOptions: { page: { mode: ['one'] }, count: { mode: ['many'] } },
  };

  it('applies an option only while its condition holds', () => {
    expect(optionApplies(tool, 'page', { mode: 'one' })).toBe(true);
    expect(optionApplies(tool, 'page', { mode: 'many' })).toBe(false);
    expect(optionApplies(tool, 'count', { mode: 'many' })).toBe(true);
    expect(optionApplies(tool, 'mode', { mode: 'many' })).toBe(true);
  });

  it('puts the initial value back for options that do not apply', () => {
    expect(effectiveOptions(tool, { mode: 'many', page: '7', count: '' })).toEqual({
      mode: 'many',
      page: '',
      count: '',
    });
    expect(effectiveOptions(tool, { mode: 'one', page: '7', count: '' })).toEqual({
      mode: 'one',
      page: '7',
      count: 2,
    });
  });

  it('calls an option required when leaving it empty fails the schema', () => {
    const modal = {
      options: z
        .object({
          mode: z.enum(['one', 'many']).default('one'),
          page: z.string().default(''),
          count: z.int().min(1).default(2),
          note: z.string().default(''),
        })
        .superRefine((o, ctx) => {
          if (o.mode === 'one' && o.page === '') ctx.addIssue({ code: 'custom', path: ['page'] });
        }),
      conditionalOptions: { page: { mode: ['one'] }, count: { mode: ['many'] } },
    };
    expect(requiredOptions(modal, { mode: 'one', page: '3', count: 2, note: '' })).toEqual([
      'page',
    ]);
    expect(requiredOptions(modal, { mode: 'many', page: '', count: 2, note: '' })).toEqual([
      'count',
    ]);
  });

  it('treats a tool without conditions as all options applying', () => {
    const plain = { options: z.object({ outputName: z.string().default('') }) };
    expect(optionApplies(plain, 'outputName', {})).toBe(true);
    expect(effectiveOptions(plain, { outputName: 'x', stray: 1 })).toEqual({ outputName: 'x' });
  });
});
