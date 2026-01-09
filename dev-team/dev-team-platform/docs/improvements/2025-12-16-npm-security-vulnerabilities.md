# npm Security Vulnerabilities and Deprecated Packages

**Date Discovered**: 2025-12-16
**Severity**: Medium
**Category**: Dependencies | Security

## Summary
During dependency installation, npm reported 16 vulnerabilities (6 moderate, 10 high) and multiple deprecated packages. While these don't prevent the build, they pose security risks and should be addressed. Additionally, several packages are using deprecated versions that may have compatibility or support issues.

## Error Details

### Command Executed
```bash
cd /home/cmndcntrl/code/dev-team/dev-team/dev-team-platform && npm install
```

### Warning Output
```
npm warn deprecated inflight@1.0.6: This module is not supported, and leaks memory. Do not use it. Check out lru-cache if you want a good and tested way to coalesce async requests by a key value, which is much more comprehensive and powerful.
npm warn deprecated @humanwhocodes/config-array@0.13.0: Use @eslint/config-array instead
npm warn deprecated rimraf@3.0.2: Rimraf versions prior to v4 are no longer supported
npm warn deprecated @humanwhocodes/object-schema@2.0.3: Use @eslint/object-schema instead
npm warn deprecated glob@7.2.3: Glob versions prior to v9 are no longer supported
npm warn deprecated read-package-json@2.1.2: This package is no longer supported. Please use @npmcli/package-json instead.
npm warn deprecated node-domexception@1.0.0: Use your platform's native DOMException instead
npm warn deprecated querystring@0.2.0: The querystring API is considered Legacy. new code should use the URLSearchParams API instead.
npm warn deprecated domexception@4.0.0: Use your platform's native DOMException instead
npm warn deprecated dependency-check@4.1.0: dependency-check has been deprecated in favor of the knip module
npm warn deprecated abab@2.0.6: Use your platform's native atob() and btoa() methods instead
npm warn deprecated @types/babel__parser@7.1.5: This is a stub types definition. @babel/parser provides its own type definitions, so you do not need this installed.
npm warn deprecated eslint@8.57.1: This version is no longer supported. Please see https://eslint.org/version-support for other options.

16 vulnerabilities (6 moderate, 10 high)

To address issues that do not require attention, run:
  npm audit fix

To address all issues (including breaking changes), run:
  npm audit fix --force
```

### Environment
- OS: Linux 6.17.4-76061704-generic
- Node Version: v20.19.3
- npm Version: 10.8.2
- Location: /home/cmndcntrl/code/dev-team/dev-team/dev-team-platform
- Total Packages: 1444 packages installed

## Root Cause Analysis

### Deprecated Packages

The deprecated packages fall into several categories:

1. **ESLint ecosystem updates** - ESLint 9.x changed its internal structure:
   - `@humanwhocodes/config-array` → Use `@eslint/config-array`
   - `@humanwhocodes/object-schema` → Use `@eslint/object-schema`
   - `eslint@8.57.1` → Upgrade to ESLint 9.x

2. **File system utilities with better alternatives**:
   - `glob@7.2.3` → Upgrade to glob v9+
   - `rimraf@3.0.2` → Upgrade to rimraf v4+
   - `inflight@1.0.6` → Known memory leak, use `lru-cache`

3. **Node.js built-in replacements**:
   - `domexception@4.0.0` / `node-domexception@1.0.0` → Use Node's native DOMException
   - `abab@2.0.6` → Use Node's native atob() and btoa()
   - `querystring@0.2.0` → Use URLSearchParams API

4. **npm ecosystem updates**:
   - `read-package-json@2.1.2` → Use `@npmcli/package-json`

5. **Tool replacements**:
   - `dependency-check@4.1.0` → Use `knip` instead

6. **Type definitions**:
   - `@types/babel__parser@7.1.5` → @babel/parser has built-in types

### Security Vulnerabilities

The npm audit found:
- **6 moderate** severity vulnerabilities
- **10 high** severity vulnerabilities
- **Total: 16** vulnerabilities

These are likely in transitive dependencies rather than direct dependencies.

## Suggested Fixes

### Option 1: Run npm audit fix (Recommended First Step)
Start with the automatic fix for non-breaking changes:

```bash
cd /home/cmndcntrl/code/dev-team/dev-team/dev-team-platform
npm audit fix
```

This will:
- Update packages to secure versions where possible
- Not make breaking changes
- Provide a report of what was fixed

### Option 2: Review and Apply Breaking Changes Selectively
After running `npm audit fix`, review remaining issues:

```bash
npm audit
```

For each high/critical vulnerability, decide whether to:
1. Apply the fix manually
2. Wait for upstream package updates
3. Find alternative packages

### Option 3: Upgrade Major Dependencies
Upgrade packages that have deprecated versions:

**ESLint (Major Update)**
```bash
npm install --save-dev eslint@^9.0.0 --workspaces
npm install --save-dev @eslint/js @eslint/config-array --workspaces
```

Note: This will require updating ESLint configuration to the new flat config format.

**File System Utilities**
```bash
npm install --save-dev glob@^10.0.0 rimraf@^5.0.0 --workspaces
```

**Remove Deprecated Type Definitions**
```bash
npm uninstall @types/babel__parser
```

### Option 4: Audit and Replace Deprecated Packages
Review package.json files and replace deprecated dependencies:

1. Replace `dependency-check` with `knip`:
```bash
npm uninstall dependency-check
npm install --save-dev knip
```

2. Update code using `querystring` to use `URLSearchParams`
3. Update code using `glob` v7 syntax to v10 syntax

## Implementation Steps

**Recommended phased approach:**

### Phase 1: Immediate Security Fixes (Do Now)
```bash
cd /home/cmndcntrl/code/dev-team/dev-team/dev-team-platform

# Run automatic fixes
npm audit fix

# Review what was fixed
npm audit

# Generate detailed report
npm audit --json > audit-report.json
```

### Phase 2: Review Vulnerabilities (Within 1 Week)
```bash
# Get detailed vulnerability information
npm audit

# For each remaining vulnerability:
# 1. Assess the risk in context of how the package is used
# 2. Check if the vulnerability affects your use case
# 3. Decide: update, replace, or accept risk with documentation
```

### Phase 3: Upgrade ESLint (Within 2 Weeks)
```bash
# After creating ESLint configuration (see separate issue doc)
npm install --save-dev eslint@^9.0.0 @eslint/js

# Update .eslintrc.js to use flat config format
# Test linting works across all workspaces
npm run lint
```

### Phase 4: Replace Deprecated Packages (Within 1 Month)
```bash
# Update glob
npm install --save-dev glob@^10.0.0

# Update rimraf
npm install --save-dev rimraf@^5.0.0

# Remove unneeded type definitions
npm uninstall @types/babel__parser

# Test builds
npm run build
```

## Prevention

### 1. Regular Dependency Updates
Add to package.json:
```json
{
  "scripts": {
    "deps:check": "npm outdated",
    "deps:update": "npm update",
    "security:audit": "npm audit",
    "security:fix": "npm audit fix"
  }
}
```

### 2. Automated Dependency Updates
Use Dependabot or Renovate Bot:

**.github/dependabot.yml**
```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10
    groups:
      development-dependencies:
        dependency-type: "development"
      production-dependencies:
        dependency-type: "production"
```

### 3. Pre-commit Security Checks
Add to husky pre-commit:
```bash
#!/bin/sh
npm audit --audit-level=high
if [ $? -ne 0 ]; then
  echo "Security vulnerabilities found. Please run 'npm audit' and address them."
  exit 1
fi
```

### 4. CI/CD Security Scanning
Add to GitHub Actions workflow:
```yaml
- name: Security Audit
  run: npm audit --audit-level=moderate

- name: Check for Outdated Dependencies
  run: npm outdated || true
```

### 5. Dependency Review Policy
Document in CONTRIBUTING.md:
```markdown
## Dependency Management

1. Run `npm audit` before adding new dependencies
2. Avoid packages with known high/critical vulnerabilities
3. Prefer well-maintained packages with recent updates
4. Review dependencies monthly for updates
5. Pin versions for critical dependencies
```

### 6. Lock File Maintenance
```bash
# Regenerate lock file periodically
rm package-lock.json
npm install

# Or update lock file only
npm install --package-lock-only
```

## Related Issues

- ESLint migration guide: https://eslint.org/docs/latest/use/migrate-to-9.0.0
- npm audit documentation: https://docs.npmjs.com/cli/v10/commands/npm-audit
- Dependabot configuration: https://docs.github.com/en/code-security/dependabot
- Node.js security best practices: https://nodejs.org/en/docs/guides/security/

## Additional Notes

### Vulnerability Severity Assessment

**High Priority** (Address Immediately):
- Any vulnerability in production dependencies
- Any vulnerability with known exploits
- Any vulnerability in authentication/authorization code

**Medium Priority** (Address Soon):
- Vulnerabilities in dev dependencies
- Vulnerabilities without known exploits
- Vulnerabilities in less-critical code paths

**Low Priority** (Monitor):
- Vulnerabilities in unused dependencies
- Vulnerabilities that don't affect your usage pattern

### Testing After Updates

After any dependency updates, run:
```bash
# Build all services
npm run build

# Run tests
npm test

# Run linting
npm run lint

# Test Docker builds
docker compose build
```

### Breaking Changes Log

Keep a log of breaking changes from dependency updates:
```markdown
# Dependency Update Log

## 2025-12-16
- Updated glob from v7 to v10
  - Breaking: Changed glob pattern syntax
  - Migration: Updated all glob patterns in scripts/

- Updated ESLint from v8 to v9
  - Breaking: Requires flat config format
  - Migration: Converted .eslintrc.js to eslint.config.js
```

## Security Scan Results Template

Document security scan results:
```bash
# Generate report
npm audit --json > docs/security/audit-$(date +%Y-%m-%d).json

# Summary
npm audit | tee docs/security/audit-summary-$(date +%Y-%m-%d).txt
```

Regular security scans should be part of the development workflow, with results reviewed weekly.
