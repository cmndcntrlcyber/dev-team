# Auto-Startup Configuration Summary

## Overview
This document summarizes the configuration changes made to enable automatic startup of four essential security tool containers at Attack Node application startup:
- **attacknode-empire** - PowerShell Empire C2 Framework
- **attacknode-maltego** - Link Analysis Platform  
- **attacknode-vscode** - Web-based VS Code IDE
- **attacknode-kali** - Kali Linux Desktop Environment

## Changes Made

### 1. Docker Service Updates (`server/services/docker.ts`)

**Modified essential containers list:**
```typescript
// Before: Only kali and vscode
const essentialContainers = ['kali', 'vscode'];

// After: All four security tools
const essentialContainers = ['kali', 'vscode', 'empire', 'maltego'];
```

**Impact:**
- The `initializeEssentialContainers()` method now starts all four containers automatically
- Each container is checked for running status and started if stopped
- Integration with existing health monitoring and self-healing systems

### 2. Docker Compose Configuration Updates

#### Development Environment (`docker-compose.yml`)
Added four new services with auto-restart policies:

**attacknode-kali:**
- Image: `kasmweb/kali-rolling-desktop:develop`
- Port: `6902:6901`
- Privileged mode with SYS_ADMIN capabilities
- Persistent storage for Kali environment
- Root user configuration

**attacknode-vscode:**
- Image: `kasmweb/vs-code:1.17.0`
- Port: `6903:6901`
- Shared volume for file access
- Web-based IDE accessibility

**attacknode-empire:**
- Image: `bcsecurity/empire:latest`
- Ports: `1337:1337`, `5000:5000`
- Data container pattern for persistence
- Interactive mode (stdin_open/tty)

**attacknode-maltego:**
- Image: `kasmweb/maltego:1.17.0-rolling-daily`
- Port: `6904:6901`
- Link analysis and data mining platform

#### Production Environment (`docker-compose.prod.yml`)
Same container configurations with additional networking:
- All containers connected to `attack-node` network
- Proper health checks configured
- Production-ready resource limits

### 3. Container Restart Policies

All four containers now have:
```yaml
restart: unless-stopped
```

This ensures containers:
- Start automatically when Docker daemon starts
- Restart if they crash or stop unexpectedly  
- Do NOT restart if manually stopped
- Survive system reboots

### 4. Health Monitoring Integration

Each container includes health checks:
- **Kali/VS Code/Maltego**: HTTP health checks on VNC port
- **Empire**: Process-based health check for Empire service
- Health check intervals, timeouts, and retry logic configured
- Integration with existing Empire health monitoring system

### 5. Volume and Directory Structure

Created persistent storage directories:
```
uploads/
├── kasm_profiles/
│   └── kali-root/          # Kali Linux persistent home
├── docker/                 # Shared workspace
└── empire/                 # Empire data (via Docker volume)
```

### 6. Port Mappings

Standardized port assignments:
- **Kali Linux**: `http://localhost:6902`
- **VS Code**: `http://localhost:6903`  
- **Empire**: `http://localhost:1337` (main), `http://localhost:5000` (web)
- **Maltego**: `http://localhost:6904`

### 7. Test Script (`test-startup-containers.sh`)

Created comprehensive test script that:
- Starts all containers via Docker Compose
- Waits for each container to be ready
- Verifies container status and port accessibility
- Shows container logs for debugging
- Provides success/failure reporting

## How Auto-Startup Works

### Application Startup Sequence

1. **Node.js Application Start** (`server/index.ts`)
   - Initializes self-healing systems
   - Calls `dockerService.initializeEssentialContainers()`

2. **Essential Container Initialization** (`server/services/docker.ts`)
   - Checks status of each essential container
   - Starts any stopped containers
   - Waits for containers to be ready
   - Integrates with health monitoring

3. **Docker Compose Integration**
   - Containers defined with `restart: unless-stopped`
   - Automatic startup on Docker daemon start
   - Proper dependency management
   - Health check monitoring

### Startup Flow
```
Docker Daemon Start
        ↓
Docker Compose Up
        ↓
Base Services (postgres, redis)
        ↓
Attack Node Application
        ↓
Initialize Essential Containers
        ↓
Security Tools Ready
```

## Benefits

1. **Automatic Recovery**: Containers restart if they crash
2. **System Resilience**: Survives system reboots
3. **Consistent Environment**: All tools available immediately
4. **Health Monitoring**: Integrated with existing monitoring systems
5. **Easy Management**: Single command starts entire stack

## Testing

Run the test script to verify configuration:
```bash
./test-startup-containers.sh
```

This will:
- Start all containers via Docker Compose
- Verify each container is running
- Test port accessibility
- Display container logs
- Confirm auto-startup is working

## Configuration Files Modified

1. `server/services/docker.ts` - Essential containers list
2. `docker-compose.yml` - Development environment
3. `docker-compose.prod.yml` - Production environment
4. `test-startup-containers.sh` - Test script (new)
5. `uploads/` directories - Created volume structure

## Access URLs (After Startup)

- **Kali Linux Desktop**: http://localhost:6902
- **VS Code IDE**: http://localhost:6903
- **Empire C2 Framework**: http://localhost:1337 (main) / http://localhost:5000 (web)
- **Maltego**: http://localhost:6904

All services use VNC password: `password`

## Troubleshooting

If containers don't start automatically:

1. Check Docker daemon status: `systemctl status docker`
2. Verify available resources (RAM/CPU)
3. Check container logs: `docker logs [container-name]`
4. Verify port availability: `netstat -tlnp | grep [port]`
5. Run test script for detailed diagnostics

## Future Enhancements

Consider adding:
- Container resource limits
- Additional health monitoring
- Custom startup scripts
- Backup/restore functionality
- Container orchestration improvements

---

**Status**: ✅ Complete - All four security tool containers now start automatically at Attack Node application startup.
