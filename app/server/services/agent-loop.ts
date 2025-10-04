import { storage } from "../storage";
import { generateVulnerabilityReport as openaiGenerate } from "./openai";
import { generateVulnerabilityReport as anthropicGenerate } from "./anthropic";

export interface LoopExecution {
  id: string;
  agentId: number;
  partnerId: number;
  beaconId: number;
  currentIteration: number;
  maxIterations: number;
  exitCondition: string;
  status: 'running' | 'completed' | 'failed' | 'max_iterations_reached';
  iterations: LoopIteration[];
  startedAt: Date;
  completedAt?: Date;
}

export interface LoopIteration {
  iteration: number;
  agentId: number;
  input: string;
  output: string;
  success: boolean;
  exitConditionMet: boolean;
  timestamp: Date;
  metadata?: Record<string, any>;
}

class AgentLoopService {
  private activeLoops = new Map<string, LoopExecution>();

  async startLoop(
    agentId: number,
    beaconId: number,
    initialInput: string
  ): Promise<LoopExecution | null> {
    const agent = await storage.getAiAgent(agentId);
    if (!agent || !agent.loopEnabled || !agent.loopPartnerId) {
      throw new Error('Agent not configured for looping');
    }

    const partner = await storage.getAiAgent(agent.loopPartnerId);
    if (!partner) {
      throw new Error('Loop partner agent not found');
    }

    const loopId = `loop_${agentId}_${partner.id}_${Date.now()}`;
    
    const loopExecution: LoopExecution = {
      id: loopId,
      agentId,
      partnerId: partner.id,
      beaconId,
      currentIteration: 0,
      maxIterations: agent.maxLoopIterations || 5,
      exitCondition: agent.loopExitCondition || 'functional_poc',
      status: 'running',
      iterations: [],
      startedAt: new Date(),
    };

    this.activeLoops.set(loopId, loopExecution);

    // Start the loop execution
    try {
      await this.executeLoop(loopExecution, initialInput);
      return loopExecution;
    } catch (error) {
      loopExecution.status = 'failed';
      loopExecution.completedAt = new Date();
      throw error;
    }
  }

  private async executeLoop(loop: LoopExecution, input: string): Promise<void> {
    let currentInput = input;
    let currentAgentId = loop.agentId;

    while (loop.currentIteration < loop.maxIterations && loop.status === 'running') {
      const agent = await storage.getAiAgent(currentAgentId);
      if (!agent) break;

      try {
        // Execute current agent
        const output = await this.executeAgent(agent, currentInput, loop.beaconId);
        
        // Check exit condition
        const exitConditionMet = await this.checkExitCondition(
          loop.exitCondition,
          output,
          loop.currentIteration
        );

        const iteration: LoopIteration = {
          iteration: loop.currentIteration + 1,
          agentId: currentAgentId,
          input: currentInput,
          output,
          success: true,
          exitConditionMet,
          timestamp: new Date(),
        };

        loop.iterations.push(iteration);
        loop.currentIteration++;

        if (exitConditionMet) {
          loop.status = 'completed';
          loop.completedAt = new Date();
          break;
        }

        // Switch to partner agent for next iteration
        currentAgentId = currentAgentId === loop.agentId ? loop.partnerId : loop.agentId;
        currentInput = output; // Use previous output as next input

      } catch (error) {
        const iteration: LoopIteration = {
          iteration: loop.currentIteration + 1,
          agentId: currentAgentId,
          input: currentInput,
          output: `Error: ${error instanceof Error ? error.message : String(error)}`,
          success: false,
          exitConditionMet: false,
          timestamp: new Date(),
        };

        loop.iterations.push(iteration);
        loop.status = 'failed';
        loop.completedAt = new Date();
        break;
      }
    }

    if (loop.currentIteration >= loop.maxIterations && loop.status === 'running') {
      loop.status = 'max_iterations_reached';
      loop.completedAt = new Date();
    }
  }

  private async executeAgent(agent: any, input: string, beaconId: number): Promise<string> {
    const beacon = await storage.getBeacon(beaconId);
    if (!beacon) {
      throw new Error('Beacon not found');
    }

    const prompt = agent.modelPrompt 
      ? `${agent.modelPrompt}\n\nPrevious iteration output: ${input}\n\nBeacon: ${beacon.hostname || 'Unknown'}`
      : `Previous iteration output: ${input}\n\nBeacon: ${beacon.hostname || 'Unknown'}`;

    switch (agent.type) {
      case 'openai':
        return await openaiGenerate("Agent Loop Analysis", "medium", prompt);
      case 'anthropic':
        return await anthropicGenerate("Agent Loop Analysis", prompt, "medium", beacon.hostname || 'Unknown');
      case 'local':
        // For local agents, return enhanced input (placeholder)
        return `[Local Agent Processing]\nInput: ${input}\nEnhanced analysis: Vulnerability pattern analysis complete.\nRecommendation: Continue iteration for POC development.`;
      case 'burp':
        // For Burp Suite integration (placeholder)
        return `[Burp Suite Analysis]\nInput: ${input}\nScanning results: Additional attack vectors identified.\nPayload suggestions: ${this.generatePayloadSuggestions(beacon)}`;
      default:
        throw new Error(`Unsupported agent type: ${agent.type}`);
    }
  }

  private async checkExitCondition(
    condition: string,
    output: string,
    iteration: number
  ): Promise<boolean> {
    const outputLower = output.toLowerCase();

    switch (condition) {
      case 'functional_poc':
        return outputLower.includes('functional') && 
               (outputLower.includes('poc') || outputLower.includes('proof of concept')) &&
               (outputLower.includes('working') || outputLower.includes('successful'));

      case 'vulnerability_confirmed':
        return outputLower.includes('confirmed') || 
               outputLower.includes('verified') ||
               outputLower.includes('exploitable');

      case 'exploit_successful':
        return outputLower.includes('exploit') && 
               (outputLower.includes('successful') || outputLower.includes('working'));

      default:
        // Default: consider completed after 3 iterations if no specific condition
        return iteration >= 3;
    }
  }

  private generatePayloadSuggestions(beacon: any): string {
    const suggestions = [
      'SQL injection variations',
      'XSS payload mutations',
      'Command injection techniques',
      'Path traversal exploits',
      'Authentication bypass methods'
    ];
    
    return suggestions.slice(0, 2).join(', ');
  }

  getActiveLoops(): LoopExecution[] {
    return Array.from(this.activeLoops.values());
  }

  getLoop(loopId: string): LoopExecution | undefined {
    return this.activeLoops.get(loopId);
  }

  stopLoop(loopId: string): boolean {
    const loop = this.activeLoops.get(loopId);
    if (loop && loop.status === 'running') {
      loop.status = 'completed';
      loop.completedAt = new Date();
      return true;
    }
    return false;
  }
}

export const agentLoopService = new AgentLoopService();
