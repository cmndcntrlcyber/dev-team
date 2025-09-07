# 🔒 Security Guidelines for Dev Team Platform

## Overview

This document outlines security best practices, guidelines, and procedures for the Dev Team Platform repository. Following these guidelines is **mandatory** to protect sensitive data, API keys, and maintain the security posture of our development environment.

## 🚨 Critical Security Rules

### 1. **NEVER commit secrets, API keys, or sensitive data**
- ✅ Use `.env.example` files as templates
- ❌ Never commit actual `.env` files
- ❌ Never hardcode API keys, passwords, or tokens in code
- ❌ Never commit database credentials or connection strings

### 2. **Always review before committing**
- Run `git diff --cached` before every commit
- Check for accidentally staged sensitive files
- Verify .gitignore is protecting sensitive data

### 3. **Use proper environment variable management**
- Store secrets in `.env` files (ignored by git)
- Reference secrets via `process.env.VARIABLE_NAME`
- Document required variables in `.env.example`

## 📁 Repository Structure Security

### .gitignore Hierarchy

The repository uses a hierarchical .gitignore structure:

```
dev-team-platform/
├── .gitignore                    # Root-level comprehensive protection
├── frontend/.gitignore          # Next.js specific patterns
├── services/.gitignore          # Backend services generic patterns
└── services/{service}/.gitignore # Service-specific patterns (optional)
```

### Protected File Patterns

The following patterns are automatically ignored:

#### Environment & Secrets
- `.env*` (except `.env.example`)
- `*.key`, `*.pem`, `*.p12`, `*.pfx`
- `secrets/`, `credentials/`, `api-keys/`
- Service account files (`*-service-account.json`)

#### Build & Dependencies
- `node_modules/`
- `dist/`, `build/`, `out/`
- `*.tsbuildinfo`
- Coverage reports and test results

#### Development Files
- IDE settings (`.vscode/settings.json`, `.idea/`)
- OS files (`.DS_Store`, `Thumbs.db`)
- Logs and temporary files

## 🔑 Environment Variables Management

### Setup Process

1. **Copy the example file:**
   ```bash
   cp .env.example .env
   ```

2. **Fill in your actual values:**
   ```bash
   # .env
   ANTHROPIC_API_KEY=sk-ant-api03-your-actual-key-here
   JWT_SECRET=your-very-secure-jwt-secret-minimum-32-characters
   DATABASE_URL=postgresql://user:password@localhost:5432/dev_team_platform
   ```

3. **Verify .env is ignored:**
   ```bash
   git status  # .env should not appear in untracked files
   ```

### Required Variables

#### Core API Keys
- `ANTHROPIC_API_KEY` - Claude API access (REQUIRED)
- `TAVILY_API_KEY` - Web search capabilities (OPTIONAL)

#### Security
- `JWT_SECRET` - Minimum 32 characters (REQUIRED)
- `JWT_EXPIRES_IN` - Token expiration (default: 15m)
- `REFRESH_TOKEN_EXPIRES_IN` - Refresh token expiration (default: 7d)

#### Database
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `NATS_URL` - NATS message broker URL

### Production Environment Variables

For production deployments:

```bash
# Production security settings
NODE_ENV=production
LOG_LEVEL=warn
CORS_ORIGINS=https://yourdomain.com
BASE_URL=https://yourdomain.com

# Enhanced security
RATE_LIMIT_MAX=200
AGENT_TIMEOUT=60000
```

## 🛡️ Pre-Commit Security Checklist

Before every commit, verify:

- [ ] No `.env` files are staged (`git diff --cached --name-only | grep -E '\.env$'`)
- [ ] No API keys in code (`git diff --cached | grep -i -E 'api[_-]?key|secret|token|password'`)
- [ ] No hardcoded credentials in configuration files
- [ ] No sensitive data in test files or examples
- [ ] All new dependencies are from trusted sources
- [ ] Docker secrets are properly handled (not in Dockerfiles)

### Quick Security Check Commands

```bash
# Check for staged .env files
git diff --cached --name-only | grep -E '\.env$'

# Search for potential secrets in staged files
git diff --cached | grep -i -E 'api[_-]?key|secret|token|password'

# Check git status for unexpected files
git status --porcelain | grep -E '\.(env|key|pem)$'
```

## 🐳 Docker Security

### Dockerfile Best Practices

```dockerfile
# ❌ Don't do this - exposes secrets in image layers
ENV API_KEY=sk-ant-api03-your-key-here

# ✅ Do this - use build args and runtime secrets
ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

# Copy only necessary files
COPY package*.json ./
COPY src/ ./src/
# Don't COPY .env files
```

### Docker Compose Security

```yaml
# docker-compose.yml
services:
  api-gateway:
    environment:
      - NODE_ENV=production
      # Reference secrets from environment
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - JWT_SECRET=${JWT_SECRET}
```

## 🚀 CI/CD Security

### GitHub Actions

Sensitive data in CI/CD pipelines should use GitHub Secrets:

```yaml
# .github/workflows/ci.yml
env:
  NODE_ENV: test
  JWT_SECRET: ${{ secrets.JWT_SECRET }}
  ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
  SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
```

### Required GitHub Secrets

Configure these secrets in your GitHub repository:

- `ANTHROPIC_API_KEY` - For AI agent testing
- `JWT_SECRET` - For authentication testing
- `SNYK_TOKEN` - For security vulnerability scanning
- `DATABASE_URL` - Test database connection (if needed)

## 🔍 Security Scanning

### Automated Scans

The repository includes automated security scanning:

1. **Dependency Vulnerability Scanning** (Snyk)
   ```bash
   npm audit --audit-level=moderate
   ```

2. **Secret Detection** (built into CI)
   - Scans for accidentally committed secrets
   - Fails builds if secrets are detected

3. **Code Security Analysis**
   - Static analysis for security vulnerabilities
   - Dependency license compliance

### Manual Security Checks

Perform these checks regularly:

```bash
# Check for secrets in git history
git log --patch | grep -i -E 'api[_-]?key|secret|token|password'

# Audit npm dependencies
npm audit

# Check for exposed ports and services
netstat -tuln

# Review .gitignore effectiveness
git ls-files | grep -E '\.(env|key|secret|token)$'
```

## 🚨 Incident Response

### If Secrets Are Accidentally Committed

1. **Immediate Actions:**
   ```bash
   # Stop using the exposed secret immediately
   # Rotate/regenerate the compromised secret
   # Remove from git history (if recent)
   git reset --hard HEAD~1  # if last commit
   ```

2. **For Historical Commits:**
   - Use `git filter-branch` or BFG Repo-Cleaner
   - Force push to remove from remote
   - Notify team members to re-clone repository
   - Rotate all potentially compromised secrets

3. **Notification Process:**
   - Report to security team immediately
   - Document the incident
   - Update security procedures if needed

### Emergency Contacts

- **Security Team:** [security@company.com]
- **DevOps Lead:** [devops@company.com]
- **Platform Owner:** [platform@company.com]

## 📚 Security Resources

### Tools and Utilities

1. **git-secrets** - Prevents committing secrets
   ```bash
   brew install git-secrets
   git secrets --register-aws
   git secrets --install
   ```

2. **pre-commit hooks** - Automated checks
   ```bash
   pip install pre-commit
   pre-commit install
   ```

3. **Snyk CLI** - Security vulnerability scanning
   ```bash
   npm install -g snyk
   snyk auth
   snyk test
   ```

### Educational Resources

- [OWASP Top 10 Security Risks](https://owasp.org/www-project-top-ten/)
- [GitHub Security Best Practices](https://docs.github.com/en/code-security)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Docker Security Best Practices](https://docs.docker.com/engine/security/)

## 🔧 Development Environment Security

### Local Development Setup

1. **Install security tools:**
   ```bash
   # Git hooks for secret detection
   npm install --save-dev husky lint-staged

   # Security scanning
   npm install --save-dev snyk
   ```

2. **Configure git hooks:**
   ```json
   // package.json
   {
     "husky": {
       "hooks": {
         "pre-commit": "lint-staged && npm run security-check"
       }
     },
     "lint-staged": {
       "*.{js,ts}": "eslint --fix",
       "*": "git-secrets --scan"
     }
   }
   ```

3. **Environment isolation:**
   ```bash
   # Use different .env files for different environments
   .env.development
   .env.test
   .env.production.local
   ```

### VSCode Security Extensions

Recommended extensions for enhanced security:

- **SonarLint** - Code quality and security analysis
- **GitLens** - Git history and blame annotations
- **ESLint** - JavaScript/TypeScript linting with security rules
- **Docker** - Dockerfile linting and best practices

## 📋 Security Compliance Checklist

### For New Services

- [ ] Environment variables properly configured
- [ ] Service-specific .gitignore created (if needed)
- [ ] No hardcoded secrets in configuration
- [ ] Proper error handling (no sensitive data in errors)
- [ ] Input validation implemented
- [ ] Authentication and authorization configured
- [ ] Logging configured (no sensitive data in logs)
- [ ] Dependencies are up-to-date and secure

### For Production Deployment

- [ ] All secrets stored in secure secret management system
- [ ] Environment variables validated
- [ ] Security headers configured
- [ ] Rate limiting implemented
- [ ] HTTPS enforced
- [ ] Database connections secured
- [ ] Monitoring and alerting configured
- [ ] Backup and recovery procedures tested

## 📞 Getting Help

### Security Questions

If you have questions about security practices:

1. **Check this documentation first**
2. **Consult with the security team**
3. **Create a security issue template in GitHub**
4. **Schedule a security review session**

### Reporting Security Issues

**DO NOT** create public GitHub issues for security vulnerabilities.

Instead:
1. Email security@company.com
2. Use GitHub Security Advisories (private)
3. Follow responsible disclosure practices

---

## 📝 Document Maintenance

- **Last Updated:** September 7, 2025
- **Next Review:** October 7, 2025
- **Owner:** Platform Security Team
- **Contributors:** Dev Team Platform Contributors

This document should be reviewed and updated regularly to ensure it remains current with security best practices and platform changes.
