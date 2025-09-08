# Redis Self-Healing Solution Documentation

## Overview
This document describes the comprehensive, long-term self-healing solution implemented to automatically prevent, detect, and recover from Redis permission issues in the Docker environment.

## Problem Statement
The original error:
```
1:M 14 Jul 2025 15:02:18.414 # Can't open or create append-only dir appendonlydir: Permission denied
```

This occurs when Redis containers cannot access or create the append-only file (AOF) directory due to permission mismatches between the host and container file systems.

## Solution Architecture

### 1. **Volume Permission Manager** (`server/services/volume-permission-manager.ts`)
**Purpose**: Proactive permission management and validation

**Key Features**:
- Pre-flight permission checks before container startup
- Automatic permission repair for Redis volumes
- Continuous volume health monitoring
- Support for multiple container types (Redis, PostgreSQL, Kali, etc.)

**Core Methods**:
- `fixRedisPermissions()`: Specifically handles Redis volume permissions
- `preflightCheck()`: Validates permissions before container start
- `repairVolumePermissions()`: Automatic permission repair
- `monitorVolumeHealth()`: Continuous monitoring

### 2. **Redis Health Monitor** (`server/services/redis-health-monitor.ts`)
**Purpose**: Real-time Redis container health tracking

**Key Features**:
- Continuous monitoring of Redis container status
- AOF (Append-Only File) status tracking
- Permission issue detection
- Automatic health repair attempts
- Performance metrics collection

**Health Checks**:
- Container running status
- Redis responsiveness (PING/PONG)
- AOF enablement and writability
- Volume permission validation
- Memory and connection monitoring

### 3. **Enhanced Docker Error Monitor** (`server/services/docker-error-monitor.ts`)
**Purpose**: Intelligent error pattern recognition

**Enhanced Features**:
- Redis-specific error patterns added
- AOF permission error detection
- Context extraction from error messages
- Automatic recovery triggering

**New Error Patterns Added**:
```typescript
/can't open or create append-only dir/i
/appendonlydir.*permission denied/i
/redis.*permission denied/i
/can't create\/write to append only file/i
```

### 4. **Enhanced Docker Recovery Engine** (`server/services/docker-recovery-engine.ts`)
**Purpose**: Automated recovery strategies

**New Recovery Actions**:
- `FIX_REDIS_PERMISSIONS`: Repair Redis volume permissions
- `REPAIR_VOLUME_PERMISSIONS`: Generic volume permission repair
- `RESTART_REDIS_CONTAINER`: Restart Redis with health checks
- `DISABLE_REDIS_AOF`: Fallback option to disable AOF

**Recovery Strategy for Permission Denied Errors**:
1. Fix Redis permissions
2. Repair volume permissions
3. Restart Redis container
4. Disable Redis AOF (fallback)
5. Retry with sudo

### 5. **Enhanced Docker Service** (`server/services/docker.ts`)
**Purpose**: Integrated container management

**Enhancements**:
- Preflight checks before container startup
- Automatic permission repair integration
- Error monitoring integration
- Health monitoring integration

## Self-Healing Workflow

### Prevention Phase
1. **Preflight Check**: Before starting any container, validate volume permissions
2. **Permission Repair**: If issues detected, automatically fix permissions
3. **Directory Creation**: Ensure all required directories exist with proper ownership

### Detection Phase
1. **Error Pattern Matching**: Monitor Docker commands for Redis permission errors
2. **Health Monitoring**: Continuous monitoring of Redis container health
3. **Log Analysis**: Scan container logs for permission-related issues

### Recovery Phase
1. **Automatic Recovery**: When permission errors detected, trigger recovery strategies
2. **Multi-Strategy Approach**: Try multiple recovery methods in sequence
3. **Fallback Options**: If permissions can't be fixed, disable AOF as fallback
4. **Verification**: Verify recovery success before marking as resolved

## Usage Examples

### Manual Testing
```typescript
// Test Redis permission fix
await volumePermissionManager.fixRedisPermissions();

// Check Redis health
const healthStatus = await redisHealthMonitor.checkRedisHealth();

// Manual recovery attempt
await dockerRecoveryEngine.attemptRecovery(error);
```

### Automatic Operation
The system automatically handles Redis permission issues when:
- Starting Redis containers
- Detecting permission errors in logs
- Health checks fail due to permission issues

## Key Benefits

1. **Zero Manual Intervention**: Issues are resolved automatically
2. **Proactive Prevention**: Problems are prevented before they occur
3. **Comprehensive Coverage**: Handles various types of permission issues
4. **Intelligent Recovery**: Multiple recovery strategies with fallbacks
5. **Continuous Monitoring**: Real-time health tracking and alerting
6. **Learning System**: Tracks error patterns and recovery success rates

## Configuration

### Redis Volume Permissions
```typescript
{
  path: 'redis-data',
  uid: 999,    // Redis container user ID
  gid: 999,    // Redis container group ID
  mode: '0755', // Directory permissions
  recursive: true
}
```

### Recovery Strategy Configuration
```typescript
{
  errorType: DockerErrorType.PERMISSION_DENIED,
  maxAttempts: 4,
  actions: [
    RecoveryActionType.FIX_REDIS_PERMISSIONS,
    RecoveryActionType.REPAIR_VOLUME_PERMISSIONS,
    RecoveryActionType.RESTART_REDIS_CONTAINER,
    RecoveryActionType.DISABLE_REDIS_AOF,
    RecoveryActionType.RETRY_WITH_SUDO
  ],
  retryDelay: 2000
}
```

## Monitoring and Alerts

### Health Status Monitoring
The system provides real-time monitoring of:
- Container running status
- Redis responsiveness
- AOF functionality
- Volume permissions
- Memory usage
- Connection counts

### Event Emissions
Components emit events for:
- Permission issues detected
- Recovery attempts
- Health status changes
- Volume health issues

## Troubleshooting

### Common Issues and Solutions

1. **Permission Denied Errors**
   - Automatically fixed by `fixRedisPermissions()`
   - Fallback: Disable AOF persistence

2. **Container Start Failures**
   - Preflight checks prevent most issues
   - Automatic container cleanup and restart

3. **Volume Mount Issues**
   - Automatic directory creation
   - Permission repair before container start

### Manual Override Options

If automatic recovery fails, manual intervention options:
```bash
# Manual permission fix
sudo chown -R 999:999 redis-data/
sudo chmod -R 755 redis-data/

# Manual Redis restart
docker restart attacknode-redis

# Manual AOF disable
docker exec attacknode-redis redis-cli CONFIG SET appendonly no
```

## Future Enhancements

1. **Predictive Analytics**: Use error patterns to predict issues before they occur
2. **Performance Optimization**: Optimize recovery strategies based on success rates
3. **Extended Monitoring**: Add more comprehensive health metrics
4. **Integration Testing**: Automated testing of recovery scenarios
5. **Dashboard Integration**: Real-time monitoring dashboard

## Conclusion

This comprehensive self-healing solution transforms Redis permission errors from a manual troubleshooting task into an automatically resolved issue. The multi-layered approach ensures high availability and reliability of the Redis infrastructure while minimizing operational overhead.
