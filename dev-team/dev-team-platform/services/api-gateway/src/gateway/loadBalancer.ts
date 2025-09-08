import { LoadBalancerConfig, ServiceHealth } from '../types';

export class LoadBalancer {
  private serviceInstances: Map<string, string[]> = new Map();
  private currentIndex: Map<string, number> = new Map();
  private connections: Map<string, number> = new Map();
  private weights: Map<string, Map<string, number>> = new Map();
  private logger: any;

  constructor(logger: any) {
    this.logger = logger;
  }

  addServiceInstance(serviceName: string, endpoint: string, weight: number = 1): void {
    if (!this.serviceInstances.has(serviceName)) {
      this.serviceInstances.set(serviceName, []);
      this.currentIndex.set(serviceName, 0);
      this.weights.set(serviceName, new Map());
    }

    const instances = this.serviceInstances.get(serviceName)!;
    const weights = this.weights.get(serviceName)!;
    
    if (!instances.includes(endpoint)) {
      instances.push(endpoint);
      weights.set(endpoint, weight);
      this.connections.set(endpoint, 0);
      
      this.logger.info(`Added service instance: ${serviceName} -> ${endpoint} (weight: ${weight})`);
    }
  }

  removeServiceInstance(serviceName: string, endpoint: string): void {
    const instances = this.serviceInstances.get(serviceName);
    const weights = this.weights.get(serviceName);
    
    if (instances) {
      const index = instances.indexOf(endpoint);
      if (index !== -1) {
        instances.splice(index, 1);
        weights?.delete(endpoint);
        this.connections.delete(endpoint);
        
        this.logger.info(`Removed service instance: ${serviceName} -> ${endpoint}`);
      }
    }
  }

  getNextInstance(serviceName: string, strategy: 'round-robin' | 'least-connections' | 'weighted' = 'round-robin'): string | null {
    const instances = this.serviceInstances.get(serviceName);
    
    if (!instances || instances.length === 0) {
      return null;
    }

    switch (strategy) {
      case 'round-robin':
        return this.roundRobin(serviceName, instances);
      case 'least-connections':
        return this.leastConnections(instances);
      case 'weighted':
        return this.weightedRoundRobin(serviceName, instances);
      default:
        return this.roundRobin(serviceName, instances);
    }
  }

  private roundRobin(serviceName: string, instances: string[]): string {
    const currentIndex = this.currentIndex.get(serviceName) || 0;
    const instance = instances[currentIndex];
    
    this.currentIndex.set(serviceName, (currentIndex + 1) % instances.length);
    
    return instance;
  }

  private leastConnections(instances: string[]): string {
    let selectedInstance = instances[0];
    let minConnections = this.connections.get(selectedInstance) || 0;
    
    for (const instance of instances) {
      const connections = this.connections.get(instance) || 0;
      if (connections < minConnections) {
        minConnections = connections;
        selectedInstance = instance;
      }
    }
    
    return selectedInstance;
  }

  private weightedRoundRobin(serviceName: string, instances: string[]): string {
    const weights = this.weights.get(serviceName);
    
    if (!weights) {
      return this.roundRobin(serviceName, instances);
    }

    // Simple weighted selection based on weight values
    const weightedInstances: string[] = [];
    
    for (const instance of instances) {
      const weight = weights.get(instance) || 1;
      for (let i = 0; i < weight; i++) {
        weightedInstances.push(instance);
      }
    }
    
    if (weightedInstances.length === 0) {
      return instances[0];
    }
    
    const currentIndex = this.currentIndex.get(serviceName) || 0;
    const instance = weightedInstances[currentIndex % weightedInstances.length];
    
    this.currentIndex.set(serviceName, currentIndex + 1);
    
    return instance;
  }

  recordConnection(endpoint: string): void {
    const current = this.connections.get(endpoint) || 0;
    this.connections.set(endpoint, current + 1);
  }

  releaseConnection(endpoint: string): void {
    const current = this.connections.get(endpoint) || 0;
    this.connections.set(endpoint, Math.max(0, current - 1));
  }

  getServiceInstances(serviceName: string): string[] {
    return this.serviceInstances.get(serviceName) || [];
  }

  getConnectionCount(endpoint: string): number {
    return this.connections.get(endpoint) || 0;
  }

  getServiceWeight(serviceName: string, endpoint: string): number {
    const weights = this.weights.get(serviceName);
    return weights?.get(endpoint) || 1;
  }

  updateServiceWeight(serviceName: string, endpoint: string, weight: number): void {
    const weights = this.weights.get(serviceName);
    if (weights && weights.has(endpoint)) {
      weights.set(endpoint, weight);
      this.logger.info(`Updated weight for ${serviceName} -> ${endpoint}: ${weight}`);
    }
  }

  getLoadBalancingStats(): Record<string, any> {
    const stats: Record<string, any> = {};
    
    for (const [serviceName, instances] of this.serviceInstances.entries()) {
      const serviceStats = {
        instances: instances.length,
        connections: instances.map(instance => ({
          endpoint: instance,
          connections: this.connections.get(instance) || 0,
          weight: this.getServiceWeight(serviceName, instance)
        })),
        currentIndex: this.currentIndex.get(serviceName) || 0
      };
      
      stats[serviceName] = serviceStats;
    }
    
    return stats;
  }

  removeUnhealthyInstances(serviceName: string, healthStatus: Record<string, ServiceHealth>): void {
    const instances = this.serviceInstances.get(serviceName);
    
    if (!instances) {
      return;
    }

    const healthyInstances = instances.filter(instance => {
      const health = healthStatus[instance];
      return health && health.status === 'healthy';
    });

    if (healthyInstances.length !== instances.length) {
      this.serviceInstances.set(serviceName, healthyInstances);
      
      // Reset index if needed
      const currentIndex = this.currentIndex.get(serviceName) || 0;
      if (currentIndex >= healthyInstances.length) {
        this.currentIndex.set(serviceName, 0);
      }
      
      this.logger.info(`Filtered unhealthy instances for ${serviceName}. Healthy: ${healthyInstances.length}/${instances.length}`);
    }
  }
}
