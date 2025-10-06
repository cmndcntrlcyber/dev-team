import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertAiAgentSchema,
  insertProjectSchema,
  insertEnvironmentSchema,
  insertSprintSchema,
  insertTaskSchema,
  insertIssueSchema,
  insertRepositorySchema,
  insertDeploymentSchema,
  insertPullRequestSchema,
  insertReleaseSchema
} from "@shared/schema";
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

  // Projects API (SDLC)
  app.get("/api/projects", async (req, res) => {
    try {
      const projects = await storage.getProjects();
      res.json(projects);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  app.get("/api/projects/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const project = await storage.getProject(id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch project" });
    }
  });

  app.post("/api/projects", async (req, res) => {
    try {
      const projectData = insertProjectSchema.parse(req.body);
      const project = await storage.createProject(projectData);
      res.status(201).json(project);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid project data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create project" });
    }
  });

  app.put("/api/projects/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const projectData = insertProjectSchema.partial().parse(req.body);
      const project = await storage.updateProject(id, projectData);
      res.json(project);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid project data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update project" });
    }
  });

  app.delete("/api/projects/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteProject(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete project" });
    }
  });

  // Legacy compatibility - redirect to projects
  app.get("/api/operations", async (req, res) => {
    const projects = await storage.getProjects();
    res.json(projects);
  });

  app.get("/api/beacons", async (req, res) => {
    res.json([]);
  });

  app.get("/api/programs", async (req, res) => {
    const projects = await storage.getProjects();
    res.json(projects);
  });

  app.get("/api/vulnerabilities", async (req, res) => {
    const issues = await storage.getIssues();
    res.json(issues);
  });

  app.get("/api/docker/containers", async (req, res) => {
    res.json([]);
  });

  app.get("/api/docker/configs", async (req, res) => {
    res.json([]);
  });

  // Environments API
  app.get("/api/environments", async (req, res) => {
    try {
      const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : undefined;
      const environments = await storage.getEnvironments(projectId);
      res.json(environments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch environments" });
    }
  });

  app.get("/api/environments/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const environment = await storage.getEnvironment(id);
      if (!environment) {
        return res.status(404).json({ message: "Environment not found" });
      }
      res.json(environment);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch environment" });
    }
  });

  app.post("/api/environments", async (req, res) => {
    try {
      const envData = insertEnvironmentSchema.parse(req.body);
      const environment = await storage.createEnvironment(envData);
      res.status(201).json(environment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid environment data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create environment" });
    }
  });

  app.put("/api/environments/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const envData = insertEnvironmentSchema.partial().parse(req.body);
      const environment = await storage.updateEnvironment(id, envData);
      res.json(environment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid environment data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update environment" });
    }
  });

  app.delete("/api/environments/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteEnvironment(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete environment" });
    }
  });

  // Sprints API
  app.get("/api/sprints", async (req, res) => {
    try {
      const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : undefined;
      const sprints = await storage.getSprints(projectId);
      res.json(sprints);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch sprints" });
    }
  });

  app.get("/api/sprints/active/:projectId", async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const sprint = await storage.getActiveSprint(projectId);
      res.json(sprint || null);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch active sprint" });
    }
  });

  app.get("/api/sprints/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const sprint = await storage.getSprint(id);
      if (!sprint) {
        return res.status(404).json({ message: "Sprint not found" });
      }
      res.json(sprint);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch sprint" });
    }
  });

  app.post("/api/sprints", async (req, res) => {
    try {
      const sprintData = insertSprintSchema.parse(req.body);
      const sprint = await storage.createSprint(sprintData);
      res.status(201).json(sprint);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid sprint data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create sprint" });
    }
  });

  app.put("/api/sprints/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const sprintData = insertSprintSchema.partial().parse(req.body);
      const sprint = await storage.updateSprint(id, sprintData);
      res.json(sprint);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid sprint data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update sprint" });
    }
  });

  app.delete("/api/sprints/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteSprint(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete sprint" });
    }
  });

  // Tasks API
  app.get("/api/tasks", async (req, res) => {
    try {
      const filters: any = {};
      if (req.query.projectId) filters.projectId = parseInt(req.query.projectId as string);
      if (req.query.sprintId) filters.sprintId = parseInt(req.query.sprintId as string);
      if (req.query.status) filters.status = req.query.status as string;
      
      const tasks = await storage.getTasks(filters);
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  app.get("/api/tasks/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const task = await storage.getTask(id);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      res.json(task);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch task" });
    }
  });

  app.post("/api/tasks", async (req, res) => {
    try {
      const taskData = insertTaskSchema.parse(req.body);
      const task = await storage.createTask(taskData);
      res.status(201).json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid task data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create task" });
    }
  });

  app.put("/api/tasks/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const taskData = insertTaskSchema.partial().parse(req.body);
      const task = await storage.updateTask(id, taskData);
      res.json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid task data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update task" });
    }
  });

  app.delete("/api/tasks/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteTask(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete task" });
    }
  });

  // Issues API
  app.get("/api/issues", async (req, res) => {
    try {
      const filters: any = {};
      if (req.query.projectId) filters.projectId = parseInt(req.query.projectId as string);
      if (req.query.severity) filters.severity = req.query.severity as string;
      if (req.query.status) filters.status = req.query.status as string;
      
      const issues = await storage.getIssues(filters);
      res.json(issues);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch issues" });
    }
  });

  app.get("/api/issues/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const issue = await storage.getIssue(id);
      if (!issue) {
        return res.status(404).json({ message: "Issue not found" });
      }
      res.json(issue);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch issue" });
    }
  });

  app.post("/api/issues", async (req, res) => {
    try {
      const issueData = insertIssueSchema.parse(req.body);
      const issue = await storage.createIssue(issueData);
      res.status(201).json(issue);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid issue data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create issue" });
    }
  });

  app.put("/api/issues/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const issueData = insertIssueSchema.partial().parse(req.body);
      const issue = await storage.updateIssue(id, issueData);
      res.json(issue);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid issue data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update issue" });
    }
  });

  app.delete("/api/issues/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteIssue(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete issue" });
    }
  });

  // Repositories API
  app.get("/api/repositories", async (req, res) => {
    try {
      const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : undefined;
      const repositories = await storage.getRepositories(projectId);
      res.json(repositories);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch repositories" });
    }
  });

  app.post("/api/repositories", async (req, res) => {
    try {
      const repoData = insertRepositorySchema.parse(req.body);
      const repository = await storage.createRepository(repoData);
      res.status(201).json(repository);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid repository data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create repository" });
    }
  });

  // Deployments API
  app.get("/api/deployments", async (req, res) => {
    try {
      const filters: any = {};
      if (req.query.projectId) filters.projectId = parseInt(req.query.projectId as string);
      if (req.query.environmentId) filters.environmentId = parseInt(req.query.environmentId as string);
      
      const deployments = await storage.getDeployments(filters);
      res.json(deployments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch deployments" });
    }
  });

  app.post("/api/deployments", async (req, res) => {
    try {
      const deploymentData = insertDeploymentSchema.parse(req.body);
      const deployment = await storage.createDeployment(deploymentData);
      res.status(201).json(deployment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid deployment data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create deployment" });
    }
  });

  // Releases API
  app.get("/api/releases", async (req, res) => {
    try {
      const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : undefined;
      const releases = await storage.getReleases(projectId);
      res.json(releases);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch releases" });
    }
  });

  app.post("/api/releases", async (req, res) => {
    try {
      const releaseData = insertReleaseSchema.parse(req.body);
      const release = await storage.createRelease(releaseData);
      res.status(201).json(release);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid release data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create release" });
    }
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

  // Dashboard stats - SDLC metrics
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
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

  // Integration status route - SDLC tools
  app.get("/api/integrations/status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || 'dev-user';
      
      // Get API configuration to check if keys are set
      const apiConfig = await storage.getGlobalConfig(userId, 'api');
      const apiConfigData = apiConfig?.configData || {};
      
      // Check OpenAI status
      const openaiStatus = {
        name: "OpenAI",
        description: "GPT-4 API for AI-powered code assistance",
        status: apiConfigData.openaiApiKey ? "connected" : "disconnected",
        hasApiKey: !!apiConfigData.openaiApiKey
      };
      
      // Check Anthropic status  
      const anthropicStatus = {
        name: "Anthropic",
        description: "Claude AI for multi-agent development workflows", 
        status: apiConfigData.anthropicApiKey ? "connected" : "disconnected",
        hasApiKey: !!apiConfigData.anthropicApiKey
      };
      
      // Check GitHub status
      const githubStatus = {
        name: "GitHub",
        description: "Git repository hosting and collaboration",
        status: apiConfigData.githubToken ? "connected" : "disconnected",
        hasToken: !!apiConfigData.githubToken
      };
      
      // Check Jenkins status
      let jenkinsStatus = {
        name: "Jenkins",
        description: "CI/CD automation server",
        status: "disconnected",
        endpoint: apiConfigData.jenkinsEndpoint || "http://localhost:8080"
      };
      
      try {
        const controller = new AbortController();
        setTimeout(() => controller.abort(), 3000);
        
        const jenkinsResponse = await fetch(`${jenkinsStatus.endpoint}/api/json`, { 
          signal: controller.signal
        });
        if (jenkinsResponse.ok || jenkinsResponse.status === 403) {
          jenkinsStatus.status = "connected";
        }
      } catch (error) {
        // Keep as disconnected
      }
      
      // Check Cloudflare status
      const cloudflareStatus = {
        name: "Cloudflare",
        description: "CDN and DNS management",
        status: apiConfigData.cloudflareToken ? "connected" : "disconnected",
        hasToken: !!apiConfigData.cloudflareToken
      };
      
      // Check OpenTofu status
      const opentofuStatus = {
        name: "OpenTofu",
        description: "Infrastructure as Code management",
        status: "available" as const
      };
      
      res.json({
        openai: openaiStatus,
        anthropic: anthropicStatus,
        github: githubStatus,
        jenkins: jenkinsStatus,
        cloudflare: cloudflareStatus,
        opentofu: opentofuStatus
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

  // Password change endpoint
  app.post("/api/auth/change-password", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || 'dev-user';
      const { currentPassword, newPassword } = req.body;

      if (!newPassword || newPassword.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters long" });
      }

      // For now, just return success (actual password hashing would be implemented with user auth)
      res.json({ message: "Password changed successfully" });
    } catch (error) {
      console.error("Error changing password:", error);
      res.status(500).json({ message: "Failed to change password" });
    }
  });

  // Export data endpoint
  app.get("/api/export-data", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || 'dev-user';
      
      const data = {
        exportDate: new Date().toISOString(),
        userId,
        projects: await storage.getProjects(),
        tasks: await storage.getTasks({}),
        repositories: await storage.getRepositories(),
        deployments: await storage.getDeployments({}),
        releases: await storage.getReleases(),
        environments: await storage.getEnvironments(),
        issues: await storage.getIssues({}),
        aiAgents: await storage.getAiAgents(),
      };
      
      res.json(data);
    } catch (error) {
      console.error("Error exporting data:", error);
      res.status(500).json({ message: "Failed to export data" });
    }
  });

  // Import data endpoint
  app.post("/api/import-data", isAuthenticated, async (req: any, res) => {
    try {
      const importData = req.body;
      
      if (!importData || typeof importData !== 'object') {
        return res.status(400).json({ message: "Invalid import data format" });
      }

      let importedCount = 0;

      // Import projects
      if (importData.projects && Array.isArray(importData.projects)) {
        for (const project of importData.projects) {
          try {
            await storage.createProject(project);
            importedCount++;
          } catch (error) {
            console.error("Error importing project:", error);
          }
        }
      }

      // Import tasks
      if (importData.tasks && Array.isArray(importData.tasks)) {
        for (const task of importData.tasks) {
          try {
            await storage.createTask(task);
            importedCount++;
          } catch (error) {
            console.error("Error importing task:", error);
          }
        }
      }

      res.json({ 
        message: "Data imported successfully",
        itemsImported: importedCount
      });
    } catch (error) {
      console.error("Error importing data:", error);
      res.status(500).json({ message: "Failed to import data" });
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
