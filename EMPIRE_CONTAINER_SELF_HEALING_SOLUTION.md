# Empire Container Self-Healing Solution

## Problem Analysis

The Empire container was experiencing unexpected shutdowns and recovery loop failures, causing service interruptions and preventing proper Empire functionality.

### Original Issues Identified

**1. Container Recovery Loop Bug**
```
Error: Container name "/attacknode-empire" is already in use
Error: Container name "/empire-data" is already in use
```

**2. Container Exit Analysis**
- Empire containers starting successfully but exiting unexpectedly
- Health monitor detecting failures but unable to recover due to naming conflicts
- Infinite recovery loops creating system instability

**3. Inadequate Cleanup Process**
- Existing containers not properly removed before recreation
- Zombie containers causing naming conflicts
- Volume and network cleanup insufficient

## Comprehensive Self-Healing Solution

### 1. **Enhanced Empire Health Monitor** (`server/services/empire-health-monitor.ts`)

**Key Improvements:**
- **Complete Container Cleanup**: Comprehensive removal of all Empire-related containers
- **Improved Setup Detection**: Better recognition of Empire startup completion
- **Progressive Recovery**: Multiple recovery levels with proper cleanup
- **Robust Error Handling**: Detailed logging and error analysis

**Enhanced Features:**
```typescript
// Improved setup completion detection
private checkSetupCompleted(logs: string): boolean {
  const hasStartupComplete = logs.includes('Application startup complete');
  const hasUvicornRunning = logs.includes('Uvicorn running on');
  const hasEmpireStarting = logs.includes('Empire starting up');
  
  return hasStartupComplete && hasUvicornRunning && hasEmpireStarting;
}

// Complete container cleanup
private async completeContainerCleanup(): Promise<void> {
  // Stop all Empire containers
  // Remove all Empire containers  
  // Clean up orphaned containers
  // Verify cleanup completion
}
```

### 2. **Empire Container Repair Script** (`fix-empire-container.sh`)

**Comprehensive Troubleshooting Tool:**
- **System Resource Monitoring**: Memory, CPU, disk space analysis
- **Port Availability Checking**: Conflict detection for ports 1337/5000
- **Container Lifecycle Management**: Start, stop, restart, cleanup operations
- **Exit Code Analysis**: Detailed container failure diagnosis

**Advanced Features:**
```bash
# Container exit code analysis
case $exit_code in
  0) "Container exited normally"
  1) "Container exited with general error"
  137) "Container killed by SIGKILL (OOM or manual)"
  143) "Container terminated by SIGTERM"
esac

# Progressive startup with retry logic
start_empire_container() {
  for attempt in 1 to MAX_RETRIES; do
    if start_empire_container_single; then
      return 0
    fi
    exponential_backoff_wait
  done
}
```

### 3. **Intelligent Container Management**

**Container Lifecycle Improvements:**
- **Unique Container Naming**: Prevents naming conflicts
- **Proper Cleanup Sequence**: Stop → Remove → Prune → Verify
- **Volume Management**: Persistent data handling across restarts
- **Health Check Integration**: Docker-native health monitoring

**Recovery Strategy:**
```bash
# Level 1: Simple restart
docker restart attacknode-empire

# Level 2: Clean recreation
complete_cleanup && start_empire_container

# Level 3: Aggressive recovery
remove_all_empire_containers && rebuild_from_scratch
```

## Implementation Details

### Enhanced Health Monitoring

**Health Check Components:**
- **Container Status**: Running, stopped, crashed analysis
- **API Responsiveness**: Empire REST API health verification
- **Database Connectivity**: SQLite database access testing
- **Starkiller UI**: Web interface availability checking
- **Process Monitoring**: Empire process lifecycle tracking

**Recovery Triggers:**
- **Container Exit**: Automatic restart on unexpected shutdown
- **API Failure**: Service restart when API becomes unresponsive
- **Database Issues**: Database repair and container recreation
- **Resource Exhaustion**: Cleanup and resource optimization

### Container Cleanup Process

**Comprehensive Cleanup Steps:**
1. **Stop All Empire Containers**: Graceful shutdown with timeout
2. **Remove Container Instances**: Force removal of all Empire containers
3. **Clean Orphaned Resources**: Remove unused containers and networks
4. **Verify Cleanup**: Ensure no naming conflicts remain
5. **Prepare Environment**: Setup volumes and permissions

**Cleanup Implementation:**
```typescript
private async completeContainerCleanup(): Promise<void> {
  // Stop containers with timeout
  const stopCommands = [
    'docker stop attacknode-empire --time 5',
    'docker stop empire-data --time 5',
    'docker stop $(docker ps -q --filter "name=empire") --time 5'
  ];
  
  // Remove containers forcefully
  const removeCommands = [
    'docker rm -f attacknode-empire',
    'docker rm -f empire-data',
    'docker rm -f $(docker ps -aq --filter "name=empire")'
  ];
  
  // Clean up orphaned containers
  await execAsync('docker container prune -f');
}
```

### Container Startup Optimization

**Startup Sequence:**
1. **Image Pull**: Ensure latest Empire image is available
2. **Data Container**: Create persistent data container
3. **Main Container**: Start Empire with proper configuration
4. **Readiness Check**: Wait for complete initialization
5. **Health Verification**: Confirm all services are operational

**Startup Verification:**
```bash
wait_for_container_ready() {
  while [ $elapsed -lt $STARTUP_TIMEOUT ]; do
    # Check container is running
    if ! docker ps --filter "name=$CONTAINER_NAME" --format "{{.Status}}" | grep -q "Up"; then
      return 1
    fi
    
    # Check Empire startup indicators
    local logs=$(get_container_logs "$CONTAINER_NAME" 50)
    if echo "$logs" | grep -q "Application startup complete" && \
       echo "$logs" | grep -q "Uvicorn running on"; then
      return 0
    fi
    
    sleep 5
  done
}
```

## Usage Instructions

### 1. **Automatic Self-Healing**
The enhanced health monitor runs automatically and handles:
- **Container Failures**: Automatic restart and recovery
- **Service Degradation**: Proactive health monitoring
- **Resource Issues**: Cleanup and optimization
- **Naming Conflicts**: Complete container cleanup

### 2. **Manual Troubleshooting**

**Basic Diagnostics:**
```bash
# Run comprehensive diagnostics
./fix-empire-container.sh --diagnose

# Check container status
./fix-empire-container.sh --status

# View container logs
./fix-empire-container.sh --logs
```

**Container Management:**
```bash
# Repair container issues
./fix-empire-container.sh --repair

# Clean up containers
./fix-empire-container.sh --cleanup

# Restart Empire container
./fix-empire-container.sh --restart
```

**Emergency Recovery:**
```bash
# Create emergency recovery script
./fix-empire-container.sh --recovery

# Run emergency recovery
./empire-recovery.sh
```

### 3. **Health Monitor Integration**

**Manual Health Monitor Control:**
```typescript
// Restart Empire manually
await empireHealthMonitor.restartEmpire();

// Get detailed status
const status = await empireHealthMonitor.getDetailedStatus();

// Check health status
const health = empireHealthMonitor.getLastHealthStatus();
```

## Troubleshooting Guide

### Common Container Issues

**1. Container Exits Immediately**
```bash
# Check exit code and reason
./fix-empire-container.sh --diagnose

# Analyze container logs
docker logs attacknode-empire --tail 50

# Check system resources
free -h && df -h
```

**2. Naming Conflicts**
```bash
# Clean up all Empire containers
./fix-empire-container.sh --cleanup

# Restart with clean environment
./fix-empire-container.sh --repair
```

**3. Port Conflicts**
```bash
# Check port usage
netstat -tlnp | grep -E ':1337|:5000'

# Kill conflicting processes
sudo fuser -k 1337/tcp 5000/tcp
```

**4. Database Issues**
```bash
# Check database file
docker exec attacknode-empire ls -la /empire/empire.db

# Recreate container with fresh database
./fix-empire-container.sh --cleanup && ./fix-empire-container.sh --repair
```

### System Resource Issues

**Memory Problems:**
```bash
# Check available memory
free -h

# Clean up Docker resources
docker system prune -a

# Restart with limited resources
docker run --memory=1g --cpus=1 ...
```

**Disk Space Issues:**
```bash
# Check disk usage
df -h

# Clean up Docker images
docker image prune -a

# Clean up volumes
docker volume prune
```

## Performance Optimization

### Container Resource Management

**Memory Optimization:**
- **Container Limits**: Set appropriate memory limits
- **Garbage Collection**: Regular cleanup of unused resources
- **Volume Management**: Efficient storage utilization

**CPU Optimization:**
- **Process Monitoring**: Track Empire process performance
- **Load Balancing**: Distribute container load
- **Resource Limits**: Prevent CPU exhaustion

### Network Performance

**Port Management:**
- **Port Conflict Detection**: Automatic port availability checking
- **Network Optimization**: Container network configuration
- **Connection Pooling**: Efficient network resource usage

## Monitoring and Alerting

### Health Metrics

**Container Health:**
- **Uptime Monitoring**: Track container availability
- **Resource Usage**: Monitor CPU, memory, disk usage
- **Error Rate**: Track container failure frequency
- **Recovery Time**: Measure self-healing effectiveness

**Application Health:**
- **API Response Time**: Monitor Empire API performance
- **Database Performance**: Track database query times
- **UI Accessibility**: Monitor Starkiller interface availability

### Alerting System

**Alert Conditions:**
- **Container Failures**: Multiple consecutive failures
- **Resource Exhaustion**: High CPU/memory usage
- **API Unresponsiveness**: Service degradation
- **Recovery Failures**: Self-healing system issues

**Alert Actions:**
- **Automatic Recovery**: Trigger self-healing processes
- **Notification**: Send alerts to administrators
- **Logging**: Record incidents for analysis
- **Escalation**: Progressive response to persistent issues

## Security Considerations

### Container Security

**Access Control:**
- **User Permissions**: Proper Docker access management
- **Container Isolation**: Network and process isolation
- **Volume Security**: Secure data persistence

**Network Security:**
- **Port Exposure**: Minimize exposed ports
- **Network Segmentation**: Isolate Empire network traffic
- **SSL/TLS**: Secure communication channels

### Data Protection

**Database Security:**
- **Access Control**: Restrict database access
- **Backup Strategy**: Regular database backups
- **Encryption**: Encrypt sensitive data

**Log Security:**
- **Log Rotation**: Prevent log file growth
- **Access Logging**: Monitor system access
- **Audit Trail**: Maintain security audit logs

## Future Enhancements

### Planned Improvements

1. **Advanced Monitoring**: Enhanced metrics collection and analysis
2. **Predictive Healing**: Machine learning for failure prediction
3. **Cluster Support**: Multi-container Empire deployments
4. **Integration**: Enhanced integration with monitoring systems

### Scalability Improvements

1. **Load Balancing**: Multiple Empire instance support
2. **High Availability**: Failover and redundancy
3. **Performance Tuning**: Optimization for high-load scenarios
4. **Resource Scaling**: Dynamic resource allocation

## Conclusion

The Empire Container Self-Healing Solution provides:

1. **Automatic Recovery**: Comprehensive container failure detection and recovery
2. **Robust Cleanup**: Complete container cleanup preventing naming conflicts
3. **Intelligent Monitoring**: Advanced health monitoring with detailed diagnostics
4. **Troubleshooting Tools**: Comprehensive diagnostic and repair capabilities
5. **Performance Optimization**: Resource management and performance tuning
6. **Security**: Secure container management and data protection

This solution ensures Empire runs reliably with automatic recovery from container failures, providing long-term stability and minimal downtime.

The system operates transparently, automatically detecting and repairing container issues while providing detailed diagnostics for manual troubleshooting when needed.
