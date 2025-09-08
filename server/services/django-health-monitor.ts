import { exec } from 'child_process';
import { promisify } from 'util';
import { EventEmitter } from 'events';
import { djangoDatabaseValidator, DatabaseValidationResult } from './django-database-validator';
import { dockerErrorMonitor } from './docker-error-monitor';

const execAsync = promisify(exec);

export interface DjangoHealthStatus {
  isHealthy: boolean;
  containerRunning: boolean;
  databaseConnected: boolean;
  migrationsUpToDate: boolean;
  pluginsLoaded: boolean;
  lastChecked: Date;
  errors: string[];
  warnings: string[];
  performance: {
    responseTime: number;
    memoryUsage: number;
    cpuUsage: number;
  };
}

export interface DjangoHealthMetrics {
  uptime: number;
  totalRequests: number;
  errorRate: number;
  avgResponseTime: number;
  databaseConnections: number;
  healthScore: number;
}

export class DjangoHealthMonitor extends EventEmitter {
  private containerName: string;
  private healthCheckInterval?: NodeJS.Timeout;
  private metricsInterval?: NodeJS.Timeout;
  private lastHealthStatus?: DjangoHealthStatus;
  private healthHistory: DjangoHealthStatus[] = [];
  private metrics: DjangoHealthMetrics = {
    uptime: 0,
    totalRequests: 0,
    errorRate: 0,
    avgResponseTime: 0,
    databaseConnections: 0,
    healthScore: 0
  };
  private isMonitoring = false;
  private consecutiveFailures = 0;

  constructor(containerName: string = 'sysreptor-app') {
    super();
    this.containerName = containerName;
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Listen for database validator events
    djangoDatabaseValidator.on('validation-failed', (result: DatabaseValidationResult) => {
      this.handleDatabaseValidationFailure(result);
    });

    djangoDatabaseValidator.on('repair-success', () => {
      this.consecutiveFailures = 0;
      this.emit('database-repair-success');
    });

    djangoDatabaseValidator.on('repair-failed', (result: DatabaseValidationResult) => {
      this.consecutiveFailures++;
      this.emit('database-repair-failed', result);
    });
  }

  async startMonitoring(): Promise<void> {
    if (this.isMonitoring) {
      console.log('[DjangoHealthMonitor] Already monitoring');
      return;
    }

    console.log('[DjangoHealthMonitor] Starting Django health monitoring...');
    this.isMonitoring = true;

    // Initial health check
    await this.performHealthCheck();

    // Start regular health checks every 30 seconds
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        console.error('[DjangoHealthMonitor] Health check failed:', error);
      }
    }, 30000);

    // Start metrics collection every 60 seconds
    this.metricsInterval = setInterval(async () => {
      try {
        await this.collectMetrics();
      } catch (error) {
        console.error('[DjangoHealthMonitor] Metrics collection failed:', error);
      }
    }, 60000);

    this.emit('monitoring-started');
  }

  async stopMonitoring(): Promise<void> {
    if (!this.isMonitoring) {
      return;
    }

    console.log('[DjangoHealthMonitor] Stopping Django health monitoring...');
    this.isMonitoring = false;

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }

    this.emit('monitoring-stopped');
  }

  async performHealthCheck(): Promise<DjangoHealthStatus> {
    const healthStatus: DjangoHealthStatus = {
      isHealthy: false,
      containerRunning: false,
      databaseConnected: false,
      migrationsUpToDate: false,
      pluginsLoaded: false,
      lastChecked: new Date(),
      errors: [],
      warnings: [],
      performance: {
        responseTime: 0,
        memoryUsage: 0,
        cpuUsage: 0
      }
    };

    try {
      // Check 1: Container running status
      healthStatus.containerRunning = await this.isContainerRunning();
      if (!healthStatus.containerRunning) {
        healthStatus.errors.push('Django container is not running');
        healthStatus.isHealthy = false;
      }

      // Check 2: Database connectivity (only if container is running)
      if (healthStatus.containerRunning) {
        const dbValidation = await djangoDatabaseValidator.validateDatabaseConfiguration();
        healthStatus.databaseConnected = dbValidation.connectionWorking;
        healthStatus.migrationsUpToDate = dbValidation.schemaValid;
        
        if (!healthStatus.databaseConnected) {
          healthStatus.errors.push('Database connection failed');
          healthStatus.errors.push(...dbValidation.issues);
        }
      }

      // Check 3: Django application health
      if (healthStatus.containerRunning) {
        const appHealth = await this.checkDjangoApplication();
        healthStatus.pluginsLoaded = appHealth.pluginsLoaded;
        healthStatus.errors.push(...appHealth.errors);
        healthStatus.warnings.push(...appHealth.warnings);
        healthStatus.performance = appHealth.performance;
      }

      // Check 4: Overall health assessment
      healthStatus.isHealthy = healthStatus.containerRunning && 
                              healthStatus.databaseConnected && 
                              healthStatus.migrationsUpToDate && 
                              healthStatus.errors.length === 0;

      // Update health history
      this.lastHealthStatus = healthStatus;
      this.addToHealthHistory(healthStatus);

      // Emit health status event
      this.emit('health-status', healthStatus);

      // Handle unhealthy state
      if (!healthStatus.isHealthy) {
        this.consecutiveFailures++;
        this.emit('health-degraded', healthStatus);
        
        // Trigger recovery if consecutive failures exceed threshold
        if (this.consecutiveFailures >= 3) {
          this.emit('health-critical', healthStatus);
          await this.triggerRecovery(healthStatus);
        }
      } else {
        this.consecutiveFailures = 0;
        this.emit('health-restored', healthStatus);
      }

      return healthStatus;

    } catch (error) {
      healthStatus.isHealthy = false;
      healthStatus.errors.push(`Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      this.emit('health-check-error', error);
      return healthStatus;
    }
  }

  private async isContainerRunning(): Promise<boolean> {
    try {
      const { stdout } = await execAsync(`docker ps --filter "name=${this.containerName}" --format "{{.Names}}" 2>/dev/null || true`);
      return stdout.trim() === this.containerName;
    } catch (error) {
      return false;
    }
  }

  private async checkDjangoApplication(): Promise<{
    pluginsLoaded: boolean;
    errors: string[];
    warnings: string[];
    performance: { responseTime: number; memoryUsage: number; cpuUsage: number };
  }> {
    const result = {
      pluginsLoaded: false,
      errors: [] as string[],
      warnings: [] as string[],
      performance: { responseTime: 0, memoryUsage: 0, cpuUsage: 0 }
    };

    try {
      const startTime = Date.now();

      // Test Django management commands
      const { stdout: checkOutput, stderr: checkError } = await execAsync(
        `docker exec ${this.containerName} python manage.py check 2>&1 || true`
      );

      result.performance.responseTime = Date.now() - startTime;

      // Parse Django check output
      const output = checkOutput + checkError;
      
      if (output.includes('System check identified no issues')) {
        result.pluginsLoaded = true;
      } else {
        // Parse specific issues
        if (output.includes('ImproperlyConfigured')) {
          result.errors.push('Django configuration error detected');
        }
        
        if (output.includes('Plugin') && output.includes('not found')) {
          result.errors.push('Missing Django plugins detected');
        }
        
        if (output.includes('WARNING')) {
          const warnings = output.split('\n').filter(line => line.includes('WARNING'));
          result.warnings.push(...warnings);
        }
      }

      // Get container resource usage
      try {
        const { stdout: statsOutput } = await execAsync(
          `docker stats ${this.containerName} --no-stream --format "table {{.CPUPerc}},{{.MemUsage}}" 2>/dev/null || true`
        );
        
        const lines = statsOutput.split('\n');
        if (lines.length > 1) {
          const stats = lines[1].split(',');
          if (stats.length >= 2) {
            result.performance.cpuUsage = parseFloat(stats[0].replace('%', '')) || 0;
            
            // Parse memory usage (e.g., "123.4MiB / 1.5GiB")
            const memoryMatch = stats[1].match(/(\d+\.?\d*)\s*(\w+)/);
            if (memoryMatch) {
              const value = parseFloat(memoryMatch[1]);
              const unit = memoryMatch[2].toLowerCase();
              
              // Convert to MB
              let memoryMB = value;
              if (unit.includes('g')) {
                memoryMB = value * 1024;
              } else if (unit.includes('k')) {
                memoryMB = value / 1024;
              }
              
              result.performance.memoryUsage = memoryMB;
            }
          }
        }
      } catch (statsError) {
        // Stats are optional, continue without them
      }

      // Test HTTP endpoint if available
      try {
        const endpointTest = await this.testHttpEndpoint();
        if (endpointTest.error) {
          result.warnings.push(`HTTP endpoint test failed: ${endpointTest.error}`);
        }
      } catch (httpError) {
        // HTTP test is optional
      }

    } catch (error) {
      result.errors.push(`Django application check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return result;
  }

  private async testHttpEndpoint(): Promise<{ success: boolean; error?: string }> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch('http://localhost:9000/', {
        method: 'GET',
        signal: controller.signal
      }).catch(() => null);

      clearTimeout(timeoutId);

      if (response && (response.ok || response.status === 404)) {
        return { success: true };
      } else {
        return { success: false, error: 'HTTP endpoint not responding' };
      }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  private async collectMetrics(): Promise<void> {
    try {
      if (!this.lastHealthStatus) {
        return;
      }

      // Calculate uptime
      const containerUptime = await this.getContainerUptime();
      this.metrics.uptime = containerUptime;

      // Calculate health score based on recent health checks
      const recentChecks = this.healthHistory.slice(-10);
      const healthyChecks = recentChecks.filter(check => check.isHealthy).length;
      this.metrics.healthScore = Math.round((healthyChecks / Math.max(recentChecks.length, 1)) * 100);

      // Update average response time
      const recentResponseTimes = recentChecks.map(check => check.performance.responseTime);
      this.metrics.avgResponseTime = recentResponseTimes.reduce((a, b) => a + b, 0) / Math.max(recentResponseTimes.length, 1);

      // Error rate calculation
      const errorChecks = recentChecks.filter(check => check.errors.length > 0).length;
      this.metrics.errorRate = Math.round((errorChecks / Math.max(recentChecks.length, 1)) * 100);

      // Database connection count (mock for now)
      this.metrics.databaseConnections = this.lastHealthStatus.databaseConnected ? 1 : 0;

      this.emit('metrics-updated', this.metrics);

    } catch (error) {
      console.error('[DjangoHealthMonitor] Metrics collection failed:', error);
    }
  }

  private async getContainerUptime(): Promise<number> {
    try {
      const { stdout } = await execAsync(`docker inspect ${this.containerName} --format '{{.State.StartedAt}}' 2>/dev/null || true`);
      if (stdout.trim()) {
        const startTime = new Date(stdout.trim());
        return Math.floor((Date.now() - startTime.getTime()) / 1000);
      }
    } catch (error) {
      // Return 0 if can't determine uptime
    }
    return 0;
  }

  private async triggerRecovery(healthStatus: DjangoHealthStatus): Promise<void> {
    console.log('[DjangoHealthMonitor] Triggering recovery for Django health issues...');
    
    try {
      // Trigger database configuration repair if needed
      if (!healthStatus.databaseConnected || !healthStatus.migrationsUpToDate) {
        console.log('[DjangoHealthMonitor] Triggering database configuration repair...');
        const repairSuccess = await djangoDatabaseValidator.repairDatabaseConfiguration();
        
        if (repairSuccess) {
          console.log('[DjangoHealthMonitor] Database repair successful');
        } else {
          console.log('[DjangoHealthMonitor] Database repair failed');
        }
      }

      // Restart container if it's not running
      if (!healthStatus.containerRunning) {
        console.log('[DjangoHealthMonitor] Restarting Django container...');
        await this.restartContainer();
      }

      // Reset consecutive failures counter
      this.consecutiveFailures = 0;

    } catch (error) {
      console.error('[DjangoHealthMonitor] Recovery failed:', error);
      this.emit('recovery-failed', error);
    }
  }

  private async restartContainer(): Promise<void> {
    try {
      // Stop container gracefully
      await execAsync(`docker stop ${this.containerName} --time 10 2>/dev/null || true`);
      
      // Remove container
      await execAsync(`docker rm -f ${this.containerName} 2>/dev/null || true`);
      
      // Wait for cleanup
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Start container using docker-compose
      await execAsync('docker-compose up -d app').catch(async () => {
        return await execAsync('sudo docker-compose up -d app');
      });
      
      // Wait for container to be ready
      let retries = 0;
      while (retries < 15) {
        if (await this.isContainerRunning()) {
          console.log('[DjangoHealthMonitor] Container restart successful');
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 2000));
        retries++;
      }
      
      if (retries >= 15) {
        throw new Error('Container restart timeout');
      }
      
    } catch (error) {
      console.error('[DjangoHealthMonitor] Container restart failed:', error);
      throw error;
    }
  }

  private handleDatabaseValidationFailure(result: DatabaseValidationResult): void {
    console.log('[DjangoHealthMonitor] Database validation failed:', result.issues);
    
    // Emit specific database issues
    if (result.issues.some(issue => issue.includes('ImproperlyConfigured'))) {
      this.emit('database-config-error', result);
    }
    
    if (result.issues.some(issue => issue.includes('connection'))) {
      this.emit('database-connection-error', result);
    }
    
    if (result.issues.some(issue => issue.includes('migration'))) {
      this.emit('database-migration-error', result);
    }
  }

  private addToHealthHistory(healthStatus: DjangoHealthStatus): void {
    this.healthHistory.unshift(healthStatus);
    
    // Keep only last 100 health checks
    if (this.healthHistory.length > 100) {
      this.healthHistory = this.healthHistory.slice(0, 100);
    }
  }

  // Public methods for external access
  getLastHealthStatus(): DjangoHealthStatus | undefined {
    return this.lastHealthStatus;
  }

  getHealthHistory(limit: number = 10): DjangoHealthStatus[] {
    return this.healthHistory.slice(0, limit);
  }

  getMetrics(): DjangoHealthMetrics {
    return { ...this.metrics };
  }

  async performManualHealthCheck(): Promise<DjangoHealthStatus> {
    console.log('[DjangoHealthMonitor] Performing manual health check...');
    return await this.performHealthCheck();
  }

  async performManualRecovery(): Promise<boolean> {
    console.log('[DjangoHealthMonitor] Performing manual recovery...');
    
    try {
      // Force database repair
      const repairSuccess = await djangoDatabaseValidator.repairDatabaseConfiguration();
      
      if (repairSuccess) {
        // Restart container for good measure
        await this.restartContainer();
        
        // Wait and check health
        await new Promise(resolve => setTimeout(resolve, 5000));
        const healthStatus = await this.performHealthCheck();
        
        return healthStatus.isHealthy;
      }
      
      return false;
      
    } catch (error) {
      console.error('[DjangoHealthMonitor] Manual recovery failed:', error);
      return false;
    }
  }

  isMonitoringActive(): boolean {
    return this.isMonitoring;
  }

  getConsecutiveFailures(): number {
    return this.consecutiveFailures;
  }
}

export const djangoHealthMonitor = new DjangoHealthMonitor();
