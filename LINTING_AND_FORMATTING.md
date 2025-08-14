# Linting and Formatting Setup

This project uses ESLint and Prettier for code quality and consistent formatting.

## Available Scripts

### Linting

- `yarn lint` - Check for linting errors and warnings
- `yarn lint:fix` - Automatically fix linting errors that can be auto-fixed

### Formatting

- `yarn format` - Format all files using Prettier
- `yarn format:check` - Check if files are properly formatted without making changes

### Type Checking

- `yarn type-check` - Run TypeScript type checking

## Configuration Files

### ESLint Configuration (`.eslintrc.js`)

The ESLint configuration includes:

- **Expo configuration** - React Native and Expo specific rules
- **TypeScript support** - TypeScript-specific linting rules
- **React rules** - React and React Hooks best practices
- **React Native rules** - Mobile-specific linting rules
- **Prettier integration** - Prevents conflicts between ESLint and Prettier

### Prettier Configuration (`.prettierrc`)

Prettier is configured with:

- Single quotes for strings
- Semicolons at the end of statements
- 2 spaces for indentation
- 80 character line width
- Trailing commas for cleaner git diffs

### Ignore Files

- `.eslintignore` - Files and directories to exclude from linting
- `.prettierignore` - Files and directories to exclude from formatting

## Common Issues and Solutions

### 1. Unused Variables

```typescript
// ❌ Error
const unusedVar = 'something';

// ✅ Fix: Remove or use the variable
const usedVar = 'something';
console.log(usedVar);

// ✅ Fix: Prefix with underscore for intentionally unused parameters
const handleClick = (_event: React.MouseEvent) => {
  // Handle click without using event
};
```

### 2. Console Statements

```typescript
// ❌ Warning
console.log('Debug info');

// ✅ Fix: Remove in production or use proper logging
// Use a logging library or remove console statements
```

### 3. TypeScript `any` Types

```typescript
// ❌ Warning
const data: any = getData();

// ✅ Fix: Use proper types
const data: UserData = getData();
```

### 4. Object Property Shorthand

```typescript
// ❌ Error
const obj = {
  name: name,
  age: age,
};

// ✅ Fix: Use shorthand
const obj = {
  name,
  age,
};
```

### 5. String Concatenation

```typescript
// ❌ Error
const message = 'Hello ' + name + '!';

// ✅ Fix: Use template literals
const message = `Hello ${name}!`;
```

## IDE Integration

### VS Code

Install these extensions for the best experience:

- ESLint
- Prettier - Code formatter

Add to your VS Code settings:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

### Other IDEs

- **WebStorm/IntelliJ**: Enable ESLint and Prettier plugins
- **Atom**: Install `linter-eslint` and `prettier-atom` packages
- **Sublime Text**: Install `SublimeLinter-eslint` and `JsPrettier` packages

## Pre-commit Hooks (Optional)

To automatically run linting and formatting before commits, you can set up pre-commit hooks:

1. Install husky and lint-staged:

```bash
yarn add -D husky lint-staged
```

2. Add to `package.json`:

```json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged"
    }
  },
  "lint-staged": {
    "*.{js,jsx,ts,tsx}": ["eslint --fix", "prettier --write"]
  }
}
```

## Troubleshooting

### ESLint Configuration Issues

If you encounter ESLint configuration errors:

1. Make sure all dependencies are installed: `yarn install`
2. Clear ESLint cache: `yarn lint --cache-location .eslintcache`
3. Check for conflicting configurations in parent directories

### Prettier Conflicts

If Prettier and ESLint conflict:

1. Make sure `eslint-config-prettier` is last in the extends array
2. Ensure `prettier` plugin is included in ESLint plugins
3. Check that `.prettierrc` configuration is valid

### Performance Issues

For large projects, you can:

1. Use ESLint cache: `yarn lint --cache`
2. Run linting only on changed files
3. Use `--max-warnings 0` to treat warnings as errors

## Best Practices

1. **Run linting before committing** - Use `yarn lint` to catch issues early
2. **Format code regularly** - Use `yarn format` to maintain consistent style
3. **Fix auto-fixable issues** - Use `yarn lint:fix` for quick fixes
4. **Address warnings** - Don't ignore warnings, they often indicate potential issues
5. **Use proper TypeScript types** - Avoid `any` types when possible
6. **Remove unused code** - Keep your codebase clean and maintainable

## Customization

### Adding New Rules

To add custom ESLint rules, modify `.eslintrc.js`:

```javascript
rules: {
  // Your custom rules here
  'your-custom-rule': 'error'
}
```

### Modifying Prettier Settings

To change formatting preferences, update `.prettierrc`:

```json
{
  "printWidth": 100,
  "tabWidth": 4,
  "singleQuote": false
}
```

### Ignoring Specific Files

Add patterns to `.eslintignore` or `.prettierignore`:

```
# Ignore generated files
dist/
build/
*.min.js
```

## Continuous Integration

For CI/CD pipelines, add these steps:

```yaml
- name: Install dependencies
  run: yarn install

- name: Check formatting
  run: yarn format:check

- name: Run linting
  run: yarn lint

- name: Type check
  run: yarn type-check
```

This ensures code quality is maintained across all environments.
