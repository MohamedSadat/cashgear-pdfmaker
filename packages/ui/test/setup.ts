import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// jsdom has no object URLs.
URL.createObjectURL = vi.fn(() => 'blob:test-result');
URL.revokeObjectURL = vi.fn();

afterEach(() => cleanup());
