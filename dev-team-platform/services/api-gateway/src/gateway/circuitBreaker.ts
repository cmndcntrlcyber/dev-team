import { CircuitBreakerConfig } from '../types';

interface CircuitState {
  status: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failures: number;
  successes: number;
  lastFailureTime: number;
  nextAttemptTime: number;
}

export class CircuitBreaker {
  private circuits: Map<string, CircuitState> = new Map();
  private config: CircuitBreakerConfig;

  constructor(config?: Partial<CircuitBreakerConfig>) {
    this.config = {
      failureThreshold: config?.failureThreshold || 5,
      resetTimeout: config?.resetTimeout || 60000, // 1 minute
      monitoringPeriod: config?.monitoringPeriod || 300000, // 5 minutes
    };
  }

  private getCircuitState(serviceName: string): CircuitState {
    if (!this.circuits.has(serviceName)) {
      this.circuits.set(serviceName, {
        status: 'CLOSED',
        failures: 0,
        successes: 0,
        lastFailureTime: 0,
        nextAttemptTime: 0,
      });
    }
    return this.circuits.get(serviceName)!;
  }

  isOpen(serviceName: string): boolean {
    const circuit = this.getCircuitState(serviceName);
    const now = Date.now();

    // Check if circuit should transition from OPEN to HALF_OPEN
    if (circuit.status === 'OPEN' && now >= circuit.nextAttemptTime) {
      circuit.status = 'HALF_OPEN';
      circuit.successes = 0;
      circuit.failures = 0;
    }

    return circuit.status === 'OPEN';
  }

  isHalfOpen(serviceName: string): boolean {
    const circuit = this.getCircuitState(serviceName);
    return circuit.status === 'HALF_OPEN';
  }

  isClosed(serviceName: string): boolean {
    const circuit = this.getCircuitState(serviceName);
    return circuit.status === 'CLOSED';
  }

  recordSuccess(serviceName: string): void {
    const circuit = this.getCircuitState(serviceName);
    const now = Date.now();

    circuit.successes++;

    if (circuit.status === 'HALF_OPEN') {
      // If we get a success in HALF_OPEN state, transition back to CLOSED
      if (circuit.successes >= 1) {
        circuit.status = 'CLOSED';
        circuit.failures = 0;
        circuit.successes = 0;
      }
    } else if (circuit.status === 'CLOSED') {
      // Reset failure count on success in CLOSED state
      circuit.failures = 0;
    }

    // Clean up old monitoring data
    this.cleanupOldData(circuit, now);
  }

  recordFailure(serviceName: string): void {
    const circuit = this.getCircuitState(serviceName);
    const now = Date.now();

    circuit.failures++;
    circuit.lastFailureTime = now;

    if (circuit.status === 'HALF_OPEN') {
      // If we get a failure in HALF_OPEN state, go back to OPEN
      circuit.status = 'OPEN';
      circuit.nextAttemptTime = now + this.config.resetTimeout;
    } else if (circuit.status === 'CLOSED' && circuit.failures >= this.config.failureThreshold) {
      // If we exceed the failure threshold in CLOSED state, open the circuit
      circuit.status = 'OPEN';
      circuit.nextAttemptTime = now + this.config.resetTimeout;
    }

    // Clean up old monitoring data
    this.cleanupOldData(circuit, now);
  }

  private cleanupOldData(circuit: CircuitState, now: number): void {
    // Reset counters if monitoring period has passed
    if (now - circuit.lastFailureTime > this.config.monitoringPeriod) {
      circuit.failures = 0;
      circuit.successes = 0;
    }
  }

  getCircuitStatus(serviceName: string): {
    status: string;
    failures: number;
    successes: number;
    lastFailureTime: number;
    nextAttemptTime: number;
    timeUntilNextAttempt: number;
  } {
    const circuit = this.getCircuitState(serviceName);
    const now = Date.now();

    return {
      status: circuit.status,
      failures: circuit.failures,
      successes: circuit.successes,
      lastFailureTime: circuit.lastFailureTime,
      nextAttemptTime: circuit.nextAttemptTime,
      timeUntilNextAttempt: Math.max(0, circuit.nextAttemptTime - now),
    };
  }

  getAllCircuitStatus(): Record<string, any> {
    const status: Record<string, any> = {};
    
    for (const [serviceName] of this.circuits.entries()) {
      status[serviceName] = this.getCircuitStatus(serviceName);
    }
    
    return status;
  }

  reset(serviceName: string): void {
    const circuit = this.getCircuitState(serviceName);
    
    circuit.status = 'CLOSED';
    circuit.failures = 0;
    circuit.successes = 0;
    circuit.lastFailureTime = 0;
    circuit.nextAttemptTime = 0;
  }

  resetAll(): void {
    for (const [serviceName] of this.circuits.entries()) {
      this.reset(serviceName);
    }
  }

  updateConfig(config: Partial<CircuitBreakerConfig>): void {
    this.config = {
      ...this.config,
      ...config,
    };
  }

  getConfig(): CircuitBreakerConfig {
    return { ...this.config };
  }

  // Health check for circuit breaker functionality
  getHealthMetrics(): {
    totalCircuits: number;
    openCircuits: number;
    halfOpenCircuits: number;
    closedCircuits: number;
    failureRate: number;
  } {
    let openCount = 0;
    let halfOpenCount = 0;
    let closedCount = 0;
    let totalFailures = 0;
    let totalRequests = 0;

    for (const [, circuit] of this.circuits.entries()) {
      switch (circuit.status) {
        case 'OPEN':
          openCount++;
          break;
        case 'HALF_OPEN':
          halfOpenCount++;
          break;
        case 'CLOSED':
          closedCount++;
          break;
      }
      
      totalFailures += circuit.failures;
      totalRequests += circuit.failures + circuit.successes;
    }

    return {
      totalCircuits: this.circuits.size,
      openCircuits: openCount,
      halfOpenCircuits: halfOpenCount,
      closedCircuits: closedCount,
      failureRate: totalRequests > 0 ? totalFailures / totalRequests : 0,
    };
  }

  // Monitor circuits and automatically manage state transitions
  startMonitoring(intervalMs: number = 10000): NodeJS.Timeout {
    return setInterval(() => {
      const now = Date.now();
      
      for (const [serviceName, circuit] of this.circuits.entries()) {
        // Auto-transition OPEN circuits to HALF_OPEN when ready
        if (circuit.status === 'OPEN' && now >= circuit.nextAttemptTime) {
          circuit.status = 'HALF_OPEN';
          circuit.successes = 0;
        }
        
        // Clean up old data
        this.cleanupOldData(circuit, now);
      }
    }, intervalMs);
  }
}
