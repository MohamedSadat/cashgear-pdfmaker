import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import { commonRules, ignores, rtlGuard } from './base.js';

// apps/web reaches PDF engines only through @repo/ui (worker + dynamic import), never directly,
// so pdf-lib and pdf.js never end up in a server component or the initial page bundle.
const noEngineImports = {
  name: 'repo/no-engine-imports',
  rules: {
    'no-restricted-imports': [
      'error',
      {
        paths: [
          { name: '@cantoo/pdf-lib', message: 'Use @repo/ui tools; engines run in the worker.' },
          { name: 'pdf-lib', message: 'Use @repo/ui tools; engines run in the worker.' },
          { name: 'pdfjs-dist', message: 'Use @repo/ui tools; engines run in the worker.' },
          {
            name: '@repo/pdf-client/engine',
            message: 'The engine runs in the worker; import from @repo/pdf-client instead.',
          },
        ],
      },
    ],
  },
};

export default defineConfig(
  ...nextVitals,
  ...nextTs,
  ignores,
  commonRules,
  rtlGuard,
  noEngineImports,
  globalIgnores(['.next/**', 'next-env.d.ts']),
);
