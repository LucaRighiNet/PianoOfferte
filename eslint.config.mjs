import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['.next/**', 'node_modules/**', 'src/generated/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // Una funzione vuota o un corpo non implementato deve essere un errore,
      // non una svista che passa la revisione.
      'no-empty-function': 'off',
      '@typescript-eslint/no-empty-function': 'error',
      'no-empty': ['error', { allowEmptyCatch: false }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'error',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'always'],
      'no-throw-literal': 'error',
    },
  },
);
