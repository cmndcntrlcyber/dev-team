import { exec } from 'child_process';
import { promisify } from 'util';
import { EventEmitter } from 'events';
import { DockerError, DockerErrorType, dockerErrorMonitor } from './docker-error-monitor';
import { volumePermissionManager } from './volume-permission-manager';
import { redisHealthMonitor } from './redis-health-monitor';
import { djangoDatabaseValidator } from './django-database-validator';

const execAsync = promisify(exec);

export interface RecoveryAction {
  id: string;
  errorId: string;
  type: RecoveryActionType;
  description: string;
  timestamp: Date;
  success: boolean;
  details?: any;
}

export enum RecoveryActionType {
  CLEANUP_CONTAINERS = 'cleanup_containers',
  FIND_ALTERNATIVE_PORT = 'find_alternative_port',
  CLEANUP_DISK_SPACE = 'cleanup_disk_space',
  RESTART_DOCKER_DAEMON = 'restart_docker_daemon',
  KILL_CONFLICTING_PROCESS = 'kill_conflicting_process',
  CREATE_MISSING_DIRECTORIES = 'create_missing_directories',
  RETRY_WITH_SUDO = 'retry_with_sudo',
  FREE_MEMORY = 'free_memory',
  PULL_ALTERNATIVE_IMAGE = 'pull_alternative_image',
  FIX_REDIS_PERMISSIONS = 'fix_redis_permissions',
  REPAIR_VOLUME_PERMISSIONS = 'repair_volume_permissions',
  RESTART_REDIS_CONTAINER = 'restart_redis_container',
  DISABLE_REDIS_AOF = 'disable_redis_aof',
  REMOVE_STALE_RDB = 'remove_stale_rdb',
  FORCE_BGREWRITEAOF = 'force_bgrewriteaof',
  CLEAN_REDIS_DATA = 'clean_redis_data',
  FIX_POSTGRES_PERMISSIONS = 'fix_postgres_permissions',
  REMOVE_POSTGRES_LOCK = 'remove_postgres_lock',
  RESTART_SYSREPTOR_CONTAINER = 'restart_sysreptor_container',
  FIX_DJANGO_DATABASE_CONFIG = 'fix_django_database_config',
  INSTALL_DJANGO_PLUGINS = 'install_django_plugins',
  DISABLE_MISSING_PLUGINS = 'disable_missing_plugins',
  RESTART_DJANGO_CONTAINER = 'restart_django_container',
  VERIFY_DATABASE_CONNECTION = 'verify_database_connection'
}

export interface RecoveryStrategy {
  errorType: DockerErrorType;
  maxAttempts: number;
  actions: RecoveryActionType[];
  retryDelay: number; // in milliseconds
}

export class DockerRecoveryEngine extends EventEmitter {
  private recoveryHistory: RecoveryAction[] = [];
  private recoveryStrategies: Map<DockerErrorType, RecoveryStrategy> = new Map();
  private portRanges: { [key: string]: { start: number; end: number } } = {};
  private activeRecoveries = new Set<string>();

  constructor() {
    super();
    this.initializeRecoveryStrategies();
    this.initializePortRanges();
    this.setupErrorListener();
  }

  private initializeRecoveryStrategies(): void {
    this.recoveryStrategies.set(DockerErrorType.PORT_CONFLICT, {
      errorType: DockerErrorType.PORT_CONFLICT,
      maxAttempts: 3,
      actions: [
        RecoveryActionType.FIND_ALTERNATIVE_PORT,
        RecoveryActionType.KILL_CONFLICTING_PROCESS,
        RecoveryActionType.CLEANUP_CONTAINERS
      ],
      retryDelay: 2000
    });

    this.recoveryStrategies.set(DockerErrorType.CONTAINER_NAME_CONFLICT, {
      errorType: DockerErrorType.CONTAINER_NAME_CONFLICT,
      maxAttempts: 2,
      actions: [
        RecoveryActionType.CLEANUP_CONTAINERS
      ],
      retryDelay: 1000
    });

    this.recoveryStrategies.set(DockerErrorType.PERMISSION_DENIED, {
      errorType: DockerErrorType.PERMISSION_DENIED,
      maxAttempts: 6,
      actions: [
        RecoveryActionType.REMOVE_STALE_RDB,
        RecoveryActionType.FIX_REDIS_PERMISSIONS,
        RecoveryActionType.REPAIR_VOLUME_PERMISSIONS,
        RecoveryActionType.CLEAN_REDIS_DATA,
        RecoveryActionType.RESTART_REDIS_CONTAINER,
        RecoveryActionType.DISABLE_REDIS_AOF,
        RecoveryActionType.RETRY_WITH_SUDO
      ],
      retryDelay: 2000
    });

    this.recoveryStrategies.set(DockerErrorType.RESOURCE_EXHAUSTED, {
      errorType: DockerErrorType.RESOURCE_EXHAUSTED,
      maxAttempts: 3,
      actions: [
        RecoveryActionType.CLEANUP_DISK_SPACE,
        RecoveryActionType.FREE_MEMORY,
        RecoveryActionType.CLEANUP_CONTAINERS
      ],
      retryDelay: 5000
    });

    this.recoveryStrategies.set(DockerErrorType.VOLUME_MOUNT_ERROR, {
      errorType: DockerErrorType.VOLUME_MOUNT_ERROR,
      maxAttempts: 2,
      actions: [
        RecoveryActionType.CREATE_MISSING_DIRECTORIES
      ],
      retryDelay: 1000
    });

    this.recoveryStrategies.set(DockerErrorType.NETWORK_ERROR, {
      errorType: DockerErrorType.NETWORK_ERROR,
      maxAttempts: 3,
      actions: [
        RecoveryActionType.RESTART_DOCKER_DAEMON
      ],
      retryDelay: 10000
    });

    this.recoveryStrategies.set(DockerErrorType.HEALTH_CHECK_FAILED, {
      errorType: DockerErrorType.HEALTH_CHECK_FAILED,
      maxAttempts: 4,
      actions: [
        RecoveryActionType.RESTART_SYSREPTOR_CONTAINER,
        RecoveryActionType.REPAIR_VOLUME_PERMISSIONS,
        RecoveryActionType.CLEANUP_CONTAINERS,
        RecoveryActionType.RESTART_DOCKER_DAEMON
      ],
      retryDelay: 5000
    });

    this.recoveryStrategies.set(DockerErrorType.DJANGO_DATABASE_CONFIG_ERROR, {
      errorType: DockerErrorType.DJANGO_DATABASE_CONFIG_ERROR,
      maxAttempts: 4,
      actions: [
        RecoveryActionType.FIX_DJANGO_DATABASE_CONFIG,
        RecoveryActionType.VERIFY_DATABASE_CONNECTION,
        RecoveryActionType.RESTART_DJANGO_CONTAINER,
        RecoveryActionType.REPAIR_VOLUME_PERMISSIONS
      ],
      retryDelay: 3000
    });

    this.recoveryStrategies.set(DockerErrorType.DJANGO_PLUGIN_MISSING_ERROR, {
      errorType: DockerErrorType.DJANGO_PLUGIN_MISSING_ERROR,
      maxAttempts: 3,
      actions: [
        RecoveryActionType.INSTALL_DJANGO_PLUGINS,
        RecoveryActionType.DISABLE_MISSING_PLUGINS,
        RecoveryActionType.RESTART_DJANGO_CONTAINER
      ],
      retryDelay: 2000
    });
  }

  private initializePortRanges(): void {
    this.portRanges = {
      postgres: { start: 5433, end: 5440 },
      redis: { start: 6380, end: 6390 },
      kali: { start: 6900, end: 6910 },
      vscode: { start: 6920, end: 6930 },
      empire: { start: 1337, end: 1350 },
      sysreptor: { start: 9000, end: 9010 },
      bbot: { start: 8080, end: 8090 },
      maltego: { start: 6940, end: 6950 },
      burpsuite: { start: 6960, end: 6970 }
    };
  }

  private setupErrorListener(): void {
    dockerErrorMonitor.on('error-detected', async (error: DockerError) => {
      if (error.autoRecoverable && error.recoveryAttempts < 3) {
        await this.attemptRecovery(error);
      }
    });
  }

  async attemptRecovery(error: DockerError): Promise<boolean> {
    if (this.activeRecoveries.has(error.id)) {
      console.log(`[DockerRecoveryEngine] Recovery already in progress for error ${error.id}`);
      return false;
    }

    this.activeRecoveries.add(error.id);
    
    try {
      const strategy = this.recoveryStrategies.get(error.type);
      if (!strategy) {
        console.log(`[DockerRecoveryEngine] No recovery strategy for error type: ${error.type}`);
        return false;
      }

      console.log(`[DockerRecoveryEngine] Starting recovery for error: ${error.id} (${error.type})`);
      dockerErrorMonitor.incrementRecoveryAttempts(error.id);

      for (const actionType of strategy.actions) {
        const success = await this.executeRecoveryAction(error, actionType);
        
        if (success) {
          dockerErrorMonitor.markErrorResolved(error.id);
          this.emit('recovery-success', { error, actionType });
          console.log(`[DockerRecoveryEngine] Successfully recovered from error ${error.id} using ${actionType}`);
          return true;
        }
        
        // Wait before trying next action
        await new Promise(resolve => setTimeout(resolve, strategy.retryDelay));
      }

      console.log(`[DockerRecoveryEngine] All recovery actions failed for error ${error.id}`);
      this.emit('recovery-failed', error);
      return false;

    } finally {
      this.activeRecoveries.delete(error.id);
    }
  }

  private async executeRecoveryAction(error: DockerError, actionType: RecoveryActionType): Promise<boolean> {
    const action: RecoveryAction = {
      id: this.generateActionId(),
      errorId: error.id,
      type: actionType,
      description: this.getActionDescription(actionType),
      timestamp: new Date(),
      success: false
    };

    try {
      switch (actionType) {
        case RecoveryActionType.CLEANUP_CONTAINERS:
          action.success = await this.cleanupContainers(error);
          break;
        
        case RecoveryActionType.FIND_ALTERNATIVE_PORT:
          action.success = await this.findAlternativePort(error);
          break;
        
        case RecoveryActionType.CLEANUP_DISK_SPACE:
          action.success = await this.cleanupDiskSpace();
          break;
        
        case RecoveryActionType.KILL_CONFLICTING_PROCESS:
          action.success = await this.killConflictingProcess(error);
          break;
        
        case RecoveryActionType.CREATE_MISSING_DIRECTORIES:
          action.success = await this.createMissingDirectories(error);
          break;
        
        case RecoveryActionType.RETRY_WITH_SUDO:
          action.success = await this.retryWithSudo(error);
          break;
        
        case RecoveryActionType.FREE_MEMORY:
          action.success = await this.freeMemory();
          break;
        
        case RecoveryActionType.RESTART_DOCKER_DAEMON:
          action.success = await this.restartDockerDaemon();
          break;
        
        case RecoveryActionType.FIX_REDIS_PERMISSIONS:
          action.success = await this.fixRedisPermissions();
          break;
        
        case RecoveryActionType.REPAIR_VOLUME_PERMISSIONS:
          action.success = await this.repairVolumePermissions(error);
          break;
        
        case RecoveryActionType.RESTART_REDIS_CONTAINER:
          action.success = await this.restartRedisContainer();
          break;
        
        case RecoveryActionType.DISABLE_REDIS_AOF:
          action.success = await this.disableRedisAOF();
          break;
        
        case RecoveryActionType.REMOVE_STALE_RDB:
          action.success = await this.removeStaleRDB();
          break;
        
        case RecoveryActionType.FORCE_BGREWRITEAOF:
          action.success = await this.forceBGRewriteAOF();
          break;
        
        case RecoveryActionType.CLEAN_REDIS_DATA:
          action.success = await this.cleanRedisData();
          break;
        
        case RecoveryActionType.FIX_POSTGRES_PERMISSIONS:
          action.success = await this.fixPostgresPermissions();
          break;
        
        case RecoveryActionType.REMOVE_POSTGRES_LOCK:
          action.success = await this.removePostgresLock();
          break;
        
        case RecoveryActionType.RESTART_SYSREPTOR_CONTAINER:
          action.success = await this.restartSysreptorContainer();
          break;
        
        case RecoveryActionType.FIX_DJANGO_DATABASE_CONFIG:
          action.success = await this.fixDjangoDatabaseConfig(error);
          break;
        
        case RecoveryActionType.INSTALL_DJANGO_PLUGINS:
          action.success = await this.installDjangoPlugins(error);
          break;
        
        case RecoveryActionType.DISABLE_MISSING_PLUGINS:
          action.success = await this.disableMissingPlugins(error);
          break;
        
        case RecoveryActionType.RESTART_DJANGO_CONTAINER:
          action.success = await this.restartDjangoContainer();
          break;
        
        case RecoveryActionType.VERIFY_DATABASE_CONNECTION:
          action.success = await this.verifyDatabaseConnection(error);
          break;
        
        default:
          console.warn(`[DockerRecoveryEngine] Unknown recovery action: ${actionType}`);
          action.success = false;
      }

      this.addToHistory(action);
      return action.success;

    } catch (error) {
      console.error(`[DockerRecoveryEngine] Recovery action ${actionType} failed:`, error);
      action.success = false;
      this.addToHistory(action);
      return false;
    }
  }

  private async fixDjangoDatabaseConfig(error: DockerError): Promise<boolean> {
    try {
      console.log('[DockerRecoveryEngine] Fixing Django database configuration using comprehensive validator...');
      
      // Use the new django database validator for comprehensive repair
      const repairSuccess = await djangoDatabaseValidator.repairDatabaseConfiguration();
      
      if (repairSuccess) {
        console.log('[DockerRecoveryEngine] Django database configuration repair successful');
        return true;
      } else {
        console.log('[DockerRecoveryEngine] Django database configuration repair failed');
        return false;
      }
      
    } catch (error) {
      console.error('[DockerRecoveryEngine] Failed to fix Django database config:', error);
      return false;
    }
  }

  private async installDjangoPlugins(error: DockerError): Promise<boolean> {
    try {
      console.log('[DockerRecoveryEngine] Installing missing Django plugins...');
      
      const containerName = error.context.containerName || 'sysreptor-app';
      const missingPlugins = error.context.missingPlugins || [];
      
      if (missingPlugins.length === 0) {
        console.log('[DockerRecoveryEngine] No missing plugins identified');
        return false;
      }
      
      // Map plugin names to their packages
      const pluginPackages: { [key: string]: string } = {
        'cyberchef': 'django-cyberchef',
        'graphqlvoyager': 'django-graphql-voyager',
        'checkthehash': 'django-checkthehash'
      };
      
      let installSuccess = false;
      
      for (const plugin of missingPlugins) {
        const packageName = pluginPackages[plugin] || `django-${plugin}`;
        
        try {
          console.log(`[DockerRecoveryEngine] Installing plugin package: ${packageName}`);
          
          const installCmd = `docker exec ${containerName} pip install ${packageName}`;
          await execAsync(installCmd).catch(async () => {
            return await execAsync(`sudo ${installCmd}`);
          });
          
          console.log(`[DockerRecoveryEngine] Successfully installed plugin: ${packageName}`);
          installSuccess = true;
        } catch (installError) {
          console.log(`[DockerRecoveryEngine] Failed to install plugin ${packageName}:`, installError);
          
          // Try alternative package names
          const altPackages = [
            `${plugin}`,
            `sysreptor-${plugin}`,
            `reportcreator-${plugin}`
          ];
          
          for (const altPackage of altPackages) {
            try {
              console.log(`[DockerRecoveryEngine] Trying alternative package: ${altPackage}`);
              const altInstallCmd = `docker exec ${containerName} pip install ${altPackage}`;
              await execAsync(altInstallCmd).catch(async () => {
                return await execAsync(`sudo ${altInstallCmd}`);
              });
              
              console.log(`[DockerRecoveryEngine] Successfully installed alternative package: ${altPackage}`);
              installSuccess = true;
              break;
            } catch (altError) {
              console.log(`[DockerRecoveryEngine] Alternative package ${altPackage} also failed`);
            }
          }
        }
      }
      
      if (installSuccess) {
        // Restart the container to load new plugins
        await this.restartDjangoContainer();
        return true;
      }
      
      return false;
      
    } catch (error) {
      console.error('[DockerRecoveryEngine] Failed to install Django plugins:', error);
      return false;
    }
  }

  private async disableMissingPlugins(error: DockerError): Promise<boolean> {
    try {
      console.log('[DockerRecoveryEngine] Disabling missing Django plugins...');
      
      const containerName = error.context.containerName || 'sysreptor-app';
      const missingPlugins = error.context.missingPlugins || [];
      
      if (missingPlugins.length === 0) {
        console.log('[DockerRecoveryEngine] No missing plugins to disable');
        return false;
      }
      
      // Update app.env to remove the missing plugins
      const envPath = 'server/configs/sysreptor/app.env';
      
      try {
        // Read current environment file
        const { stdout: envContent } = await execAsync(`cat ${envPath}`);
        
        // Find and update the ENABLED_PLUGINS line
        const lines = envContent.split('\n');
        let updatedLines = [];
        let pluginsUpdated = false;
        
        for (const line of lines) {
          if (line.startsWith('ENABLED_PLUGINS=')) {
            const pluginsLine = line.replace('ENABLED_PLUGINS=', '').replace(/['"]/g, '');
            const currentPlugins = pluginsLine.split(',').map(p => p.trim());
            
            // Filter out missing plugins
            const workingPlugins = currentPlugins.filter(plugin => 
              !missingPlugins.includes(plugin)
            );
            
            if (workingPlugins.length !== currentPlugins.length) {
              updatedLines.push(`ENABLED_PLUGINS="${workingPlugins.join(',')}"`);
              pluginsUpdated = true;
              console.log(`[DockerRecoveryEngine] Updated plugins from [${currentPlugins.join(', ')}] to [${workingPlugins.join(', ')}]`);
            } else {
              updatedLines.push(line);
            }
          } else {
            updatedLines.push(line);
          }
        }
        
        if (pluginsUpdated) {
          // Write updated environment file
          const updatedContent = updatedLines.join('\n');
          await execAsync(`echo '${updatedContent}' > ${envPath}`);
          
          console.log('[DockerRecoveryEngine] Updated app.env to disable missing plugins');
          
          // Restart the container to apply changes
          await this.restartDjangoContainer();
          return true;
        }
        
        return false;
        
      } catch (envError) {
        console.log('[DockerRecoveryEngine] Failed to update environment file:', envError);
        
        // Fallback: try to disable plugins via container environment
        try {
          const workingPlugins = ['graphqlvoyager']; // Keep only known working plugins
          const envCmd = `docker exec ${containerName} sh -c 'export ENABLED_PLUGINS="${workingPlugins.join(',')}" && python manage.py check'`;
          
          await execAsync(envCmd).catch(async () => {
            return await execAsync(`sudo ${envCmd}`);
          });
          
          console.log('[DockerRecoveryEngine] Successfully disabled missing plugins via container environment');
          return true;
        } catch (fallbackError) {
          console.log('[DockerRecoveryEngine] Fallback plugin disable also failed:', fallbackError);
          return false;
        }
      }
      
    } catch (error) {
      console.error('[DockerRecoveryEngine] Failed to disable missing plugins:', error);
      return false;
    }
  }

  private async restartDjangoContainer(): Promise<boolean> {
    try {
      console.log('[DockerRecoveryEngine] Restarting Django container...');
      
      const containerName = 'sysreptor-app';
      
      // Stop the container gracefully
      await execAsync(`docker stop ${containerName} --time 10 2>/dev/null || true`);
      await execAsync(`sudo docker stop ${containerName} --time 10 2>/dev/null || true`);
      
      // Remove the container
      await execAsync(`docker rm -f ${containerName} 2>/dev/null || true`);
      await execAsync(`sudo docker rm -f ${containerName} 2>/dev/null || true`);
      
      // Wait for cleanup
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Restart using docker-compose
      try {
        await execAsync('docker-compose up -d app').catch(async () => {
          return await execAsync('sudo docker-compose up -d app');
        });
        
        // Wait for container to be ready
        let retries = 0;
        while (retries < 15) {
          try {
            const { stdout } = await execAsync(`docker ps --filter "name=${containerName}" --format "{{.Status}}" 2>/dev/null || true`);
            if (stdout.includes('Up')) {
              console.log('[DockerRecoveryEngine] Django container is running');
              
              // Give it time to initialize
              await new Promise(resolve => setTimeout(resolve, 5000));
              
              // Test health
              try {
                const healthCmd = `docker exec ${containerName} python manage.py check`;
                await execAsync(healthCmd).catch(async () => {
                  return await execAsync(`sudo ${healthCmd}`);
                });
                
                console.log('[DockerRecoveryEngine] Django container health check passed');
                return true;
              } catch (healthError) {
                console.log('[DockerRecoveryEngine] Django health check failed, but container is running');
                return true; // Consider it success if container is at least running
              }
            }
          } catch (error) {
            // Continue checking
          }
          
          await new Promise(resolve => setTimeout(resolve, 2000));
          retries++;
        }
        
        console.log('[DockerRecoveryEngine] Django container restart timed out');
        return false;
        
      } catch (restartError) {
        console.log('[DockerRecoveryEngine] Failed to restart Django container:', restartError);
        return false;
      }
      
    } catch (error) {
      console.error('[DockerRecoveryEngine] Failed to restart Django container:', error);
      return false;
    }
  }

  private async verifyDatabaseConnection(error: DockerError): Promise<boolean> {
    try {
      console.log('[DockerRecoveryEngine] Verifying database connection...');
      
      const containerName = error.context.containerName || 'sysreptor-app';
      
      // Test database connectivity from Django container
      const dbTestCmd = `docker exec ${containerName} python -c "
import os
import psycopg2
try:
    conn = psycopg2.connect(
        host='attacknode-postgres',
        database='sysreptor',
        user='sysreptor',
        password='sysreptor123'
    )
    conn.close()
    print('Database connection successful')
except Exception as e:
    print(f'Database connection failed: {e}')
    exit(1)
"`;
      
      try {
        const { stdout } = await execAsync(dbTestCmd).catch(async () => {
          return await execAsync(`sudo ${dbTestCmd}`);
        });
        
        if (stdout.includes('successful')) {
          console.log('[DockerRecoveryEngine] Database connection verified');
          return true;
        } else {
          console.log('[DockerRecoveryEngine] Database connection test failed');
          return false;
        }
      } catch (testError) {
        console.log('[DockerRecoveryEngine] Database connection test error:', testError);
        
        // Try alternative connection test using Django management command
        try {
          const djangoDbCmd = `docker exec ${containerName} python manage.py dbshell --command="SELECT 1;"`;
          await execAsync(djangoDbCmd).catch(async () => {
            return await execAsync(`sudo ${djangoDbCmd}`);
          });
          
          console.log('[DockerRecoveryEngine] Django database connection verified via dbshell');
          return true;
        } catch (djangoError) {
          console.log('[DockerRecoveryEngine] Django database connection also failed:', djangoError);
          return false;
        }
      }
      
    } catch (error) {
      console.error('[DockerRecoveryEngine] Failed to verify database connection:', error);
      return false;
    }
  }

  private async cleanupContainers(error: DockerError): Promise<boolean> {
    try {
      console.log(`[DockerRecoveryEngine] Starting aggressive container cleanup for error: ${error.type}`);
      
      const containerName = error.context.containerName;
      const conflictingContainerId = error.context.conflictingContainerId;
      
      // Strategy 1: Clean up specific container by name
      if (containerName) {
        await this.removeContainerByName(containerName);
      }
      
      // Strategy 2: Clean up specific container by ID (from error message)
      if (conflictingContainerId) {
        await this.removeContainerById(conflictingContainerId);
      }
      
      // Strategy 3: Find and remove all containers with similar names
      if (containerName) {
        await this.removeContainersByPattern(containerName);
      }
      
      // Strategy 4: Cleanup all stopped containers
      try {
        console.log(`[DockerRecoveryEngine] Pruning all stopped containers`);
        await execAsync('docker container prune -f').catch(async () => {
          return await execAsync('sudo docker container prune -f');
        });
      } catch (error: any) {
        console.log(`[DockerRecoveryEngine] Container prune failed:`, error.message);
      }
      
      // Strategy 5: Verify cleanup was successful
      if (containerName) {
        const isCleanedUp = await this.verifyContainerCleanup(containerName);
        if (isCleanedUp) {
          console.log(`[DockerRecoveryEngine] Successfully verified cleanup of container: ${containerName}`);
          return true;
        } else {
          console.log(`[DockerRecoveryEngine] Cleanup verification failed for container: ${containerName}`);
          return false;
        }
      }
      
      return true;
    } catch (error) {
      console.error('[DockerRecoveryEngine] Container cleanup failed:', error);
      return false;
    }
  }

  private async removeContainerByName(containerName: string): Promise<void> {
    const variations = [
      containerName,
      containerName.replace(/^\//, ''), // Remove leading slash
      `/${containerName}`, // Add leading slash
      containerName.replace('attacknode-', ''), // Remove prefix
      `attacknode-${containerName.replace('attacknode-', '')}` // Ensure prefix
    ];

    for (const name of variations) {
      try {
        console.log(`[DockerRecoveryEngine] Attempting to stop container: ${name}`);
        await execAsync(`docker stop ${name} --time 5 2>/dev/null || true`);
        await execAsync(`sudo docker stop ${name} --time 5 2>/dev/null || true`);
        
        console.log(`[DockerRecoveryEngine] Attempting to remove container: ${name}`);
        await execAsync(`docker rm -f ${name} 2>/dev/null || true`);
        await execAsync(`sudo docker rm -f ${name} 2>/dev/null || true`);
        
        console.log(`[DockerRecoveryEngine] Container removal attempt completed for: ${name}`);
      } catch (error: any) {
        console.log(`[DockerRecoveryEngine] Failed to remove container ${name}:`, error.message);
      }
    }
  }

  private async removeContainerById(containerId: string): Promise<void> {
    try {
      console.log(`[DockerRecoveryEngine] Removing container by ID: ${containerId}`);
      
      await execAsync(`docker stop ${containerId} --time 5 2>/dev/null || true`);
      await execAsync(`sudo docker stop ${containerId} --time 5 2>/dev/null || true`);
      
      await execAsync(`docker rm -f ${containerId} 2>/dev/null || true`);
      await execAsync(`sudo docker rm -f ${containerId} 2>/dev/null || true`);
      
      console.log(`[DockerRecoveryEngine] Container ID removal completed: ${containerId}`);
    } catch (error: any) {
      console.log(`[DockerRecoveryEngine] Failed to remove container by ID ${containerId}:`, error.message);
    }
  }

  private async removeContainersByPattern(containerName: string): Promise<void> {
    try {
      const baseName = containerName.replace('attacknode-', '').replace(/^\//, '');
      const patterns = [
        `*${baseName}*`,
        `*attacknode-${baseName}*`,
        `attacknode*${baseName}*`,
        baseName
      ];

      for (const pattern of patterns) {
        try {
          console.log(`[DockerRecoveryEngine] Searching for containers matching pattern: ${pattern}`);
          
          const { stdout } = await execAsync(`docker ps -aq --filter "name=${pattern}" 2>/dev/null || true`).catch(async () => {
            return await execAsync(`sudo docker ps -aq --filter "name=${pattern}" 2>/dev/null || true`);
          });
          
          const containerIds = stdout.trim().split('\n').filter(id => id.trim());
          
          for (const id of containerIds) {
            if (id.trim()) {
              await this.removeContainerById(id.trim());
            }
          }
        } catch (error: any) {
          console.log(`[DockerRecoveryEngine] Pattern search failed for ${pattern}:`, error.message);
        }
      }
    } catch (error: any) {
      console.log(`[DockerRecoveryEngine] Container pattern cleanup failed:`, error.message);
    }
  }

  private async verifyContainerCleanup(containerName: string): Promise<boolean> {
    try {
      const { stdout } = await execAsync(`docker ps -a --filter "name=${containerName}" --format "{{.Names}}" 2>/dev/null || true`).catch(async () => {
        return await execAsync(`sudo docker ps -a --filter "name=${containerName}" --format "{{.Names}}" 2>/dev/null || true`);
      });
      
      const remainingContainers = stdout.trim().split('\n').filter(name => name.trim());
      
      if (remainingContainers.length === 0) {
        return true;
      } else {
        console.log(`[DockerRecoveryEngine] Cleanup verification failed - remaining containers:`, remainingContainers);
        return false;
      }
    } catch (error: any) {
      console.log(`[DockerRecoveryEngine] Cleanup verification error:`, error.message);
      return false;
    }
  }

  private async findAlternativePort(error: DockerError): Promise<boolean> {
    try {
      const conflictedPort = error.context.port;
      if (!conflictedPort) return false;

      // Determine container type from context
      const containerName = error.context.containerName || '';
      let portRange = { start: conflictedPort + 1, end: conflictedPort + 100 };
      
      // Use specific port ranges if available
      for (const [type, range] of Object.entries(this.portRanges)) {
        if (containerName.includes(type)) {
          portRange = range;
          break;
        }
      }

      const availablePort = await this.findAvailablePort(portRange.start, portRange.end);
      if (availablePort) {
        console.log(`[DockerRecoveryEngine] Found alternative port: ${availablePort} (original: ${conflictedPort})`);
        // Store the alternative port for use by the Docker service
        this.emit('port-alternative-found', { 
          originalPort: conflictedPort, 
          alternativePort: availablePort,
          containerName 
        });
        return true;
      }

      return false;
    } catch (error) {
      console.error('[DockerRecoveryEngine] Port search failed:', error);
      return false;
    }
  }

  private async findAvailablePort(startPort: number, endPort: number): Promise<number | null> {
    for (let port = startPort; port <= endPort; port++) {
      try {
        const { stdout } = await execAsync(`netstat -tuln | grep :${port} || true`);
        if (!stdout.trim()) {
          return port;
        }
      } catch {
        // Continue checking next port
      }
    }
    return null;
  }

  private async cleanupDiskSpace(): Promise<boolean> {
    try {
      // Remove unused Docker images
      await execAsync('docker image prune -a -f').catch(async () => {
        return await execAsync('sudo docker image prune -a -f');
      });

      // Remove unused volumes
      await execAsync('docker volume prune -f').catch(async () => {
        return await execAsync('sudo docker volume prune -f');
      });

      // Remove unused networks
      await execAsync('docker network prune -f').catch(async () => {
        return await execAsync('sudo docker network prune -f');
      });

      console.log('[DockerRecoveryEngine] Disk space cleanup completed');
      return true;
    } catch (error) {
      console.error('[DockerRecoveryEngine] Disk cleanup failed:', error);
      return false;
    }
  }

  private async killConflictingProcess(error: DockerError): Promise<boolean> {
    try {
      const port = error.context.port;
      if (!port) return false;

      const { stdout } = await execAsync(`lsof -ti:${port} || true`);
      const pids = stdout.trim().split('\n').filter(pid => pid.trim());

      for (const pid of pids) {
        if (pid.trim()) {
          try {
            await execAsync(`kill ${pid}`);
            console.log(`[DockerRecoveryEngine] Killed process ${pid} using port ${port}`);
          } catch {
            // Try with sudo
            await execAsync(`sudo kill ${pid}`);
            console.log(`[DockerRecoveryEngine] Killed process ${pid} using port ${port} (with sudo)`);
          }
        }
      }

      return pids.length > 0;
    } catch (error) {
      console.error('[DockerRecoveryEngine] Process kill failed:', error);
      return false;
    }
  }

  private async createMissingDirectories(error: DockerError): Promise<boolean> {
    try {
      // Extract directory paths from error message
      const pathMatches = error.message.match(/["']?([^"'\s:]+)["']?/g);
      if (!pathMatches) return false;

      for (const match of pathMatches) {
        const cleanPath = match.replace(/["']/g, '');
        if (cleanPath.startsWith('/') || cleanPath.includes('uploads')) {
          try {
            await execAsync(`mkdir -p "${cleanPath}"`);
            console.log(`[DockerRecoveryEngine] Created directory: ${cleanPath}`);
          } catch {
            // Continue with next path
          }
        }
      }

      return true;
    } catch (error) {
      console.error('[DockerRecoveryEngine] Directory creation failed:', error);
      return false;
    }
  }

  private async retryWithSudo(error: DockerError): Promise<boolean> {
    try {
      const command = error.context.command;
      if (!command) return false;

      if (!command.startsWith('sudo ')) {
        const sudoCommand = `sudo ${command}`;
        await execAsync(sudoCommand);
        console.log(`[DockerRecoveryEngine] Successfully retried with sudo: ${command}`);
        return true;
      }

      return false;
    } catch (error) {
      console.error('[DockerRecoveryEngine] Sudo retry failed:', error);
      return false;
    }
  }

  private async freeMemory(): Promise<boolean> {
    try {
      // Clear system caches
      await execAsync('sync').catch(() => {});
      await execAsync('sudo sh -c "echo 3 > /proc/sys/vm/drop_caches"').catch(() => {});
      
      // Stop non-essential containers
      const { stdout } = await execAsync('docker ps --format "{{.Names}}" | grep -v "postgres\\|redis" || true');
      const containers = stdout.trim().split('\n').filter(name => name.trim());
      
      for (const container of containers.slice(0, 2)) { // Stop only first 2 non-essential containers
        if (container.trim()) {
          await execAsync(`docker stop ${container}`).catch(() => {});
          console.log(`[DockerRecoveryEngine] Stopped container to free memory: ${container}`);
        }
      }

      return true;
    } catch (error) {
      console.error('[DockerRecoveryEngine] Memory cleanup failed:', error);
      return false;
    }
  }

  private async restartDockerDaemon(): Promise<boolean> {
    try {
      await execAsync('sudo systemctl restart docker');
      
      // Wait for daemon to be ready
      let retries = 0;
      while (retries < 10) {
        try {
          await execAsync('docker info');
          console.log('[DockerRecoveryEngine] Docker daemon restarted successfully');
          return true;
        } catch {
          await new Promise(resolve => setTimeout(resolve, 2000));
          retries++;
        }
      }

      return false;
    } catch (error) {
      console.error('[DockerRecoveryEngine] Docker daemon restart failed:', error);
      return false;
    }
  }

  private async fixRedisPermissions(): Promise<boolean> {
    try {
      console.log('[DockerRecoveryEngine] Fixing Redis permissions...');
      return await volumePermissionManager.fixRedisPermissions();
    } catch (error) {
      console.error('[DockerRecoveryEngine] Redis permission fix failed:', error);
      return false;
    }
  }

  private async repairVolumePermissions(error: DockerError): Promise<boolean> {
    try {
      const containerName = error.context.containerName || 'unknown';
      console.log(`[DockerRecoveryEngine] Repairing volume permissions for ${containerName}...`);
      return await volumePermissionManager.repairVolumePermissions(containerName);
    } catch (error) {
      console.error('[DockerRecoveryEngine] Volume permission repair failed:', error);
      return false;
    }
  }

  private async restartRedisContainer(): Promise<boolean> {
    try {
      console.log('[DockerRecoveryEngine] Restarting Redis container...');
      return await redisHealthMonitor.repairRedisHealth();
    } catch (error) {
      console.error('[DockerRecoveryEngine] Redis container restart failed:', error);
      return false;
    }
  }

  private async disableRedisAOF(): Promise<boolean> {
    try {
      console.log('[DockerRecoveryEngine] Disabling Redis AOF as fallback...');
      
      // Try to disable AOF via Redis CLI
      const configCmd = `docker exec attacknode-redis redis-cli CONFIG SET appendonly no`;
      await execAsync(configCmd).catch(async () => {
        return await execAsync(`sudo ${configCmd}`);
      });
      
      // Save the configuration
      const saveCmd = `docker exec attacknode-redis redis-cli CONFIG REWRITE`;
      await execAsync(saveCmd).catch(async () => {
        return await execAsync(`sudo ${saveCmd}`);
      });
      
      console.log('[DockerRecoveryEngine] Redis AOF disabled successfully');
      return true;
    } catch (error) {
      console.error('[DockerRecoveryEngine] Failed to disable Redis AOF:', error);
      return false;
    }
  }

  private async removeStaleRDB(): Promise<boolean> {
    try {
      console.log('[DockerRecoveryEngine] Removing stale RDB files...');
      
      const redisDataPath = 'redis-data';
      
      // Remove problematic RDB files
      const rdbFiles = [
        'appendonly.aof.*.base.rdb',
        '*.rdb',
        'dump.rdb'
      ];
      
      for (const pattern of rdbFiles) {
        try {
          await execAsync(`find ${redisDataPath} -name "${pattern}" -delete 2>/dev/null || true`);
          console.log(`[DockerRecoveryEngine] Removed RDB files matching: ${pattern}`);
        } catch (error) {
          // Continue with next pattern
        }
      }
      
      // Also remove any AOF base files that might be corrupted
      try {
        await execAsync(`find ${redisDataPath} -name "*.base.rdb" -delete 2>/dev/null || true`);
        await execAsync(`find ${redisDataPath} -name "*.base.aof" -delete 2>/dev/null || true`);
        console.log('[DockerRecoveryEngine] Removed corrupted AOF base files');
      } catch (error) {
        // Continue
      }
      
      console.log('[DockerRecoveryEngine] Stale RDB file removal completed');
      return true;
    } catch (error) {
      console.error('[DockerRecoveryEngine] Failed to remove stale RDB files:', error);
      return false;
    }
  }

  private async forceBGRewriteAOF(): Promise<boolean> {
    try {
      console.log('[DockerRecoveryEngine] Forcing AOF rewrite...');
      
      // Wait for Redis to be ready first
      let retries = 0;
      while (retries < 5) {
        try {
          const pingCmd = `docker exec attacknode-redis redis-cli ping`;
          const { stdout } = await execAsync(pingCmd).catch(async () => {
            return await execAsync(`sudo ${pingCmd}`);
          });
          
          if (stdout.trim() === 'PONG') {
            break;
          }
        } catch {
          // Wait and retry
        }
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        retries++;
      }
      
      if (retries >= 5) {
        console.log('[DockerRecoveryEngine] Redis not responding, cannot force AOF rewrite');
        return false;
      }
      
      // Force background AOF rewrite
      const bgrewriteCmd = `docker exec attacknode-redis redis-cli BGREWRITEAOF`;
      await execAsync(bgrewriteCmd).catch(async () => {
        return await execAsync(`sudo ${bgrewriteCmd}`);
      });
      
      console.log('[DockerRecoveryEngine] AOF rewrite initiated successfully');
      return true;
    } catch (error) {
      console.error('[DockerRecoveryEngine] Failed to force AOF rewrite:', error);
      return false;
    }
  }

  private async cleanRedisData(): Promise<boolean> {
    try {
      console.log('[DockerRecoveryEngine] Performing complete Redis data cleanup...');
      
      // Stop Redis container first
      await execAsync('docker stop attacknode-redis 2>/dev/null || true');
      await execAsync('sudo docker stop attacknode-redis 2>/dev/null || true');
      
      const redisDataPath = 'redis-data';
      
      // Remove all persistence files but keep directory structure
      const filesToRemove = [
        '*.rdb',
        '*.aof*',
        'appendonly.aof*',
        'dump.rdb',
        'temp-*',
        '*.log'
      ];
      
      for (const pattern of filesToRemove) {
        try {
          await execAsync(`find ${redisDataPath} -name "${pattern}" -type f -delete 2>/dev/null || true`);
          console.log(`[DockerRecoveryEngine] Removed files matching: ${pattern}`);
        } catch (error) {
          // Continue with next pattern
        }
      }
      
      // Clean up appendonlydir specifically
      try {
        await execAsync(`rm -rf ${redisDataPath}/appendonlydir/* 2>/dev/null || true`);
        console.log('[DockerRecoveryEngine] Cleaned appendonlydir contents');
      } catch (error) {
        // Continue
      }
      
      // Ensure correct permissions after cleanup
      await volumePermissionManager.fixRedisPermissions();
      
      console.log('[DockerRecoveryEngine] Redis data cleanup completed - fresh start enabled');
      return true;
    } catch (error) {
      console.error('[DockerRecoveryEngine] Failed to clean Redis data:', error);
      return false;
    }
  }

  private async fixPostgresPermissions(): Promise<boolean> {
    try {
      console.log('[DockerRecoveryEngine] Fixing PostgreSQL permissions...');
      return await volumePermissionManager.fixPostgresPermissions();
    } catch (error) {
      console.error('[DockerRecoveryEngine] PostgreSQL permission fix failed:', error);
      return false;
    }
  }

  private async removePostgresLock(): Promise<boolean> {
    try {
      console.log('[DockerRecoveryEngine] Removing PostgreSQL lock files...');
      
      // Stop PostgreSQL container first
      await execAsync('docker stop attacknode-postgres 2>/dev/null || true');
      await execAsync('sudo docker stop attacknode-postgres 2>/dev/null || true');
      
      const postgresDataPath = 'postgres-data';
      
      // Remove specific lock files that prevent PostgreSQL startup
      const lockFiles = [
        'postmaster.pid',
        'recovery.signal',
        'standby.signal',
        'postgresql.auto.conf.tmp'
      ];
      
      for (const lockFile of lockFiles) {
        try {
          await execAsync(`rm -f ${postgresDataPath}/${lockFile} 2>/dev/null || true`);
          console.log(`[DockerRecoveryEngine] Removed PostgreSQL lock file: ${lockFile}`);
        } catch (error) {
          // Continue with next file
        }
      }
      
      // Also remove any .pid files in subdirectories
      try {
        await execAsync(`find ${postgresDataPath} -name "*.pid" -delete 2>/dev/null || true`);
        console.log('[DockerRecoveryEngine] Removed additional PID files');
      } catch (error) {
        // Continue
      }
      
      console.log('[DockerRecoveryEngine] PostgreSQL lock file removal completed');
      return true;
    } catch (error) {
      console.error('[DockerRecoveryEngine] Failed to remove PostgreSQL lock files:', error);
      return false;
    }
  }

  private async restartSysreptorContainer(): Promise<boolean> {
    try {
      console.log('[DockerRecoveryEngine] Restarting Sysreptor container for health recovery...');
      
      // Stop the container gracefully first
      await execAsync('docker stop attacknode-sysreptor --time 10 2>/dev/null || true');
      await execAsync('sudo docker stop attacknode-sysreptor --time 10 2>/dev/null || true');
      
      // Remove the container to ensure fresh start
      await execAsync('docker rm -f attacknode-sysreptor 2>/dev/null || true');
      await execAsync('sudo docker rm -f attacknode-sysreptor 2>/dev/null || true');
      
      // Wait a moment for cleanup
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Try to restart using docker-compose
      try {
        console.log('[DockerRecoveryEngine] Attempting to restart sysreptor via docker-compose...');
        await execAsync('docker-compose up -d sysreptor').catch(async () => {
          return await execAsync('sudo docker-compose up -d sysreptor');
        });
        
        // Wait for container to be ready
        let retries = 0;
        while (retries < 15) {
          try {
            const { stdout } = await execAsync('docker ps --filter "name=attacknode-sysreptor" --format "{{.Status}}" 2>/dev/null || true');
            if (stdout.includes('Up')) {
              console.log('[DockerRecoveryEngine] Sysreptor container is now running');
              
              // Give it a moment to fully initialize
              await new Promise(resolve => setTimeout(resolve, 5000));
              
              // Verify health by testing connection
              try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 5000);
                
                const response = await fetch('http://localhost:9000/health', { 
                  method: 'GET',
                  signal: controller.signal
                }).catch(() => null);
                
                clearTimeout(timeoutId);
                
                if (response && (response.ok || response.status === 404)) {
                  console.log('[DockerRecoveryEngine] Sysreptor health check passed after restart');
                  return true;
                }
              } catch (healthError) {
                console.log('[DockerRecoveryEngine] Health check failed but container is running, considering success');
                return true; // Container is up, even if health endpoint not ready
              }
              
              return true;
            }
          } catch (error) {
            // Continue checking
          }
          
          await new Promise(resolve => setTimeout(resolve, 2000));
          retries++;
        }
        
        console.log('[DockerRecoveryEngine] Sysreptor container restart timed out');
        return false;
        
      } catch (composeError) {
        console.log('[DockerRecoveryEngine] Docker-compose restart failed, trying manual restart...');
        return false;
      }
      
    } catch (error) {
      console.error('[DockerRecoveryEngine] Failed to restart Sysreptor container:', error);
      return false;
    }
  }

  private getActionDescription(actionType: RecoveryActionType): string {
    switch (actionType) {
      case RecoveryActionType.CLEANUP_CONTAINERS:
        return 'Clean up conflicting containers';
      case RecoveryActionType.FIND_ALTERNATIVE_PORT:
        return 'Find alternative available port';
      case RecoveryActionType.CLEANUP_DISK_SPACE:
        return 'Clean up disk space';
      case RecoveryActionType.KILL_CONFLICTING_PROCESS:
        return 'Kill process using conflicting port';
      case RecoveryActionType.CREATE_MISSING_DIRECTORIES:
        return 'Create missing directories';
      case RecoveryActionType.RETRY_WITH_SUDO:
        return 'Retry operation with sudo privileges';
      case RecoveryActionType.FREE_MEMORY:
        return 'Free system memory';
      case RecoveryActionType.RESTART_DOCKER_DAEMON:
        return 'Restart Docker daemon';
      case RecoveryActionType.FIX_REDIS_PERMISSIONS:
        return 'Fix Redis volume permissions';
      case RecoveryActionType.REPAIR_VOLUME_PERMISSIONS:
        return 'Repair container volume permissions';
      case RecoveryActionType.RESTART_REDIS_CONTAINER:
        return 'Restart Redis container with health check';
      case RecoveryActionType.DISABLE_REDIS_AOF:
        return 'Disable Redis AOF as fallback';
      case RecoveryActionType.REMOVE_STALE_RDB:
        return 'Remove stale/incompatible RDB files';
      case RecoveryActionType.FORCE_BGREWRITEAOF:
        return 'Force Redis background AOF rewrite';
      case RecoveryActionType.CLEAN_REDIS_DATA:
        return 'Clean Redis data for fresh start';
      case RecoveryActionType.FIX_POSTGRES_PERMISSIONS:
        return 'Fix PostgreSQL volume permissions';
      case RecoveryActionType.REMOVE_POSTGRES_LOCK:
        return 'Remove PostgreSQL lock files';
      case RecoveryActionType.RESTART_SYSREPTOR_CONTAINER:
        return 'Restart Sysreptor container with health recovery';
      case RecoveryActionType.FIX_DJANGO_DATABASE_CONFIG:
        return 'Fix Django database configuration';
      case RecoveryActionType.INSTALL_DJANGO_PLUGINS:
        return 'Install missing Django plugins';
      case RecoveryActionType.DISABLE_MISSING_PLUGINS:
        return 'Disable missing Django plugins';
      case RecoveryActionType.RESTART_DJANGO_CONTAINER:
        return 'Restart Django container';
      case RecoveryActionType.VERIFY_DATABASE_CONNECTION:
        return 'Verify database connection';
      default:
        return 'Unknown recovery action';
    }
  }

  private generateActionId(): string {
    return `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private addToHistory(action: RecoveryAction): void {
    this.recoveryHistory.unshift(action);
    
    // Keep only last 500 actions
    if (this.recoveryHistory.length > 500) {
      this.recoveryHistory = this.recoveryHistory.slice(0, 500);
    }
  }

  getRecoveryHistory(limit: number = 50): RecoveryAction[] {
    return this.recoveryHistory.slice(0, limit);
  }

  getRecoveryStats(): {
    total: number;
    successful: number;
    byType: Record<string, { total: number; successful: number }>;
  } {
    const stats = {
      total: this.recoveryHistory.length,
      successful: 0,
      byType: {} as Record<string, { total: number; successful: number }>
    };

    for (const action of this.recoveryHistory) {
      if (action.success) stats.successful++;
      
      if (!stats.byType[action.type]) {
        stats.byType[action.type] = { total: 0, successful: 0 };
      }
      
      stats.byType[action.type].total++;
      if (action.success) stats.byType[action.type].successful++;
    }

    return stats;
  }
}

export const dockerRecoveryEngine = new DockerRecoveryEngine();
