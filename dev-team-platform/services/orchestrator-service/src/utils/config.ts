import { PlatformConfig, RateLimitConfig } from '../shared';

export interface ConfigValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
}

export class ConfigManager {
    private config: PlatformConfig | null = null;
    private validationResult: ConfigValidationResult | null = null;

    async loadConfig(): Promise<PlatformConfig> {
        try {
            const config: PlatformConfig = {
                // Core API Keys
                anthropicApiKey: this.getRequiredEnv('ANTHROPIC_API_KEY'),
                tavilyApiKey: this.getOptionalEnv('TAVILY_API_KEY'),
                
                // Task Management
                maxConcurrentTasks: parseInt(this.getOptionalEnv('MAX_CONCURRENT_TASKS', '10')),
                agentTimeout: parseInt(this.getOptionalEnv('AGENT_TIMEOUT', '300000')), // 5 minutes default
                
                // Logging
                logLevel: this.getOptionalEnv('LOG_LEVEL', 'info') as 'debug' | 'info' | 'warn' | 'error',
                
                // Database
                databaseUrl: this.getRequiredEnv('DATABASE_URL'),
                
                // Redis Cache
                redisUrl: this.getOptionalEnv('REDIS_URL', 'redis://localhost:6379'),
                
                // Message Broker
                natsUrl: this.getOptionalEnv('NATS_URL', 'nats://localhost:4222'),
                
                // Authentication
                jwtSecret: this.getRequiredEnv('JWT_SECRET'),
                
                // Monitoring & Telemetry
                enableTelemetry: this.getBooleanEnv('ENABLE_TELEMETRY', false),
                enableMonitoring: this.getBooleanEnv('ENABLE_MONITORING', true),
                
                // CORS Configuration
                corsOrigins: this.getArrayEnv('CORS_ORIGINS', ['http://localhost:3000']),
                
                // Rate Limiting
                rateLimit: {
                    windowMs: parseInt(this.getOptionalEnv('RATE_LIMIT_WINDOW_MS', '900000')), // 15 minutes
                    maxRequests: parseInt(this.getOptionalEnv('RATE_LIMIT_MAX_REQUESTS', '100')),
                    skipSuccessfulRequests: this.getBooleanEnv('RATE_LIMIT_SKIP_SUCCESS', false)
                }
            };

            // Validate configuration
            this.validationResult = this.validateConfig(config);
            
            if (!this.validationResult.isValid) {
                throw new Error(`Configuration validation failed: ${this.validationResult.errors.join(', ')}`);
            }

            // Log warnings if any
            if (this.validationResult.warnings.length > 0) {
                console.warn('Configuration warnings:', this.validationResult.warnings.join(', '));
            }

            this.config = config;
            return config;
        } catch (error) {
            console.error('Failed to load configuration:', error);
            throw new Error(`Configuration loading failed: ${(error as Error).message}`);
        }
    }

    getConfig(): PlatformConfig | null {
        return this.config;
    }

    getValidationResult(): ConfigValidationResult | null {
        return this.validationResult;
    }

    // Environment variable helpers
    private getRequiredEnv(key: string): string {
        const value = process.env[key];
        if (!value) {
            throw new Error(`Required environment variable ${key} is not set`);
        }
        return value;
    }

    private getOptionalEnv(key: string, defaultValue: string = ''): string {
        return process.env[key] || defaultValue;
    }

    private getBooleanEnv(key: string, defaultValue: boolean = false): boolean {
        const value = process.env[key];
        if (!value) return defaultValue;
        
        return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
    }

    private getArrayEnv(key: string, defaultValue: string[] = []): string[] {
        const value = process.env[key];
        if (!value) return defaultValue;
        
        return value.split(',').map(item => item.trim()).filter(item => item.length > 0);
    }

    private getNumberEnv(key: string, defaultValue: number): number {
        const value = process.env[key];
        if (!value) return defaultValue;
        
        const parsed = parseInt(value);
        if (isNaN(parsed)) {
            throw new Error(`Environment variable ${key} must be a valid number, got: ${value}`);
        }
        
        return parsed;
    }

    // Configuration validation
    private validateConfig(config: PlatformConfig): ConfigValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Validate required fields
        if (!config.anthropicApiKey) {
            errors.push('anthropicApiKey is required');
        }

        if (!config.databaseUrl) {
            errors.push('databaseUrl is required');
        } else if (!this.isValidDatabaseUrl(config.databaseUrl)) {
            errors.push('databaseUrl is not a valid PostgreSQL connection string');
        }

        if (!config.jwtSecret) {
            errors.push('jwtSecret is required');
        } else if (config.jwtSecret.length < 32) {
            warnings.push('jwtSecret should be at least 32 characters long for security');
        }

        // Validate URLs
        if (!this.isValidUrl(config.redisUrl)) {
            errors.push('redisUrl is not a valid URL');
        }

        if (!this.isValidUrl(config.natsUrl)) {
            errors.push('natsUrl is not a valid URL');
        }

        // Validate numeric ranges
        if (config.maxConcurrentTasks <= 0) {
            errors.push('maxConcurrentTasks must be greater than 0');
        } else if (config.maxConcurrentTasks > 100) {
            warnings.push('maxConcurrentTasks is very high, consider if this is intentional');
        }

        if (config.agentTimeout < 5000) {
            warnings.push('agentTimeout is very low, agents might timeout prematurely');
        } else if (config.agentTimeout > 1800000) { // 30 minutes
            warnings.push('agentTimeout is very high, consider if this is intentional');
        }

        // Validate log level
        const validLogLevels = ['debug', 'info', 'warn', 'error'];
        if (!validLogLevels.includes(config.logLevel)) {
            errors.push(`logLevel must be one of: ${validLogLevels.join(', ')}`);
        }

        // Validate CORS origins
        for (const origin of config.corsOrigins) {
            if (origin !== '*' && !this.isValidUrl(origin)) {
                warnings.push(`CORS origin "${origin}" is not a valid URL`);
            }
        }

        // Validate rate limiting
        this.validateRateLimit(config.rateLimit, errors, warnings);

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    private validateRateLimit(rateLimit: RateLimitConfig, errors: string[], warnings: string[]): void {
        if (rateLimit.windowMs <= 0) {
            errors.push('rateLimit.windowMs must be greater than 0');
        }

        if (rateLimit.maxRequests <= 0) {
            errors.push('rateLimit.maxRequests must be greater than 0');
        } else if (rateLimit.maxRequests < 10) {
            warnings.push('rateLimit.maxRequests is very low, might affect user experience');
        }

        if (rateLimit.windowMs < 60000 && rateLimit.maxRequests > 100) {
            warnings.push('High request rate with short window might not be effective');
        }
    }

    private isValidUrl(url: string): boolean {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    private isValidDatabaseUrl(url: string): boolean {
        try {
            const parsed = new URL(url);
            return parsed.protocol === 'postgresql:' || parsed.protocol === 'postgres:';
        } catch {
            return false;
        }
    }

    // Configuration utilities
    isDevelopment(): boolean {
        return process.env.NODE_ENV === 'development';
    }

    isProduction(): boolean {
        return process.env.NODE_ENV === 'production';
    }

    isTest(): boolean {
        return process.env.NODE_ENV === 'test';
    }

    getServiceName(): string {
        return process.env.SERVICE_NAME || 'orchestrator-service';
    }

    getServiceVersion(): string {
        return process.env.SERVICE_VERSION || '1.0.0';
    }

    getPort(): number {
        return parseInt(process.env.PORT || '3001');
    }

    getHost(): string {
        return process.env.HOST || '0.0.0.0';
    }

    // Hot reload configuration (useful for development)
    watchConfig(): void {
        if (!this.isDevelopment()) {
            return;
        }

        // In a real implementation, you might use chokidar or similar
        // to watch for changes to environment files or config files
        console.log('Config watching is not implemented yet');
    }
}

// Singleton instance
const configManager = new ConfigManager();

export async function loadConfig(): Promise<PlatformConfig> {
    return configManager.loadConfig();
}

export function getConfig(): PlatformConfig | null {
    return configManager.getConfig();
}

export function getConfigValidation(): ConfigValidationResult | null {
    return configManager.getValidationResult();
}

// Environment helpers
export const env = {
    isDevelopment: () => process.env.NODE_ENV === 'development',
    isProduction: () => process.env.NODE_ENV === 'production',
    isTest: () => process.env.NODE_ENV === 'test',
    getPort: () => parseInt(process.env.PORT || '3001'),
    getHost: () => process.env.HOST || '0.0.0.0',
    getServiceName: () => process.env.SERVICE_NAME || 'orchestrator-service',
    getServiceVersion: () => process.env.SERVICE_VERSION || '1.0.0'
};

// Default configuration for development
export const defaultDevConfig: Partial<PlatformConfig> = {
    logLevel: 'debug',
    maxConcurrentTasks: 5,
    agentTimeout: 180000, // 3 minutes
    enableTelemetry: false,
    enableMonitoring: true,
    corsOrigins: ['http://localhost:3000', 'http://localhost:3001'],
    rateLimit: {
        windowMs: 900000, // 15 minutes
        maxRequests: 1000, // More lenient for development
        skipSuccessfulRequests: true
    }
};

// Default configuration for production
export const defaultProdConfig: Partial<PlatformConfig> = {
    logLevel: 'info',
    maxConcurrentTasks: 20,
    agentTimeout: 300000, // 5 minutes
    enableTelemetry: true,
    enableMonitoring: true,
    rateLimit: {
        windowMs: 900000, // 15 minutes
        maxRequests: 100,
        skipSuccessfulRequests: false
    }
};
