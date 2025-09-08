import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { dockerErrorMonitor } from './docker-error-monitor';
import { dockerRecoveryEngine } from './docker-recovery-engine';
import { volumePermissionManager } from './volume-permission-manager';
import { redisHealthMonitor } from './redis-health-monitor';

const execAsync = promisify(exec);

export interface DockerContainer {
  id: string;
  name: string;
  image: string;
  port: number;
  status: 'running' | 'stopped' | 'installing' | 'error';
  created: Date;
  fileUploads?: string[];
  category?: 'security' | 'development' | 'analysis' | 'infrastructure';
  description?: string;
  icon?: string;
  additionalPorts?: number[];
  dependencies?: string[];
  healthCheck?: string;
  environment?: Record<string, string>;
  volumes?: string[];
  capabilities?: string[];
  privileged?: boolean;
}

export interface ContainerConfig {
  name: string;
  image: string;
  port: number;
  category: 'security' | 'development' | 'analysis' | 'infrastructure';
  description: string;
  icon: string;
  additionalPorts?: number[];
  dependencies?: string[];
  healthCheck?: string;
  environment?: Record<string, string>;
  volumes?: string[];
  capabilities?: string[];
  privileged?: boolean;
  customStartCommand?: string[];
  dataContainer?: string; // Name of data container for persistent storage
  interactive?: boolean; // Use -it flag for interactive mode
}

export class DockerService {
  private containers = new Map<string, DockerContainer>();
  private uploadDir = path.join(process.cwd(), 'uploads', 'docker');
  private dockerAvailable: boolean | null = null;

  constructor() {
    this.ensureUploadDir();
    this.checkDockerAvailability();
  }

  private async checkDockerAvailability(): Promise<boolean> {
    if (this.dockerAvailable !== null) {
      return this.dockerAvailable;
    }

    try {
      await execAsync('docker --version');
      this.dockerAvailable = true;
      return true;
    } catch (error) {
      console.warn('Docker is not available in this environment');
      this.dockerAvailable = false;
      return false;
    }
  }

  private async ensureUploadDir() {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create upload directory:', error);
    }
  }

  async pullImage(image: string): Promise<boolean> {
    try {
      let { stdout, stderr } = await execAsync(`docker pull ${image}`).catch(async () => {
        // Try with sudo if regular command fails
        return await execAsync(`sudo docker pull ${image}`);
      });
      console.log('Docker pull output:', stdout);
      if (stderr) console.warn('Docker pull warnings:', stderr);
      return true;
    } catch (error) {
      console.error('Failed to pull Docker image:', error);
      return false;
    }
  }

  async startBurpSuite(jarPath?: string, licensePath?: string): Promise<DockerContainer> {
    const containerName = 'attacknode-burpsuite';
    const port = 6901;

    // Check if Docker is available
    const dockerAvailable = await this.checkDockerAvailability();
    if (!dockerAvailable) {
      throw new Error('Docker is not available in this environment. Please install Docker to use container features.');
    }

    try {
      // Stop existing container if running
      await this.stopContainer(containerName);

      // Build custom Burp Suite image if jar file is provided
      let imageName = 'kasmweb/burpsuite-custom';
      
      if (jarPath) {
        imageName = await this.buildBurpSuiteImage(jarPath, licensePath);
      }

      // Start the container
      const dockerCmd = [
        'docker', 'run', '-d',
        '--name', containerName,
        '--shm-size=512m',
        '-p', `${port}:6901`,
        '-e', 'VNC_PW=password',
        '-v', `${this.uploadDir}:/home/kasm-user/shared`,
        imageName
      ];

      const { stdout } = await execAsync(dockerCmd.join(' '));
      const containerId = stdout.trim();

      const container: DockerContainer = {
        id: containerId,
        name: containerName,
        image: imageName,
        port,
        status: 'running',
        created: new Date(),
        fileUploads: jarPath ? [jarPath, licensePath].filter((f): f is string => Boolean(f)) : []
      };

      this.containers.set(containerName, container);
      return container;
    } catch (error) {
      console.error('Failed to start Burp Suite container:', error);
      throw new Error('Failed to start Burp Suite container');
    }
  }

  async startHeadlessBurpSuite(jarPath: string, licensePath?: string): Promise<DockerContainer> {
    const containerName = 'attacknode-burpsuite-headless';
    const port = 8080; // Port for Burp Suite proxy

    // Check if Docker is available
    const dockerAvailable = await this.checkDockerAvailability();
    if (!dockerAvailable) {
      // Create a mock container for demonstration purposes
      const mockContainer: DockerContainer = {
        id: 'mock-headless-burpsuite',
        name: containerName,
        image: 'openjdk:11-slim',
        port,
        status: 'error',
        created: new Date(),
        fileUploads: [jarPath, licensePath].filter((f): f is string => Boolean(f))
      };
      
      this.containers.set(containerName, mockContainer);
      throw new Error('Docker daemon is not running. In a production environment, this would start a headless Burp Suite container.');
    }

    try {
      // Stop existing container if running
      await this.stopContainer(containerName);

      // Get absolute path of the JAR file
      const jarAbsPath = path.resolve(jarPath);
      const jarFileName = path.basename(jarPath);
      
      // Prepare volume mappings
      const volumes = [`${jarAbsPath}:/app/${jarFileName}:ro`];
      
      // Add license file volume if provided
      let licenseCmd = '';
      if (licensePath) {
        const licenseAbsPath = path.resolve(licensePath);
        const licenseFileName = path.basename(licensePath);
        volumes.push(`${licenseAbsPath}:/app/${licenseFileName}:ro`);
        licenseCmd = `--config-file=/app/${licenseFileName}`;
      }

      // Start the headless Burp Suite container
      const dockerCmd = [
        'docker', 'run', '-d',
        '--name', containerName,
        '-p', `${port}:8080`,
        ...volumes.map(v => ['-v', v]).flat(),
        '-w', '/app',
        'openjdk:11-slim',
        'java', '-jar', '-Xmx1024m', `/app/${jarFileName}`, licenseCmd
      ].filter(Boolean);

      const { stdout } = await execAsync(dockerCmd.join(' '));
      const containerId = stdout.trim();

      const container: DockerContainer = {
        id: containerId,
        name: containerName,
        image: 'openjdk:11-slim (headless Burp Suite)',
        port,
        status: 'running',
        created: new Date(),
        fileUploads: [jarPath, licensePath].filter((f): f is string => Boolean(f))
      };

      this.containers.set(containerName, container);
      return container;
    } catch (error) {
      console.error('Failed to start headless Burp Suite container:', error);
      throw new Error('Failed to start headless Burp Suite container');
    }
  }

  async startKasmWebApp(appName: string, image: string, port: number): Promise<DockerContainer> {
    const containerName = `attacknode-${appName}`;

    // Check if Docker is available
    const dockerAvailable = await this.checkDockerAvailability();
    if (!dockerAvailable) {
      // Create a mock container for demonstration purposes
      const mockContainer: DockerContainer = {
        id: `mock-${appName}-container`,
        name: containerName,
        image: image,
        port,
        status: 'error',
        created: new Date()
      };
      
      this.containers.set(containerName, mockContainer);
      throw new Error('Docker is not available in this environment. In a production environment with Docker installed, this would start a containerized version of the application.');
    }

    try {
      // Stop existing container if running
      await this.stopContainer(containerName);

      // Pull the image first
      await this.pullImage(image);

      // Determine the container port based on the image
      let containerPort = '80'; // Default for nginx
      let environmentVars: string[] = [];
      let volumeMounts: string[] = [];
      let additionalOptions: string[] = [];
      
      if (image.includes('kasm')) {
        // Kasm images use VNC on port 6901
        containerPort = '6901';
        environmentVars = ['-e', 'VNC_PW=password'];

        // Special configuration for Kali Linux with persistence and root access
        if (appName === 'kali') {
          // Create persistent profile directory
          const persistentDir = path.join(process.cwd(), 'uploads', 'kasm_profiles', 'kali-root');
          await fs.mkdir(persistentDir, { recursive: true });

          // Set up volume mounts for persistence
          volumeMounts = [
            '-v', `${persistentDir}:/home/kasm-user:rw`,
            '-v', `${this.uploadDir}:/home/kasm-user/shared:rw`
          ];

          // Configure for root user access
          additionalOptions = [
            '--hostname', 'kasm',
            '--user', 'root',
            '--privileged',
            '--shm-size=512m'
          ];

          // Additional environment variables for Kali
          environmentVars.push(
            '-e', 'KASM_USER=root',
            '-e', 'KASM_UID=0',
            '-e', 'KASM_GID=0'
          );

          console.log(`Setting up Kali container with persistent storage at: ${persistentDir}`);
        }
      }

      // Start the container
      const dockerCmd = [
        'docker', 'run', '-d',
        '--name', containerName,
        '-p', `${port}:${containerPort}`,
        ...additionalOptions,
        ...volumeMounts,
        ...environmentVars,
        image
      ].filter(Boolean);

      console.log(`Starting container with command: ${dockerCmd.join(' ')}`);
      
      const { stdout } = await execAsync(dockerCmd.join(' ')).catch(async (error: any) => {
        // Try with sudo if regular command fails
        console.log(`Regular docker command failed, trying with sudo: ${error.message}`);
        return await execAsync('sudo ' + dockerCmd.join(' '));
      });
      
      const containerId = stdout.trim();

      const container: DockerContainer = {
        id: containerId,
        name: containerName,
        image,
        port,
        status: 'running',
        created: new Date()
      };

      this.containers.set(containerName, container);
      console.log(`Successfully started container: ${containerId}`);
      return container;
    } catch (error: any) {
      console.error(`Failed to start ${appName} container:`, error);
      throw new Error(`Failed to start ${appName} container: ${error.message}`);
    }
  }

  async stopContainer(nameOrId: string): Promise<boolean> {
    try {
      // Force stop and remove with timeout
      try {
        await execAsync(`docker stop ${nameOrId} -t 5`).catch(async () => {
          return await execAsync(`sudo docker stop ${nameOrId} -t 5`);
        });
      } catch (error: any) {
        // Container might not exist or already stopped, continue to removal
        console.log(`Container ${nameOrId} not running or doesn't exist:`, error.message);
      }
      
      // Force remove the container
      try {
        await execAsync(`docker rm -f ${nameOrId}`).catch(async () => {
          return await execAsync(`sudo docker rm -f ${nameOrId}`);
        });
      } catch (error: any) {
        // Container might not exist, that's ok
        console.log(`Container ${nameOrId} already removed or doesn't exist:`, error.message);
      }
      
      // Update our local state
      const entries = Array.from(this.containers.entries());
      for (const [key, container] of entries) {
        if (container.name === nameOrId || container.id === nameOrId) {
          container.status = 'stopped';
          this.containers.delete(key);
          break;
        }
      }
      
      return true;
    } catch (error) {
      console.error('Failed to stop container:', error);
      return false;
    }
  }

  async cleanupConflictingContainer(containerName: string): Promise<void> {
    const fullName = `attacknode-${containerName}`;
    
    try {
      console.log(`[DockerService] Checking for conflicting containers: ${fullName}`);
      
      // Check if a container with this name exists
      const { stdout } = await execAsync(`docker ps -aq -f name="^${fullName}$"`).catch(async () => {
        return await execAsync(`sudo docker ps -aq -f name="^${fullName}$"`);
      });
      
      const existingContainers = stdout.trim().split('\n').filter(id => id.trim());
      
      if (existingContainers.length === 0) {
        console.log(`[DockerService] No conflicting containers found for: ${fullName}`);
        return;
      }
      
      console.log(`[DockerService] Found ${existingContainers.length} conflicting containers for ${fullName}`);
      
      // Stop and remove each conflicting container
      for (const containerId of existingContainers) {
        try {
          console.log(`[DockerService] Stopping conflicting container: ${containerId}`);
          await execAsync(`docker stop ${containerId} --time 10`).catch(async () => {
            return await execAsync(`sudo docker stop ${containerId} --time 10`);
          });
          
          console.log(`[DockerService] Removing conflicting container: ${containerId}`);
          await execAsync(`docker rm ${containerId}`).catch(async () => {
            return await execAsync(`sudo docker rm ${containerId}`);
          });
          
          console.log(`[DockerService] Successfully removed conflicting container: ${containerId}`);
        } catch (error: any) {
          console.log(`[DockerService] Failed to remove container ${containerId}:`, error.message);
          // Try force removal as fallback
          try {
            await execAsync(`docker rm -f ${containerId}`).catch(async () => {
              return await execAsync(`sudo docker rm -f ${containerId}`);
            });
            console.log(`[DockerService] Force removed container: ${containerId}`);
          } catch (forceError: any) {
            console.error(`[DockerService] Failed to force remove container ${containerId}:`, forceError.message);
          }
        }
      }
      
      // Brief wait for Docker daemon to process changes
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error: any) {
      console.error(`[DockerService] Error during conflict cleanup of ${containerName}:`, error.message);
      // Don't throw error - continue with container start attempt
    }
  }

  async getContainerStatus(nameOrId: string): Promise<'running' | 'stopped' | 'error'> {
    try {
      // First check if container exists at all
      const { stdout: allContainers } = await execAsync(`docker ps -aq --format "{{.Names}}\t{{.Status}}" --filter name="^${nameOrId}$"`).catch(async () => {
        return await execAsync(`sudo docker ps -aq --format "{{.Names}}\t{{.Status}}" --filter name="^${nameOrId}$"`);
      });
      
      if (!allContainers.trim()) {
        return 'stopped'; // Container doesn't exist
      }

      // Check if container is running
      const { stdout: runningContainers } = await execAsync(`docker ps -q --filter name="^${nameOrId}$" --filter status=running`).catch(async () => {
        return await execAsync(`sudo docker ps -q --filter name="^${nameOrId}$" --filter status=running`);
      });
      
      if (runningContainers.trim()) {
        return 'running';
      }

      // Check if container is in an error state
      const { stdout: containerInfo } = await execAsync(`docker ps -a --format "{{.Status}}" --filter name="^${nameOrId}$"`).catch(async () => {
        return await execAsync(`sudo docker ps -a --format "{{.Status}}" --filter name="^${nameOrId}$"`);
      });
      
      const status = containerInfo.trim().toLowerCase();
      if (status.includes('exited') && (status.includes('(1)') || status.includes('(125)') || status.includes('(126)') || status.includes('(127)'))) {
        return 'error';
      }
      
      return 'stopped';
    } catch (error) {
      console.error('Failed to get container status:', error);
      return 'error';
    }
  }

  async listContainers(): Promise<DockerContainer[]> {
    const dockerAvailable = await this.checkDockerAvailability();
    if (!dockerAvailable) {
      return [];
    }
    
    try {
      // Update status for all tracked containers
      const entries = Array.from(this.containers.entries());
      for (const [key, container] of entries) {
        container.status = await this.getContainerStatus(container.name);
      }
      
      return Array.from(this.containers.values());
    } catch (error) {
      console.error('Failed to list containers:', error);
      return [];
    }
  }

  private async buildBurpSuiteImage(jarPath: string, licensePath?: string): Promise<string> {
    const buildDir = path.join(this.uploadDir, 'burpsuite-build');
    const imageName = 'kasmweb/burpsuite-custom:latest';

    try {
      // Create build directory
      await fs.mkdir(buildDir, { recursive: true });

      // Copy jar file to build directory
      const jarFileName = path.basename(jarPath);
      await fs.copyFile(jarPath, path.join(buildDir, jarFileName));

      // Copy license file if provided
      let licenseFileName = '';
      if (licensePath) {
        licenseFileName = path.basename(licensePath);
        await fs.copyFile(licensePath, path.join(buildDir, licenseFileName));
      }

      // Create Dockerfile
      const dockerfile = `
FROM kasmweb/core-ubuntu-focal:1.17.0

USER root

# Install Java
RUN apt-get update && apt-get install -y openjdk-11-jre-headless && rm -rf /var/lib/apt/lists/*

# Create application directory
RUN mkdir -p /opt/burpsuite

# Copy Burp Suite jar
COPY ${jarFileName} /opt/burpsuite/burpsuite.jar

${licensePath ? `# Copy license file\nCOPY ${licenseFileName} /opt/burpsuite/license.txt` : ''}

# Set permissions
RUN chown -R kasm-user:kasm-user /opt/burpsuite

USER kasm-user

# Create desktop shortcut
RUN mkdir -p /home/kasm-user/Desktop && \\
    echo "[Desktop Entry]" > /home/kasm-user/Desktop/burpsuite.desktop && \\
    echo "Type=Application" >> /home/kasm-user/Desktop/burpsuite.desktop && \\
    echo "Name=Burp Suite Professional" >> /home/kasm-user/Desktop/burpsuite.desktop && \\
    echo "Exec=java -jar /opt/burpsuite/burpsuite.jar ${licensePath ? '--config-file=/opt/burpsuite/license.txt' : ''}" >> /home/kasm-user/Desktop/burpsuite.desktop && \\
    echo "Icon=applications-internet" >> /home/kasm-user/Desktop/burpsuite.desktop && \\
    echo "Terminal=false" >> /home/kasm-user/Desktop/burpsuite.desktop && \\
    chmod +x /home/kasm-user/Desktop/burpsuite.desktop

# Set working directory
WORKDIR /home/kasm-user
`;

      await fs.writeFile(path.join(buildDir, 'Dockerfile'), dockerfile);

      // Build the Docker image
      const buildCmd = `docker build -t ${imageName} ${buildDir}`;
      const { stdout, stderr } = await execAsync(buildCmd);
      
      console.log('Docker build output:', stdout);
      if (stderr) console.warn('Docker build warnings:', stderr);

      return imageName;
    } catch (error) {
      console.error('Failed to build Burp Suite image:', error);
      throw new Error('Failed to build custom Burp Suite image');
    }
  }

  async saveUploadedFile(fileBuffer: Buffer, originalName: string): Promise<string> {
    const fileName = `${Date.now()}-${originalName}`;
    const filePath = path.join(this.uploadDir, fileName);
    
    await fs.writeFile(filePath, fileBuffer);
    return filePath;
  }

  async getDockerInfo(): Promise<any> {
    try {
      const { stdout } = await execAsync('docker version --format "{{.Server.Version}}"').catch(async () => {
        return await execAsync('sudo docker version --format "{{.Server.Version}}"');
      });
      const version = stdout.trim();
      
      const { stdout: psOutput } = await execAsync('docker ps --format "table {{.Names}}\t{{.Status}}"').catch(async () => {
        return await execAsync('sudo docker ps --format "table {{.Names}}\t{{.Status}}"');
      });
      const runningContainers = psOutput.split('\n').length - 2; // Subtract header and empty line
      
      return {
        version,
        runningContainers: Math.max(0, runningContainers),
        totalImages: this.containers.size
      };
    } catch (error) {
      console.error('Failed to get Docker info:', error);
      return {
        version: 'Unknown',
        runningContainers: 0,
        totalImages: 0
      };
    }
  }

  async cleanupUnusedImages(): Promise<boolean> {
    try {
      await execAsync('docker image prune -f');
      return true;
    } catch (error) {
      console.error('Failed to cleanup unused images:', error);
      return false;
    }
  }

  async stopAllContainers(): Promise<boolean> {
    try {
      const containerNames = Array.from(this.containers.keys());
      for (const name of containerNames) {
        await this.stopContainer(name);
      }
      return true;
    } catch (error) {
      console.error('Failed to stop all containers:', error);
      return false;
    }
  }

  // Setup data container for persistent storage (Empire pattern)
  private async setupDataContainer(config: ContainerConfig): Promise<void> {
    if (!config.dataContainer) {
      return;
    }

    const dataContainerName = config.dataContainer;
    
    try {
      // Check if data container already exists
      const { stdout } = await execAsync(`docker ps -aq --filter name="^${dataContainerName}$"`).catch(async () => {
        return await execAsync(`sudo docker ps -aq --filter name="^${dataContainerName}$"`);
      });
      
      if (stdout.trim()) {
        console.log(`[DockerService] Data container ${dataContainerName} already exists`);
        return;
      }

      // Create data container with volume
      console.log(`[DockerService] Creating data container: ${dataContainerName}`);
      const createCmd = `docker create -v /empire --name ${dataContainerName} ${config.image}`;
      
      await execAsync(createCmd).catch(async () => {
        return await execAsync(`sudo ${createCmd}`);
      });
      
      console.log(`[DockerService] Data container ${dataContainerName} created successfully`);
      
    } catch (error) {
      console.error(`[DockerService] Failed to setup data container ${dataContainerName}:`, error);
      throw error;
    }
  }

  // New comprehensive container management methods
  async startContainer(containerName: string): Promise<DockerContainer> {
    const config = this.containerConfigs.get(containerName);
    if (!config) {
      throw new Error(`Container configuration not found for: ${containerName}`);
    }

    const dockerAvailable = await this.checkDockerAvailability();
    if (!dockerAvailable) {
      throw new Error('Docker is not available in this environment');
    }

    try {
      // Preflight checks - validate volume permissions
      console.log(`[DockerService] Running preflight checks for ${containerName}...`);
      const preflightResult = await volumePermissionManager.preflightCheck(containerName);
      
      if (!preflightResult.passed) {
        console.log(`[DockerService] Preflight checks failed for ${containerName}:`, preflightResult.issues);
        
        // Attempt to repair permissions
        console.log(`[DockerService] Attempting to repair permissions for ${containerName}...`);
        const repairSuccess = await volumePermissionManager.repairVolumePermissions(containerName);
        
        if (!repairSuccess) {
          console.warn(`[DockerService] Permission repair failed for ${containerName}, proceeding with caution`);
        }
      }

      // Start dependencies first
      if (config.dependencies) {
        for (const dep of config.dependencies) {
          await this.startContainer(dep);
          // Wait for dependency to be ready
          await this.waitForContainer(dep);
        }
      }

      // Clean up any conflicting containers with this name
      await this.cleanupConflictingContainer(containerName);

      // Pull the image
      await this.pullImage(config.image);

      // Build Docker command
      const dockerCmd = await this.buildDockerCommand(config);

      console.log(`Starting ${containerName} with command: ${dockerCmd.join(' ')}`);
      
      const { stdout } = await this.executeDockerCommandWithMonitoring(dockerCmd.join(' '), {
        containerName: `attacknode-${containerName}`,
        operation: 'start_container',
        command: dockerCmd.join(' ')
      });
      
      const containerId = stdout.trim();

      const container: DockerContainer = {
        id: containerId,
        name: `attacknode-${containerName}`,
        image: config.image,
        port: config.port,
        status: 'running',
        created: new Date(),
        category: config.category,
        description: config.description,
        icon: config.icon,
        additionalPorts: config.additionalPorts,
        dependencies: config.dependencies,
        environment: config.environment,
        volumes: config.volumes,
        capabilities: config.capabilities,
        privileged: config.privileged
      };

      this.containers.set(`attacknode-${containerName}`, container);
      console.log(`Successfully started container: ${containerId}`);
      return container;
    } catch (error: any) {
      console.error(`Failed to start ${containerName} container:`, error);
      throw new Error(`Failed to start ${containerName} container: ${error.message}`);
    }
  }

  private async buildDockerCommand(config: ContainerConfig): Promise<string[]> {
    const containerName = `attacknode-${config.name}`;
    
    // Handle data container pattern for Empire
    if (config.dataContainer) {
      await this.setupDataContainer(config);
    }
    
    const dockerCmd = ['docker', 'run', '-d', '--name', containerName, '--restart', 'unless-stopped'];
    
    // Add interactive mode flag if specified
    if (config.interactive) {
      dockerCmd.push('-it');
    }

    // Add host binding to 0.0.0.0 for reverse proxy compatibility
    // Special handling for PostgreSQL and Redis port mapping
    if (config.name === 'postgres') {
      // PostgreSQL: External port 5433 -> Internal port 5432
      dockerCmd.push('-p', `0.0.0.0:${config.port}:5432`);
      console.log(`PostgreSQL port mapping: ${config.port}:5432 (external:internal)`);
    } else if (config.name === 'redis') {
      // Redis: External port 6380 -> Internal port 6379  
      dockerCmd.push('-p', `0.0.0.0:${config.port}:6379`);
      console.log(`Redis port mapping: ${config.port}:6379 (external:internal)`);
    } else {
      dockerCmd.push('-p', `0.0.0.0:${config.port}:${this.getContainerPort(config)}`);
    }

    // Add additional ports - special handling for Empire
    if (config.additionalPorts) {
      for (const port of config.additionalPorts) {
        if (config.name === 'empire') {
          // For Empire, direct port mapping 5000:5000
          dockerCmd.push('-p', `0.0.0.0:${port}:5000`);
        } else {
          dockerCmd.push('-p', `0.0.0.0:${port}:${port}`);
        }
      }
    }

    // Add volumes-from for data container pattern
    if (config.dataContainer) {
      dockerCmd.push('--volumes-from', config.dataContainer);
    }

    // Add environment variables or env file
    if (config.name === 'sysreptor') {
      // Use app.env file for sysreptor
      const envFilePath = path.join(process.cwd(), 'server/configs/sysreptor/app.env');
      dockerCmd.push('--env-file', envFilePath);
      console.log(`Using environment file for sysreptor: ${envFilePath}`);
    } else if (config.environment) {
      // Use individual environment variables for other containers
      for (const [key, value] of Object.entries(config.environment)) {
        dockerCmd.push('-e', `${key}=${value}`);
      }
    }

    // Add volumes
    if (config.volumes) {
      for (const volume of config.volumes) {
        // Handle relative paths and ensure directories exist
        let volumePath = volume;
        if (!volume.startsWith('/')) {
          const localPath = volume.split(':')[0];
          const fullLocalPath = path.join(process.cwd(), localPath);
          // Create directory if it doesn't exist
          try {
            await fs.mkdir(fullLocalPath, { recursive: true });
          } catch (error) {
            console.warn(`Failed to create volume directory ${fullLocalPath}:`, error);
          }
          volumePath = volume.replace(localPath, fullLocalPath);
        }
        dockerCmd.push('-v', volumePath);
      }
    }

    // Add capabilities
    if (config.capabilities) {
      for (const cap of config.capabilities) {
        dockerCmd.push('--cap-add', cap);
      }
    }

    // Add privileged mode
    if (config.privileged) {
      dockerCmd.push('--privileged');
    }

    // Add special configurations
    if (config.image.includes('kasm')) {
      dockerCmd.push('--shm-size=512m');
    }

    // Add custom start command or image
    if (config.customStartCommand) {
      dockerCmd.push(config.image, ...config.customStartCommand);
    } else {
      dockerCmd.push(config.image);
    }

    return dockerCmd;
  }

  private getContainerPort(config: ContainerConfig): string {
    // Return the internal container port based on the image type
    if (config.image.includes('kasm')) {
      return '6901';
    }
    if (config.image.includes('postgres')) {
      return '5432';
    }
    if (config.image.includes('redis')) {
      return '6379';
    }
    if (config.image.includes('empire')) {
      return '1337';
    }
    if (config.image.includes('sysreptor')) {
      return '8000';
    }
    if (config.image.includes('caddy')) {
      return '80';
    }
    if (config.image.includes('bbot')) {
      return '8000';
    }
    
    // Default to the configured port
    return config.port.toString();
  }

  private async executeDockerCommandWithMonitoring(command: string, context: any = {}): Promise<{ stdout: string; stderr?: string }> {
    try {
      // First try the regular docker command
      const result = await execAsync(command);
      return result;
    } catch (error: any) {
      // Analyze the error with our monitoring system
      const dockerError = dockerErrorMonitor.analyzeError(error.message || error.stderr || 'Unknown Docker error', {
        ...context,
        command
      });

      // If the error is auto-recoverable, the recovery engine will handle it
      if (dockerError && dockerError.autoRecoverable) {
        console.log(`[DockerService] Auto-recoverable error detected, recovery engine will attempt to fix it`);
        // Wait a moment for recovery to potentially complete
        await new Promise(resolve => setTimeout(resolve, 3000));
      }

      // Try with sudo as fallback
      console.log(`Regular docker command failed, trying with sudo: ${error.message}`);
      try {
        const sudoResult = await execAsync('sudo ' + command);
        return sudoResult;
      } catch (sudoError: any) {
        // Analyze the sudo error as well
        dockerErrorMonitor.analyzeError(sudoError.message || sudoError.stderr || 'Unknown Docker error with sudo', {
          ...context,
          command: 'sudo ' + command,
          originalError: error.message
        });
        
        throw sudoError;
      }
    }
  }

  private async waitForContainer(containerName: string, maxWait: number = 60000): Promise<void> {
    const startTime = Date.now();
    const fullName = `attacknode-${containerName}`;
    
    console.log(`[DockerService] Waiting for container ${fullName} to be ready (max ${maxWait}ms)`);
    
    while (Date.now() - startTime < maxWait) {
      const status = await this.getContainerStatus(fullName);
      console.log(`[DockerService] Container ${fullName} status: ${status} (${Date.now() - startTime}ms elapsed)`);
      
      if (status === 'running') {
        // Additional wait for service to be ready based on container type
        const config = this.containerConfigs.get(containerName);
        let serviceWait = 2000; // Default 2 seconds
        
        if (config?.name === 'postgres') {
          serviceWait = 5000; // PostgreSQL needs more time
        } else if (config?.name === 'redis') {
          serviceWait = 3000; // Redis needs some time
        } else if (config?.name === 'empire') {
          serviceWait = 10000; // Empire needs longer to initialize
        } else if (config?.name === 'sysreptor') {
          serviceWait = 8000; // Sysreptor needs time to connect to DB
        }
        
        console.log(`[DockerService] Container ${fullName} is running, waiting ${serviceWait}ms for service readiness`);
        await new Promise(resolve => setTimeout(resolve, serviceWait));
        
        // Final status check to ensure container is still running
        const finalStatus = await this.getContainerStatus(fullName);
        if (finalStatus === 'running') {
          console.log(`[DockerService] Container ${fullName} is ready`);
          return;
        } else {
          console.log(`[DockerService] Container ${fullName} stopped during readiness check, status: ${finalStatus}`);
        }
      } else if (status === 'error') {
        // Get container logs to help diagnose the issue
        const logs = await this.getContainerLogs(containerName);
        console.error(`[DockerService] Container ${fullName} failed to start. Logs:\n${logs}`);
        throw new Error(`Container ${containerName} failed to start (error state). Check logs for details.`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000)); // Check every 2 seconds
    }
    
    // Timeout reached - get final status and logs
    const finalStatus = await this.getContainerStatus(fullName);
    const logs = await this.getContainerLogs(containerName);
    
    console.error(`[DockerService] Container ${fullName} did not start within ${maxWait}ms. Final status: ${finalStatus}`);
    console.error(`[DockerService] Container ${fullName} logs:\n${logs}`);
    
    throw new Error(`Container ${containerName} did not start within ${maxWait}ms. Final status: ${finalStatus}`);
  }

  async getAllContainerConfigs(): Promise<ContainerConfig[]> {
    return Array.from(this.containerConfigs.values());
  }

  async getContainerConfig(name: string): Promise<ContainerConfig | undefined> {
    return this.containerConfigs.get(name);
  }

  async getContainerLogs(containerName: string): Promise<string> {
    try {
      const { stdout } = await execAsync(`docker logs attacknode-${containerName} --tail 100`).catch(async () => {
        return await execAsync(`sudo docker logs attacknode-${containerName} --tail 100`);
      });
      return stdout;
    } catch (error) {
      console.error('Failed to get container logs:', error);
      return `Error retrieving logs: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  async inspectContainer(containerName: string): Promise<any> {
    try {
      const { stdout } = await execAsync(`docker inspect attacknode-${containerName}`).catch(async () => {
        return await execAsync(`sudo docker inspect attacknode-${containerName}`);
      });
      return JSON.parse(stdout)[0];
    } catch (error) {
      console.error('Failed to inspect container:', error);
      return { error: `Failed to inspect container: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }

  async execInContainer(containerName: string, command: string): Promise<string> {
    try {
      const { stdout } = await execAsync(`docker exec attacknode-${containerName} ${command}`).catch(async () => {
        return await execAsync(`sudo docker exec attacknode-${containerName} ${command}`);
      });
      return stdout;
    } catch (error) {
      console.error('Failed to execute command in container:', error);
      return `Error executing command: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  async restartContainer(containerName: string): Promise<boolean> {
    try {
      await execAsync(`docker restart attacknode-${containerName}`).catch(async () => {
        return await execAsync(`sudo docker restart attacknode-${containerName}`);
      });
      return true;
    } catch (error) {
      console.error('Failed to restart container:', error);
      return false;
    }
  }

  // Initialize essential containers on startup
  async initializeEssentialContainers(): Promise<void> {
    const essentialContainers = ['kali', 'vscode', 'empire', 'maltego'];
    
    for (const containerName of essentialContainers) {
      try {
        console.log(`Initializing essential container: ${containerName}`);
        const status = await this.getContainerStatus(`attacknode-${containerName}`);
        if (status === 'stopped') {
          await this.startContainer(containerName);
        }
      } catch (error) {
        console.error(`Failed to initialize ${containerName}:`, error);
      }
    }
  }

  // Graceful shutdown of all containers
  async gracefulShutdown(): Promise<void> {
    console.log('Shutting down all containers gracefully...');
    
    // Stop containers in reverse dependency order
    const configs = Array.from(this.containerConfigs.values());
    const dependents = configs.filter(c => c.dependencies && c.dependencies.length > 0);
    const independents = configs.filter(c => !c.dependencies || c.dependencies.length === 0);
    
    // Stop dependent containers first
    for (const config of dependents) {
      try {
        await this.stopContainer(`attacknode-${config.name}`);
      } catch (error) {
        console.error(`Failed to stop ${config.name}:`, error);
      }
    }
    
    // Then stop independent containers
    for (const config of independents) {
      try {
        await this.stopContainer(`attacknode-${config.name}`);
      } catch (error) {
        console.error(`Failed to stop ${config.name}:`, error);
      }
    }
    
    console.log('Container shutdown complete');
  }
}

export const dockerService = new DockerService();
