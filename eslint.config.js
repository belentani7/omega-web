import js from '@eslint/js';
import globals from 'globals';

export default [
  {
    ignores: ['dist/**', 'node_modules/**', 'static/**', 'coverage/**', 'src/**', 'galaxias/core/galaxia-core.js', 'galaxias/core/omega-galaxias.js', 'galaxias/core/galaxia-i18n.js']
  },
  js.configs.recommended,
  {
    files: ['js/**/*.js'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: { ...globals.browser }
    },
    rules: {
      'no-unused-vars': ['error', { args: 'after-used', caughtErrors: 'none' }],
      eqeqeq: ['error', 'smart'],
      'no-var': 'error',
      'prefer-const': 'error',
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }]
    }
  },
  {
    files: ['tools/**/*.mjs', 'tests/**/*.mjs'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: { ...globals.node }
    },
    rules: {
      'no-unused-vars': ['error', { args: 'after-used', caughtErrors: 'none' }],
      eqeqeq: ['error', 'smart'],
      'prefer-const': 'error'
    }
  },
  {
    files: ['galaxias/core/galaxia.js'],
    languageOptions: {
      ecmaVersion: 2019,
      sourceType: 'script',
      globals: { ...globals.browser }
    },
    rules: {
      eqeqeq: ['error', 'smart'],
      'no-unused-vars': ['error', { args: 'after-used', caughtErrors: 'none' }]
    }
  }
];
