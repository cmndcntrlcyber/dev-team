import pino from 'pino';
import { Logger } from '../shared';

export interface LoggerConfig {
    level: 'debug' | 'info' | 'warn' | 'error';
    service: string;
    environment: string;
    prettyPrint?: boolean;
}

export class PlatformLogger implements Logger {
    private pinoLogger: pino.Logger;

    constructor(config: LoggerConfig) {
        this.pinoLogger = pino({
            name: config.service,
            level: config.level,
            transport: config.prettyPrint ? {
                target: 'pino-pretty',
                options: {
                    colorize: true,
                    translateTime: 'HH:MM:ss Z',
                    ignore: 'pid,hostname'
                }
            } : undefined,
            base: {
                service: config.service,
                environment: config.environment
            },
            timestamp: pino.stdTimeFunctions.isoTime,
            formatters: {
                level: (label) => ({ level: label.toUpperCase() }),
                log: (object) => object
            }
        });
    }

    debug(message: string, ...args: any[]): void {
        if (args.length > 0) {
            this.pinoLogger.debug(args[0], message);
        } else {
            this.pinoLogger.debug(message);
        }
    }

    info(message: string, ...args: any[]): void {
        if (args.length > 0) {
            this.pinoLogger.info(args[0], message);
        } else {
            this.pinoLogger.info(message);
        }
    }

    warn(message: string, ...args: any[]): void {
        if (args.length > 0) {
            this.pinoLogger.warn(args[0], message);
        } else {
            this.pinoLogger.warn(message);
        }
    }

    error(message: string, error?: Error, ...args: any[]): void {
        if (error) {
            this.pinoLogger.error({ err: error, ...args[0] }, message);
        } else if (args.length > 0) {
            this.pinoLogger.error(args[0], message);
        } else {
            this.pinoLogger.error(message);
        }
    }

    // Additional utility methods
    child(bindings: Record<string, any>): PlatformLogger {
        const childLogger = this.pinoLogger.child(bindings);
        const config: LoggerConfig = {
            level: this.pinoLogger.level as any,
            service: bindings.service || 'orchestrator-service',
            environment: bindings.environment || 'development'
        };
        
        const platformLogger = new PlatformLogger(config);
        platformLogger.pinoLogger = childLogger;
        return platformLogger;
    }

    setLevel(level: 'debug' | 'info' | 'warn' | 'error'): void {
        this.pinoLogger.level = level;
    }

    getLevel(): string {
        return this.pinoLogger.level;
    }
}

export function createLogger(level: string = 'info'): Logger {
    const config: LoggerConfig = {
        level: level as any,
        service: 'orchestrator-service',
        environment: process.env.NODE_ENV || 'development',
        prettyPrint: process.env.NODE_ENV !== 'production'
    };

    return new PlatformLogger(config);
}

// Export utility functions for different log levels
export const createDebugLogger = () => createLogger('debug');
export const createInfoLogger = () => createLogger('info');
export const createWarnLogger = () => createLogger('warn');
export const createErrorLogger = () => createLogger('error');

// Context-aware logging utilities
export function withRequestContext(logger: Logger, requestId: string, userId?: string): Logger {
    if (logger instanceof PlatformLogger) {
        return logger.child({ 
            requestId, 
            userId: userId || 'anonymous' 
        });
    }
    return logger;
}

export function withAgentContext(logger: Logger, agentId: string, agentType: string): Logger {
    if (logger instanceof PlatformLogger) {
        return logger.child({ 
            agentId, 
            agentType 
        });
    }
    return logger;
}

export function withTaskContext(logger: Logger, taskId: string, taskType: string): Logger {
    if (logger instanceof PlatformLogger) {
        return logger.child({ 
            taskId, 
            taskType 
        });
    }
    return logger;
}

// Performance logging utilities
export function logExecutionTime(logger: Logger, operation: string) {
    const start = Date.now();
    
    return {
        end: (additionalData?: Record<string, any>) => {
            const duration = Date.now() - start;
            logger.info(`${operation} completed`, { 
                duration, 
                operation,
                ...additionalData 
            });
        },
        
        error: (error: Error, additionalData?: Record<string, any>) => {
            const duration = Date.now() - start;
            logger.error(`${operation} failed`, error, { 
                duration, 
                operation,
                ...additionalData 
            });
        }
    };
}

// Structured error logging
export function logError(logger: Logger, error: Error, context?: Record<string, any>): void {
    const errorContext = {
        errorName: error.name,
        stack: error.stack,
        ...context
    };
    
    logger.error(error.message, error, errorContext);
}

// Health check logging
export function logHealthCheck(logger: Logger, service: string, status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY', details?: Record<string, any>): void {
    const logData = {
        service,
        healthStatus: status,
        ...details
    };
    
    if (status === 'HEALTHY') {
        logger.info(`Health check: ${service} is ${status}`, logData);
    } else if (status === 'DEGRADED') {
        logger.warn(`Health check: ${service} is ${status}`, logData);
    } else {
        logger.error(`Health check: ${service} is ${status}`, undefined, logData);
    }
}

// Agent lifecycle logging
export function logAgentLifecycle(logger: Logger, agentId: string, event: 'REGISTERED' | 'STARTED' | 'STOPPED' | 'ERROR', details?: Record<string, any>): void {
    logger.info(`Agent ${event.toLowerCase()}: ${agentId}`, {
        agentId,
        lifecycleEvent: event,
        ...details
    });
}

// Task lifecycle logging
export function logTaskLifecycle(logger: Logger, taskId: string, event: 'CREATED' | 'ASSIGNED' | 'STARTED' | 'COMPLETED' | 'FAILED', details?: Record<string, any>): void {
    logger.info(`Task ${event.toLowerCase()}: ${taskId}`, {
        taskId,
        lifecycleEvent: event,
        ...details
    });
}

// Performance metrics logging
export function logMetrics(logger: Logger, metrics: Record<string, number>, context?: Record<string, any>): void {
    logger.info('Performance metrics', {
        metrics,
        timestamp: new Date().toISOString(),
        ...context
    });
}
