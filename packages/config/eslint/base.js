import js from '@eslint/js';
import globals from 'globals';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

// Physical (left/right) Tailwind utilities break RTL layouts. Use the logical ones instead:
// ms-/me-, ps-/pe-, start-/end-, border-s/e, rounded-s/e, text-start/end, float-start/end.
const PHYSICAL_CLASS =
  '/(^|\\s|:)-?(m[lr]|p[lr]|left|right|border-[lr]|rounded-[lr]|rounded-[tb][lr]|text-(left|right)|float-(left|right)|scroll-[mp][lr])(-|\\s|$)/';
const RTL_MESSAGE =
  'Physical left/right Tailwind class: use the logical form (ms-, me-, ps-, pe-, start-, end-, text-start, border-s, rounded-s) so Arabic (RTL) layouts work.';

/** Rejects physical direction classes in className, cn(), cva() and clsx(). */
export const rtlGuard = {
  name: 'repo/rtl-guard',
  files: ['**/*.{ts,tsx,js,jsx}'],
  rules: {
    'no-restricted-syntax': [
      'error',
      {
        selector: `JSXAttribute[name.name='className'] Literal[value=${PHYSICAL_CLASS}]`,
        message: RTL_MESSAGE,
      },
      {
        selector: `JSXAttribute[name.name='className'] TemplateElement[value.raw=${PHYSICAL_CLASS}]`,
        message: RTL_MESSAGE,
      },
      {
        selector: `CallExpression[callee.name=/^(cn|cva|clsx)$/] Literal[value=${PHYSICAL_CLASS}]`,
        message: RTL_MESSAGE,
      },
    ],
  },
};

/** Rules shared by every TypeScript package, on top of the recommended sets. */
export const commonRules = {
  name: 'repo/common',
  rules: {
    '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
    '@typescript-eslint/no-unused-vars': [
      'error',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' },
    ],
  },
};

export const ignores = {
  name: 'repo/ignores',
  ignores: ['**/dist/**', '**/.next/**', '**/coverage/**', '**/.turbo/**', '**/next-env.d.ts'],
};

export default defineConfig(
  ignores,
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    name: 'repo/globals',
    languageOptions: { globals: { ...globals.es2023 } },
  },
  commonRules,
  rtlGuard,
);
