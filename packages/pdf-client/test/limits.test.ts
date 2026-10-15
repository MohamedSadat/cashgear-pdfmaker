import { describe, expect, it } from 'vitest';
import { BROWSER_MAX_TOTAL_BYTES, MIB, validateSelection } from '../src/limits';

const tool = {
  input: {
    accept: ['pdf'],
    minFiles: 2,
    maxFiles: 3,
    maxTotalBytes: BROWSER_MAX_TOTAL_BYTES,
    ordered: true,
  },
} as const;

const pdf = (size = MIB) => ({ size, kind: 'pdf' as const });

describe('validateSelection', () => {
  it('accepts a valid selection', () => {
    expect(validateSelection(tool, [pdf(), pdf()])).toBeNull();
  });

  it('flags the first unsupported file with its index', () => {
    const error = validateSelection(tool, [
      pdf(),
      { size: 10, kind: null },
      { size: 10, kind: 'png' },
    ]);
    expect(error?.code).toBe('UNSUPPORTED_TYPE');
    expect(error?.fileIndex).toBe(1);
  });

  it('flags too many files', () => {
    expect(validateSelection(tool, [pdf(), pdf(), pdf(), pdf()])?.code).toBe('TOO_MANY_FILES');
  });

  it('flags a combined size over the limit', () => {
    expect(validateSelection(tool, [pdf(100 * MIB), pdf(51 * MIB)])?.code).toBe('TOO_LARGE');
  });

  it('reports too few files last', () => {
    expect(validateSelection(tool, [pdf()])?.code).toBe('TOO_FEW_FILES');
    expect(validateSelection(tool, [])?.code).toBe('TOO_FEW_FILES');
  });
});
