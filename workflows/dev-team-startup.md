---
description: Automated dev-team platform initialization at VS Code startup
author: Workspace System
version: 1.0
tags: [workflow, startup, dev-team, initialization]
trigger: VS Code Startup
---

# Dev-Team Startup Workflow

## 🎯 Purpose
Automatically check and initialize the dev-team platform when VS Code opens in this workspace.

## 🚀 Execution Trigger
This workflow should execute automatically when:
- VS Code opens in the `/home/cmndcntrl/code/dev-team` workspace
- User requests dev-team status check
- Before any task delegation to dev-team

## 📋 Startup Sequence

### Step 1: Check Docker Service Status
```bash
docker ps --filter "name=dev-team" --format "{{.Names}}: {{.Status}}"
```

**Expected Output:**
- If running: Container names with "Up X minutes/hours"
- If not running: Empty output or error

### Step 2: Conditional Service Start
**If services are NOT running:**

1. Navigate to project directory and start services:
```bash
cd /home/cmndcntrl/code/dev-team && docker compose -f docker-compose.simple.yml up -d
```

2. Wait for services to initialize (30 seconds):
```bash
sleep 30
```

3. Verify services started:
```bash
docker ps --filter "name=dev-team" --format "{{.Names}}: {{.Status}}"
```

### Step 3: Health Check
Verify API connectivity:
```bash
curl -s http://localhost:5000/api/dashboard/stats
```

**Expected Response:**
```json
{
  "totalProjects": <number>,
  "activeProjects": <number>,
  "totalTasks": <number>,
  "activeTasks": <number>
}
```

### Step 4: Load Agent Roster
Fetch available agents:
```bash
curl -s http://localhost:5000/api/ai-agents
```

**Expected Response:**
```json
[
  {
    "id": <number>,
    "name": "Architecture Agent",
    "type": "anthropic",
    "status": "online|offline",
    ...
  },
  ...
]
```

## 📊 Status Display

### Success Output
Display to user:
```
✅ Dev-Team Platform Ready

Services Status:
- App: Running on port 5000
- Database: Running on port 5432

Available Agents:
- Architecture Agent: [online/offline]
- Frontend Agent: [online/offline]
- Backend Agent: [online/offline]
- QA Agent: [online/offline]
- DevOps Agent: [online/offline]
- MCP Agent: [online/offline]

Dashboard: http://localhost:5000
```

### Startup Output
Display during startup:
```
🔄 Starting Dev-Team Platform...

- Starting Docker containers...
- Waiting for database initialization (10s)...
- Waiting for app startup (15s)...
- Verifying connectivity...
- Loading agent roster...

✅ Platform ready!
```

### Failure Output
Display on error:
```
❌ Dev-Team Platform Failed to Start

Error: [specific error message]

Troubleshooting Steps:
1. Check Docker is running: docker --version
2. Check ports are available: netstat -tlnp | grep -E '5000|5432'
3. View logs: docker compose -f docker-compose.simple.yml logs
4. Restart services: docker compose -f docker-compose.simple.yml restart

Manual Commands:
- Start: cd /home/cmndcntrl/code/dev-team && docker compose -f docker-compose.simple.yml up -d
- Stop: docker compose -f docker-compose.simple.yml down
- Restart: docker compose -f docker-compose.simple.yml restart
```

## 🔄 Recovery Procedures

### If Services Won't Start:
```bash
# Check Docker daemon
systemctl status docker

# Check for port conflicts
netstat -tlnp | grep -E '5000|5432'

# Remove old containers
docker compose -f docker-compose.simple.yml down -v

# Rebuild and start
docker compose -f docker-compose.simple.yml up -d --build
```

### If API Not Responding:
```bash
# Check app logs
docker compose -f docker-compose.simple.yml logs app

# Check database logs
docker compose -f docker-compose.simple.yml logs postgres

# Restart just the app
docker compose -f docker-compose.simple.yml restart app
```

### If Database Connection Issues:
```bash
# Check postgres is healthy
docker compose -f docker-compose.simple.yml ps postgres

# Check database connectivity
docker exec -it <postgres_container> psql -U user -d devteam -c "SELECT 1;"

# Reset database (WARNING: destroys data)
docker compose -f docker-compose.simple.yml down -v
docker compose -f docker-compose.simple.yml up -d
```

## 📝 Implementation Notes

### For Cline:
When this workflow is triggered:

1. **Always execute Step 1** to check current status
2. **Only execute Step 2** if services are not running
3. **Always execute Steps 3-4** to verify health and load agents
4. **Display appropriate status** based on results
5. **Store agent roster** for later task delegation decisions

### Environment Variables Check:
Before starting services, verify `.env` file exists and contains:
```bash
# Check .env exists
test -f /home/cmndcntrl/code/dev-team/.env && echo "✅ .env found" || echo "❌ .env missing"

# Required variables (don't display values)
grep -q "ANTHROPIC_API_KEY" /home/cmndcntrl/code/dev-team/.env && echo "✅ ANTHROPIC_API_KEY set" || echo "⚠️ ANTHROPIC_API_KEY missing"
grep -q "SESSION_SECRET" /home/cmndcntrl/code/dev-team/.env && echo "✅ SESSION_SECRET set" || echo "⚠️ SESSION_SECRET missing"
```

If `.env` is missing or incomplete, prompt user to configure it.

## 🎯 Success Criteria

The workflow is successful when:
- ✅ Docker containers are running
- ✅ API responds to health check
- ✅ Agent roster can be fetched
- ✅ No error messages in logs
- ✅ Ports 5000 and 5432 are accessible

## 🔒 Security Considerations

- Never display API keys or secrets in output
- Only show service status and health information
- Log files should not contain sensitive data
- Use secure connections for API calls (when available)

## ⏱️ Timing Expectations

- Service check: <1 second
- Service startup: 25-35 seconds
- Health verification: 2-5 seconds
- Agent roster fetch: 1-3 seconds
- **Total time: 30-45 seconds** (if starting from stopped state)
- **Total time: 3-9 seconds** (if already running)

## 🔧 Maintenance

### Periodic Health Checks
While dev-team is in use, periodically verify health:
- Every 5 minutes during active task delegation
- Before starting any new project delegation
- After any error or timeout

### Cleanup on VS Code Exit
Optional: Stop services when VS Code closes (configurable):
```bash
# If auto-shutdown enabled
docker compose -f docker-compose.simple.yml stop
```

---

**This workflow ensures the dev-team platform is always ready when you need it, with clear status reporting and automated recovery procedures.**
