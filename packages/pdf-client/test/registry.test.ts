import { describe, expect, it } from 'vitest';
import { operations } from '../src/engine/index';
import { allTools as tools, getToolById, getToolBySlug, webTools } from '../src/registry/index';

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
    expect(() => tool.options.parse({})).not.toThrow();
    expect(getToolBySlug(tool.slug)).toBe(tool);
  });

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
