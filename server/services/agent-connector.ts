import { db } from "../db";
import { aiAgents } from "@shared/schema";
import { eq } from "drizzle-orm";
import fetch from "node-fetch";

interface ContainerAgent {
  name: string;
  type: string;
  port: number;
  container: string;
}

const CONTAINER_AGENTS: ContainerAgent[] = [
  {
    name: "Architecture Lead",
    type: "ARCHITECTURE_LEAD",
    port: 3010,
    container: "dev-team-agent-architecture"
  },
  {
    name: "Frontend Core",
    type: "FRONTEND_CORE",
    port: 3011,
    container: "dev-team-agent-frontend"
  },
  {
    name: "Backend Integration",
    type: "BACKEND_INTEGRATION",
    port: 3012,
    container: "dev-team-agent-backend"
  },
  {
    name: "Quality Assurance",
    type: "QUALITY_ASSURANCE",
    port: 3013,
    container: "dev-team-agent-qa"
  },
  {
    name: "DevOps Engineer",
    type: "DEVOPS",
    port: 3014,
    container: "dev-team-agent-devops"
  },
  {
    name: "MCP Integration",
    type: "MCP_INTEGRATION",
    port: 3015,
    container: "dev-team-agent-mcp"
  }
];

export class AgentConnector {
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private reconnectAttempts: Map<string, number> = new Map();
  private maxReconnectAttempts = 5;
  private reconnectDelay = 5000; // 5 seconds

  async initialize() {
    console.log("Initializing Agent Connector...");
    
    // Seed agents if they don't exist
    await this.seedAgents();
    
    // Start health monitoring
    this.startHealthMonitoring();
    
    console.log("Agent Connector initialized successfully");
  }

  private async seedAgents() {
    console.log("Seeding container agents...");
    
    for (const containerAgent of CONTAINER_AGENTS) {
      try {
        // Check if agent already exists
        const existingAgent = await db.select()
          .from(aiAgents)
          .where(eq(aiAgents.type, containerAgent.type))
          .limit(1);
        
        if (existingAgent.length === 0) {
          // Create new agent
          await db.insert(aiAgents).values({
            name: containerAgent.name,
            type: containerAgent.type,
            endpoint: `http://localhost:${containerAgent.port}`,
            status: "INITIALIZING",
            modelPrompt: `You are the ${containerAgent.name} agent for the dev team platform.`,
            flowOrder: containerAgent.port - 3010, // Simple ordering based on port
            capabilities: this.getAgentCapabilities(containerAgent.type),
            taskQueue: [],
            tasksCompleted: 0,
            tasksFailed: 0,
            cpuUsage: "0",
            memoryUsage: "0",
            uptime: 0,
            lastPing: new Date(),
            config: {
              container: containerAgent.container,
              port: containerAgent.port,
              autoReconnect: true
            }
          });
          console.log(`Created agent: ${containerAgent.name}`);
        } else {
          // Update endpoint in case port changed
          await db.update(aiAgents)
            .set({
              endpoint: `http://localhost:${containerAgent.port}`,
              config: {
                container: containerAgent.container,
                port: containerAgent.port,
                autoReconnect: true
              }
            })
            .where(eq(aiAgents.type, containerAgent.type));
          console.log(`Updated agent: ${containerAgent.name}`);
        }
      } catch (error) {
        console.error(`Failed to seed agent ${containerAgent.name}:`, error);
      }
    }
  }

  private getAgentCapabilities(type: string): string[] {
    switch (type) {
      case "ARCHITECTURE_LEAD":
        return ["system_design", "architecture_review", "technical_decisions", "api_design"];
      case "FRONTEND_CORE":
        return ["ui_development", "component_creation", "state_management", "styling"];
      case "BACKEND_INTEGRATION":
        return ["api_development", "database_design", "integration", "authentication"];
      case "QUALITY_ASSURANCE":
        return ["testing", "quality_gates", "bug_detection", "test_automation"];
      case "DEVOPS":
        return ["deployment", "infrastructure", "monitoring", "ci_cd"];
      case "MCP_INTEGRATION":
        return ["model_integration", "ai_coordination", "prompt_engineering"];
      default:
        return [];
    }
  }

  private startHealthMonitoring() {
    // Clear existing interval if any
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    // Check health every 10 seconds
    this.healthCheckInterval = setInterval(() => {
      this.checkAllAgentHealth();
    }, 10000);

    // Do initial health check
    this.checkAllAgentHealth();
  }

  private async checkAllAgentHealth() {
    const agents = await db.select().from(aiAgents);
    
    for (const agent of agents) {
      await this.checkAgentHealth(agent);
    }
  }

  private async checkAgentHealth(agent: any) {
    if (!agent.endpoint) return;

    try {
      // Try to ping the agent endpoint
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000); // 3 second timeout
      
      const startTime = Date.now();
      const response = await fetch(`${agent.endpoint}/health`, {
        method: "GET",
        signal: controller.signal as any,
        headers: {
          "Content-Type": "application/json"
        }
      }).finally(() => clearTimeout(timeout));

      const responseTime = Date.now() - startTime;

      if (response.ok) {
        const healthData = await response.json().catch(() => ({}));
        
        // Update agent status to READY
        await db.update(aiAgents)
          .set({
            status: healthData.status || "READY",
            lastPing: new Date(),
            averageResponseTime: responseTime.toString(),
            cpuUsage: healthData.cpu?.toString() || "0",
            memoryUsage: healthData.memory?.toString() || "0",
            uptime: healthData.uptime || 0
          })
          .where(eq(aiAgents.id, agent.id));

        // Reset reconnect attempts on successful connection
        this.reconnectAttempts.set(agent.type, 0);
        
      } else {
        throw new Error(`Health check failed with status ${response.status}`);
      }
    } catch (error) {
      // Agent is not responding
      console.log(`Agent ${agent.name} health check failed:`, (error as Error).message);
      
      // Update status to ERROR or OFFLINE
      const attempts = this.reconnectAttempts.get(agent.type) || 0;
      const status = attempts > this.maxReconnectAttempts ? "OFFLINE" : "ERROR";
      
      await db.update(aiAgents)
        .set({
          status,
          lastPing: new Date()
        })
        .where(eq(aiAgents.id, agent.id));

      // Try to reconnect if not exceeded max attempts
      if (attempts <= this.maxReconnectAttempts) {
        this.reconnectAttempts.set(agent.type, attempts + 1);
        setTimeout(() => this.attemptReconnect(agent), this.reconnectDelay);
      }
    }
  }

  private async attemptReconnect(agent: any) {
    console.log(`Attempting to reconnect to ${agent.name}...`);
    
    try {
      // Try to establish connection
      const response = await fetch(`${agent.endpoint}/health`, {
        method: "GET"
      });

      if (response.ok) {
        console.log(`Successfully reconnected to ${agent.name}`);
        
        // Update status to READY
        await db.update(aiAgents)
          .set({
            status: "READY",
            lastPing: new Date()
          })
          .where(eq(aiAgents.id, agent.id));
        
        // Reset attempts
        this.reconnectAttempts.set(agent.type, 0);
      }
    } catch (error) {
      console.log(`Reconnection failed for ${agent.name}`);
    }
  }

  async getAgentStatus(agentType: string) {
    const agent = await db.select()
      .from(aiAgents)
      .where(eq(aiAgents.type, agentType))
      .limit(1);
    
    return agent[0] || null;
  }

  async sendTaskToAgent(agentType: string, task: any) {
    const agent = await this.getAgentStatus(agentType);
    
    if (!agent || agent.status !== "READY") {
      throw new Error(`Agent ${agentType} is not available`);
    }

    try {
      const response = await fetch(`${agent.endpoint}/task`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(task)
      });

      if (!response.ok) {
        throw new Error(`Task submission failed: ${response.statusText}`);
      }

      const result = await response.json();
      
      // Update agent metrics
      await db.update(aiAgents)
        .set({
          tasksCompleted: (agent.tasksCompleted || 0) + 1,
          currentTaskId: task.id,
          currentTaskProgress: 0
        })
        .where(eq(aiAgents.id, agent.id));
      
      return result;
    } catch (error) {
      // Update failed task count
      await db.update(aiAgents)
        .set({
          tasksFailed: (agent.tasksFailed || 0) + 1
        })
        .where(eq(aiAgents.id, agent.id));
      
      throw error;
    }
  }

  destroy() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }
}

export const agentConnector = new AgentConnector();