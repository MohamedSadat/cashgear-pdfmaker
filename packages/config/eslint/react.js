import { defineConfig } from 'eslint/config';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import base from './base.js';

export default defineConfig(
  ...base,
  reactHooks.configs.flat.recommended,
  jsxA11y.flatConfigs.recommended,
  {
    name: 'repo/react-globals',
    languageOptions: { globals: { ...globals.browser } },
  },
);
