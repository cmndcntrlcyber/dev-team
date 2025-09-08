import { EventEmitter } from 'events';
import { connect, NatsConnection, Subscription, JSONCodec, StringCodec } from 'nats';
import { Logger, PlatformError, HealthStatus } from '../shared';

export interface MessageBrokerConfig {
    servers: string[];
    maxReconnectAttempts?: number;
    reconnectTimeWait?: number;
    timeout?: number;
    pingInterval?: number;
    maxPingOut?: number;
}

export interface MessageHandler {
    (message: any, subject: string, reply?: string): Promise<void>;
}

export interface PublishOptions {
    reply?: string;
    timeout?: number;
}

export interface SubscriptionOptions {
    queue?: string;
    max?: number;
    timeout?: number;
}

export class MessageBroker extends EventEmitter {
    private connection: NatsConnection | null = null;
    private logger: Logger;
    private config: MessageBrokerConfig;
    private subscriptions: Map<string, Subscription> = new Map();
    private isInitialized: boolean = false;
    private isConnected: boolean = false;
    private reconnectAttempts: number = 0;
    private jsonCodec = JSONCodec();
    private stringCodec = StringCodec();

    constructor(natsUrl: string, logger: Logger) {
        super();
        this.logger = logger;
        this.config = this.parseNatsUrl(natsUrl);
    }

    async initialize(): Promise<void> {
        try {
            this.logger.info('Initializing Message Broker...');

            await this.connect();
            this.setupConnectionHandlers();

            this.isInitialized = true;
            this.logger.info('Message Broker initialized successfully');
        } catch (error) {
            this.logger.error('Failed to initialize Message Broker', error as Error);
            throw new PlatformError('Message Broker initialization failed', 'MB_INIT_ERROR', 500, { error });
        }
    }

    async connect(): Promise<void> {
        try {
            this.connection = await connect({
                servers: this.config.servers,
                maxReconnectAttempts: this.config.maxReconnectAttempts || -1, // Infinite reconnect attempts
                reconnectTimeWait: this.config.reconnectTimeWait || 2000,
                timeout: this.config.timeout || 10000,
                pingInterval: this.config.pingInterval || 20000,
                maxPingOut: this.config.maxPingOut || 2,
                name: 'orchestrator-service'
            });

            this.isConnected = true;
            this.reconnectAttempts = 0;
            
            this.logger.info('Connected to NATS message broker');
            this.emit('connection:established');
        } catch (error) {
            this.isConnected = false;
            this.logger.error('Failed to connect to NATS', error as Error);
            throw new PlatformError('NATS connection failed', 'MB_CONNECTION_ERROR', 500, { error });
        }
    }

    async close(): Promise<void> {
        if (this.connection) {
            this.logger.info('Closing message broker connection...');

            // Close all subscriptions
            for (const [subject, subscription] of this.subscriptions) {
                try {
                    subscription.unsubscribe();
                    this.logger.debug(`Unsubscribed from: ${subject}`);
                } catch (error) {
                    this.logger.error(`Failed to unsubscribe from ${subject}`, error as Error);
                }
            }

            this.subscriptions.clear();

            // Close connection
            await this.connection.close();
            this.connection = null;
            this.isConnected = false;
            this.isInitialized = false;

            this.logger.info('Message broker connection closed');
            this.emit('connection:closed');
        }
    }

    async publish(subject: string, data: any, options: PublishOptions = {}): Promise<void> {
        if (!this.connection || !this.isConnected) {
            throw new PlatformError('Message broker not connected', 'MB_NOT_CONNECTED', 500);
        }

        try {
            const message = typeof data === 'string' ? 
                this.stringCodec.encode(data) : 
                this.jsonCodec.encode(data);

            if (options.reply) {
                this.connection.publish(subject, message, { reply: options.reply });
            } else {
                this.connection.publish(subject, message);
            }

            this.logger.debug(`Message published to: ${subject}`, { data: typeof data === 'object' ? JSON.stringify(data) : data });
        } catch (error) {
            this.logger.error(`Failed to publish message to ${subject}`, error as Error);
            throw new PlatformError(
                `Failed to publish message: ${subject}`, 
                'MB_PUBLISH_ERROR', 
                500, 
                { subject, error }
            );
        }
    }

    async request(subject: string, data: any, timeout: number = 5000): Promise<any> {
        if (!this.connection || !this.isConnected) {
            throw new PlatformError('Message broker not connected', 'MB_NOT_CONNECTED', 500);
        }

        try {
            const message = typeof data === 'string' ? 
                this.stringCodec.encode(data) : 
                this.jsonCodec.encode(data);

            const response = await this.connection.request(subject, message, { timeout });

            // Try to decode as JSON first, fallback to string
            try {
                return this.jsonCodec.decode(response.data);
            } catch {
                return this.stringCodec.decode(response.data);
            }
        } catch (error) {
            this.logger.error(`Failed to send request to ${subject}`, error as Error);
            throw new PlatformError(
                `Failed to send request: ${subject}`, 
                'MB_REQUEST_ERROR', 
                500, 
                { subject, error }
            );
        }
    }

    async subscribe(subject: string, handler: MessageHandler, options: SubscriptionOptions = {}): Promise<void> {
        if (!this.connection || !this.isConnected) {
            throw new PlatformError('Message broker not connected', 'MB_NOT_CONNECTED', 500);
        }

        try {
            const subscription = this.connection.subscribe(subject, {
                queue: options.queue,
                max: options.max
            });

            // Store subscription for cleanup
            this.subscriptions.set(subject, subscription);

            // Handle incoming messages
            (async () => {
                for await (const msg of subscription) {
                    try {
                        // Try to decode as JSON first, fallback to string
                        let data: any;
                        try {
                            data = this.jsonCodec.decode(msg.data);
                        } catch {
                            data = this.stringCodec.decode(msg.data);
                        }

                        await handler(data, msg.subject, msg.reply);

                        // Send acknowledgment if needed
                        if (msg.reply) {
                            this.connection!.publish(msg.reply, this.jsonCodec.encode({ success: true }));
                        }
                    } catch (error) {
                        this.logger.error(`Error handling message on ${subject}`, error as Error);

                        // Send error response if reply subject provided
                        if (msg.reply) {
                            try {
                                this.connection!.publish(msg.reply, this.jsonCodec.encode({ 
                                    success: false, 
                                    error: (error as Error).message 
                                }));
                            } catch (replyError) {
                                this.logger.error('Failed to send error response', replyError as Error);
                            }
                        }
                    }
                }
            })().catch(error => {
                this.logger.error(`Subscription error on ${subject}`, error as Error);
                this.subscriptions.delete(subject);
            });

            this.logger.debug(`Subscribed to: ${subject}`, options);
        } catch (error) {
            this.logger.error(`Failed to subscribe to ${subject}`, error as Error);
            throw new PlatformError(
                `Failed to subscribe: ${subject}`, 
                'MB_SUBSCRIBE_ERROR', 
                500, 
                { subject, error }
            );
        }
    }

    async unsubscribe(subject: string): Promise<void> {
        const subscription = this.subscriptions.get(subject);
        if (subscription) {
            try {
                subscription.unsubscribe();
                this.subscriptions.delete(subject);
                this.logger.debug(`Unsubscribed from: ${subject}`);
            } catch (error) {
                this.logger.error(`Failed to unsubscribe from ${subject}`, error as Error);
                throw new PlatformError(
                    `Failed to unsubscribe: ${subject}`, 
                    'MB_UNSUBSCRIBE_ERROR', 
                    500, 
                    { subject, error }
                );
            }
        }
    }

    async healthCheck(): Promise<HealthStatus> {
        const issues: any[] = [];

        try {
            if (!this.connection || !this.isConnected) {
                issues.push({
                    severity: 'HIGH',
                    message: 'Message broker not connected',
                    code: 'MB_NOT_CONNECTED',
                    timestamp: new Date()
                });
            } else {
                // Test connection with a simple publish
                    try {
                        await this.publish('health.check', { timestamp: new Date() });
                    } catch (error) {
                        issues.push({
                            severity: 'MEDIUM',
                            message: `Message broker publish test failed: ${(error as Error).message}`,
                            code: 'MB_PUBLISH_TEST_FAILED',
                            timestamp: new Date()
                        });
                    }

                // Check reconnection attempts
                if (this.reconnectAttempts > 5) {
                    issues.push({
                        severity: 'MEDIUM',
                        message: `High reconnection attempts: ${this.reconnectAttempts}`,
                        code: 'MB_HIGH_RECONNECT_ATTEMPTS',
                        timestamp: new Date()
                    });
                }

                // Check number of active subscriptions
                if (this.subscriptions.size > 50) {
                    issues.push({
                        severity: 'LOW',
                        message: `High number of active subscriptions: ${this.subscriptions.size}`,
                        code: 'MB_HIGH_SUBSCRIPTION_COUNT',
                        timestamp: new Date()
                    });
                }
            }
        } catch (error) {
            issues.push({
                severity: 'HIGH',
                message: `Message broker health check failed: ${(error as Error).message}`,
                code: 'MB_HEALTH_CHECK_FAILED',
                timestamp: new Date()
            });
        }

        const status = issues.length === 0 ? 'HEALTHY' : 
                      issues.some(i => i.severity === 'HIGH') ? 'UNHEALTHY' : 'DEGRADED';

        return {
            status,
            lastCheck: new Date(),
            uptime: this.isConnected ? process.uptime() : 0,
            issues,
            systemInfo: {
                memoryUsage: 0,
                cpuUsage: 0,
                activeConnections: this.isConnected ? 1 : 0
            }
        };
    }

    // Utility methods
    isConnectedToBroker(): boolean {
        return this.isConnected && this.connection !== null;
    }

    getConnectionInfo(): any {
        if (!this.connection) {
            return null;
        }

        return {
            servers: this.config.servers,
            reconnectAttempts: this.reconnectAttempts,
            activeSubscriptions: this.subscriptions.size,
            isConnected: this.isConnected
        };
    }

    getActiveSubscriptions(): string[] {
        return Array.from(this.subscriptions.keys());
    }

    // Private helper methods
    private setupConnectionHandlers(): void {
        if (!this.connection) {
            return;
        }

        // Handle connection events
        (async () => {
            if (!this.connection) return;
            
            for await (const status of this.connection.status()) {
                switch (status.type) {
                    case 'disconnect':
                        this.isConnected = false;
                        this.logger.warn('Disconnected from NATS message broker');
                        this.emit('connection:lost');
                        break;

                    case 'reconnecting':
                        this.reconnectAttempts++;
                        this.logger.info(`Reconnecting to NATS... (attempt ${this.reconnectAttempts})`);
                        this.emit('connection:reconnecting', { attempts: this.reconnectAttempts });
                        break;

                    case 'reconnect':
                        this.isConnected = true;
                        this.reconnectAttempts = 0;
                        this.logger.info('Reconnected to NATS message broker');
                        this.emit('connection:restored');
                        break;

                    case 'error':
                        const errorMessage = typeof status.data === 'string' ? status.data : 'Unknown error';
                        this.logger.error('NATS connection error', new Error(errorMessage));
                        this.emit('connection:error', { error: status.data });
                        break;

                    case 'ldm':
                        this.logger.warn('NATS entered lame duck mode');
                        this.emit('connection:lame_duck');
                        break;
                }
            }
        })().catch(error => {
            this.logger.error('Error in connection status handler', error);
        });
    }

    private parseNatsUrl(natsUrl: string): MessageBrokerConfig {
        // Handle both single URL and comma-separated URLs
        const servers = natsUrl.includes(',') ? 
            natsUrl.split(',').map(url => url.trim()) : 
            [natsUrl];

        return {
            servers,
            maxReconnectAttempts: -1, // Infinite reconnect attempts
            reconnectTimeWait: 2000,   // 2 seconds
            timeout: 10000,            // 10 seconds
            pingInterval: 20000,       // 20 seconds
            maxPingOut: 2
        };
    }
}
