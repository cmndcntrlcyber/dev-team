# Missing Environment Variables for Docker Compose Deployment

**Date Discovered**: 2025-12-16
**Severity**: Medium
**Category**: Configuration | Environment | Deployment

## Summary
The Docker Compose configuration requires multiple environment variables that are not set in the environment. While Docker Compose allows these to default to blank strings, this will cause runtime failures for services that depend on these credentials (particularly API keys for Anthropic Claude and Tavily, and JWT secrets for authentication).

## Error Details

### Command Executed
```bash
docker compose -f /home/cmndcntrl/code/dev-team/dev-team/dev-team-platform/docker-compose.yml config
docker compose -f /home/cmndcntrl/code/dev-team/dev-team/dev-team-platform/docker-compose.yml up --build -d
```

### Warning Output
```
time="2025-12-16T13:18:04-06:00" level=warning msg="The \"JWT_SECRET\" variable is not set. Defaulting to a blank string."
time="2025-12-16T13:18:04-06:00" level=warning msg="The \"ANTHROPIC_API_KEY\" variable is not set. Defaulting to a blank string."
time="2025-12-16T13:18:04-06:00" level=warning msg="The \"TAVILY_API_KEY\" variable is not set. Defaulting to a blank string."
```

### Environment
- OS: Linux 6.17.4-76061704-generic
- Docker Version: 29.1.1, build 0aedba5
- Docker Compose: Built into Docker (compose v2)
- Location: /home/cmndcntrl/code/dev-team/dev-team/dev-team-platform
- Configuration File: docker-compose.yml

### Missing Variables
1. **JWT_SECRET** - Used by: auth-service, api-gateway, orchestrator-service, project-service, task-service
2. **ANTHROPIC_API_KEY** - Used by: All AI agent services (architecture, backend, devops, frontend, mcp, qa)
3. **TAVILY_API_KEY** - Used by: architecture-agent, mcp-agent (for web search functionality)

### Files Present
- ✅ /home/cmndcntrl/code/dev-team/dev-team/dev-team-platform/.env.example (exists)
- ❌ /home/cmndcntrl/code/dev-team/dev-team/dev-team-platform/.env (NOT confirmed)

## Root Cause Analysis

The docker-compose.yml file references environment variables using the `${VARIABLE_NAME}` syntax, expecting them to be:
1. Set in the shell environment
2. Defined in a .env file in the same directory as docker-compose.yml
3. Provided via `docker compose --env-file` flag

Since none of these conditions are met, Docker Compose defaults to blank strings, which will cause:
- **Authentication failures**: JWT_SECRET being blank means JWT tokens cannot be properly signed or verified
- **AI service failures**: ANTHROPIC_API_KEY being blank means all AI agent services will fail to make API calls to Claude
- **Search functionality failures**: TAVILY_API_KEY being blank means web search features won't work

## Suggested Fixes

### Option 1: Create .env File from Template (Recommended for Development)
Copy the example environment file and populate it with actual values:

```bash
cd /home/cmndcntrl/code/dev-team/dev-team/dev-team-platform
cp .env.example .env
```

Then edit the .env file to add real values:
```bash
# Edit the .env file with actual credentials
nano .env  # or vim, code, etc.
```

Required entries in .env:
```env
# Authentication
JWT_SECRET=<generate-a-secure-random-string>

# AI Service - Anthropic Claude
ANTHROPIC_API_KEY=<your-anthropic-api-key>

# Web Search - Tavily
TAVILY_API_KEY=<your-tavily-api-key>

# Other potentially required variables
NODE_ENV=development
LOG_LEVEL=info
```

### Option 2: Set Environment Variables in Shell
Export the variables in your shell before running docker compose:

```bash
export JWT_SECRET="your-secure-jwt-secret-here"
export ANTHROPIC_API_KEY="sk-ant-your-key-here"
export TAVILY_API_KEY="tvly-your-key-here"

docker compose up --build -d
```

**Note**: This approach requires setting the variables in every new shell session.

### Option 3: Use External Secrets Management
For production deployments, use proper secrets management:

**Docker Secrets:**
```yaml
# In docker-compose.yml
services:
  auth-service:
    secrets:
      - jwt_secret
    environment:
      JWT_SECRET_FILE: /run/secrets/jwt_secret

secrets:
  jwt_secret:
    external: true
```

**Environment variable files per environment:**
```bash
docker compose --env-file .env.production up -d
```

### Option 4: Default Values in docker-compose.yml
Add default values in docker-compose.yml for development (NOT recommended for production):

```yaml
environment:
  JWT_SECRET: ${JWT_SECRET:-dev-secret-change-in-production}
  ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY:-}
```

## Implementation Steps

**Recommended approach (Option 1):**

1. Check if .env.example exists and review its contents:
```bash
cat /home/cmndcntrl/code/dev-team/dev-team/dev-team-platform/.env.example
```

2. Create .env from template:
```bash
cp /home/cmndcntrl/code/dev-team/dev-team/dev-team-platform/.env.example \
   /home/cmndcntrl/code/dev-team/dev-team/dev-team-platform/.env
```

3. Generate a secure JWT secret:
```bash
# Generate a random 64-character hex string
openssl rand -hex 32
```

4. Edit .env and add the required credentials:
```bash
cd /home/cmndcntrl/code/dev-team/dev-team/dev-team-platform
vim .env  # or your preferred editor
```

5. Ensure .env is in .gitignore:
```bash
grep "^\.env$" .gitignore || echo ".env" >> .gitignore
```

6. Restart Docker Compose to pick up the new environment variables:
```bash
docker compose down
docker compose up -d
```

## Prevention

1. **Document environment setup**: Add a "Environment Setup" section to README.md with clear instructions on configuring the .env file

2. **Validation script**: Create a script to validate required environment variables:

```bash
#!/bin/bash
# scripts/validate-env.sh

REQUIRED_VARS=(
  "JWT_SECRET"
  "ANTHROPIC_API_KEY"
  "TAVILY_API_KEY"
)

missing=()

for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!var}" ]; then
    missing+=("$var")
  fi
done

if [ ${#missing[@]} -ne 0 ]; then
  echo "ERROR: Required environment variables are not set:"
  printf '  - %s\n' "${missing[@]}"
  echo ""
  echo "Please create a .env file from .env.example and populate it with actual values."
  exit 1
fi

echo "✓ All required environment variables are set"
```

3. **Pre-flight check in docker-compose**: Add a validation service:

```yaml
services:
  env-validator:
    image: alpine:latest
    command: sh -c '
      [ -n "$JWT_SECRET" ] || { echo "JWT_SECRET not set"; exit 1; }
      [ -n "$ANTHROPIC_API_KEY" ] || { echo "ANTHROPIC_API_KEY not set"; exit 1; }
      echo "Environment validation passed"
    '
    environment:
      JWT_SECRET: ${JWT_SECRET}
      ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY}
```

4. **CI/CD checks**: Add environment variable validation to CI/CD pipelines before deployment

5. **Template comments**: Add helpful comments in .env.example:

```env
# JWT Secret - Use a strong random string (min 32 characters)
# Generate with: openssl rand -hex 32
JWT_SECRET=

# Anthropic API Key - Get from https://console.anthropic.com/
ANTHROPIC_API_KEY=

# Tavily API Key - Get from https://tavily.com/
TAVILY_API_KEY=
```

## Related Issues

- Docker Compose environment variable documentation: https://docs.docker.com/compose/environment-variables/
- .env.example file exists at: /home/cmndcntrl/code/dev-team/dev-team/dev-team-platform/.env.example
- Consider using docker-compose.override.yml for local development overrides

## Additional Notes

The docker-compose.yml also shows a deprecation warning:
```
level=warning msg="/home/cmndcntrl/code/dev-team/dev-team/dev-team-platform/docker-compose.yml: the attribute `version` is obsolete"
```

While not critical, the `version` key in docker-compose.yml should be removed as it's no longer needed in Compose v2.

## Security Considerations

1. **Never commit .env file**: Always ensure .env is in .gitignore
2. **Use strong JWT secrets**: Minimum 32 characters, cryptographically random
3. **Rotate secrets regularly**: Especially in production environments
4. **Use different secrets per environment**: Development, staging, and production should have different JWT secrets
5. **Limit API key permissions**: Use API keys with minimum required permissions
6. **Monitor API usage**: Set up alerts for unusual API key usage patterns
