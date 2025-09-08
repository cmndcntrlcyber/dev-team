import { dockerErrorMonitor } from './docker-error-monitor';
import { dockerRecoveryEngine } from './docker-recovery-engine';

export interface SysreptorHealth {
  isHealthy: boolean;
  lastCheck: Date;
  responseTime?: number;
  error?: string;
}

class SysreptorHealthMonitor {
  private isMonitoring = false;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private lastHealth: SysreptorHealth = {
    isHealthy: false,
    lastCheck: new Date()
  };

  constructor() {
    this.startMonitoring();
  }

  public startMonitoring(): void {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    console.log('[SysreptorHealthMonitor] Starting health monitoring...');

    // Check every 15 seconds
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, 15000);

    // Perform initial check
    this.performHealthCheck();
  }

  public stopMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    this.isMonitoring = false;
    console.log('[SysreptorHealthMonitor] Stopped health monitoring');
  }

  public getLastHealth(): SysreptorHealth {
    return { ...this.lastHealth };
  }

  private async performHealthCheck(): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Try multiple health endpoints
      const healthEndpoints = [
        'http://localhost:9000/health',
        'http://localhost:9000/api/health',
        'http://localhost:9000/',
        'http://127.0.0.1:9000/health',
        'http://127.0.0.1:9000/api/health',
        'http://127.0.0.1:9000/'
      ];

      let lastError: string = '';
      let isHealthy = false;
      let responseTime = 0;

      for (const endpoint of healthEndpoints) {
        try {
          // Create AbortController for timeout
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

          const response = await fetch(endpoint, {
            method: 'GET',
            signal: controller.signal,
            headers: {
              'User-Agent': 'AttackNode-HealthMonitor/1.0'
            }
          });

          clearTimeout(timeoutId);

          responseTime = Date.now() - startTime;

          if (response.ok || response.status === 200) {
            isHealthy = true;
            console.log(`[SysreptorHealthMonitor] Health check passed (${endpoint}) - ${responseTime}ms`);
            break;
          } else if (response.status === 404) {
            // 404 might be normal if health endpoint doesn't exist but service is running
            isHealthy = true;
            console.log(`[SysreptorHealthMonitor] Service responding (${endpoint}) - ${responseTime}ms`);
            break;
          } else {
            lastError = `HTTP ${response.status}: ${response.statusText}`;
          }
        } catch (error: any) {
          lastError = error.message || 'Connection failed';
          continue; // Try next endpoint
        }
      }

      this.lastHealth = {
        isHealthy,
        lastCheck: new Date(),
        responseTime: isHealthy ? responseTime : undefined,
        error: isHealthy ? undefined : lastError
      };

      // If health check failed, trigger error monitoring
      if (!isHealthy) {
        console.error(`[SysreptorHealthMonitor] Health check failed: ${lastError}`);
        
        // Emit a health check failed error
        dockerErrorMonitor.analyzeError(
          `Sysreptor health check failed: ${lastError}`,
          {
            containerName: 'attacknode-sysreptor',
            operation: 'health_check',
            healthEndpoints: healthEndpoints,
            responseTime,
            lastError
          }
        );
      }

    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      const errorMessage = error.message || 'Unknown health check error';
      
      console.error(`[SysreptorHealthMonitor] Health check error: ${errorMessage}`);
      
      this.lastHealth = {
        isHealthy: false,
        lastCheck: new Date(),
        responseTime,
        error: errorMessage
      };

      // Emit a health check error
      dockerErrorMonitor.analyzeError(
        `Sysreptor health check error: ${errorMessage}`,
        {
          containerName: 'attacknode-sysreptor',
          operation: 'health_check',
          error: errorMessage,
          responseTime
        }
      );
    }
  }

  // Manual health check method for API calls
  public async checkHealth(): Promise<SysreptorHealth> {
    await this.performHealthCheck();
    return this.getLastHealth();
  }

  // Get health status for multiple checks
  public getHealthHistory(limit: number = 10): SysreptorHealth[] {
    // For now return current health, but this could be extended to track history
    return [this.lastHealth];
  }
}

export const sysreptorHealthMonitor = new SysreptorHealthMonitor();
