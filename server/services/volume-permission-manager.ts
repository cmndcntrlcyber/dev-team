import { exec } from 'child_process';
import { promisify } from 'util';
import { promises as fs } from 'fs';
import path from 'path';
import { EventEmitter } from 'events';

const execAsync = promisify(exec);

export interface VolumePermission {
  path: string;
  uid: number;
  gid: number;
  mode: string;
  recursive: boolean;
}

export interface VolumeValidationResult {
  path: string;
  exists: boolean;
  readable: boolean;
  writable: boolean;
  owner: { uid: number; gid: number };
  permissions: string;
  issues: string[];
}

export class VolumePermissionManager extends EventEmitter {
  private permissionCache = new Map<string, VolumeValidationResult>();
  private standardPermissions = new Map<string, VolumePermission>();

  constructor() {
    super();
    this.initializeStandardPermissions();
  }

  private initializeStandardPermissions(): void {
    // Redis volume permissions
    this.standardPermissions.set('redis-data', {
      path: 'redis-data',
      uid: 999, // Redis container user ID
      gid: 999, // Redis container group ID
      mode: '0755',
      recursive: true
    });

    // PostgreSQL volume permissions
    this.standardPermissions.set('postgres-data', {
      path: 'postgres-data',
      uid: 999, // PostgreSQL container user ID
      gid: 999, // PostgreSQL container group ID
      mode: '0700',
      recursive: true
    });

    // Upload directories
    this.standardPermissions.set('uploads', {
      path: 'uploads',
      uid: 1000, // Host user ID
      gid: 1000, // Host group ID
      mode: '0755',
      recursive: true
    });

    // Kali persistent data
    this.standardPermissions.set('kali-data', {
      path: 'uploads/kasm_profiles',
      uid: 0, // Root for Kali
      gid: 0, // Root for Kali
      mode: '0755',
      recursive: true
    });
  }

  async validateVolume(volumePath: string): Promise<VolumeValidationResult> {
    const result: VolumeValidationResult = {
      path: volumePath,
      exists: false,
      readable: false,
      writable: false,
      owner: { uid: 0, gid: 0 },
      permissions: '000',
      issues: []
    };

    try {
      const fullPath = path.resolve(volumePath);
      
      // Check if path exists
      try {
        const stats = await fs.stat(fullPath);
        result.exists = true;
        result.owner.uid = stats.uid;
        result.owner.gid = stats.gid;
        result.permissions = (stats.mode & parseInt('777', 8)).toString(8);
      } catch (error) {
        result.issues.push(`Volume path does not exist: ${fullPath}`);
        return result;
      }

      // Check readability
      try {
        await fs.access(fullPath, fs.constants.R_OK);
        result.readable = true;
      } catch (error) {
        result.issues.push('Volume is not readable');
      }

      // Check writability
      try {
        await fs.access(fullPath, fs.constants.W_OK);
        result.writable = true;
      } catch (error) {
        result.issues.push('Volume is not writable');
      }

      // Cache the result
      this.permissionCache.set(volumePath, result);
      
      return result;
    } catch (error) {
      result.issues.push(`Failed to validate volume: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return result;
    }
  }

  async ensureVolumePermissions(volumeName: string): Promise<boolean> {
    const permission = this.standardPermissions.get(volumeName);
    if (!permission) {
      console.warn(`[VolumePermissionManager] No standard permission defined for volume: ${volumeName}`);
      return false;
    }

    try {
      console.log(`[VolumePermissionManager] Ensuring permissions for volume: ${volumeName}`);
      
      const fullPath = path.resolve(permission.path);
      
      // Create directory if it doesn't exist
      await fs.mkdir(fullPath, { recursive: true });
      
      // Set ownership
      await this.setOwnership(fullPath, permission.uid, permission.gid, permission.recursive);
      
      // Set permissions
      await this.setPermissions(fullPath, permission.mode, permission.recursive);
      
      // Validate the changes
      const validation = await this.validateVolume(fullPath);
      
      if (validation.issues.length === 0) {
        console.log(`[VolumePermissionManager] Successfully set permissions for ${volumeName}`);
        this.emit('permissions-applied', { volumeName, path: fullPath });
        return true;
      } else {
        console.error(`[VolumePermissionManager] Permission validation failed for ${volumeName}:`, validation.issues);
        return false;
      }
    } catch (error) {
      console.error(`[VolumePermissionManager] Failed to set permissions for ${volumeName}:`, error);
      return false;
    }
  }

  private async setOwnership(path: string, uid: number, gid: number, recursive: boolean): Promise<void> {
    const chownCmd = recursive ? `chown -R ${uid}:${gid} "${path}"` : `chown ${uid}:${gid} "${path}"`;
    
    try {
      await execAsync(chownCmd);
    } catch (error) {
      // Try with sudo if regular command fails
      await execAsync(`sudo ${chownCmd}`);
    }
  }

  private async setPermissions(path: string, mode: string, recursive: boolean): Promise<void> {
    const chmodCmd = recursive ? `chmod -R ${mode} "${path}"` : `chmod ${mode} "${path}"`;
    
    try {
      await execAsync(chmodCmd);
    } catch (error) {
      // Try with sudo if regular command fails
      await execAsync(`sudo ${chmodCmd}`);
    }
  }

  async fixRedisPermissions(): Promise<boolean> {
    try {
      console.log('[VolumePermissionManager] Fixing Redis permissions aggressively...');
      
      // Ensure redis-data directory exists and has correct permissions
      const redisDataPath = path.resolve('redis-data');
      await fs.mkdir(redisDataPath, { recursive: true });
      
      // Stop any running Redis containers first
      try {
        await execAsync('docker stop attacknode-redis 2>/dev/null || true');
        await execAsync('sudo docker stop attacknode-redis 2>/dev/null || true');
        await execAsync('docker rm -f attacknode-redis 2>/dev/null || true');
        await execAsync('sudo docker rm -f attacknode-redis 2>/dev/null || true');
        console.log('[VolumePermissionManager] Stopped existing Redis containers');
      } catch (error) {
        // Continue - container might not exist
      }
      
      // Set proper ownership for Redis container (uid:999, gid:999)
      console.log('[VolumePermissionManager] Setting Redis data directory ownership...');
      await this.setOwnership(redisDataPath, 999, 999, true);
      // Use 0777 permissions to ensure Redis can create temp files for AOF rewrite
      await this.setPermissions(redisDataPath, '0777', true);
      
      // Create appendonlydir if it doesn't exist
      const appendOnlyDir = path.join(redisDataPath, 'appendonlydir');
      console.log('[VolumePermissionManager] Creating appendonlydir...');
      await fs.mkdir(appendOnlyDir, { recursive: true });
      await this.setOwnership(appendOnlyDir, 999, 999, true);
      // Use 0777 permissions for appendonlydir to allow temp file creation
      await this.setPermissions(appendOnlyDir, '0777', true);
      
      // Clean up any existing temp files that might have wrong permissions
      console.log('[VolumePermissionManager] Cleaning up Redis temp files...');
      try {
        const tempFiles = await fs.readdir(redisDataPath);
        for (const file of tempFiles) {
          if (file.includes('temp-rewriteaof') || file.includes('.tmp') || file.includes('.temp')) {
            const tempFilePath = path.join(redisDataPath, file);
            await fs.unlink(tempFilePath);
            console.log(`[VolumePermissionManager] Removed temp file: ${file}`);
          }
        }
        
        // Also check appendonlydir for temp files
        if (await fs.access(appendOnlyDir).then(() => true).catch(() => false)) {
          const appendTempFiles = await fs.readdir(appendOnlyDir);
          for (const file of appendTempFiles) {
            if (file.includes('temp-rewriteaof') || file.includes('.tmp') || file.includes('.temp')) {
              const tempFilePath = path.join(appendOnlyDir, file);
              await fs.unlink(tempFilePath);
              console.log(`[VolumePermissionManager] Removed append temp file: ${file}`);
            }
          }
        }
      } catch (error) {
        // Continue - temp files might not exist
        console.log('[VolumePermissionManager] No temp files to clean up');
      }
      
      // Create Redis configuration directory
      const confDir = path.join(redisDataPath, 'conf');
      await fs.mkdir(confDir, { recursive: true });
      await this.setOwnership(confDir, 999, 999, true);
      await this.setPermissions(confDir, '0755', true);
      
      // Fix any existing AOF files
      try {
        const files = await fs.readdir(redisDataPath);
        for (const file of files) {
          if (file.endsWith('.aof') || file.endsWith('.rdb')) {
            const filePath = path.join(redisDataPath, file);
            await this.setOwnership(filePath, 999, 999, false);
            await this.setPermissions(filePath, '0644', false);
            console.log(`[VolumePermissionManager] Fixed permissions for ${file}`);
          }
        }
      } catch (error) {
        // Continue - files might not exist yet
      }
      
      // Verify permissions are correctly set
      const validation = await this.validateVolume(redisDataPath);
      if (validation.issues.length > 0) {
        console.warn('[VolumePermissionManager] Validation issues after fix:', validation.issues);
        // Try one more time with force
        await execAsync(`sudo chown -R 999:999 "${redisDataPath}"`);
        await execAsync(`sudo chmod -R 755 "${redisDataPath}"`);
      }
      
      console.log('[VolumePermissionManager] Redis permissions fixed successfully');
      return true;
    } catch (error) {
      console.error('[VolumePermissionManager] Failed to fix Redis permissions:', error);
      return false;
    }
  }

  async fixPostgresPermissions(): Promise<boolean> {
    try {
      console.log('[VolumePermissionManager] Fixing PostgreSQL permissions aggressively...');
      
      // Ensure postgres-data directory exists and has correct permissions
      const postgresDataPath = path.resolve('postgres-data');
      await fs.mkdir(postgresDataPath, { recursive: true });
      
      // Stop any running PostgreSQL containers first
      try {
        await execAsync('docker stop attacknode-postgres 2>/dev/null || true');
        await execAsync('sudo docker stop attacknode-postgres 2>/dev/null || true');
        await execAsync('docker rm -f attacknode-postgres 2>/dev/null || true');
        await execAsync('sudo docker rm -f attacknode-postgres 2>/dev/null || true');
        console.log('[VolumePermissionManager] Stopped existing PostgreSQL containers');
      } catch (error) {
        // Continue - container might not exist
      }
      
      // Set proper ownership for PostgreSQL container (uid:999, gid:999)
      console.log('[VolumePermissionManager] Setting PostgreSQL data directory ownership...');
      await this.setOwnership(postgresDataPath, 999, 999, true);
      // Use 0777 permissions to ensure PostgreSQL can read/write data
      await this.setPermissions(postgresDataPath, '0777', true);
      
      // Remove stale lock files that prevent PostgreSQL startup
      console.log('[VolumePermissionManager] Removing PostgreSQL lock files...');
      try {
        const lockFiles = [
          'postmaster.pid',
          'recovery.signal',
          'standby.signal',
          'postgresql.auto.conf.tmp'
        ];
        
        for (const lockFile of lockFiles) {
          const lockFilePath = path.join(postgresDataPath, lockFile);
          try {
            await fs.unlink(lockFilePath);
            console.log(`[VolumePermissionManager] Removed lock file: ${lockFile}`);
          } catch (error) {
            // File might not exist - continue
          }
        }
      } catch (error) {
        // Continue - lock files might not exist
        console.log('[VolumePermissionManager] No lock files to clean up');
      }
      
      // Fix permissions on PostgreSQL subdirectories
      console.log('[VolumePermissionManager] Fixing PostgreSQL subdirectory permissions...');
      try {
        const subdirs = await fs.readdir(postgresDataPath);
        for (const subdir of subdirs) {
          const subdirPath = path.join(postgresDataPath, subdir);
          const stats = await fs.stat(subdirPath);
          if (stats.isDirectory()) {
            await this.setOwnership(subdirPath, 999, 999, true);
            await this.setPermissions(subdirPath, '0755', true);
            console.log(`[VolumePermissionManager] Fixed permissions for directory: ${subdir}`);
          }
        }
      } catch (error) {
        // Continue - directories might not exist yet
      }
      
      // Fix permissions on PostgreSQL configuration files
      console.log('[VolumePermissionManager] Fixing PostgreSQL config file permissions...');
      try {
        const configFiles = ['postgresql.conf', 'pg_hba.conf', 'pg_ident.conf'];
        for (const configFile of configFiles) {
          const configPath = path.join(postgresDataPath, configFile);
          try {
            await this.setOwnership(configPath, 999, 999, false);
            await this.setPermissions(configPath, '0644', false);
            console.log(`[VolumePermissionManager] Fixed permissions for config: ${configFile}`);
          } catch (error) {
            // File might not exist - continue
          }
        }
      } catch (error) {
        // Continue - config files might not exist yet
      }
      
      // Verify permissions are correctly set
      const validation = await this.validateVolume(postgresDataPath);
      if (validation.issues.length > 0) {
        console.warn('[VolumePermissionManager] Validation issues after fix:', validation.issues);
        // Try one more time with force
        await execAsync(`sudo chown -R 999:999 "${postgresDataPath}"`);
        await execAsync(`sudo chmod -R 700 "${postgresDataPath}"`);
      }
      
      console.log('[VolumePermissionManager] PostgreSQL permissions fixed successfully');
      return true;
    } catch (error) {
      console.error('[VolumePermissionManager] Failed to fix PostgreSQL permissions:', error);
      return false;
    }
  }

  async preflightCheck(containerName: string): Promise<{ passed: boolean; issues: string[] }> {
    const result = { passed: true, issues: [] as string[] };
    
    try {
      // Check volume permissions based on container type
      if (containerName === 'redis') {
        const redisValidation = await this.validateVolume('redis-data');
        if (redisValidation.issues.length > 0) {
          result.issues.push(...redisValidation.issues);
          result.passed = false;
        }
      } else if (containerName === 'postgres') {
        const postgresValidation = await this.validateVolume('postgres-data');
        if (postgresValidation.issues.length > 0) {
          result.issues.push(...postgresValidation.issues);
          result.passed = false;
        }
      }
      
      // Check common upload directories
      if (['kali', 'vscode', 'burpsuite'].includes(containerName)) {
        const uploadsValidation = await this.validateVolume('uploads');
        if (uploadsValidation.issues.length > 0) {
          result.issues.push(...uploadsValidation.issues);
          result.passed = false;
        }
      }
      
      return result;
    } catch (error) {
      result.passed = false;
      result.issues.push(`Preflight check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return result;
    }
  }

  async repairVolumePermissions(containerName: string): Promise<boolean> {
    console.log(`[VolumePermissionManager] Repairing permissions for container: ${containerName}`);
    
    try {
      let success = true;
      
      if (containerName === 'redis') {
        success = await this.fixRedisPermissions();
      } else if (containerName === 'postgres') {
        success = await this.fixPostgresPermissions();
      } else if (containerName === 'kali') {
        success = await this.ensureVolumePermissions('kali-data');
      }
      
      // Always ensure uploads directory permissions
      const uploadsSuccess = await this.ensureVolumePermissions('uploads');
      
      return success && uploadsSuccess;
    } catch (error) {
      console.error(`[VolumePermissionManager] Failed to repair permissions for ${containerName}:`, error);
      return false;
    }
  }

  async monitorVolumeHealth(): Promise<void> {
    const volumesToCheck = ['redis-data', 'postgres-data', 'uploads'];
    
    for (const volumeName of volumesToCheck) {
      const permission = this.standardPermissions.get(volumeName);
      if (permission) {
        const validation = await this.validateVolume(permission.path);
        
        if (validation.issues.length > 0) {
          console.warn(`[VolumePermissionManager] Volume health issue detected for ${volumeName}:`, validation.issues);
          this.emit('volume-health-issue', { volumeName, issues: validation.issues });
        }
      }
    }
  }

  async getVolumeStatus(): Promise<{ [key: string]: VolumeValidationResult }> {
    const status: { [key: string]: VolumeValidationResult } = {};
    
    for (const [volumeName, permission] of Array.from(this.standardPermissions.entries())) {
      status[volumeName] = await this.validateVolume(permission.path);
    }
    
    return status;
  }

  async clearCache(): Promise<void> {
    this.permissionCache.clear();
  }
}

export const volumePermissionManager = new VolumePermissionManager();
