import { exec } from 'child_process';
import { promisify } from 'util';
import { EventEmitter } from 'events';

const execAsync = promisify(exec);

export interface DockerError {
  id: string;
  timestamp: Date;
  type: DockerErrorType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  context: {
    containerName?: string;
    operation?: string;
    command?: string;
    port?: number;
    image?: string;
    conflictingContainerId?: string;
    missingPlugins?: string[];
    databaseName?: string;
    volumePath?: string;
    healthEndpoint?: string;
  };
  autoRecoverable: boolean;
  recoveryAttempts: number;
  resolved: boolean;
}

export enum DockerErrorType {
  PORT_CONFLICT = 'port_conflict',
  CONTAINER_NAME_CONFLICT = 'container_name_conflict',
  IMAGE_PULL_FAILED = 'image_pull_failed',
  PERMISSION_DENIED = 'permission_denied',
  RESOURCE_EXHAUSTED = 'resource_exhausted',
  NETWORK_ERROR = 'network_error',
  DOCKER_DAEMON_ERROR = 'docker_daemon_error',
  CONTAINER_START_FAILED = 'container_start_failed',
  VOLUME_MOUNT_ERROR = 'volume_mount_error',
  HEALTH_CHECK_FAILED = 'health_check_failed',
  DJANGO_DATABASE_CONFIG_ERROR = 'django_database_config_error',
  DJANGO_PLUGIN_MISSING_ERROR = 'django_plugin_missing_error',
  UNKNOWN_ERROR = 'unknown_error'
}

export interface ErrorPattern {
  type: DockerErrorType;
  patterns: RegExp[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  autoRecoverable: boolean;
  extractContext?: (error: string, match: RegExpMatchArray) => any;
}

export class DockerErrorMonitor extends EventEmitter {
  private errorHistory: DockerError[] = [];
  private errorPatterns: ErrorPattern[] = [];
  private monitoringActive = false;
  private healthCheckInterval?: NodeJS.Timeout;

  constructor() {
    super();
    this.initializeErrorPatterns();
    this.startHealthMonitoring();
  }

  private initializeErrorPatterns(): void {
    this.errorPatterns = [
      {
        type: DockerErrorType.PORT_CONFLICT,
        patterns: [
          /failed to bind host port.*address already in use/i,
          /port.*already in use/i,
          /bind: address already in use/i
        ],
        severity: 'high',
        autoRecoverable: true,
        extractContext: (error, match) => {
          const portMatch = error.match(/port\s+(\d+)/i);
          return { port: portMatch ? parseInt(portMatch[1]) : null };
        }
      },
      {
        type: DockerErrorType.CONTAINER_NAME_CONFLICT,
        patterns: [
          /the container name.*is already in use/i,
          /conflict.*container.*already in use/i,
          /name.*already in use by container/i,
          /container name ["'][^"']*["'] is already in use/i,
          /conflict.*the container name.*is already in use/i,
          /you have to remove.*that container to be able to reuse that name/i
        ],
        severity: 'high',
        autoRecoverable: true,
        extractContext: (error, match) => {
          // Try multiple patterns to extract container name
          let containerName = null;
          
          // Pattern 1: "container name "/name" is already in use"
          let nameMatch = error.match(/container name ["']([^"']+)["'] is already in use/i);
          if (nameMatch) {
            containerName = nameMatch[1];
          }
          
          // Pattern 2: "container name /name is already in use"
          if (!containerName) {
            nameMatch = error.match(/container name ([^\s]+) is already in use/i);
            if (nameMatch) {
              containerName = nameMatch[1].replace(/^["']|["']$/g, '');
            }
          }
          
          // Pattern 3: Extract container ID from error message
          const containerIdMatch = error.match(/by container ["']([a-f0-9]{12,64})["']/i);
          const containerId = containerIdMatch ? containerIdMatch[1] : null;
          
          return { 
            containerName: containerName ? containerName.replace(/^\//, '') : null,
            conflictingContainerId: containerId
          };
        }
      },
      {
        type: DockerErrorType.IMAGE_PULL_FAILED,
        patterns: [
          /pull access denied/i,
          /repository does not exist/i,
          /manifest unknown/i,
          /failed to pull image/i
        ],
        severity: 'medium',
        autoRecoverable: false,
        extractContext: (error, match) => {
          const imageMatch = error.match(/image\s+["']?([^"'\s]+)["']?/i);
          return { image: imageMatch ? imageMatch[1] : null };
        }
      },
      {
        type: DockerErrorType.PERMISSION_DENIED,
        patterns: [
          /permission denied/i,
          /access denied/i,
          /operation not permitted/i,
          /unauthorized/i,
          /can't open or create append-only dir/i,
          /appendonlydir.*permission denied/i,
          /redis.*permission denied/i,
          /can't create\/write to append only file/i,
          /failed to create directory.*permission denied/i,
          /opening the append only file.*permission denied/i,
          /redis server.*permission denied/i,
          /opening the temp file for aof rewrite.*permission denied/i,
          /rewriteappendonlyfile.*permission denied/i,
          /temp file.*aof.*permission denied/i,
          /can't handle rdb format version \d+/i,
          /error reading the rdb base file.*aof.*base\.rdb/i,
          /aof loading aborted/i,
          /fatal error loading the db/i,
          /corrupted rdb file/i,
          /permission denied.*postgresql.*data/i,
          /could not open file.*postmaster\.pid.*permission denied/i,
          /data directory.*permission denied/i,
          /initdb.*permission denied/i,
          /postgres.*permission denied/i,
          /could not create.*directory.*permission denied/i
        ],
        severity: 'high',
        autoRecoverable: true,
        extractContext: (error, match) => {
          let containerName = null;
          let volumePath = null;
          
          // Extract container name from Redis errors
          if (error.includes('redis') || error.includes('appendonly')) {
            containerName = 'redis';
          }
          
          // Extract volume path from directory errors
          const pathMatch = error.match(/(?:dir|directory|file)\s+["']?([^"'\s]+)["']?/i);
          if (pathMatch) {
            volumePath = pathMatch[1];
          }
          
          return { containerName, volumePath };
        }
      },
      {
        type: DockerErrorType.RESOURCE_EXHAUSTED,
        patterns: [
          /no space left on device/i,
          /cannot allocate memory/i,
          /resource temporarily unavailable/i,
          /disk quota exceeded/i
        ],
        severity: 'critical',
        autoRecoverable: true
      },
      {
        type: DockerErrorType.NETWORK_ERROR,
        patterns: [
          /network unreachable/i,
          /connection refused/i,
          /timeout/i,
          /no route to host/i
        ],
        severity: 'medium',
        autoRecoverable: true
      },
      {
        type: DockerErrorType.DOCKER_DAEMON_ERROR,
        patterns: [
          /cannot connect to the docker daemon/i,
          /docker daemon not running/i,
          /is the docker daemon running/i
        ],
        severity: 'critical',
        autoRecoverable: false
      },
      {
        type: DockerErrorType.VOLUME_MOUNT_ERROR,
        patterns: [
          /invalid mount config/i,
          /no such file or directory.*volume/i,
          /invalid volume specification/i
        ],
        severity: 'medium',
        autoRecoverable: true
      },
      {
        type: DockerErrorType.HEALTH_CHECK_FAILED,
        patterns: [
          /sysreptor health check failed/i,
          /health check failed/i,
          /service health check error/i,
          /connection failed.*health/i,
          /timeout.*health check/i,
          /http.*failed.*health/i
        ],
        severity: 'high',
        autoRecoverable: true,
        extractContext: (error, match) => {
          const containerMatch = error.match(/container[:\s]+([^\s,]+)/i);
          const endpointMatch = error.match(/endpoint[:\s]+([^\s,]+)/i);
          return { 
            containerName: containerMatch ? containerMatch[1] : 'sysreptor',
            healthEndpoint: endpointMatch ? endpointMatch[1] : null
          };
        }
      },
      {
        type: DockerErrorType.DJANGO_DATABASE_CONFIG_ERROR,
        patterns: [
          /settings\.DATABASES is improperly configured/i,
          /Please supply the NAME or OPTIONS\['service'\] value/i,
          /django\.core\.exceptions\.ImproperlyConfigured.*DATABASES/i,
          /ImproperlyConfigured.*settings\.DATABASES/i,
          /DATABASES configuration.*missing/i,
          /database.*improperly configured/i
        ],
        severity: 'high',
        autoRecoverable: true,
        extractContext: (error, match) => {
          const dbMatch = error.match(/database[:\s]+([^\s,'"]+)/i);
          return { 
            containerName: 'sysreptor-app',
            databaseName: dbMatch ? dbMatch[1] : null,
            operation: 'database_config'
          };
        }
      },
      {
        type: DockerErrorType.DJANGO_PLUGIN_MISSING_ERROR,
        patterns: [
          /Plugin "([^"]+)" not found in plugins/i,
          /WARNING:root:Plugin "([^"]+)" not found/i,
          /plugin.*not found/i,
          /missing plugin/i,
          /plugin.*could not be loaded/i,
          /failed to load plugin/i
        ],
        severity: 'medium',
        autoRecoverable: true,
        extractContext: (error, match) => {
          const pluginMatch = error.match(/Plugin "([^"]+)" not found/i);
          let missingPlugins: string[] = [];
          
          if (pluginMatch) {
            // Split comma-separated plugins
            missingPlugins = pluginMatch[1].split(',').map(p => p.trim());
          }
          
          return { 
            containerName: 'sysreptor-app',
            missingPlugins: missingPlugins,
            operation: 'plugin_loading'
          };
        }
      }
    ];
  }

  analyzeError(errorMessage: string, context: any = {}): DockerError | null {
    for (const pattern of this.errorPatterns) {
      for (const regex of pattern.patterns) {
        const match = errorMessage.match(regex);
        if (match) {
          const extractedContext = pattern.extractContext ? 
            pattern.extractContext(errorMessage, match) : {};
          
          const dockerError: DockerError = {
            id: this.generateErrorId(),
            timestamp: new Date(),
            type: pattern.type,
            severity: pattern.severity,
            message: errorMessage,
            context: { ...context, ...extractedContext },
            autoRecoverable: pattern.autoRecoverable,
            recoveryAttempts: 0,
            resolved: false
          };

          this.addToHistory(dockerError);
          this.emit('error-detected', dockerError);
          
          console.log(`[DockerErrorMonitor] Detected ${pattern.type}: ${errorMessage}`);
          return dockerError;
        }
      }
    }

    // Unknown error
    const unknownError: DockerError = {
      id: this.generateErrorId(),
      timestamp: new Date(),
      type: DockerErrorType.UNKNOWN_ERROR,
      severity: 'medium',
      message: errorMessage,
      context,
      autoRecoverable: false,
      recoveryAttempts: 0,
      resolved: false
    };

    this.addToHistory(unknownError);
    this.emit('error-detected', unknownError);
    return unknownError;
  }

  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private addToHistory(error: DockerError): void {
    this.errorHistory.unshift(error);
    
    // Keep only last 1000 errors
    if (this.errorHistory.length > 1000) {
      this.errorHistory = this.errorHistory.slice(0, 1000);
    }
  }

  getErrorHistory(limit: number = 50): DockerError[] {
    return this.errorHistory.slice(0, limit);
  }

  getErrorStats(): {
    total: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
    resolved: number;
    autoRecoverable: number;
  } {
    const stats = {
      total: this.errorHistory.length,
      byType: {} as Record<string, number>,
      bySeverity: {} as Record<string, number>,
      resolved: 0,
      autoRecoverable: 0
    };

    for (const error of this.errorHistory) {
      stats.byType[error.type] = (stats.byType[error.type] || 0) + 1;
      stats.bySeverity[error.severity] = (stats.bySeverity[error.severity] || 0) + 1;
      
      if (error.resolved) stats.resolved++;
      if (error.autoRecoverable) stats.autoRecoverable++;
    }

    return stats;
  }

  markErrorResolved(errorId: string): void {
    const error = this.errorHistory.find(e => e.id === errorId);
    if (error) {
      error.resolved = true;
      this.emit('error-resolved', error);
    }
  }

  incrementRecoveryAttempts(errorId: string): void {
    const error = this.errorHistory.find(e => e.id === errorId);
    if (error) {
      error.recoveryAttempts++;
    }
  }

  private async startHealthMonitoring(): Promise<void> {
    this.monitoringActive = true;
    
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        console.error('[DockerErrorMonitor] Health check failed:', error);
      }
    }, 30000); // Check every 30 seconds
  }

  private async performHealthCheck(): Promise<void> {
    try {
      // Check Docker daemon status
      await execAsync('docker info').catch(async () => {
        return await execAsync('sudo docker info');
      });

      // Check disk space
      const { stdout } = await execAsync('df -h /var/lib/docker 2>/dev/null || df -h / 2>/dev/null');
      const lines = stdout.split('\n');
      if (lines.length > 1) {
        const diskInfo = lines[1].split(/\s+/);
        const usagePercent = parseInt(diskInfo[4]?.replace('%', '') || '0');
        
        if (usagePercent > 90) {
          this.analyzeError('Disk space critical: Over 90% usage detected', {
            operation: 'health_check',
            diskUsage: usagePercent
          });
        }
      }

      // Check memory usage
      const { stdout: memInfo } = await execAsync('free -m');
      const memLines = memInfo.split('\n');
      const memLine = memLines.find(line => line.startsWith('Mem:'));
      if (memLine) {
        const memParts = memLine.split(/\s+/);
        const total = parseInt(memParts[1]);
        const available = parseInt(memParts[6] || memParts[3]);
        const usagePercent = ((total - available) / total) * 100;
        
        if (usagePercent > 95) {
          this.analyzeError('Memory usage critical: Over 95% usage detected', {
            operation: 'health_check',
            memoryUsage: usagePercent
          });
        }
      }

    } catch (error) {
      this.analyzeError(`Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`, {
        operation: 'health_check'
      });
    }
  }

  async getSystemHealth(): Promise<{
    dockerDaemon: boolean;
    diskSpace: { usage: number; available: string };
    memory: { usage: number; available: string };
    errors: { recent: number; critical: number };
  }> {
    const health = {
      dockerDaemon: false,
      diskSpace: { usage: 0, available: '0GB' },
      memory: { usage: 0, available: '0GB' },
      errors: { recent: 0, critical: 0 }
    };

    try {
      // Check Docker daemon
      await execAsync('docker info').catch(async () => {
        return await execAsync('sudo docker info');
      });
      health.dockerDaemon = true;
    } catch {
      health.dockerDaemon = false;
    }

    try {
      // Get disk info
      const { stdout } = await execAsync('df -h /var/lib/docker 2>/dev/null || df -h / 2>/dev/null');
      const lines = stdout.split('\n');
      if (lines.length > 1) {
        const diskInfo = lines[1].split(/\s+/);
        health.diskSpace.usage = parseInt(diskInfo[4]?.replace('%', '') || '0');
        health.diskSpace.available = diskInfo[3] || '0GB';
      }

      // Get memory info
      const { stdout: memInfo } = await execAsync('free -h');
      const memLines = memInfo.split('\n');
      const memLine = memLines.find(line => line.startsWith('Mem:'));
      if (memLine) {
        const memParts = memLine.split(/\s+/);
        const total = parseFloat(memParts[1]);
        const available = parseFloat(memParts[6] || memParts[3]);
        health.memory.usage = Math.round(((total - available) / total) * 100);
        health.memory.available = memParts[6] || memParts[3];
      }
    } catch (error) {
      console.warn('[DockerErrorMonitor] Failed to get system info:', error);
    }

    // Count recent and critical errors
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    health.errors.recent = this.errorHistory.filter(e => e.timestamp > oneHourAgo).length;
    health.errors.critical = this.errorHistory.filter(e => e.severity === 'critical' && !e.resolved).length;

    return health;
  }

  stop(): void {
    this.monitoringActive = false;
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
  }
}

export const dockerErrorMonitor = new DockerErrorMonitor();
