import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { EventEmitter } from 'events';

const execAsync = promisify(exec);

interface NetworkHealthStatus {
  internetConnected: boolean;
  dockerHubReachable: boolean;
  dnsResolution: boolean;
  proxyDetected: boolean;
  registryMirrors: string[];
  lastError?: string;
  latency: number;
  errors: string[];
  warnings: string[];
}

interface RegistryMirror {
  url: string;
  name: string;
  priority: number;
}

class NetworkHealthMonitor extends EventEmitter {
  private monitoringInterval: NodeJS.Timeout | null = null;
  private readonly checkInterval = 60000; // 1 minute
  private readonly logFile = path.join(process.cwd(), 'logs', 'network-health.log');
  private lastHealthCheck: NetworkHealthStatus | null = null;
  private consecutiveFailures = 0;
  private readonly maxConsecutiveFailures = 3;

  // Registry mirrors for fallback
  private readonly registryMirrors: RegistryMirror[] = [
    { url: 'https://registry-1.docker.io', name: 'Docker Hub', priority: 1 },
    { url: 'https://ghcr.io', name: 'GitHub Container Registry', priority: 2 },
    { url: 'https://quay.io', name: 'Quay.io', priority: 3 },
    { url: 'https://registry.gitlab.com', name: 'GitLab Registry', priority: 4 }
  ];

  constructor() {
    super();
    this.ensureLogDirectory();
  }

  private async ensureLogDirectory(): Promise<void> {
    const logDir = path.dirname(this.logFile);
    try {
      await fs.mkdir(logDir, { recursive: true });
    } catch (error) {
      console.error('[NetworkHealthMonitor] Failed to create log directory:', error);
    }
  }

  private async logMessage(level: 'INFO' | 'WARN' | 'ERROR', message: string): Promise<void> {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${level}] ${message}\n`;
    
    try {
      await fs.appendFile(this.logFile, logEntry);
    } catch (error) {
      console.error('[NetworkHealthMonitor] Failed to write to log file:', error);
    }
    
    console.log(`[NetworkHealthMonitor] ${logEntry.trim()}`);
  }

  public startMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    this.logMessage('INFO', 'Starting network health monitoring');
    
    this.monitoringInterval = setInterval(async () => {
      try {
        const health = await this.checkNetworkHealth();
        await this.handleHealthStatus(health);
      } catch (error) {
        await this.logMessage('ERROR', `Network health check failed: ${error}`);
      }
    }, this.checkInterval);

    // Initial health check
    this.checkNetworkHealth().then(health => this.handleHealthStatus(health));
  }

  public stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      this.logMessage('INFO', 'Network health monitoring stopped');
    }
  }

  public async checkNetworkHealth(): Promise<NetworkHealthStatus> {
    const startTime = Date.now();
    const health: NetworkHealthStatus = {
      internetConnected: false,
      dockerHubReachable: false,
      dnsResolution: false,
      proxyDetected: false,
      registryMirrors: [],
      latency: 0,
      errors: [],
      warnings: []
    };

    try {
      // Check internet connectivity
      health.internetConnected = await this.checkInternetConnectivity();
      
      if (!health.internetConnected) {
        health.errors.push('No internet connectivity detected');
      }

      // Check DNS resolution
      health.dnsResolution = await this.checkDnsResolution();
      
      if (!health.dnsResolution) {
        health.errors.push('DNS resolution failed');
      }

      // Check proxy configuration
      health.proxyDetected = await this.checkProxyConfiguration();
      
      if (health.proxyDetected) {
        health.warnings.push('Proxy configuration detected');
      }

      // Check Docker Hub reachability
      health.dockerHubReachable = await this.checkDockerHubReachability();
      
      if (!health.dockerHubReachable) {
        health.errors.push('Docker Hub registry unreachable');
      }

      // Check alternative registry mirrors
      health.registryMirrors = await this.checkRegistryMirrors();

      health.latency = Date.now() - startTime;

    } catch (error) {
      health.errors.push(`Network health check failed: ${error}`);
      health.lastError = error instanceof Error ? error.message : String(error);
    }

    this.lastHealthCheck = health;
    return health;
  }

  private async checkInternetConnectivity(): Promise<boolean> {
    try {
      // Try multiple reliable endpoints
      const endpoints = [
        'https://www.google.com',
        'https://1.1.1.1',
        'https://8.8.8.8'
      ];

      for (const endpoint of endpoints) {
        try {
          await execAsync(`curl -s -f --max-time 5 ${endpoint} > /dev/null`);
          return true;
        } catch (error) {
          continue;
        }
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  private async checkDnsResolution(): Promise<boolean> {
    try {
      const domains = [
        'registry-1.docker.io',
        'docker.io',
        'ghcr.io',
        'quay.io'
      ];

      for (const domain of domains) {
        try {
          await execAsync(`nslookup ${domain}`);
          return true;
        } catch (error) {
          continue;
        }
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  private async checkProxyConfiguration(): Promise<boolean> {
    try {
      const proxyVars = ['HTTP_PROXY', 'HTTPS_PROXY', 'http_proxy', 'https_proxy'];
      
      for (const proxyVar of proxyVars) {
        if (process.env[proxyVar]) {
          return true;
        }
      }

      // Check Docker daemon proxy configuration
      try {
        const { stdout } = await execAsync('docker info --format "{{.HTTPProxy}}"');
        if (stdout.trim()) {
          return true;
        }
      } catch (error) {
        // Ignore Docker info errors
      }

      return false;
    } catch (error) {
      return false;
    }
  }

  private async checkDockerHubReachability(): Promise<boolean> {
    try {
      // Try to reach Docker Hub registry API
      const testCommands = [
        'curl -s -f --max-time 10 https://registry-1.docker.io/v2/',
        'curl -s -f --max-time 10 https://index.docker.io/v1/',
        'docker info > /dev/null 2>&1'
      ];

      for (const command of testCommands) {
        try {
          await execAsync(command);
          return true;
        } catch (error) {
          continue;
        }
      }

      return false;
    } catch (error) {
      return false;
    }
  }

  private async checkRegistryMirrors(): Promise<string[]> {
    const availableMirrors: string[] = [];

    for (const mirror of this.registryMirrors) {
      try {
        await execAsync(`curl -s -f --max-time 5 ${mirror.url} > /dev/null`);
        availableMirrors.push(mirror.name);
      } catch (error) {
        continue;
      }
    }

    return availableMirrors;
  }

  private async handleHealthStatus(health: NetworkHealthStatus): Promise<void> {
    if (health.errors.length > 0) {
      this.consecutiveFailures++;
      await this.logMessage('ERROR', `Network health check failed (${this.consecutiveFailures}/${this.maxConsecutiveFailures}): ${health.errors.join(', ')}`);
      
      this.emit('network-degraded', health);
      
      if (this.consecutiveFailures >= this.maxConsecutiveFailures) {
        await this.logMessage('ERROR', 'Network connectivity critical, attempting repair');
        this.emit('network-critical', health);
        await this.attemptNetworkRepair();
      }
    } else {
      if (this.consecutiveFailures > 0) {
        await this.logMessage('INFO', 'Network connectivity restored');
        this.emit('network-restored', health);
      }
      this.consecutiveFailures = 0;
    }

    if (health.warnings.length > 0) {
      await this.logMessage('WARN', `Network warnings: ${health.warnings.join(', ')}`);
    }
  }

  private async attemptNetworkRepair(): Promise<void> {
    await this.logMessage('INFO', 'Starting network repair process');

    try {
      // Repair DNS configuration
      await this.repairDnsConfiguration();

      // Optimize Docker daemon settings
      await this.optimizeDockerDaemon();

      // Configure registry mirrors
      await this.configureRegistryMirrors();

      // Restart Docker daemon if needed
      await this.restartDockerDaemon();

      await this.logMessage('INFO', 'Network repair completed successfully');
      this.consecutiveFailures = 0;

    } catch (error) {
      await this.logMessage('ERROR', `Network repair failed: ${error}`);
    }
  }

  private async repairDnsConfiguration(): Promise<void> {
    await this.logMessage('INFO', 'Repairing DNS configuration');

    try {
      // Flush DNS cache
      await execAsync('sudo systemctl restart systemd-resolved').catch(() => {
        return execAsync('sudo /etc/init.d/dns-clean restart').catch(() => {
          return execAsync('sudo dscacheutil -flushcache');
        });
      });

      // Add reliable DNS servers
      const dnsServers = ['8.8.8.8', '1.1.1.1', '9.9.9.9'];
      
      // Try to update resolv.conf
      const resolvConf = `/etc/resolv.conf`;
      const backupFile = `/etc/resolv.conf.backup.${Date.now()}`;
      
      await execAsync(`sudo cp ${resolvConf} ${backupFile}`).catch(() => {});
      
      for (const dns of dnsServers) {
        await execAsync(`echo "nameserver ${dns}" | sudo tee -a ${resolvConf}`).catch(() => {});
      }

    } catch (error) {
      await this.logMessage('WARN', `DNS repair failed: ${error}`);
    }
  }

  private async optimizeDockerDaemon(): Promise<void> {
    await this.logMessage('INFO', 'Optimizing Docker daemon configuration');

    try {
      const daemonConfig: {
        dns: string[];
        "registry-mirrors": string[];
        "max-concurrent-downloads": number;
        "max-concurrent-uploads": number;
        "default-runtime": string;
      } = {
        "dns": ["8.8.8.8", "1.1.1.1"],
        "registry-mirrors": [],
        "max-concurrent-downloads": 3,
        "max-concurrent-uploads": 5,
        "default-runtime": "runc"
      };

      // Add working registry mirrors
      const workingMirrors = await this.getWorkingRegistryMirrors();
      daemonConfig["registry-mirrors"] = workingMirrors;

      const configPath = '/etc/docker/daemon.json';
      await fs.writeFile(configPath, JSON.stringify(daemonConfig, null, 2))
        .catch(() => {
          // If we can't write to system location, create user config
          const userConfigPath = path.join(process.env.HOME || '/tmp', '.docker', 'daemon.json');
          return fs.mkdir(path.dirname(userConfigPath), { recursive: true })
            .then(() => fs.writeFile(userConfigPath, JSON.stringify(daemonConfig, null, 2)));
        });

    } catch (error) {
      await this.logMessage('WARN', `Docker daemon optimization failed: ${error}`);
    }
  }

  private async configureRegistryMirrors(): Promise<void> {
    await this.logMessage('INFO', 'Configuring registry mirrors');

    try {
      const workingMirrors = await this.getWorkingRegistryMirrors();
      
      if (workingMirrors.length > 0) {
        // Export mirror configuration as environment variables
        process.env.DOCKER_REGISTRY_MIRRORS = workingMirrors.join(',');
        
        await this.logMessage('INFO', `Configured ${workingMirrors.length} working registry mirrors`);
      }
    } catch (error) {
      await this.logMessage('WARN', `Registry mirror configuration failed: ${error}`);
    }
  }

  private async getWorkingRegistryMirrors(): Promise<string[]> {
    const workingMirrors: string[] = [];

    for (const mirror of this.registryMirrors) {
      try {
        await execAsync(`curl -s -f --max-time 5 ${mirror.url} > /dev/null`);
        workingMirrors.push(mirror.url);
      } catch (error) {
        continue;
      }
    }

    return workingMirrors;
  }

  private async restartDockerDaemon(): Promise<void> {
    await this.logMessage('INFO', 'Restarting Docker daemon');

    try {
      await execAsync('sudo systemctl restart docker').catch(() => {
        return execAsync('sudo service docker restart');
      });

      // Wait for Docker daemon to be ready
      await new Promise(resolve => setTimeout(resolve, 10000));

      // Verify Docker is running
      await execAsync('docker info');
      
      await this.logMessage('INFO', 'Docker daemon restarted successfully');
    } catch (error) {
      await this.logMessage('ERROR', `Docker daemon restart failed: ${error}`);
    }
  }

  public async pullImageWithRetry(imageName: string, maxRetries: number = 5): Promise<boolean> {
    let lastError: string = '';

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.logMessage('INFO', `Pulling image ${imageName} (attempt ${attempt}/${maxRetries})`);
        
        // Use exponential backoff
        const backoffTime = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s, 8s, 16s
        
        if (attempt > 1) {
          await this.logMessage('INFO', `Waiting ${backoffTime}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, backoffTime));
        }

        // Try different pull strategies
        const pullCommands = [
          `docker pull ${imageName}`,
          `docker pull ${imageName} --disable-content-trust`,
          `docker pull ${imageName} --platform linux/amd64`
        ];

        for (const command of pullCommands) {
          try {
            await execAsync(command, { timeout: 300000 }); // 5 minute timeout
            await this.logMessage('INFO', `Successfully pulled image ${imageName}`);
            return true;
          } catch (error) {
            lastError = error instanceof Error ? error.message : String(error);
            continue;
          }
        }

        // If all pull strategies failed, try network repair
        if (attempt === Math.floor(maxRetries / 2)) {
          await this.logMessage('INFO', 'Attempting network repair mid-retry...');
          await this.attemptNetworkRepair();
        }

      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
        await this.logMessage('WARN', `Image pull attempt ${attempt} failed: ${lastError}`);
      }
    }

    await this.logMessage('ERROR', `Failed to pull image ${imageName} after ${maxRetries} attempts. Last error: ${lastError}`);
    return false;
  }

  public getLastHealthStatus(): NetworkHealthStatus | null {
    return this.lastHealthCheck;
  }

  public async getDetailedNetworkStatus(): Promise<{
    health: NetworkHealthStatus | null;
    diagnostics: any;
  }> {
    const health = await this.checkNetworkHealth();
    
    const diagnostics = {
      timestamp: new Date().toISOString(),
      environment: {
        proxy: {
          http_proxy: process.env.HTTP_PROXY || 'not set',
          https_proxy: process.env.HTTPS_PROXY || 'not set'
        },
        dns: await this.getDnsConfiguration(),
        docker: await this.getDockerConfiguration()
      },
      connectivity: {
        registryMirrors: await this.getWorkingRegistryMirrors(),
        latency: health.latency
      }
    };

    return {
      health,
      diagnostics
    };
  }

  private async getDnsConfiguration(): Promise<any> {
    try {
      const resolvConf = await fs.readFile('/etc/resolv.conf', 'utf8');
      return {
        resolv_conf: resolvConf.split('\n').filter(line => line.trim())
      };
    } catch (error) {
      return { error: 'Could not read DNS configuration' };
    }
  }

  private async getDockerConfiguration(): Promise<any> {
    try {
      const { stdout } = await execAsync('docker info --format "{{json .}}"');
      return JSON.parse(stdout);
    } catch (error) {
      return { error: 'Could not get Docker configuration' };
    }
  }
}

export const networkHealthMonitor = new NetworkHealthMonitor();
