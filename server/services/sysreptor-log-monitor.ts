import { exec } from 'child_process';
import { promisify } from 'util';
import { EventEmitter } from 'events';
import { dockerErrorMonitor } from './docker-error-monitor';

const execAsync = promisify(exec);

export class SysreptorLogMonitor extends EventEmitter {
  private monitoringActive = false;
  private logProcess: any = null;
  private errorBuffer: string[] = [];
  private readonly maxBufferSize = 100;

  constructor() {
    super();
  }

  async startMonitoring(): Promise<void> {
    if (this.monitoringActive) {
      console.log('[SysreptorLogMonitor] Already monitoring');
      return;
    }

    this.monitoringActive = true;
    console.log('[SysreptorLogMonitor] Starting Sysreptor log monitoring...');

    try {
      // Start monitoring sysreptor container logs
      await this.startLogStreaming();
      
      // Also check for existing errors in recent logs
      await this.checkRecentLogs();

      console.log('[SysreptorLogMonitor] Monitoring started successfully');
    } catch (error) {
      console.error('[SysreptorLogMonitor] Failed to start monitoring:', error);
      this.monitoringActive = false;
    }
  }

  private async startLogStreaming(): Promise<void> {
    const containerNames = [
      'sysreptor-app',
      'attacknode-sysreptor',
      'sysreptor_app_1',
      'sysreptor-sysreptor-1'
    ];

    // Find the actual container name
    let activeContainer = null;
    for (const name of containerNames) {
      try {
        const { stdout } = await execAsync(`docker ps --filter "name=${name}" --format "{{.Names}}" 2>/dev/null`);
        if (stdout.trim()) {
          activeContainer = stdout.trim().split('\n')[0];
          break;
        }
      } catch (error) {
        // Continue checking other names
      }
    }

    if (!activeContainer) {
      console.log('[SysreptorLogMonitor] No active sysreptor container found, will retry...');
      // Retry in 30 seconds
      setTimeout(() => {
        if (this.monitoringActive) {
          this.startLogStreaming();
        }
      }, 30000);
      return;
    }

    console.log(`[SysreptorLogMonitor] Monitoring container: ${activeContainer}`);

    // Start streaming logs
    const logCommand = `docker logs -f --tail=50 ${activeContainer}`;
    
    try {
      this.logProcess = exec(logCommand);
      
      this.logProcess.stdout?.on('data', (data: string) => {
        this.processLogData(data);
      });

      this.logProcess.stderr?.on('data', (data: string) => {
        this.processLogData(data);
      });

      this.logProcess.on('exit', (code: number) => {
        console.log(`[SysreptorLogMonitor] Log process exited with code ${code}`);
        if (this.monitoringActive) {
          // Restart after a delay
          setTimeout(() => {
            this.startLogStreaming();
          }, 5000);
        }
      });

      this.logProcess.on('error', (error: Error) => {
        console.error('[SysreptorLogMonitor] Log process error:', error);
        if (this.monitoringActive) {
          // Restart after a delay
          setTimeout(() => {
            this.startLogStreaming();
          }, 5000);
        }
      });

    } catch (error) {
      console.error('[SysreptorLogMonitor] Failed to start log streaming:', error);
      // Retry with sudo
      try {
        this.logProcess = exec(`sudo ${logCommand}`);
        // Set up the same event handlers...
      } catch (sudoError) {
        console.error('[SysreptorLogMonitor] Failed to start log streaming with sudo:', sudoError);
      }
    }
  }

  private async checkRecentLogs(): Promise<void> {
    const containerNames = [
      'sysreptor-app',
      'attacknode-sysreptor', 
      'sysreptor_app_1',
      'sysreptor-sysreptor-1'
    ];

    for (const name of containerNames) {
      try {
        const { stdout } = await execAsync(`docker logs --tail=100 ${name} 2>&1`).catch(async () => {
          return await execAsync(`sudo docker logs --tail=100 ${name} 2>&1`);
        });

        if (stdout.trim()) {
          console.log(`[SysreptorLogMonitor] Checking recent logs for ${name}`);
          this.processLogData(stdout);
          break;
        }
      } catch (error) {
        // Continue checking other containers
      }
    }
  }

  private processLogData(data: string): void {
    const lines = data.split('\n');
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      // Add to buffer
      this.errorBuffer.push(trimmedLine);
      if (this.errorBuffer.length > this.maxBufferSize) {
        this.errorBuffer.shift();
      }

      // Check for Django database configuration errors
      if (this.isDatabaseConfigError(trimmedLine)) {
        console.log(`[SysreptorLogMonitor] Detected database config error: ${trimmedLine}`);
        dockerErrorMonitor.analyzeError(trimmedLine, {
          containerName: 'sysreptor-app',
          operation: 'database_config',
          source: 'log_monitor'
        });
      }

      // Check for Django plugin errors
      if (this.isPluginError(trimmedLine)) {
        console.log(`[SysreptorLogMonitor] Detected plugin error: ${trimmedLine}`);
        dockerErrorMonitor.analyzeError(trimmedLine, {
          containerName: 'sysreptor-app',
          operation: 'plugin_loading',
          source: 'log_monitor'
        });
      }

      // Check for other Django errors
      if (this.isGeneralDjangoError(trimmedLine)) {
        console.log(`[SysreptorLogMonitor] Detected Django error: ${trimmedLine}`);
        dockerErrorMonitor.analyzeError(trimmedLine, {
          containerName: 'sysreptor-app',
          operation: 'django_startup',
          source: 'log_monitor'
        });
      }
    }
  }

  private isDatabaseConfigError(line: string): boolean {
    const patterns = [
      /settings\.DATABASES is improperly configured/i,
      /Please supply the NAME or OPTIONS\['service'\] value/i,
      /django\.core\.exceptions\.ImproperlyConfigured.*DATABASES/i,
      /ImproperlyConfigured.*settings\.DATABASES/i,
      /DATABASES configuration.*missing/i,
      /database.*improperly configured/i
    ];

    return patterns.some(pattern => pattern.test(line));
  }

  private isPluginError(line: string): boolean {
    const patterns = [
      /Plugin "([^"]+)" not found in plugins/i,
      /WARNING:root:Plugin "([^"]+)" not found/i,
      /plugin.*not found/i,
      /missing plugin/i,
      /plugin.*could not be loaded/i,
      /failed to load plugin/i
    ];

    return patterns.some(pattern => pattern.test(line));
  }

  private isGeneralDjangoError(line: string): boolean {
    const patterns = [
      /django\.core\.exceptions/i,
      /django\.db\.utils\.IntegrityError/i,
      /django\.db\.utils\.ProgrammingError/i,
      /django\.db\.utils\.OperationalError/i,
      /ModuleNotFoundError.*django/i,
      /ImportError.*django/i,
      /AttributeError.*django/i
    ];

    return patterns.some(pattern => pattern.test(line));
  }

  async testErrorDetection(): Promise<void> {
    console.log('[SysreptorLogMonitor] Testing error detection with recent errors...');
    
    const testErrors = [
      'django.core.exceptions.ImproperlyConfigured: settings.DATABASES is improperly configured. Please supply the NAME or OPTIONS[\'service\'] value.',
      'WARNING:root:Plugin "cyberchef,graphqlvoyager,checkthehash" not found in plugins'
    ];

    for (const error of testErrors) {
      console.log(`[SysreptorLogMonitor] Testing error: ${error}`);
      this.processLogData(error);
    }
  }

  async stopMonitoring(): Promise<void> {
    console.log('[SysreptorLogMonitor] Stopping monitoring...');
    this.monitoringActive = false;
    
    if (this.logProcess) {
      this.logProcess.kill();
      this.logProcess = null;
    }
  }

  getErrorBuffer(): string[] {
    return [...this.errorBuffer];
  }

  isActive(): boolean {
    return this.monitoringActive;
  }
}

export const sysreptorLogMonitor = new SysreptorLogMonitor();
