module.exports = {
  root: true,
  extends: ['expo', 'prettier'],
  parser: '@typescript-eslint/parser',
  plugins: [
    '@typescript-eslint',
    'react',
    'react-hooks',
    'react-native',
    'prettier',
    'unused-imports',
  ],
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  env: {
    'react-native/react-native': true,
    es6: true,
    node: true,
  },
  rules: {
    // Prettier integration - make it a warning instead of error
    'prettier/prettier': 'warn',
    // Disable non-existent Expo rule
    'expo/use-dom-exports': 'off',
    // TypeScript rules - make them more lenient
    '@typescript-eslint/no-unused-vars': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'off', // Allow 'any' type
    '@typescript-eslint/no-non-null-assertion': 'off', // Allow non-null assertions
    'unused-imports/no-unused-imports': 'warn', // Change from error to warn
    'unused-imports/no-unused-vars': 'off', // Turn off unused vars checking

    // React rules - make them more lenient
    'react/prop-types': 'off',
    'react/react-in-jsx-scope': 'off',
    'react-hooks/rules-of-hooks': 'error', // Keep this as it's important
    'react-hooks/exhaustive-deps': 'off', // Turn off exhaustive deps warning

    // React Native specific rules - make them more lenient
    'react-native/no-unused-styles': 'warn', // Change from error to warn
    'react-native/split-platform-components': 'off', // Turn off platform splitting
    'react-native/no-inline-styles': 'off', // Allow inline styles
    'react-native/no-color-literals': 'off', // Allow color literals
    'react-native/no-raw-text': 'off',

    // General rules - make them more lenient
    'no-console': 'off', // Allow console.log
    'no-debugger': 'warn', // Change from error to warn
    'prefer-const': 'warn', // Change from error to warn
    'no-var': 'warn', // Change from error to warn
    'object-shorthand': 'off', // Turn off object shorthand requirement
    'prefer-template': 'off', // Turn off template literal requirement
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
  ignorePatterns: [
    'node_modules/',
    'dist/',
    'build/',
    '*.config.js',
    '*.config.ts',
    'metro.config.js',
    'babel.config.js',
    'supabase/functions/**/*',
  ],
};
