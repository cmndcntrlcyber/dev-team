import { exec } from 'child_process';
import { promisify } from 'util';
import { EventEmitter } from 'events';
import { volumePermissionManager } from './volume-permission-manager';

const execAsync = promisify(exec);

export interface RedisHealthStatus {
  containerRunning: boolean;
  redisResponding: boolean;
  aofEnabled: boolean;
  aofWritable: boolean;
  memoryUsage: number;
  connectedClients: number;
  lastError?: string;
  permissionIssues: string[];
  recommendations: string[];
}

export interface RedisConfig {
  appendonly: boolean;
  appendfsync: string;
  dir: string;
  maxmemory?: string;
  maxmemoryPolicy?: string;
}

export class RedisHealthMonitor extends EventEmitter {
  private healthCheckInterval?: NodeJS.Timeout;
  private lastHealthStatus?: RedisHealthStatus;
  private containerName = 'attacknode-redis';
  private isMonitoring = false;

  constructor() {
    super();
    this.startHealthMonitoring();
  }

  private startHealthMonitoring(): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    console.log('[RedisHealthMonitor] Starting Redis health monitoring...');
    
    this.healthCheckInterval = setInterval(async () => {
      try {
        const status = await this.checkRedisHealth();
        
        if (this.hasHealthChanged(status)) {
          this.lastHealthStatus = status;
          this.emit('health-status-change', status);
          
          if (status.permissionIssues.length > 0) {
            this.emit('permission-issues-detected', status);
          }
        }
      } catch (error) {
        console.error('[RedisHealthMonitor] Health check failed:', error);
      }
    }, 15000); // Check every 15 seconds
  }

  private hasHealthChanged(newStatus: RedisHealthStatus): boolean {
    if (!this.lastHealthStatus) return true;
    
    const previous = this.lastHealthStatus;
    return (
      previous.containerRunning !== newStatus.containerRunning ||
      previous.redisResponding !== newStatus.redisResponding ||
      previous.aofWritable !== newStatus.aofWritable ||
      previous.permissionIssues.length !== newStatus.permissionIssues.length ||
      previous.lastError !== newStatus.lastError
    );
  }

  async checkRedisHealth(): Promise<RedisHealthStatus> {
    const status: RedisHealthStatus = {
      containerRunning: false,
      redisResponding: false,
      aofEnabled: false,
      aofWritable: false,
      memoryUsage: 0,
      connectedClients: 0,
      permissionIssues: [],
      recommendations: []
    };

    try {
      // Check if Redis container is running
      status.containerRunning = await this.isContainerRunning();
      
      if (!status.containerRunning) {
        status.recommendations.push('Start Redis container');
        return status;
      }

      // Check if Redis is responding
      status.redisResponding = await this.isRedisResponding();
      
      if (!status.redisResponding) {
        status.recommendations.push('Check Redis container logs for errors');
        await this.checkPermissionIssues(status);
        return status;
      }

      // Get Redis configuration and stats
      await this.getRedisConfig(status);
      await this.getRedisStats(status);
      await this.checkAOFStatus(status);
      await this.checkPermissionIssues(status);
      
      // Generate recommendations
      this.generateRecommendations(status);
      
      return status;
    } catch (error) {
      status.lastError = error instanceof Error ? error.message : 'Unknown error';
      console.error('[RedisHealthMonitor] Health check error:', error);
      return status;
    }
  }

  private async isContainerRunning(): Promise<boolean> {
    try {
      const { stdout } = await execAsync(`docker ps -q --filter name=${this.containerName} --filter status=running`).catch(async () => {
        return await execAsync(`sudo docker ps -q --filter name=${this.containerName} --filter status=running`);
      });
      
      return stdout.trim().length > 0;
    } catch (error) {
      return false;
    }
  }

  private async isRedisResponding(): Promise<boolean> {
    try {
      const { stdout } = await execAsync(`docker exec ${this.containerName} redis-cli ping`).catch(async () => {
        return await execAsync(`sudo docker exec ${this.containerName} redis-cli ping`);
      });
      
      return stdout.trim() === 'PONG';
    } catch (error) {
      return false;
    }
  }

  private async getRedisConfig(status: RedisHealthStatus): Promise<void> {
    try {
      const configCmd = `docker exec ${this.containerName} redis-cli CONFIG GET "*"`;
      const { stdout } = await execAsync(configCmd).catch(async () => {
        return await execAsync(`sudo ${configCmd}`);
      });
      
      const configLines = stdout.trim().split('\n');
      const config: { [key: string]: string } = {};
      
      for (let i = 0; i < configLines.length; i += 2) {
        if (configLines[i + 1]) {
          config[configLines[i]] = configLines[i + 1];
        }
      }
      
      status.aofEnabled = config.appendonly === 'yes';
      
    } catch (error) {
      console.error('[RedisHealthMonitor] Failed to get Redis config:', error);
    }
  }

  private async getRedisStats(status: RedisHealthStatus): Promise<void> {
    try {
      const infoCmd = `docker exec ${this.containerName} redis-cli INFO`;
      const { stdout } = await execAsync(infoCmd).catch(async () => {
        return await execAsync(`sudo ${infoCmd}`);
      });
      
      const infoLines = stdout.split('\n');
      
      for (const line of infoLines) {
        if (line.startsWith('used_memory:')) {
          status.memoryUsage = parseInt(line.split(':')[1] || '0');
        } else if (line.startsWith('connected_clients:')) {
          status.connectedClients = parseInt(line.split(':')[1] || '0');
        }
      }
      
    } catch (error) {
      console.error('[RedisHealthMonitor] Failed to get Redis stats:', error);
    }
  }

  private async checkAOFStatus(status: RedisHealthStatus): Promise<void> {
    if (!status.aofEnabled) return;
    
    try {
      // Check if AOF directory is writable
      const aofCmd = `docker exec ${this.containerName} test -w /data/appendonlydir && echo "writable" || echo "not_writable"`;
      const { stdout } = await execAsync(aofCmd).catch(async () => {
        return await execAsync(`sudo ${aofCmd}`);
      });
      
      status.aofWritable = stdout.trim() === 'writable';
      
    } catch (error) {
      console.error('[RedisHealthMonitor] Failed to check AOF status:', error);
      status.aofWritable = false;
    }
  }

  private async checkPermissionIssues(status: RedisHealthStatus): Promise<void> {
    try {
      // Check redis-data volume permissions
      const volumeValidation = await volumePermissionManager.validateVolume('redis-data');
      
      if (volumeValidation.issues.length > 0) {
        status.permissionIssues.push(...volumeValidation.issues);
      }
      
      // Check container logs for permission errors
      const logsCmd = `docker logs ${this.containerName} --tail 50 2>&1 | grep -i "permission denied" || true`;
      const { stdout } = await execAsync(logsCmd).catch(async () => {
        return await execAsync(`sudo ${logsCmd}`);
      });
      
      if (stdout.trim()) {
        status.permissionIssues.push('Permission denied errors found in Redis logs');
        
        // Check specifically for AOF rewrite permission errors
        if (stdout.includes('temp file for AOF rewrite') || stdout.includes('rewriteAppendOnlyFile')) {
          status.permissionIssues.push('AOF rewrite permission error detected - temp file creation failed');
          console.warn('[RedisHealthMonitor] AOF rewrite permission error detected, triggering aggressive repair');
          
          // Emit specific event for AOF rewrite issues
          this.emit('aof-rewrite-permission-error', {
            message: 'AOF rewrite permission error detected',
            logs: stdout
          });
        }
      }
      
    } catch (error) {
      console.error('[RedisHealthMonitor] Failed to check permission issues:', error);
    }
  }

  private generateRecommendations(status: RedisHealthStatus): void {
    if (!status.containerRunning) {
      status.recommendations.push('Start Redis container');
    }
    
    if (!status.redisResponding) {
      status.recommendations.push('Check Redis container logs');
      status.recommendations.push('Verify Redis configuration');
    }
    
    if (status.aofEnabled && !status.aofWritable) {
      status.recommendations.push('Fix Redis AOF directory permissions');
      status.recommendations.push('Check volume mount permissions');
    }
    
    if (status.permissionIssues.length > 0) {
      status.recommendations.push('Run permission repair for Redis volumes');
      status.recommendations.push('Verify Redis container user permissions');
    }
    
    if (status.memoryUsage > 1000000000) { // 1GB
      status.recommendations.push('Consider setting Redis memory limits');
    }
  }

  async repairRedisHealth(): Promise<boolean> {
    console.log('[RedisHealthMonitor] Starting Redis health repair...');
    
    try {
      const status = await this.checkRedisHealth();
      
      if (status.permissionIssues.length > 0) {
        console.log('[RedisHealthMonitor] Fixing permission issues...');
        const permissionFixed = await volumePermissionManager.repairVolumePermissions('redis');
        
        if (!permissionFixed) {
          console.error('[RedisHealthMonitor] Failed to fix permission issues');
          return false;
        }
        
        // Wait for permissions to take effect
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      // If container is not running, attempt to start it
      if (!status.containerRunning) {
        console.log('[RedisHealthMonitor] Attempting to start Redis container...');
        await this.startRedisContainer();
      }
      
      // If Redis is not responding, restart the container
      if (status.containerRunning && !status.redisResponding) {
        console.log('[RedisHealthMonitor] Restarting Redis container...');
        await this.restartRedisContainer();
      }
      
      // Wait for Redis to be ready
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Final health check
      const finalStatus = await this.checkRedisHealth();
      const isHealthy = finalStatus.containerRunning && finalStatus.redisResponding && 
                       (finalStatus.aofEnabled ? finalStatus.aofWritable : true);
      
      console.log(`[RedisHealthMonitor] Health repair ${isHealthy ? 'successful' : 'failed'}`);
      return isHealthy;
      
    } catch (error) {
      console.error('[RedisHealthMonitor] Health repair failed:', error);
      return false;
    }
  }

  private async startRedisContainer(): Promise<void> {
    try {
      const startCmd = `docker start ${this.containerName}`;
      await execAsync(startCmd).catch(async () => {
        return await execAsync(`sudo ${startCmd}`);
      });
    } catch (error) {
      console.error('[RedisHealthMonitor] Failed to start Redis container:', error);
      throw error;
    }
  }

  private async restartRedisContainer(): Promise<void> {
    try {
      const restartCmd = `docker restart ${this.containerName}`;
      await execAsync(restartCmd).catch(async () => {
        return await execAsync(`sudo ${restartCmd}`);
      });
    } catch (error) {
      console.error('[RedisHealthMonitor] Failed to restart Redis container:', error);
      throw error;
    }
  }

  async getContainerLogs(): Promise<string> {
    try {
      const logsCmd = `docker logs ${this.containerName} --tail 100`;
      const { stdout } = await execAsync(logsCmd).catch(async () => {
        return await execAsync(`sudo ${logsCmd}`);
      });
      
      return stdout;
    } catch (error) {
      return `Error retrieving logs: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  async executeRedisCommand(command: string): Promise<string> {
    try {
      const redisCmd = `docker exec ${this.containerName} redis-cli ${command}`;
      const { stdout } = await execAsync(redisCmd).catch(async () => {
        return await execAsync(`sudo ${redisCmd}`);
      });
      
      return stdout.trim();
    } catch (error) {
      return `Error executing command: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  getLastHealthStatus(): RedisHealthStatus | undefined {
    return this.lastHealthStatus;
  }

  stop(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }
    this.isMonitoring = false;
    console.log('[RedisHealthMonitor] Stopped health monitoring');
  }
}

export const redisHealthMonitor = new RedisHealthMonitor();
