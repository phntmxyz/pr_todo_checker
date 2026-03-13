import eslint from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import github from 'eslint-plugin-github'
import jest from 'eslint-plugin-jest'
import prettierRecommended from 'eslint-plugin-prettier/recommended'

const githubFlatConfigs = github.getFlatConfigs()

export default tseslint.config(
  // Global ignores (replaces .eslintignore)
  {
    ignores: [
      'lib/',
      'dist/',
      'node_modules/',
      'coverage/',
      '*.json',
      'eslint.config.mjs'
    ]
  },

  // Base ESLint recommended
  eslint.configs.recommended,

  // TypeScript-ESLint recommended
  ...tseslint.configs.recommended,

  // GitHub recommended (flat config)
  githubFlatConfigs.recommended,

  // Jest recommended — scoped to test files
  {
    files: ['__test__/**/*.ts', '**/*.test.ts'],
    ...jest.configs['flat/recommended']
  },

  // Prettier (must be last among formatting configs)
  prettierRecommended,

  // TypeScript parser options for type-checked rules
  {
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname
      },
      globals: {
        ...globals.node,
        ...globals.es2021,
        Atomics: 'readonly',
        SharedArrayBuffer: 'readonly'
      }
    }
  },

  // Custom rule overrides
  {
    rules: {
      camelcase: 'off',
      'eslint-comments/no-use': 'off',
      'eslint-comments/no-unused-disable': 'off',
      'i18n-text/no-en': 'off',
      'import/no-namespace': 'off',
      'import/no-unresolved': 'off',
      'no-console': 'off',
      'no-unused-vars': 'off',
      semi: 'off',

      // Prettier
      'prettier/prettier': 'error',

      // TypeScript-ESLint rules
      '@typescript-eslint/array-type': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/ban-ts-comment': 'error',
      '@typescript-eslint/consistent-type-assertions': 'error',
      '@typescript-eslint/explicit-member-accessibility': [
        'error',
        { accessibility: 'no-public' }
      ],
      '@typescript-eslint/explicit-function-return-type': [
        'error',
        { allowExpressions: true }
      ],
      '@typescript-eslint/no-array-constructor': 'error',
      '@typescript-eslint/no-empty-object-type': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-extraneous-class': 'error',
      '@typescript-eslint/no-for-in-array': 'error',
      '@typescript-eslint/no-inferrable-types': 'error',
      '@typescript-eslint/no-misused-new': 'error',
      '@typescript-eslint/no-namespace': 'error',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/no-require-imports': 'error',
      '@typescript-eslint/no-unnecessary-qualifier': 'error',
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/no-useless-constructor': 'error',
      '@typescript-eslint/prefer-for-of': 'warn',
      '@typescript-eslint/prefer-function-type': 'warn',
      '@typescript-eslint/prefer-includes': 'error',
      '@typescript-eslint/prefer-string-starts-ends-with': 'error',
      '@typescript-eslint/promise-function-async': 'error',
      '@typescript-eslint/require-array-sort-compare': 'error',
      '@typescript-eslint/restrict-plus-operands': 'error',
      '@typescript-eslint/unbound-method': 'error'
    }
  }
)
