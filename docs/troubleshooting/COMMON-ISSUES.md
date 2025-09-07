# Common Issues & Troubleshooting

This guide covers the most common issues you may encounter when using the Dev Team Platform and how to resolve them.

## 🚀 Startup Issues

### Services Won't Start

#### Docker Issues
```bash
# Check Docker is running
docker info

# If Docker isn't running
sudo systemctl start docker

# Check Docker Compose version
docker-compose --version  # Should be 2.0+
```

#### Port Conflicts
```bash
# Check what's using required ports
sudo lsof -i :3000,3001,3080,5432,6379,4222

# Kill processes using required ports
sudo lsof -ti:3000,3001,3080,5432,6379 | xargs kill -9

# Or stop other services
sudo systemctl stop postgresql  # If system PostgreSQL is running
sudo systemctl stop redis      # If system Redis is running
```

#### Build Failures
```bash
# Clear Docker build cache
docker system prune -a

# Rebuild from scratch
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```

### API Key Issues

#### Invalid Anthropic API Key
```bash
# Check key format (should start with sk-ant-api03-)
echo $ANTHROPIC_API_KEY

# Verify key in .env file
cat dev-team-platform/.env | grep ANTHROPIC

# Test key validity
curl -H "Authorization: Bearer $ANTHROPIC_API_KEY" \
  -H "Content-Type: application/json" \
  https://api.anthropic.com/v1/messages
```

#### Missing Environment Variables
```bash
# Check all required variables are set
cd dev-team-platform
grep -v '^#' .env | grep -v '^$'

# Should include:
# ANTHROPIC_API_KEY=sk-ant-api03-...
# JWT_SECRET=your-secret-here
# TAVILY_API_KEY=... (optional)
```

## 🌐 Dashboard Access Issues

### Can't Access Dashboard

#### Service Not Running
```bash
# Check frontend service status
docker-compose ps frontend

# View frontend logs
docker-compose logs frontend

# Restart frontend if needed
docker-compose restart frontend
```

#### Browser Issues
1. **Clear Browser Cache**: Hard refresh with `Ctrl+Shift+R`
2. **Try Incognito Mode**: Rules out browser extensions
3. **Different Browser**: Test with Chrome, Firefox, or Safari
4. **Check URL**: Ensure you're using `http://localhost:3080`

#### Network Issues
```bash
# Check if port 3080 is accessible
curl http://localhost:3080

# Check firewall settings
sudo ufw status
sudo iptables -L

# If using WSL2, check port forwarding
netsh interface portproxy show all
```

### Login Issues

#### Default Credentials Not Working
```bash
# Check auth service status
curl http://localhost:3004/health

# Reset database (will lose data!)
docker-compose down -v
docker-compose up -d postgres
# Wait 30 seconds for DB initialization
docker-compose up -d
```

#### Session Issues
1. **Clear Browser Cookies**: Remove old session data
2. **Try Incognito Mode**: Fresh session
3. **Check JWT Settings**: Verify JWT_SECRET in .env

## 🤖 Agent Issues

### Agents Not Responding

#### Check Agent Status
```bash
# Check all agent services
docker-compose ps | grep agent

# Check individual agent health
curl http://localhost:3010/health  # Architecture
curl http://localhost:3011/health  # Frontend
curl http://localhost:3012/health  # Backend
curl http://localhost:3013/health  # QA
curl http://localhost:3014/health  # DevOps
curl http://localhost:3015/health  # MCP
```

#### Agent Logs
```bash
# View logs for specific agent
docker-compose logs agent-architecture
docker-compose logs agent-frontend
docker-compose logs agent-backend

# View all agent logs
docker-compose logs | grep agent
```

#### Restart Agents
```bash
# Restart specific agent
docker-compose restart agent-architecture

# Restart all agents
docker-compose restart \
  agent-architecture \
  agent-frontend \
  agent-backend \
  agent-qa \
  agent-devops \
  agent-mcp
```

### Agent Performance Issues

#### High Memory Usage
```bash
# Check container resource usage
docker stats

# Limit agent memory (add to docker-compose.yml)
services:
  agent-frontend:
    mem_limit: 512m
    memswap_limit: 512m
```

#### Slow Response Times
1. **Check API Rate Limits**: Anthropic API has rate limits
2. **Increase Timeout**: Adjust `AGENT_TIMEOUT` in environment
3. **Scale Agents**: Add more instances for high load

```bash
# Scale specific agent type
docker-compose up --scale agent-frontend=2 -d
```

## 💾 Database Issues

### Connection Errors

#### PostgreSQL Not Running
```bash
# Check PostgreSQL container
docker-compose ps postgres

# View PostgreSQL logs
docker-compose logs postgres

# Restart PostgreSQL
docker-compose restart postgres
```

#### Connection String Issues
```bash
# Check database URL format
echo $DATABASE_URL
# Should be: postgresql://devteam:devteam_secure_password@postgres:5432/dev_team_platform

# Test database connection
docker-compose exec postgres psql -U devteam -d dev_team_platform -c "SELECT 1;"
```

### Data Issues

#### Reset Database
```bash
# WARNING: This will delete all data!
docker-compose down -v
docker-compose up -d postgres
# Wait for initialization
sleep 30
docker-compose up -d
```

#### Database Migration Errors
```bash
# Run migrations manually
docker-compose exec orchestrator-service npm run migrate

# Check migration status
docker-compose exec postgres psql -U devteam -d dev_team_platform -c "SELECT * FROM migrations;"
```

## 🔄 Performance Issues

### Slow Project Creation

#### Check System Resources
```bash
# Monitor system resources
docker stats --no-stream

# Check disk space
df -h

# Check memory usage
free -h
```

#### Optimize Configuration
```yaml
# In docker-compose.yml, add resource limits
services:
  orchestrator-service:
    deploy:
      resources:
        limits:
          memory: 1G
        reservations:
          memory: 512M
```

### High CPU Usage

#### Identify Resource-Heavy Containers
```bash
# Monitor CPU usage by container
docker stats --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"

# Check top processes in container
docker-compose exec orchestrator-service top
```

#### Reduce Concurrent Tasks
```bash
# Edit .env to reduce parallel processing
MAX_CONCURRENT_TASKS=1
AGENT_TIMEOUT=60000

# Restart services
docker-compose restart
```

## 🔒 Security Issues

### Certificate Errors

#### SSL/TLS Issues in Development
```bash
# For development, you can disable SSL verification
export NODE_TLS_REJECT_UNAUTHORIZED=0

# Or add certificate to trusted store
# (Not recommended for production)
```

### Permission Errors

#### File System Permissions
```bash
# Fix Docker volume permissions
sudo chown -R $USER:$USER ./dev-team-platform

# Fix workspace permissions
docker-compose exec agent-architecture chown -R app:app /app/workspace
```

#### API Access Issues
```bash
# Check API key permissions
curl -H "Authorization: Bearer $(grep ANTHROPIC_API_KEY .env | cut -d= -f2)" \
  https://api.anthropic.com/v1/messages

# Verify JWT secret is set
grep JWT_SECRET .env
```

## 📊 Monitoring & Debugging

### Enable Debug Logging

```bash
# Set debug log level in .env
LOG_LEVEL=debug

# Restart services to apply
docker-compose restart
```

### Health Checks

#### Comprehensive Health Check
```bash
#!/bin/bash
echo "=== Dev Team Platform Health Check ==="

# Check Docker
echo "Docker Status:"
docker info > /dev/null && echo "✅ Docker running" || echo "❌ Docker not running"

# Check services
echo -e "\nService Health:"
for service in orchestrator api-gateway project-service task-service auth-service; do
  if curl -s http://localhost:300{1..5}/health > /dev/null; then
    echo "✅ $service healthy"
  else
    echo "❌ $service unhealthy"
  fi
done

# Check agents
echo -e "\nAgent Health:"
for port in {3010..3015}; do
  if curl -s http://localhost:$port/health > /dev/null; then
    echo "✅ Agent on port $port healthy"
  else
    echo "❌ Agent on port $port unhealthy"
  fi
done

# Check frontend
echo -e "\nFrontend:"
if curl -s http://localhost:3080 > /dev/null; then
  echo "✅ Frontend accessible"
else
  echo "❌ Frontend inaccessible"
fi
```

### Log Analysis

#### Centralized Logging
```bash
# View all logs with timestamps
docker-compose logs -f -t

# Filter by service
docker-compose logs -f orchestrator-service

# Search for errors
docker-compose logs | grep -i error

# Export logs for analysis
docker-compose logs > platform-logs.txt
```

## 🛠️ Recovery Procedures

### Complete System Reset

#### Nuclear Option (Loses All Data)
```bash
# Stop everything
docker-compose down -v

# Remove all containers and images
docker system prune -a

# Remove volumes
docker volume prune

# Start fresh
cd dev-team-platform
docker-compose up --build -d
```

### Partial Recovery

#### Reset Just the Database
```bash
# Stop services
docker-compose stop

# Remove just database volume
docker volume rm dev-team-platform_postgres_data

# Restart
docker-compose up -d
```

#### Reset Agent Workspace
```bash
# Clear agent workspace
docker volume rm dev-team-platform_agent_workspace

# Restart agents
docker-compose restart $(docker-compose ps --services | grep agent)
```

## 📞 Getting Additional Help

### Collect Diagnostic Information

```bash
#!/bin/bash
echo "=== Dev Team Platform Diagnostics ==="
echo "Date: $(date)"
echo "Platform: $(uname -a)"
echo

echo "=== Docker Info ==="
docker version
docker-compose version
echo

echo "=== Service Status ==="
docker-compose ps
echo

echo "=== Resource Usage ==="
docker stats --no-stream
echo

echo "=== Recent Logs ==="
docker-compose logs --tail=50
```

### Community Resources

- **GitHub Issues**: [Report bugs and issues](https://github.com/cmndcntrlcyber/dev-team/issues)
- **Discord Community**: [Join for real-time help](https://discord.gg/dev-team-platform)
- **Documentation**: [Check latest docs](docs/README.md)
- **Stack Overflow**: Tag questions with `dev-team-platform`

### When Reporting Issues

Include this information:
1. **Platform version**: Check `docker-compose.yml` or git commit
2. **Operating system**: `uname -a`
3. **Docker versions**: `docker version && docker-compose version`
4. **Error logs**: Relevant log excerpts
5. **Steps to reproduce**: What you were trying to do
6. **Configuration**: Relevant .env settings (redact API keys!)

---

## 🎯 Prevention Tips

1. **Regular Updates**: Keep Docker and the platform updated
2. **Resource Monitoring**: Watch CPU and memory usage
3. **Log Rotation**: Don't let logs fill up disk space
4. **Backup Strategy**: Export important project data regularly
5. **Health Checks**: Run periodic health checks
6. **Documentation**: Keep track of configuration changes

**Still Having Issues?** → [Installation Guide](../getting-started/INSTALLATION.md) | [API Reference](../api-reference/REST-API.md)
