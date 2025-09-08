import { exec } from 'child_process';
import { promisify } from 'util';
import { EventEmitter } from 'events';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const execAsync = promisify(exec);

export interface DatabaseValidationResult {
  isValid: boolean;
  connectionWorking: boolean;
  schemaValid: boolean;
  configurationValid: boolean;
  issues: string[];
  recommendations: string[];
}

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  url: string;
}

export class DjangoDatabaseValidator extends EventEmitter {
  private containerName: string;
  private configPath: string;
  private validationInterval?: NodeJS.Timeout;
  private lastValidationResult?: DatabaseValidationResult;

  constructor(containerName: string = 'sysreptor-app', configPath: string = 'server/configs/sysreptor/app.env') {
    super();
    this.containerName = containerName;
    this.configPath = configPath;
    this.startContinuousValidation();
  }

  async validateDatabaseConfiguration(): Promise<DatabaseValidationResult> {
    const result: DatabaseValidationResult = {
      isValid: true,
      connectionWorking: false,
      schemaValid: false,
      configurationValid: false,
      issues: [],
      recommendations: []
    };

    try {
      // Step 1: Validate configuration file
      const configValidation = await this.validateConfigFile();
      result.configurationValid = configValidation.isValid;
      result.issues.push(...configValidation.issues);
      result.recommendations.push(...configValidation.recommendations);

      // Step 2: Test database connectivity
      const connectionTest = await this.testDatabaseConnection();
      result.connectionWorking = connectionTest.isWorking;
      if (!connectionTest.isWorking) {
        result.issues.push(...connectionTest.issues);
        result.recommendations.push(...connectionTest.recommendations);
      }

      // Step 3: Validate schema if connection works
      if (result.connectionWorking) {
        const schemaValidation = await this.validateDatabaseSchema();
        result.schemaValid = schemaValidation.isValid;
        result.issues.push(...schemaValidation.issues);
        result.recommendations.push(...schemaValidation.recommendations);
      }

      // Step 4: Test Django database settings
      const djangoValidation = await this.validateDjangoSettings();
      if (!djangoValidation.isValid) {
        result.issues.push(...djangoValidation.issues);
        result.recommendations.push(...djangoValidation.recommendations);
      }

      // Overall validation result
      result.isValid = result.configurationValid && result.connectionWorking && result.schemaValid;

      this.lastValidationResult = result;
      this.emit('validation-complete', result);

      if (!result.isValid) {
        this.emit('validation-failed', result);
      }

      return result;

    } catch (error) {
      result.isValid = false;
      result.issues.push(`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      this.emit('validation-error', error);
      return result;
    }
  }

  private async validateConfigFile(): Promise<{ isValid: boolean; issues: string[]; recommendations: string[] }> {
    const result = { isValid: true, issues: [] as string[], recommendations: [] as string[] };

    try {
      const configContent = readFileSync(this.configPath, 'utf-8');
      const config = this.parseEnvFile(configContent);

      // Check for required database configuration
      if (!config.DATABASE_URL) {
        result.isValid = false;
        result.issues.push('DATABASE_URL not found in configuration');
        result.recommendations.push('Add DATABASE_URL to app.env file');
      } else {
        // Validate DATABASE_URL format
        const urlPattern = /^postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)$/;
        if (!urlPattern.test(config.DATABASE_URL)) {
          result.isValid = false;
          result.issues.push('DATABASE_URL format is invalid');
          result.recommendations.push('Ensure DATABASE_URL follows format: postgresql://user:password@host:port/database');
        }
      }

      // Check for other required settings
      const requiredSettings = ['SECRET_KEY', 'ALLOWED_HOSTS'];
      for (const setting of requiredSettings) {
        if (!config[setting]) {
          result.issues.push(`Missing required setting: ${setting}`);
          result.recommendations.push(`Add ${setting} to app.env file`);
        }
      }

      // Check for potentially problematic plugins
      if (config.ENABLED_PLUGINS) {
        const plugins = config.ENABLED_PLUGINS.replace(/["']/g, '').split(',');
        const knownProblematicPlugins = ['cyberchef', 'checkthehash'];
        const problematicPlugins = plugins.filter(p => knownProblematicPlugins.includes(p.trim()));
        
        if (problematicPlugins.length > 0) {
          result.recommendations.push(`Consider removing potentially problematic plugins: ${problematicPlugins.join(', ')}`);
        }
      }

    } catch (error) {
      result.isValid = false;
      result.issues.push(`Failed to read configuration file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return result;
  }

  private async testDatabaseConnection(): Promise<{ isWorking: boolean; issues: string[]; recommendations: string[] }> {
    const result = { isWorking: false, issues: [] as string[], recommendations: [] as string[] };

    try {
      // First, check if PostgreSQL container is running
      const postgresContainers = ['attacknode-postgres', 'sysreptor-db', 'postgres'];
      let pgContainer = '';

      for (const container of postgresContainers) {
        try {
          const { stdout } = await execAsync(`docker ps --filter "name=${container}" --format "{{.Names}}" 2>/dev/null || true`);
          if (stdout.trim() === container) {
            pgContainer = container;
            break;
          }
        } catch (error) {
          // Continue checking other containers
        }
      }

      if (!pgContainer) {
        result.issues.push('PostgreSQL container not found or not running');
        result.recommendations.push('Start PostgreSQL container using docker-compose up -d postgres');
        return result;
      }

      // Test PostgreSQL health
      try {
        await execAsync(`docker exec ${pgContainer} pg_isready -U postgres`);
        console.log('[DjangoDatabaseValidator] PostgreSQL container is responsive');
      } catch (error) {
        result.issues.push('PostgreSQL container is not responsive');
        result.recommendations.push('Restart PostgreSQL container');
        return result;
      }

      // Test database connection from Django container
      if (await this.isContainerRunning(this.containerName)) {
        const connectionTestScript = `
import os
import sys
import psycopg2
from psycopg2 import OperationalError

try:
    # Test with environment variables
    database_url = os.environ.get('DATABASE_URL')
    if not database_url:
        print('DATABASE_URL not set')
        sys.exit(1)
    
    # Parse DATABASE_URL
    import urllib.parse
    parsed = urllib.parse.urlparse(database_url)
    
    conn = psycopg2.connect(
        host=parsed.hostname,
        port=parsed.port or 5432,
        database=parsed.path[1:],  # Remove leading /
        user=parsed.username,
        password=parsed.password
    )
    
    # Test basic query
    cur = conn.cursor()
    cur.execute('SELECT 1')
    result = cur.fetchone()
    
    if result and result[0] == 1:
        print('Database connection successful')
    else:
        print('Database query failed')
        sys.exit(1)
    
    cur.close()
    conn.close()
    
except OperationalError as e:
    print(f'Database connection failed: {e}')
    sys.exit(1)
except Exception as e:
    print(f'Database test failed: {e}')
    sys.exit(1)
`;

        try {
          const { stdout } = await execAsync(`docker exec ${this.containerName} python -c "${connectionTestScript}"`);
          if (stdout.includes('Database connection successful')) {
            result.isWorking = true;
            console.log('[DjangoDatabaseValidator] Database connection test passed');
          } else {
            result.issues.push('Database connection test failed');
            result.recommendations.push('Check DATABASE_URL configuration and database permissions');
          }
        } catch (error) {
          result.issues.push(`Database connection test error: ${error instanceof Error ? error.message : 'Unknown error'}`);
          result.recommendations.push('Verify database configuration and restart containers');
        }
      } else {
        result.issues.push('Django container is not running');
        result.recommendations.push('Start Django container using docker-compose up -d app');
      }

    } catch (error) {
      result.issues.push(`Database connectivity check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      result.recommendations.push('Check Docker containers and network connectivity');
    }

    return result;
  }

  private async validateDatabaseSchema(): Promise<{ isValid: boolean; issues: string[]; recommendations: string[] }> {
    const result = { isValid: false, issues: [] as string[], recommendations: [] as string[] };

    try {
      if (await this.isContainerRunning(this.containerName)) {
        // Check if migrations are up to date
        try {
          const { stdout } = await execAsync(`docker exec ${this.containerName} python manage.py showmigrations --plan 2>/dev/null || true`);
          
          if (stdout.includes('(no migrations)')) {
            result.issues.push('No migrations found');
            result.recommendations.push('Run python manage.py makemigrations and migrate');
          } else if (stdout.includes('[ ]')) {
            result.issues.push('Unapplied migrations detected');
            result.recommendations.push('Run python manage.py migrate');
          } else {
            result.isValid = true;
          }
        } catch (error) {
          result.issues.push('Failed to check migration status');
          result.recommendations.push('Verify Django installation and database connectivity');
        }

        // Test Django database operations
        try {
          const { stdout } = await execAsync(`docker exec ${this.containerName} python manage.py check --database default 2>/dev/null || true`);
          
          if (stdout.includes('System check identified no issues')) {
            result.isValid = true;
          } else {
            result.issues.push('Django database check failed');
            result.recommendations.push('Review Django configuration and database settings');
          }
        } catch (error) {
          result.issues.push('Django database check error');
          result.recommendations.push('Check Django configuration and database connectivity');
        }
      }

    } catch (error) {
      result.issues.push(`Schema validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return result;
  }

  private async validateDjangoSettings(): Promise<{ isValid: boolean; issues: string[]; recommendations: string[] }> {
    const result = { isValid: false, issues: [] as string[], recommendations: [] as string[] };

    try {
      if (await this.isContainerRunning(this.containerName)) {
        // Run Django check command
        try {
          const { stdout, stderr } = await execAsync(`docker exec ${this.containerName} python manage.py check 2>&1 || true`);
          
          if (stdout.includes('System check identified no issues')) {
            result.isValid = true;
          } else {
            // Parse specific Django errors
            const output = stdout + stderr;
            
            if (output.includes('ImproperlyConfigured') || output.includes('DATABASES is improperly configured')) {
              result.issues.push('Django DATABASES configuration is invalid');
              result.recommendations.push('Fix DATABASE_URL format or Django database settings');
            }
            
            if (output.includes('Plugin') && output.includes('not found')) {
              result.issues.push('Missing Django plugins detected');
              result.recommendations.push('Install missing plugins or remove them from ENABLED_PLUGINS');
            }
            
            if (output.includes('SECRET_KEY')) {
              result.issues.push('SECRET_KEY configuration issue');
              result.recommendations.push('Set a valid SECRET_KEY in app.env');
            }
            
            if (output.includes('ALLOWED_HOSTS')) {
              result.issues.push('ALLOWED_HOSTS configuration issue');
              result.recommendations.push('Configure ALLOWED_HOSTS in app.env');
            }
          }
        } catch (error) {
          result.issues.push('Django settings check failed');
          result.recommendations.push('Verify Django installation and configuration');
        }
      }

    } catch (error) {
      result.issues.push(`Django settings validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return result;
  }

  private async isContainerRunning(containerName: string): Promise<boolean> {
    try {
      const { stdout } = await execAsync(`docker ps --filter "name=${containerName}" --format "{{.Names}}" 2>/dev/null || true`);
      return stdout.trim() === containerName;
    } catch (error) {
      return false;
    }
  }

  private parseEnvFile(content: string): Record<string, string> {
    const config: Record<string, string> = {};
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          config[key.trim()] = valueParts.join('=').trim();
        }
      }
    }

    return config;
  }

  async repairDatabaseConfiguration(): Promise<boolean> {
    console.log('[DjangoDatabaseValidator] Starting database configuration repair...');

    try {
      // Step 1: Validate and fix app.env
      await this.repairConfigurationFile();

      // Step 2: Ensure PostgreSQL is running
      await this.ensurePostgresRunning();

      // Step 3: Fix Django database settings
      await this.repairDjangoDatabase();

      // Step 4: Validate the repair
      const validation = await this.validateDatabaseConfiguration();
      
      if (validation.isValid) {
        console.log('[DjangoDatabaseValidator] Database configuration repair completed successfully');
        this.emit('repair-success');
        return true;
      } else {
        console.log('[DjangoDatabaseValidator] Database configuration repair failed:', validation.issues);
        this.emit('repair-failed', validation);
        return false;
      }

    } catch (error) {
      console.error('[DjangoDatabaseValidator] Database configuration repair failed:', error);
      this.emit('repair-error', error);
      return false;
    }
  }

  private async repairConfigurationFile(): Promise<void> {
    try {
      const configContent = readFileSync(this.configPath, 'utf-8');
      let updatedContent = configContent;

      // Ensure DATABASE_URL is properly formatted
      const databaseUrlPattern = /^DATABASE_URL=(.*)$/m;
      const currentMatch = configContent.match(databaseUrlPattern);
      
      if (!currentMatch) {
        updatedContent += '\n# Fixed DATABASE_URL\nDATABASE_URL=postgresql://sysreptor:sysreptor123@attacknode-postgres:5432/sysreptor\n';
      } else {
        const currentUrl = currentMatch[1].replace(/['"]/g, '');
        const validUrlPattern = /^postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)$/;
        
        if (!validUrlPattern.test(currentUrl)) {
          updatedContent = updatedContent.replace(
            databaseUrlPattern,
            'DATABASE_URL=postgresql://sysreptor:sysreptor123@attacknode-postgres:5432/sysreptor'
          );
        }
      }

      // Remove problematic plugins
      const pluginPattern = /^ENABLED_PLUGINS=(.*)$/m;
      const pluginMatch = configContent.match(pluginPattern);
      
      if (pluginMatch) {
        const currentPlugins = pluginMatch[1].replace(/['"]/g, '');
        const plugins = currentPlugins.split(',').map(p => p.trim());
        const safePlugins = plugins.filter(p => p && !['cyberchef', 'checkthehash'].includes(p));
        
        updatedContent = updatedContent.replace(
          pluginPattern,
          `ENABLED_PLUGINS="${safePlugins.join(',')}"`
        );
      }

      // Write updated configuration
      if (updatedContent !== configContent) {
        writeFileSync(this.configPath, updatedContent);
        console.log('[DjangoDatabaseValidator] Configuration file updated');
      }

    } catch (error) {
      console.error('[DjangoDatabaseValidator] Failed to repair configuration file:', error);
      throw error;
    }
  }

  private async ensurePostgresRunning(): Promise<void> {
    try {
      const postgresContainers = ['attacknode-postgres', 'sysreptor-db', 'postgres'];
      let pgContainer = '';

      // Check if any PostgreSQL container is running
      for (const container of postgresContainers) {
        try {
          const { stdout } = await execAsync(`docker ps --filter "name=${container}" --format "{{.Names}}" 2>/dev/null || true`);
          if (stdout.trim() === container) {
            pgContainer = container;
            break;
          }
        } catch (error) {
          // Continue checking
        }
      }

      if (!pgContainer) {
        console.log('[DjangoDatabaseValidator] Starting PostgreSQL container...');
        await execAsync('docker-compose up -d postgres').catch(async () => {
          return await execAsync('sudo docker-compose up -d postgres');
        });

        // Wait for PostgreSQL to be ready
        let retries = 0;
        while (retries < 30) {
          try {
            await execAsync('docker exec attacknode-postgres pg_isready -U postgres');
            console.log('[DjangoDatabaseValidator] PostgreSQL is ready');
            break;
          } catch (error) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            retries++;
          }
        }

        if (retries >= 30) {
          throw new Error('PostgreSQL failed to start within timeout');
        }
      } else {
        // Verify PostgreSQL is responsive
        await execAsync(`docker exec ${pgContainer} pg_isready -U postgres`);
        console.log('[DjangoDatabaseValidator] PostgreSQL is responsive');
      }

    } catch (error) {
      console.error('[DjangoDatabaseValidator] Failed to ensure PostgreSQL is running:', error);
      throw error;
    }
  }

  private async repairDjangoDatabase(): Promise<void> {
    try {
      // Ensure Django container is running
      if (!(await this.isContainerRunning(this.containerName))) {
        console.log('[DjangoDatabaseValidator] Starting Django container...');
        await execAsync('docker-compose up -d app').catch(async () => {
          return await execAsync('sudo docker-compose up -d app');
        });

        // Wait for container to be ready
        let retries = 0;
        while (retries < 15) {
          if (await this.isContainerRunning(this.containerName)) {
            break;
          }
          await new Promise(resolve => setTimeout(resolve, 2000));
          retries++;
        }

        if (retries >= 15) {
          throw new Error('Django container failed to start within timeout');
        }
      }

      // Run Django migrations
      console.log('[DjangoDatabaseValidator] Running Django migrations...');
      await execAsync(`docker exec ${this.containerName} python manage.py migrate --run-syncdb`);

      // Verify Django database check
      console.log('[DjangoDatabaseValidator] Running Django database check...');
      await execAsync(`docker exec ${this.containerName} python manage.py check --database default`);

      console.log('[DjangoDatabaseValidator] Django database repair completed');

    } catch (error) {
      console.error('[DjangoDatabaseValidator] Failed to repair Django database:', error);
      throw error;
    }
  }

  private startContinuousValidation(): void {
    // Run validation every 2 minutes
    this.validationInterval = setInterval(async () => {
      try {
        await this.validateDatabaseConfiguration();
      } catch (error) {
        console.error('[DjangoDatabaseValidator] Continuous validation failed:', error);
      }
    }, 120000);
  }

  getLastValidationResult(): DatabaseValidationResult | undefined {
    return this.lastValidationResult;
  }

  stop(): void {
    if (this.validationInterval) {
      clearInterval(this.validationInterval);
    }
  }
}

export const djangoDatabaseValidator = new DjangoDatabaseValidator();
