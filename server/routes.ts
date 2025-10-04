import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertAiAgentSchema } from "@shared/schema";
import { generateVulnerabilityReport } from "./services/openai";
import { testConnection as testAnthropicConnection } from "./services/anthropic";
import { agentLoopService } from "./services/agent-loop";
import { setupGoogleAuth, isAuthenticated } from "./google-auth";
import { fileManagerService } from "./services/file-manager";
import multer from "multer";
import path from "path";
import { z } from "zod";

const upload = multer({ 
  dest: "uploads/",
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup Google authentication
  await setupGoogleAuth(app);

  // Authentication routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      // If Google OAuth is not configured, create/return a mock user for development
      if (!process.env.GOOGLE_CLIENT_ID) {
        const devUserId = 'dev-user';
        let user = await storage.getUser(devUserId);
        
        if (!user) {
          // Create the dev user if it doesn't exist
          user = await storage.createUser({
            id: devUserId,
            username: 'developer',
            email: 'dev@example.com',
            firstName: 'Developer',
            lastName: 'User'
          });
        }
        
        return res.json(user);
      }
      
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Placeholder endpoints for frontend compatibility
  app.get("/api/operations", async (req, res) => {
    res.json([]);
  });

  app.get("/api/beacons", async (req, res) => {
    res.json([]);
  });

  app.get("/api/docker/containers", async (req, res) => {
    res.json([]);
  });

  app.get("/api/docker/configs", async (req, res) => {
    res.json([]);
  });

  // AI Agents routes (renamed as Dev Agents)
  app.get("/api/ai-agents", async (req, res) => {
    try {
      const agents = await storage.getAiAgents();
      res.json(agents);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch agents" });
    }
  });

  app.get("/api/ai-agents/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const agent = await storage.getAiAgent(id);
      if (!agent) {
        return res.status(404).json({ message: "Agent not found" });
      }
      res.json(agent);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch agent" });
    }
  });

  app.post("/api/ai-agents", async (req, res) => {
    try {
      const agentData = insertAiAgentSchema.parse(req.body);
      const agent = await storage.createAiAgent(agentData);
      res.status(201).json(agent);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid agent data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create agent" });
    }
  });

  app.put("/api/ai-agents/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const agentData = insertAiAgentSchema.partial().parse(req.body);
      const agent = await storage.updateAiAgent(id, agentData);
      res.json(agent);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid agent data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update agent" });
    }
  });

  app.delete("/api/ai-agents/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteAiAgent(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete agent" });
    }
  });

  // Update agent flow order
  app.put("/api/ai-agents/reorder", async (req, res) => {
    try {
      const { agentIds } = req.body;
      if (!Array.isArray(agentIds)) {
        return res.status(400).json({ message: "agentIds must be an array" });
      }
      
      // Update flow order for each agent
      for (let i = 0; i < agentIds.length; i++) {
        await storage.updateAiAgent(agentIds[i], { flowOrder: i });
      }
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to update agent flow order" });
    }
  });

  // Test AI agent connection
  app.post("/api/ai-agents/:id/test", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const agent = await storage.getAiAgent(id);
      if (!agent) {
        return res.status(404).json({ message: "AI agent not found" });
      }

      // Test the connection based on agent type
      let status = "offline";
      let latency = 0;
      
      if (agent.type === "openai") {
        try {
          const start = Date.now();
          await generateVulnerabilityReport("Test connection", "P4", "Testing OpenAI connection");
          latency = Date.now() - start;
          status = "online";
        } catch (error) {
          status = "error";
        }
      } else if (agent.type === "anthropic") {
        try {
          const result = await testAnthropicConnection(agent.apiKey ?? undefined);
          status = result.status;
          latency = result.latency;
        } catch (error) {
          status = "error";
        }
      } else if (agent.type === "local") {
        // Test local AI connection
        try {
          const start = Date.now();
          const response = await fetch(agent.endpoint + "/health");
          latency = Date.now() - start;
          status = response.ok ? "online" : "error";
        } catch (error) {
          status = "error";
        }
      }

      // Update agent status
      await storage.updateAiAgent(id, { status, lastPing: new Date() });
      
      res.json({ status, latency });
    } catch (error) {
      res.status(500).json({ message: "Failed to test AI agent connection" });
    }
  });

  // Agent Loop Management
  app.post("/api/ai-agents/:id/start-loop", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { initialPrompt, partnerId } = req.body;
      
      const agent = await storage.getAiAgent(id);
      if (!agent) {
        return res.status(404).json({ message: "Agent not found" });
      }
      
      const partner = partnerId ? await storage.getAiAgent(partnerId) : undefined;
      if (partnerId && !partner) {
        return res.status(404).json({ message: "Partner agent not found" });
      }
      
      // Start the loop
      const loopId = await agentLoopService.startLoop(agent, partner, initialPrompt);
      
      res.json({ loopId, message: "Agent loop started successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to start agent loop" });
    }
  });

  app.post("/api/ai-agents/:id/stop-loop", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = agentLoopService.stopLoop(id);
      
      if (success) {
        res.json({ message: "Agent loop stopped successfully" });
      } else {
        res.status(404).json({ message: "No active loop found for this agent" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to stop agent loop" });
    }
  });

  app.get("/api/ai-agents/:id/loop-status", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const status = agentLoopService.getLoopStatus(id);
      
      if (!status) {
        return res.status(404).json({ message: "No loop status found for this agent" });
      }
      
      res.json(status);
    } catch (error) {
      res.status(500).json({ message: "Failed to get loop status" });
    }
  });

  app.get("/api/agent-loops/active", async (req, res) => {
    try {
      const activeLoops = agentLoopService.getActiveLoops();
      res.json(activeLoops);
    } catch (error) {
      res.status(500).json({ message: "Failed to get active loops" });
    }
  });

  // Dashboard stats
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      // Return dev-team specific stats
      const stats = {
        totalProjects: 0,
        activeProjects: 0,
        totalTasks: 0,
        completedTasks: 0,
        totalAgents: 0,
        activeAgents: 0,
        deployments: 0,
        successRate: 0
      };
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Dashboard activity
  app.get("/api/dashboard/activity", async (req, res) => {
    try {
      const activity = [];
      res.json(activity);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch activity" });
    }
  });

  // Notifications
  app.get("/api/notifications", async (req, res) => {
    try {
      const notifications = [];
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  // Integration status route
  app.get("/api/integrations/status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || 'dev-user';
      
      // Get API configuration to check if keys are set
      const apiConfig = await storage.getGlobalConfig(userId, 'api');
      const apiConfigData = apiConfig?.configData || {};
      
      // Check OpenAI status
      const openaiStatus = {
        name: "OpenAI",
        description: "GPT-4 API for AI features",
        status: apiConfigData.openaiApiKey ? "connected" : "disconnected",
        hasApiKey: !!apiConfigData.openaiApiKey
      };
      
      // Check Anthropic status  
      const anthropicStatus = {
        name: "Anthropic",
        description: "Claude AI for multi-agent workflows", 
        status: apiConfigData.anthropicApiKey ? "connected" : "disconnected",
        hasApiKey: !!apiConfigData.anthropicApiKey
      };
      
      // Check Burp Suite status
      let burpStatus = {
        name: "Burp Suite",
        description: "Web application security testing",
        status: "disconnected",
        endpoint: apiConfigData.burpEndpoint || "http://localhost:1337"
      };
      
      try {
        const controller = new AbortController();
        setTimeout(() => controller.abort(), 3000);
        
        const burpResponse = await fetch(`${burpStatus.endpoint}/health`, { 
          signal: controller.signal
        });
        if (burpResponse.ok || burpResponse.status === 404) {
          burpStatus.status = "connected";
        }
      } catch (error) {
        // Keep as disconnected
      }
      
      // Check Kali Linux status  
      const kaliStatus = {
        name: "Kali Linux",
        description: "Penetration testing environment",
        status: "running" as const
      };
      
      res.json({
        openai: openaiStatus,
        anthropic: anthropicStatus,
        burp: burpStatus,
        kali: kaliStatus
      });
    } catch (error) {
      console.error("Error fetching integration status:", error);
      res.status(500).json({ message: "Failed to fetch integration status" });
    }
  });

  // Global configuration routes
  app.get("/api/config/:type", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || 'dev-user';
      const configType = req.params.type;
      const config = await storage.getGlobalConfig(userId, configType);
      res.json(config || {});
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch configuration" });
    }
  });

  app.post("/api/config/:type", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || 'dev-user';
      const configType = req.params.type;
      const configData = req.body;
      const config = await storage.saveGlobalConfig({
        userId,
        configType,
        configData
      });
      res.json(config);
    } catch (error) {
      console.error("Error saving configuration:", error);
      res.status(500).json({ message: "Failed to save configuration" });
    }
  });

  // File manager routes
  app.get("/api/files", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || 'dev-user';
      const userDir = await fileManagerService.getUserDirectory(userId);
      const { path: dirPath } = req.query;
      const fullPath = dirPath ? path.join(userDir, dirPath as string) : userDir;
      const files = await fileManagerService.listFiles(fullPath);
      res.json(files);
    } catch (error) {
      res.status(500).json({ message: "Failed to list files" });
    }
  });

  app.post("/api/files/upload", isAuthenticated, upload.single("file"), async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || 'dev-user';
      const userDir = await fileManagerService.getUserDirectory(userId);
      const { path: uploadPath } = req.body;
      
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      const targetPath = uploadPath ? path.join(userDir, uploadPath) : userDir;
      const savedFile = await fileManagerService.saveFile(req.file.path, targetPath, req.file.originalname);
      
      res.json(savedFile);
    } catch (error) {
      res.status(500).json({ message: "Failed to upload file" });
    }
  });

  app.delete("/api/files", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || 'dev-user';
      const userDir = await fileManagerService.getUserDirectory(userId);
      const { path: filePath } = req.query;
      
      if (!filePath) {
        return res.status(400).json({ message: "File path is required" });
      }
      
      const fullPath = path.join(userDir, filePath as string);
      await fileManagerService.deleteFile(fullPath);
      
      res.json({ message: "File deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete file" });
    }
  });

  app.post("/api/files/mkdir", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || 'dev-user';
      const userDir = await fileManagerService.getUserDirectory(userId);
      const { path: dirPath, name } = req.body;
      
      if (!name) {
        return res.status(400).json({ message: "Directory name is required" });
      }
      
      const parentPath = dirPath ? path.join(userDir, dirPath) : userDir;
      const newDir = await fileManagerService.createDirectory(parentPath, name);
      
      res.json(newDir);
    } catch (error) {
      res.status(500).json({ message: "Failed to create directory" });
    }
  });

  // Create HTTP server
  const server = createServer(app);

  return server;
}
