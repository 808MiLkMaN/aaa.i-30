/**
 * Core Agent Base Class
 * Provides the foundation for all build agents in the system
 */

export enum AgentStatus {
  IDLE = 'idle',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  PAUSED = 'paused',
}

export enum AgentPriority {
  CRITICAL = 0,
  HIGH = 1,
  NORMAL = 2,
  LOW = 3,
}

export interface AgentContext {
  projectRoot: string;
  buildDir: string;
  tempDir: string;
  config: Record<string, any>;
  sharedData: Map<string, any>;
  logger: Logger;
}

export interface Logger {
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
  debug(message: string, ...args: any[]): void;
}

export interface AgentResult {
  success: boolean;
  message: string;
  data?: any;
  errors?: string[];
  warnings?: string[];
  artifacts?: string[];
  duration?: number;
}

export interface AgentDependency {
  agentId: string;
  required: boolean;
}

export abstract class BaseAgent {
  public readonly id: string;
  public readonly name: string;
  public readonly description: string;
  protected status: AgentStatus = AgentStatus.IDLE;
  protected priority: AgentPriority = AgentPriority.NORMAL;
  protected dependencies: AgentDependency[] = [];
  protected context?: AgentContext;
  protected startTime?: number;
  protected endTime?: number;

  constructor(id: string, name: string, description: string) {
    this.id = id;
    this.name = name;
    this.description = description;
  }

  /**
   * Initialize the agent with context
   */
  public async initialize(context: AgentContext): Promise<void> {
    this.context = context;
    this.context.logger.info(`Initializing agent: ${this.name}`);
    await this.onInitialize(context);
  }

  /**
   * Execute the agent's main task
   */
  public async execute(): Promise<AgentResult> {
    if (!this.context) {
      throw new Error('Agent not initialized. Call initialize() first.');
    }

    this.status = AgentStatus.RUNNING;
    this.startTime = Date.now();
    this.context.logger.info(`Executing agent: ${this.name}`);

    try {
      const result = await this.onExecute(this.context);
      this.status = result.success ? AgentStatus.COMPLETED : AgentStatus.FAILED;
      this.endTime = Date.now();

      result.duration = this.endTime - this.startTime;

      if (result.success) {
        this.context.logger.info(
          `Agent ${this.name} completed in ${result.duration}ms`
        );
      } else {
        this.context.logger.error(
          `Agent ${this.name} failed: ${result.message}`
        );
      }

      return result;
    } catch (error) {
      this.status = AgentStatus.FAILED;
      this.endTime = Date.now();

      const errorMessage = error instanceof Error ? error.message : String(error);
      this.context.logger.error(`Agent ${this.name} crashed: ${errorMessage}`);

      return {
        success: false,
        message: `Agent crashed: ${errorMessage}`,
        errors: [errorMessage],
        duration: this.endTime - this.startTime,
      };
    }
  }

  /**
   * Validate if the agent can run (check dependencies, environment, etc.)
   */
  public async validate(): Promise<{ valid: boolean; reason?: string }> {
    if (!this.context) {
      return { valid: false, reason: 'Agent not initialized' };
    }
    return this.onValidate(this.context);
  }

  /**
   * Get the current status of the agent
   */
  public getStatus(): AgentStatus {
    return this.status;
  }

  /**
   * Get the priority of the agent
   */
  public getPriority(): AgentPriority {
    return this.priority;
  }

  /**
   * Set the priority of the agent
   */
  public setPriority(priority: AgentPriority): void {
    this.priority = priority;
  }

  /**
   * Get the dependencies of this agent
   */
  public getDependencies(): AgentDependency[] {
    return this.dependencies;
  }

  /**
   * Add a dependency to this agent
   */
  public addDependency(agentId: string, required: boolean = true): void {
    this.dependencies.push({ agentId, required });
  }

  /**
   * Cleanup resources
   */
  public async cleanup(): Promise<void> {
    if (this.context) {
      await this.onCleanup(this.context);
    }
  }

  // Abstract methods to be implemented by subclasses

  /**
   * Called when the agent is initialized
   */
  protected abstract onInitialize(context: AgentContext): Promise<void>;

  /**
   * Called when the agent executes its main task
   */
  protected abstract onExecute(context: AgentContext): Promise<AgentResult>;

  /**
   * Called to validate if the agent can run
   */
  protected abstract onValidate(context: AgentContext): Promise<{
    valid: boolean;
    reason?: string;
  }>;

  /**
   * Called when the agent is being cleaned up
   */
  protected abstract onCleanup(context: AgentContext): Promise<void>;
}

/**
 * Communication system for agents to share data
 */
export class AgentCommunicator {
  private channels: Map<string, any[]> = new Map();

  /**
   * Publish a message to a channel
   */
  public publish(channel: string, message: any): void {
    if (!this.channels.has(channel)) {
      this.channels.set(channel, []);
    }
    this.channels.get(channel)!.push({
      timestamp: Date.now(),
      data: message,
    });
  }

  /**
   * Subscribe to a channel and get all messages
   */
  public subscribe(channel: string): any[] {
    return this.channels.get(channel) || [];
  }

  /**
   * Get the latest message from a channel
   */
  public getLatest(channel: string): any | null {
    const messages = this.channels.get(channel);
    return messages && messages.length > 0 ? messages[messages.length - 1].data : null;
  }

  /**
   * Clear all messages from a channel
   */
  public clear(channel: string): void {
    this.channels.delete(channel);
  }

  /**
   * Clear all channels
   */
  public clearAll(): void {
    this.channels.clear();
  }
}
