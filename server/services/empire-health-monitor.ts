import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

interface EmpireHealthStatus {
  isRunning: boolean;
  apiResponding: boolean;
  databaseConnected: boolean;
  lastError?: string;
  setupCompleted: boolean;
  starkiller: boolean;
  containerId?: string;
  containerStatus?: string;
  uptime?: number;
  errors: string[];
  warnings: string[];
}

class EmpireHealthMonitor {
  private monitoringInterval: NodeJS.Timeout | null = null;
  private readonly checkInterval = 30000; // 30 seconds
  private readonly containerName = 'attacknode-empire';
  private readonly logFile = path.join(process.cwd(), 'logs', 'empire-health.log');
  private lastHealthCheck: EmpireHealthStatus | null = null;
  private consecutiveFailures = 0;
  private readonly maxConsecutiveFailures = 3;

  constructor() {
    this.ensureLogDirectory();
    this.startMonitoring();
  }

  private async ensureLogDirectory(): Promise<void> {
    const logDir = path.dirname(this.logFile);
    try {
      await fs.mkdir(logDir, { recursive: true });
    } catch (error) {
      console.error('[EmpireHealthMonitor] Failed to create log directory:', error);
    }
  }

  private async logMessage(level: 'INFO' | 'WARN' | 'ERROR', message: string): Promise<void> {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${level}] ${message}\n`;
    
    try {
      await fs.appendFile(this.logFile, logEntry);
    } catch (error) {
      console.error('[EmpireHealthMonitor] Failed to write to log file:', error);
    }
    
    console.log(`[EmpireHealthMonitor] ${logEntry.trim()}`);
  }

  public startMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    this.logMessage('INFO', 'Starting Empire health monitoring');
    
    this.monitoringInterval = setInterval(async () => {
      try {
        const health = await this.checkHealth();
        await this.handleHealthStatus(health);
      } catch (error) {
        await this.logMessage('ERROR', `Health check failed: ${error}`);
      }
    }, this.checkInterval);

    // Initial health check
    this.checkHealth().then(health => this.handleHealthStatus(health));
  }

  public stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      this.logMessage('INFO', 'Empire health monitoring stopped');
    }
  }

  public async checkHealth(): Promise<EmpireHealthStatus> {
    const health: EmpireHealthStatus = {
      isRunning: false,
      apiResponding: false,
      databaseConnected: false,
      setupCompleted: false,
      starkiller: false,
      errors: [],
      warnings: []
    };

    try {
      // Check if container exists and is running
      const containerInfo = await this.getContainerInfo();
      health.containerId = containerInfo.id;
      health.containerStatus = containerInfo.status;
      health.isRunning = containerInfo.status === 'running';
      health.uptime = containerInfo.uptime;

      if (!health.isRunning) {
        health.errors.push('Empire container is not running');
        return health;
      }

      // Check container logs for setup completion
      const logs = await this.getContainerLogs();
      health.setupCompleted = this.checkSetupCompleted(logs);
      
      if (!health.setupCompleted) {
        health.errors.push('Empire setup has not completed successfully');
      }

      // Check if API is responding
      health.apiResponding = await this.checkApiHealth();
      
      if (!health.apiResponding) {
        health.errors.push('Empire API is not responding on port 1337');
      }

      // Check database connection (Empire uses SQLite by default)
      health.databaseConnected = await this.checkDatabaseConnection();
      
      if (!health.databaseConnected) {
        health.errors.push('Empire database connection failed');
      }

      // Check if Starkiller is accessible
      health.starkiller = await this.checkStarkiller();
      
      if (!health.starkiller) {
        health.warnings.push('Starkiller UI may not be accessible');
      }

      // Analyze logs for common issues
      const logAnalysis = this.analyzeLogs(logs);
      health.errors.push(...logAnalysis.errors);
      health.warnings.push(...logAnalysis.warnings);

    } catch (error) {
      health.errors.push(`Health check failed: ${error}`);
      health.lastError = error instanceof Error ? error.message : String(error);
    }

    this.lastHealthCheck = health;
    return health;
  }

  private async getContainerInfo(): Promise<{
    id: string;
    status: string;
    uptime?: number;
  }> {
    try {
      const { stdout } = await execAsync(`docker inspect ${this.containerName} --format "{{.Id}}\t{{.State.Status}}\t{{.State.StartedAt}}"`)
        .catch(async () => {
          return await execAsync(`sudo docker inspect ${this.containerName} --format "{{.Id}}\t{{.State.Status}}\t{{.State.StartedAt}}"`);
        });

      const [id, status, startedAt] = stdout.trim().split('\t');
      
      let uptime: number | undefined;
      if (startedAt && status === 'running') {
        const startTime = new Date(startedAt).getTime();
        uptime = Date.now() - startTime;
      }

      return { id, status, uptime };
    } catch (error) {
      throw new Error(`Container ${this.containerName} not found or not accessible`);
    }
  }

  private async getContainerLogs(): Promise<string> {
    try {
      const { stdout } = await execAsync(`docker logs ${this.containerName} --tail 100`)
        .catch(async () => {
          return await execAsync(`sudo docker logs ${this.containerName} --tail 100`);
        });
      return stdout;
    } catch (error) {
      throw new Error(`Failed to get container logs: ${error}`);
    }
  }

  private checkSetupCompleted(logs: string): boolean {
    const setupIndicators = [
      'Empire starting up',
      'Application startup complete',
      'Uvicorn running on',
      'Empire database initialized',
      'Starting Empire server',
      'Empire REST API running',
      'Empire started successfully',
      'Server running at',
      'Starkiller served at'
    ];

    // Check for the specific success pattern from the logs
    const hasStartupComplete = logs.includes('Application startup complete');
    const hasUvicornRunning = logs.includes('Uvicorn running on');
    const hasEmpireStarting = logs.includes('Empire starting up');
    
    // Empire is ready when we see the startup sequence complete
    if (hasStartupComplete && hasUvicornRunning && hasEmpireStarting) {
      return true;
    }

    // Fallback to any of the indicators
    return setupIndicators.some(indicator => 
      logs.toLowerCase().includes(indicator.toLowerCase())
    );
  }

  private async checkApiHealth(): Promise<boolean> {
    try {
      // Try multiple Empire API endpoints
      const endpoints = [
        'http://localhost:1337/api/admin/users',
        'http://localhost:1337/api/users',
        'http://localhost:1337/api/',
        'http://localhost:1337/'
      ];
      
      for (const endpoint of endpoints) {
        try {
          const { stdout } = await execAsync(`curl -s -I ${endpoint} --max-time 5`)
            .catch(() => ({ stdout: '' }));
          
          // Check for successful HTTP response codes (200, 401, 403 are all valid - means API is responding)
          if (stdout.includes('HTTP/1.1 200') || 
              stdout.includes('HTTP/1.1 401') || 
              stdout.includes('HTTP/1.1 403')) {
            return true;
          }
        } catch (error) {
          continue;
        }
      }
      
      // Fallback: check if Empire process is running
      try {
        const { stdout } = await execAsync(`docker exec ${this.containerName} pgrep -f "empire" 2>/dev/null`)
          .catch(() => ({ stdout: '' }));
        
        return stdout.trim().length > 0;
      } catch (error) {
        return false;
      }
    } catch (error) {
      return false;
    }
  }

  private async checkDatabaseConnection(): Promise<boolean> {
    try {
      // Check if Empire database file exists and is accessible
      const { stdout } = await execAsync(`docker exec ${this.containerName} ls -la /empire/empire.db`)
        .catch(async () => {
          return await execAsync(`sudo docker exec ${this.containerName} ls -la /empire/empire.db`);
        });
      
      return stdout.includes('empire.db');
    } catch (error) {
      return false;
    }
  }

  private async checkStarkiller(): Promise<boolean> {
    try {
      // Check if Starkiller port is listening
      const { stdout } = await execAsync(`docker exec ${this.containerName} netstat -tlnp | grep :5000`)
        .catch(async () => {
          return await execAsync(`sudo docker exec ${this.containerName} netstat -tlnp | grep :5000`);
        });
      
      return stdout.includes(':5000');
    } catch (error) {
      return false;
    }
  }

  private analyzeLogs(logs: string): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    const logLines = logs.split('\n');

    for (const line of logLines) {
      const lowerLine = line.toLowerCase();

      // Check for critical errors
      if (lowerLine.includes('error') || lowerLine.includes('exception') || lowerLine.includes('failed')) {
        if (lowerLine.includes('database')) {
          errors.push('Database connection error detected in logs');
        } else if (lowerLine.includes('permission')) {
          errors.push('Permission error detected in logs');
        } else if (lowerLine.includes('port') || lowerLine.includes('bind')) {
          errors.push('Port binding error detected in logs');
        } else if (lowerLine.includes('import') || lowerLine.includes('module')) {
          errors.push('Module import error detected in logs');
        } else {
          errors.push(`General error detected: ${line.trim()}`);
        }
      }

      // Check for warnings
      if (lowerLine.includes('warning') || lowerLine.includes('warn')) {
        warnings.push(`Warning detected: ${line.trim()}`);
      }
    }

    return { errors: Array.from(new Set(errors)), warnings: Array.from(new Set(warnings)) };
  }

  private async handleHealthStatus(health: EmpireHealthStatus): Promise<void> {
    if (health.errors.length > 0) {
      this.consecutiveFailures++;
      await this.logMessage('ERROR', `Empire health check failed (${this.consecutiveFailures}/${this.maxConsecutiveFailures}): ${health.errors.join(', ')}`);
      
      if (this.consecutiveFailures >= this.maxConsecutiveFailures) {
        await this.logMessage('ERROR', 'Maximum consecutive failures reached, attempting recovery');
        await this.attemptRecovery();
      }
    } else {
      if (this.consecutiveFailures > 0) {
        await this.logMessage('INFO', 'Empire health recovered successfully');
      }
      this.consecutiveFailures = 0;
    }

    if (health.warnings.length > 0) {
      await this.logMessage('WARN', `Empire warnings: ${health.warnings.join(', ')}`);
    }
  }

  private async attemptRecovery(): Promise<void> {
    await this.logMessage('INFO', 'Starting Empire recovery process');

    try {
      // Step 1: Comprehensive container cleanup
      await this.completeContainerCleanup();

      // Step 2: Ensure volume directories exist with proper permissions
      await this.setupVolumes();

      // Step 3: Start new container with proper initialization
      await this.logMessage('INFO', 'Starting new Empire container');
      await this.startEmpireContainer();

      // Step 4: Wait for container to be ready
      await this.waitForContainerReady();

      await this.logMessage('INFO', 'Empire recovery completed successfully');
      this.consecutiveFailures = 0;

    } catch (error) {
      await this.logMessage('ERROR', `Empire recovery failed: ${error}`);
      
      // If recovery fails, try a more aggressive approach
      await this.aggressiveRecovery();
    }
  }

  private async completeContainerCleanup(): Promise<void> {
    await this.logMessage('INFO', 'Performing complete container cleanup');

    // Step 1: Stop all Empire-related containers
    const stopCommands = [
      `docker stop ${this.containerName} --time 5`,
      `docker stop empire-data --time 5`,
      `docker stop $(docker ps -q --filter "name=empire") --time 5`
    ];

    for (const cmd of stopCommands) {
      try {
        await execAsync(cmd).catch(() => execAsync(`sudo ${cmd}`));
      } catch (error) {
        // Continue with cleanup even if some containers don't exist
      }
    }

    // Step 2: Remove all Empire-related containers
    const removeCommands = [
      `docker rm -f ${this.containerName}`,
      `docker rm -f empire-data`,
      `docker rm -f $(docker ps -aq --filter "name=empire")`
    ];

    for (const cmd of removeCommands) {
      try {
        await execAsync(cmd).catch(() => execAsync(`sudo ${cmd}`));
      } catch (error) {
        // Continue with cleanup even if some containers don't exist
      }
    }

    // Step 3: Clean up orphaned containers
    try {
      await execAsync('docker container prune -f').catch(() => execAsync('sudo docker container prune -f'));
    } catch (error) {
      // Continue cleanup
    }

    // Step 4: Verify cleanup
    await this.logMessage('INFO', 'Container cleanup completed');
  }

  private async setupVolumes(): Promise<void> {
    const volumeDirs = [
      path.join(process.cwd(), 'uploads', 'empire', 'data'),
      path.join(process.cwd(), 'uploads', 'empire', 'downloads')
    ];

    for (const dir of volumeDirs) {
      try {
        await fs.mkdir(dir, { recursive: true });
        // Set permissions to be accessible by the container
        await execAsync(`chmod 755 ${dir}`);
        await this.logMessage('INFO', `Volume directory prepared: ${dir}`);
      } catch (error) {
        await this.logMessage('ERROR', `Failed to prepare volume directory ${dir}: ${error}`);
      }
    }
  }

  private async startEmpireContainer(): Promise<void> {
    // Step 1: Pull the Empire image
    await this.logMessage('INFO', 'Pulling Empire image...');
    await execAsync('docker pull bcsecurity/empire:latest')
      .catch(async () => {
        return await execAsync('sudo docker pull bcsecurity/empire:latest');
      });

    // Step 2: Create data container
    await this.logMessage('INFO', 'Creating Empire data container...');
    const dataContainerCmd = 'docker create -v /empire --name empire-data bcsecurity/empire:latest';
    await execAsync(dataContainerCmd)
      .catch(async () => {
        return await execAsync('sudo ' + dataContainerCmd);
      });

    // Step 3: Start main container with data container
    await this.logMessage('INFO', 'Starting Empire main container...');
    const dockerCmd = [
      'docker', 'run', '-d', '-it',
      '--name', this.containerName,
      '--restart', 'unless-stopped',
      '-p', '1337:1337',
      '-p', '5000:5000',
      '--volumes-from', 'empire-data',
      'bcsecurity/empire:latest'
    ];

    await execAsync(dockerCmd.join(' '))
      .catch(async () => {
        return await execAsync('sudo ' + dockerCmd.join(' '));
      });
  }

  private async waitForContainerReady(): Promise<void> {
    const maxWait = 120000; // 2 minutes
    const startTime = Date.now();

    while (Date.now() - startTime < maxWait) {
      try {
        const containerInfo = await this.getContainerInfo();
        if (containerInfo.status === 'running') {
          // Give Empire time to initialize
          await new Promise(resolve => setTimeout(resolve, 15000));
          
          // Check if setup is complete
          const logs = await this.getContainerLogs();
          if (this.checkSetupCompleted(logs)) {
            await this.logMessage('INFO', 'Empire container is ready');
            return;
          }
        }
      } catch (error) {
        // Container might not be ready yet
      }
      
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    throw new Error('Empire container failed to become ready within timeout');
  }

  private async aggressiveRecovery(): Promise<void> {
    await this.logMessage('INFO', 'Starting aggressive Empire recovery');

    try {
      // Stop all Empire-related containers
      await execAsync(`docker stop $(docker ps -q --filter "name=empire") --time 5`)
        .catch(() => {});

      // Remove all Empire-related containers
      await execAsync(`docker rm $(docker ps -aq --filter "name=empire")`)
        .catch(() => {});

      // Clean up volumes
      await execAsync(`docker volume prune -f`)
        .catch(() => {});

      // Pull fresh image
      await execAsync(`docker pull bcsecurity/empire:latest`)
        .catch(async () => {
          return await execAsync(`sudo docker pull bcsecurity/empire:latest`);
        });

      // Reset volume permissions
      await execAsync(`sudo chown -R $USER:$USER ${process.cwd()}/uploads/empire/`)
        .catch(() => {});

      // Start with a simpler command
      const simpleCmd = [
        'docker', 'run', '-d',
        '--name', this.containerName,
        '--restart', 'unless-stopped',
        '-p', '1337:1337',
        '-p', '5000:5000',
        'bcsecurity/empire:latest',
        'sh', '-c', 'cd /empire && python3 empire.py setup --reset -y && python3 empire.py server'
      ];

      await execAsync(simpleCmd.join(' '))
        .catch(async () => {
          return await execAsync('sudo ' + simpleCmd.join(' '));
        });

      await this.logMessage('INFO', 'Aggressive Empire recovery completed');
      
    } catch (error) {
      await this.logMessage('ERROR', `Aggressive recovery failed: ${error}`);
      throw error;
    }
  }

  public getLastHealthStatus(): EmpireHealthStatus | null {
    return this.lastHealthCheck;
  }

  public async restartEmpire(): Promise<void> {
    await this.logMessage('INFO', 'Manual Empire restart requested');
    this.consecutiveFailures = this.maxConsecutiveFailures;
    await this.attemptRecovery();
  }

  public async getDetailedStatus(): Promise<{
    health: EmpireHealthStatus | null;
    logs: string;
    containerInfo: any;
  }> {
    const health = await this.checkHealth();
    const logs = await this.getContainerLogs().catch(() => 'No logs available');
    const containerInfo = await this.getContainerInfo().catch(() => ({ id: 'unknown', status: 'unknown' }));

    return {
      health,
      logs,
      containerInfo
    };
  }
}

export const empireHealthMonitor = new EmpireHealthMonitor();
