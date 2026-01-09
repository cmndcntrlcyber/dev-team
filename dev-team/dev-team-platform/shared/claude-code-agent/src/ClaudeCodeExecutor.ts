import Anthropic from '@anthropic-ai/sdk';
import { spawn, ChildProcess } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import pino from 'pino';
import {
  ExecutionOptions,
  ExecutionResult,
  ExecutionArtifact,
  ClaudeCodeExecutorConfig,
  Logger,
  TokenUsage,
} from './types';

/**
 * ClaudeCodeExecutor - Hybrid Claude Code wrapper
 *
 * Provides two execution modes:
 * - SDK mode: Direct Anthropic API calls for quick queries, coordination, and reviews
 * - CLI mode: Spawns Claude Code CLI subprocess for heavy code generation with full tool access
 */
export class ClaudeCodeExecutor {
  private anthropic: Anthropic;
  private config: Required<ClaudeCodeExecutorConfig>;
  private logger: Logger;

  constructor(config: ClaudeCodeExecutorConfig) {
    this.config = {
      apiKey: config.apiKey,
      defaultModel: config.defaultModel || 'claude-sonnet-4-20250514',
      defaultTimeout: config.defaultTimeout || 300000, // 5 minutes
      maxRetries: config.maxRetries || 3,
      retryDelay: config.retryDelay || 1000,
      cliPath: config.cliPath || 'claude',
      logger: config.logger || pino({ level: 'info' }),
    };

    this.logger = this.config.logger;
    this.anthropic = new Anthropic({ apiKey: this.config.apiKey });
  }

  /**
   * Execute a task using Claude Code
   * Automatically selects SDK or CLI mode based on options
   */
  async execute(options: ExecutionOptions): Promise<ExecutionResult> {
    const startTime = Date.now();
    const executionId = uuidv4();

    this.logger.info(`Starting execution ${executionId} in ${options.mode} mode`);

    try {
      let result: ExecutionResult;

      if (options.mode === 'sdk') {
        result = await this.executeViaSDK(options, executionId);
      } else {
        result = await this.executeViaCLI(options, executionId);
      }

      result.duration = Date.now() - startTime;
      this.logger.info(`Execution ${executionId} completed in ${result.duration}ms`);

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      this.logger.error(`Execution ${executionId} failed: ${errorMessage}`);

      return {
        success: false,
        content: '',
        duration,
        error: errorMessage,
      };
    }
  }

  /**
   * Execute via Anthropic SDK - for quick queries and coordination
   */
  private async executeViaSDK(
    options: ExecutionOptions,
    executionId: string
  ): Promise<ExecutionResult> {
    const model = options.model || this.config.defaultModel;
    const maxTokens = options.maxTokens || 4096;

    this.logger.debug(`SDK execution ${executionId}: model=${model}, maxTokens=${maxTokens}`);

    // Build the full prompt with context
    const fullPrompt = this.buildPromptWithContext(options);

    let retries = 0;
    while (retries <= this.config.maxRetries) {
      try {
        const response = await this.anthropic.messages.create({
          model,
          max_tokens: maxTokens,
          system: options.systemPrompt,
          messages: [
            {
              role: 'user',
              content: fullPrompt,
            },
          ],
        });

        // Extract text content
        const textContent = response.content
          .filter((block): block is Anthropic.TextBlock => block.type === 'text')
          .map((block) => block.text)
          .join('\n');

        // Try to parse structured output if JSON
        let structuredOutput: Record<string, unknown> | undefined;
        try {
          // Look for JSON in the response
          const jsonMatch = textContent.match(/```json\n?([\s\S]*?)\n?```/);
          if (jsonMatch) {
            structuredOutput = JSON.parse(jsonMatch[1]);
          } else if (textContent.trim().startsWith('{')) {
            structuredOutput = JSON.parse(textContent);
          }
        } catch {
          // Not JSON, that's fine
        }

        const tokenUsage: TokenUsage = {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
          totalTokens: response.usage.input_tokens + response.usage.output_tokens,
        };

        return {
          success: true,
          content: textContent,
          structuredOutput,
          tokenUsage,
          duration: 0, // Will be set by caller
        };
      } catch (error) {
        retries++;
        if (retries > this.config.maxRetries) {
          throw error;
        }
        this.logger.warn(`SDK execution retry ${retries}/${this.config.maxRetries}`);
        await this.sleep(this.config.retryDelay * retries);
      }
    }

    throw new Error('Max retries exceeded');
  }

  /**
   * Execute via Claude Code CLI - for heavy code generation with full tool access
   */
  private async executeViaCLI(
    options: ExecutionOptions,
    executionId: string
  ): Promise<ExecutionResult> {
    return new Promise((resolve) => {
      const timeout = options.timeout || this.config.defaultTimeout;
      const model = options.model || this.config.defaultModel;

      this.logger.debug(`CLI execution ${executionId}: workingDir=${options.workingDirectory}`);

      // Build Claude Code CLI arguments
      const args = this.buildCLIArgs(options, model);

      // Build the full prompt with context
      const fullPrompt = this.buildPromptWithContext(options);

      let stdout = '';
      let stderr = '';
      let timedOut = false;

      const process: ChildProcess = spawn(this.config.cliPath, args, {
        cwd: options.workingDirectory,
        env: {
          ...globalThis.process.env,
          ANTHROPIC_API_KEY: this.config.apiKey,
        },
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      // Set up timeout
      const timeoutId = setTimeout(() => {
        timedOut = true;
        process.kill('SIGTERM');
        this.logger.warn(`CLI execution ${executionId} timed out after ${timeout}ms`);
      }, timeout);

      // Send the prompt to stdin
      if (process.stdin) {
        process.stdin.write(fullPrompt);
        process.stdin.end();
      }

      // Collect stdout
      if (process.stdout) {
        process.stdout.on('data', (data: Buffer) => {
          stdout += data.toString();
        });
      }

      // Collect stderr
      if (process.stderr) {
        process.stderr.on('data', (data: Buffer) => {
          stderr += data.toString();
        });
      }

      process.on('close', (code: number | null) => {
        clearTimeout(timeoutId);

        if (timedOut) {
          resolve({
            success: false,
            content: stdout,
            duration: 0,
            error: `Execution timed out after ${timeout}ms`,
            warnings: stderr ? [stderr] : undefined,
          });
          return;
        }

        if (code !== 0) {
          resolve({
            success: false,
            content: stdout,
            duration: 0,
            error: `CLI exited with code ${code}: ${stderr}`,
            warnings: stderr ? [stderr] : undefined,
          });
          return;
        }

        // Parse CLI output for artifacts
        const artifacts = this.parseArtifactsFromOutput(stdout);

        // Try to parse structured output
        let structuredOutput: Record<string, unknown> | undefined;
        try {
          const jsonMatch = stdout.match(/```json\n?([\s\S]*?)\n?```/);
          if (jsonMatch) {
            structuredOutput = JSON.parse(jsonMatch[1]);
          }
        } catch {
          // Not JSON
        }

        resolve({
          success: true,
          content: stdout,
          structuredOutput,
          artifacts,
          duration: 0,
          warnings: stderr ? [stderr] : undefined,
        });
      });

      process.on('error', (error: Error) => {
        clearTimeout(timeoutId);
        resolve({
          success: false,
          content: '',
          duration: 0,
          error: `Failed to spawn CLI: ${error.message}`,
        });
      });
    });
  }

  /**
   * Build CLI arguments for Claude Code
   */
  private buildCLIArgs(options: ExecutionOptions, model: string): string[] {
    const args: string[] = [
      '--print', // Print mode for non-interactive use
      '--model', model,
    ];

    // Add system prompt file if provided
    if (options.systemPrompt) {
      args.push('--system-prompt', options.systemPrompt);
    }

    // Add tool restrictions if specified
    if (options.tools) {
      const allowedTools = options.tools
        .filter((t) => t.enabled)
        .map((t) => t.name)
        .join(',');

      if (allowedTools) {
        args.push('--allowedTools', allowedTools);
      }

      const disallowedTools = options.tools
        .filter((t) => !t.enabled)
        .map((t) => t.name)
        .join(',');

      if (disallowedTools) {
        args.push('--disallowedTools', disallowedTools);
      }
    }

    return args;
  }

  /**
   * Build prompt with context from previous tasks
   */
  private buildPromptWithContext(options: ExecutionOptions): string {
    let prompt = options.userPrompt;

    if (options.context) {
      const contextParts: string[] = [];

      // Add architecture decisions
      if (options.context.architectureDecisions?.length) {
        contextParts.push('## Relevant Architecture Decisions\n');
        for (const decision of options.context.architectureDecisions) {
          contextParts.push(`- **${decision.title}**: ${decision.decision}\n`);
        }
      }

      // Add code standards
      if (options.context.codeStandards?.length) {
        contextParts.push('\n## Code Standards to Follow\n');
        for (const standard of options.context.codeStandards) {
          contextParts.push(`### ${standard.category}\n`);
          for (const rule of standard.rules) {
            contextParts.push(`- ${rule}\n`);
          }
        }
      }

      // Add previous task summaries
      if (options.context.previousTasks?.length) {
        contextParts.push('\n## Previous Task Results\n');
        for (const task of options.context.previousTasks) {
          contextParts.push(`- **${task.title}** (${task.status}): ${task.output || 'No output'}\n`);
        }
      }

      if (contextParts.length > 0) {
        prompt = `# Context\n\n${contextParts.join('')}\n\n# Task\n\n${prompt}`;
      }
    }

    return prompt;
  }

  /**
   * Parse artifacts from CLI output
   */
  private parseArtifactsFromOutput(output: string): ExecutionArtifact[] {
    const artifacts: ExecutionArtifact[] = [];

    // Look for file operation patterns in the output
    const writePatterns = [
      /(?:Created|Wrote to|Writing to|Created file:?)\s+[`"]?([^\s`"]+)[`"]?/gi,
      /File\s+[`"]?([^\s`"]+)[`"]?\s+(?:created|written)/gi,
    ];

    const modifyPatterns = [
      /(?:Modified|Updated|Editing|Changed)\s+[`"]?([^\s`"]+)[`"]?/gi,
      /File\s+[`"]?([^\s`"]+)[`"]?\s+(?:modified|updated)/gi,
    ];

    for (const pattern of writePatterns) {
      let match;
      while ((match = pattern.exec(output)) !== null) {
        artifacts.push({
          path: match[1],
          operation: 'created',
        });
      }
    }

    for (const pattern of modifyPatterns) {
      let match;
      while ((match = pattern.exec(output)) !== null) {
        // Don't add if already marked as created
        if (!artifacts.find((a) => a.path === match[1])) {
          artifacts.push({
            path: match[1],
            operation: 'modified',
          });
        }
      }
    }

    return artifacts;
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Check if the executor is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Try a simple API call
      await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'ping' }],
      });
      return true;
    } catch {
      return false;
    }
  }
}
