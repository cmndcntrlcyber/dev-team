import { ServiceHealth, ServiceDiscovery } from '../types';

export class ServiceRegistry implements ServiceDiscovery {
  private services: Map<string, { host: string; port: number }> = new Map();
  private healthCache: Map<string, ServiceHealth> = new Map();
  private logger: any;

  constructor(logger: any) {
    this.logger = logger;
  }

  async registerService(name: string, host: string, port: number): Promise<void> {
    this.services.set(name, { host, port });
    this.logger.info(`Service registered: ${name} at ${host}:${port}`);
  }

  async unregisterService(name: string): Promise<void> {
    this.services.delete(name);
    this.healthCache.delete(name);
    this.logger.info(`Service unregistered: ${name}`);
  }

  async discoverServices(): Promise<Record<string, string>> {
    const discovered: Record<string, string> = {};
    
    for (const [name, config] of this.services.entries()) {
      discovered[name] = `http://${config.host}:${config.port}`;
    }
    
    return discovered;
  }

  async healthCheck(service: string): Promise<ServiceHealth> {
    return this.checkServiceHealth(service);
  }

  async checkServiceHealth(serviceName: string): Promise<ServiceHealth> {
    const cached = this.healthCache.get(serviceName);
    
    // Return cached result if less than 30 seconds old
    if (cached && (Date.now() - cached.lastCheck.getTime()) < 30000) {
      return cached;
    }

    const health = await this.performHealthCheck(serviceName);
    this.healthCache.set(serviceName, health);
    
    return health;
  }

  private async performHealthCheck(serviceName: string): Promise<ServiceHealth> {
    const service = this.services.get(serviceName);
    
    if (!service) {
      return {
        service: serviceName,
        status: 'unknown',
        lastCheck: new Date(),
        error: 'Service not registered'
      };
    }

    const startTime = Date.now();
    
    try {
      // Use a simple HTTP check - in a real implementation, use node-fetch or axios
      // For now, assume the service is healthy if it's registered
      const responseTime = Date.now() - startTime;
      
      return {
        service: serviceName,
        status: 'healthy',
        responseTime,
        lastCheck: new Date()
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      return {
        service: serviceName,
        status: 'unhealthy',
        responseTime,
        lastCheck: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  getRegisteredServices(): string[] {
    return Array.from(this.services.keys());
  }

  getServiceEndpoint(serviceName: string): string | null {
    const service = this.services.get(serviceName);
    return service ? `http://${service.host}:${service.port}` : null;
  }
}
