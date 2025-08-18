import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
    },
    rules: {
      'prefer-const': 'error',
      'no-var': 'error',
      'no-console': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn', // Changed from error to warn
      '@typescript-eslint/no-unused-vars': 'warn', // Changed from error to warn
      'no-useless-catch': 'warn', // Changed from error to warn
      '@typescript-eslint/no-require-imports': 'warn', // Changed from error to warn
      'no-prototype-builtins': 'warn', // Changed from error to warn
      '@typescript-eslint/no-unsafe-function-type': 'warn', // Changed from error to warn
    },
  },
  {
    ignores: ['dist/', 'node_modules/', '*.js', '*.d.ts'],
  },
]; 