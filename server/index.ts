import { config } from "dotenv";
config(); // Load environment variables from .env file

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { agentConnector } from "./services/agent-connector";
// Docker services disabled - Docker not available in this environment
// Docker services disabled - Docker not available in this environment

const app = express();
app.use(express.json({ limit: '1gb' }));
app.use(express.urlencoded({ extended: false, limit: '1gb' }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Initialize self-healing system and essential containers
  // DISABLED: Docker is not available in this environment
  /*
  try {
    log("Initializing self-healing Docker monitoring system...");
    
    // Initialize volume permission system
    log("Setting up volume permission management...");
    await volumePermissionManager.monitorVolumeHealth();
    
    // Fix Redis permissions immediately
    log("Fixing Redis permissions proactively...");
    const redisPermissionFixed = await volumePermissionManager.fixRedisPermissions();
    if (redisPermissionFixed) {
      log("Redis permissions fixed successfully");
    } else {
      log("Warning: Redis permission fix may have failed");
    }
    
    // Start Redis health monitoring
    log("Starting Redis health monitoring...");
    // redisHealthMonitor starts automatically in constructor
    
    // Set up error monitoring and recovery event listeners
    log("Setting up error recovery system...");
    dockerErrorMonitor.on('error-detected', (error) => {
      log(`Docker error detected: ${error.type} - ${error.message}`);
    });
    
    dockerRecoveryEngine.on('recovery-success', ({ error, actionType }) => {
      log(`Recovery successful: ${actionType} fixed ${error.type}`);
    });
    
    dockerRecoveryEngine.on('recovery-failed', (error) => {
      log(`Recovery failed for error: ${error.type} - ${error.message}`);
    });
    
    // Volume health monitoring events
    volumePermissionManager.on('volume-health-issue', ({ volumeName, issues }) => {
      log(`Volume health issue for ${volumeName}: ${issues.join(', ')}`);
    });
    
    volumePermissionManager.on('permissions-applied', ({ volumeName }) => {
      log(`Permissions successfully applied for volume: ${volumeName}`);
    });
    
    // Redis health monitoring events
    redisHealthMonitor.on('health-status-change', (status) => {
      log(`Redis health status changed - Running: ${status.containerRunning}, Responding: ${status.redisResponding}`);
    });
    
    redisHealthMonitor.on('permission-issues-detected', (status) => {
      log(`Redis permission issues detected: ${status.permissionIssues.join(', ')}`);
    });
    
    // AOF rewrite permission error - immediate aggressive repair
    redisHealthMonitor.on('aof-rewrite-permission-error', async (errorInfo) => {
      log(`CRITICAL: AOF rewrite permission error detected - triggering immediate repair`);
      log(`Error details: ${errorInfo.message}`);
      
      try {
        // Immediate aggressive permission fix
        log('Executing immediate Redis permission repair...');
        const repairSuccess = await volumePermissionManager.fixRedisPermissions();
        
        if (repairSuccess) {
          log('Redis permissions repaired successfully, attempting container restart...');
          // Give it a moment for permissions to take effect
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Attempt to restart Redis
          const healthRepair = await redisHealthMonitor.repairRedisHealth();
          if (healthRepair) {
            log('Redis AOF rewrite permission issue resolved successfully');
          } else {
            log('Redis health repair failed after permission fix');
          }
        } else {
          log('Failed to repair Redis permissions for AOF rewrite issue');
        }
      } catch (error) {
        log(`Error during AOF rewrite permission repair: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });
    
    // Start Sysreptor log monitoring for Django self-healing
    log("Starting Sysreptor log monitoring for Django self-healing...");
    try {
      await sysreptorLogMonitor.startMonitoring();
      log("Sysreptor log monitoring started successfully");
      
      // Test the error detection with the actual errors we're seeing
      log("Testing Django error detection...");
      await sysreptorLogMonitor.testErrorDetection();
      
    } catch (error) {
      log(`Warning: Failed to start Sysreptor log monitoring: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    // Start Django health monitoring
    log("Starting Django health monitoring...");
    try {
      await djangoHealthMonitor.startMonitoring();
      log("Django health monitoring started successfully");
      
      // Set up Django health monitoring event listeners
      djangoHealthMonitor.on('health-degraded', (status) => {
        log(`Django health degraded - Container running: ${status.containerRunning}, Database connected: ${status.databaseConnected}`);
      });
      
      djangoHealthMonitor.on('health-critical', (status) => {
        log(`CRITICAL: Django health critical - Errors: ${status.errors.join(', ')}`);
      });
      
      djangoHealthMonitor.on('health-restored', (status) => {
        log(`Django health restored - System is healthy`);
      });
      
      djangoHealthMonitor.on('database-repair-success', () => {
        log(`Django database repair successful`);
      });
      
      djangoHealthMonitor.on('database-repair-failed', (result) => {
        log(`Django database repair failed: ${result.issues.join(', ')}`);
      });
      
      // Set up Django database validator event listeners
      djangoDatabaseValidator.on('validation-failed', (result) => {
        log(`Django database validation failed: ${result.issues.join(', ')}`);
      });
      
      djangoDatabaseValidator.on('repair-success', () => {
        log(`Django database configuration repair successful`);
      });
      
      djangoDatabaseValidator.on('repair-failed', (result) => {
        log(`Django database configuration repair failed: ${result.issues.join(', ')}`);
      });
      
      // Perform initial Django health check
      log("Performing initial Django health check...");
      const initialHealthStatus = await djangoHealthMonitor.performManualHealthCheck();
      if (initialHealthStatus.isHealthy) {
        log("Django initial health check passed");
      } else {
        log(`Django initial health check failed - Issues: ${initialHealthStatus.errors.join(', ')}`);
        log("Django self-healing system will attempt automatic recovery");
      }
      
    } catch (error) {
      log(`Warning: Failed to start Django health monitoring: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    // Start Empire health monitoring
    log("Starting Empire health monitoring...");
    try {
      // empireHealthMonitor starts automatically in constructor
      log("Empire health monitoring started successfully");
      
      // Perform initial Empire health check
      log("Performing initial Empire health check...");
      const initialEmpireStatus = await empireHealthMonitor.checkHealth();
      if (initialEmpireStatus.errors.length === 0) {
        log("Empire initial health check passed");
      } else {
        log(`Empire initial health check failed - Issues: ${initialEmpireStatus.errors.join(', ')}`);
        log("Empire self-healing system will attempt automatic recovery");
      }
      
    } catch (error) {
      log(`Warning: Failed to start Empire health monitoring: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    log("Self-healing system activated successfully");
    
    // Initialize essential containers with self-healing protection
    log("Initializing essential containers with self-healing protection...");
    await dockerService.initializeEssentialContainers();
    log("Essential containers initialized");
    
  } catch (error) {
    log(`Warning: Failed to initialize containers or self-healing system: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  */
  log("Docker health monitoring disabled - Docker is not available in this environment");
  
  // Initialize Agent Connector for dev-team containers (only if enabled)
  const enableAgentContainers = process.env.ENABLE_AGENT_CONTAINERS === 'true';
  
  if (enableAgentContainers) {
    try {
      log("Initializing Agent Connector for dev-team containers...");
      await agentConnector.initialize();
      log("Agent Connector initialized successfully");
    } catch (error) {
      log(`Warning: Failed to initialize Agent Connector: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  } else {
    log("Agent Connector disabled - running in single-app mode (ENABLE_AGENT_CONTAINERS=false)");
  }

  // Setup graceful shutdown
  const gracefulShutdown = async (signal: string) => {
    log(`Received ${signal}, shutting down gracefully...`);
    
    try {
      // Docker service disabled
      // await dockerService.gracefulShutdown();
      
      // Destroy agent connector (only if it was initialized)
      if (enableAgentContainers) {
        agentConnector.destroy();
      }
      
      // Close the server
      server.close(() => {
        log("Server closed");
        process.exit(0);
      });
      
      // Force exit after 30 seconds
      setTimeout(() => {
        log("Forcing shutdown after timeout");
        process.exit(1);
      }, 30000);
      
    } catch (error) {
      log(`Error during shutdown: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    }
  };

  // Listen for shutdown signals
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  
  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    log(`Uncaught exception: ${error.message}`);
    gracefulShutdown('uncaughtException');
  });
  
  process.on('unhandledRejection', (reason, promise) => {
    log(`Unhandled rejection at ${promise}: ${reason}`);
    gracefulShutdown('unhandledRejection');
  });

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
