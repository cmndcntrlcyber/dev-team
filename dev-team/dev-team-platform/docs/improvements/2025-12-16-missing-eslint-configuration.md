# ESLint Configuration Missing Across All Services

**Date Discovered**: 2025-12-16
**Severity**: Medium
**Category**: Build | Configuration | Code Quality

## Summary
The `npm run lint` command fails across multiple services because ESLint cannot find configuration files. Despite ESLint and TypeScript ESLint packages being installed as dev dependencies, no ESLint configuration files (.eslintrc.js, .eslintrc.json, etc.) exist in the service directories. This prevents code quality checks and linting from running.

## Error Details

### Command Executed
```bash
cd /home/cmndcntrl/code/dev-team/dev-team/dev-team-platform && npm run lint
```

### Error Output
```
> @dev-team-platform/api-gateway@1.0.0 lint
> eslint src/**/*.ts

Oops! Something went wrong! :(

ESLint: 8.57.1

ESLint couldn't find a configuration file. To set up a configuration file for this project, please run:

    npm init @eslint/config

ESLint looked for configuration files in /home/cmndcntrl/code/dev-team/dev-team/dev-team-platform/services/api-gateway/src/gateway and its ancestors. If it found none, it then looked in your home directory.

If you think you already have a configuration file or if you need more help, please stop by the ESLint Discord server: https://eslint.org/chat
```

### Additional Error
```
npm error Lifecycle script `lint` failed with error:
npm error workspace @dev-team-platform/types@1.0.0
npm error Missing script: "lint"
```

### Environment
- OS: Linux 6.17.4-76061704-generic
- Node Version: v20.19.3
- npm Version: 10.8.2
- ESLint Version: ^8.0.0 (root package.json)
- TypeScript ESLint: ^6.0.0

### Affected Services
All services that have a "lint" script in package.json:
- api-gateway
- auth-service
- orchestrator-service (likely)
- project-service
- task-service
- All agent services (architecture, backend, devops, frontend, mcp, qa)

### Services with Missing Lint Script
- @dev-team-platform/types (shared/types)

## Root Cause Analysis

The root package.json includes ESLint and TypeScript ESLint plugins as devDependencies:
```json
{
  "devDependencies": {
    "eslint": "^8.0.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0"
  }
}
```

However, no ESLint configuration files exist to tell ESLint:
1. Which rules to enforce
2. Which parser to use (TypeScript)
3. Which plugins to load
4. What files to ignore

Service package.json files have lint scripts like:
```json
{
  "scripts": {
    "lint": "eslint src/**/*.ts"
  }
}
```

But there's no configuration to support these scripts.

## Suggested Fixes

### Option 1: Create Root-Level ESLint Configuration (Recommended)
Create a single ESLint configuration at the root that all workspaces can inherit from.

**Create .eslintrc.js at root:**
```javascript
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    project: './tsconfig.json',
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  env: {
    node: true,
    es2020: true,
  },
  rules: {
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    'no-console': ['warn', { allow: ['warn', 'error'] }],
  },
  ignorePatterns: [
    'dist/',
    'node_modules/',
    '*.js',
    'coverage/',
    '.next/',
  ],
};
```

**Create .eslintignore at root:**
```
node_modules/
dist/
build/
.next/
coverage/
*.config.js
```

### Option 2: Create Per-Service ESLint Configurations
Create an .eslintrc.js in each service directory. This provides more flexibility but requires maintaining multiple config files.

**Template for service .eslintrc.js:**
```javascript
module.exports = {
  extends: '../../.eslintrc.js',  // Extend root config
  parserOptions: {
    project: './tsconfig.json',
  },
  // Service-specific overrides here
};
```

### Option 3: Use ESLint Flat Config (Modern Approach)
Use the new flat config format (eslint.config.js) for ESLint 8+:

```javascript
// eslint.config.js
import js from '@eslint/js';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

export default [
  js.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: true,
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  {
    ignores: ['dist/', 'node_modules/', '.next/', 'coverage/'],
  },
];
```

### Option 4: Add Lint Script to shared/types
The shared/types package is missing a lint script entirely. Add it to package.json:

```json
{
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "clean": "rm -rf dist",
    "lint": "eslint src/**/*.ts",
    "prepublishOnly": "npm run clean && npm run build"
  }
}
```

## Implementation Steps

**Recommended approach (Option 1):**

1. Create root ESLint configuration:
```bash
cat > /home/cmndcntrl/code/dev-team/dev-team/dev-team-platform/.eslintrc.js << 'EOF'
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  env: {
    node: true,
    es2020: true,
  },
  rules: {
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    'no-console': ['warn', { allow: ['warn', 'error'] }],
  },
  ignorePatterns: [
    'dist/',
    'node_modules/',
    'coverage/',
    '.next/',
  ],
};
EOF
```

2. Create .eslintignore:
```bash
cat > /home/cmndcntrl/code/dev-team/dev-team/dev-team-platform/.eslintignore << 'EOF'
node_modules/
dist/
build/
.next/
coverage/
*.config.js
*.d.ts
EOF
```

3. Add lint script to shared/types/package.json:
```bash
# This requires manual edit of the package.json file
```

4. Test ESLint configuration:
```bash
cd /home/cmndcntrl/code/dev-team/dev-team/dev-team-platform
npm run lint
```

5. Fix any linting errors found:
```bash
npm run lint -- --fix
```

## Prevention

1. **Project templates**: Include ESLint configuration in project scaffolding/templates

2. **Documentation**: Add ESLint setup to contribution guidelines:
```markdown
## Code Quality

This project uses ESLint for code quality. Configuration is at the root level.

Run linting:
npm run lint

Auto-fix issues:
npm run lint -- --fix
```

3. **Pre-commit hooks**: Add ESLint to pre-commit hooks using husky:
```json
{
  "scripts": {
    "prepare": "husky install"
  },
  "devDependencies": {
    "husky": "^8.0.0",
    "lint-staged": "^13.0.0"
  }
}
```

```javascript
// .husky/pre-commit
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

npx lint-staged
```

```json
// package.json
{
  "lint-staged": {
    "*.ts": "eslint --fix",
    "*.tsx": "eslint --fix"
  }
}
```

4. **CI/CD integration**: Add linting to GitHub Actions or other CI:
```yaml
- name: Lint code
  run: npm run lint
```

5. **IDE integration**: Document ESLint IDE setup in README:
```markdown
### VS Code ESLint Setup

Install the ESLint extension and add to .vscode/settings.json:
{
  "eslint.validate": ["javascript", "typescript"],
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

## Related Issues

- ESLint deprecation warning: "eslint@8.57.1: This version is no longer supported"
  - Consider upgrading to ESLint 9.x in the future
- Frontend uses next lint which may have its own ESLint config (eslint-config-next)
- Multiple deprecated packages were installed (see npm install warnings)

## Additional Notes

### Frontend Special Case
The frontend using Next.js should use the Next.js ESLint configuration:

```javascript
// frontend/.eslintrc.js
module.exports = {
  extends: ['next/core-web-vitals', '../../.eslintrc.js'],
  parserOptions: {
    project: './tsconfig.json',
  },
};
```

### Workspace Lint Script
Consider adding a workspace-level lint script that handles missing lint scripts gracefully:

```json
{
  "scripts": {
    "lint": "npm run lint --workspaces --if-present"
  }
}
```

The `--if-present` flag will skip workspaces that don't have a lint script instead of failing.

### Rule Recommendations
The suggested rules are fairly lenient. Consider tightening them for production:
- Enable `@typescript-eslint/strict` preset
- Enforce consistent code style with Prettier integration
- Add security-focused rules with eslint-plugin-security
- Add import order rules with eslint-plugin-import
