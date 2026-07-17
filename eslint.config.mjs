import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default [
  {
    ignores: [
      '.vitepress/**',
      'docs/.vitepress/cache/**',
      'docs/.vitepress/dist/**',
      'docs/.vitepress/.temp/**',
      'docs/main.json',
      'examples/**',
      'node_modules/**',
      'src/util/Voice.js',
    ],
  },
  {
    linterOptions: { reportUnusedDisableDirectives: 'off' },
  },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      globals: globals.node,
      sourceType: 'commonjs',
    },
    rules: {
      'no-template-curly-in-string': 'error',
      'no-unsafe-negation': 'error',
      'getter-return': 'off',
      'no-unused-private-class-members': 'off',
      'no-useless-assignment': 'off',
      'prefer-promise-reject-errors': 'error',
    },
  },
  {
    files: ['**/*.mjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      globals: globals.node,
      sourceType: 'module',
    },
  },
  prettier,
];
