/**
 * Build Orchestrator
 * Coordinates and manages multiple build agents, handling dependencies and execution order
 */

import {
  BaseAgent,
  AgentStatus,
  AgentContext,
  AgentResult,
  AgentCommunicator,
  Logger,
} from './agent';

export interface OrchestratorConfig {
  projectRoot: string;
  buildDir?: string;
  tempDir?: string;
  parallelism?: number;
  continueOnError?: boolean;
  config?: Record<string, any>;
}

export interface BuildResult {
  success: boolean;
  totalDuration: number;
  agentResults: Map<string, AgentResult>;
  failedAgents: string[];
  skippedAgents: string[];
}

export class BuildOrchestrator {
  private agents: Map<string, BaseAgent> = new Map();
  private context: AgentContext;
  private communicator: AgentCommunicator;
  private config: OrchestratorConfig;
  private logger: Logger;

  constructor(config: OrchestratorConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
    this.communicator = new AgentCommunicator();

    // Initialize context
    this.context = {
      projectRoot: config.projectRoot,
      buildDir: config.buildDir || `${config.projectRoot}/build`,
      tempDir: config.tempDir || `${config.projectRoot}/.temp`,
      config: config.config || {},
      sharedData: new Map(),
      logger: this.logger,
    };
  }

  /**
   * Register an agent with the orchestrator
   */
  public registerAgent(agent: BaseAgent): void {
    if (this.agents.has(agent.id)) {
      throw new Error(`Agent with id ${agent.id} already registered`);
    }
    this.agents.set(agent.id, agent);
    this.logger.info(`Registered agent: ${agent.name} (${agent.id})`);
  }

  /**
   * Register multiple agents
   */
  public registerAgents(agents: BaseAgent[]): void {
    agents.forEach(agent => this.registerAgent(agent));
  }

  /**
   * Build dependency graph and validate
   */
  private buildDependencyGraph(): Map<string, Set<string>> {
    const graph = new Map<string, Set<string>>();

    for (const [id, agent] of this.agents) {
      if (!graph.has(id)) {
        graph.set(id, new Set());
      }

      for (const dep of agent.getDependencies()) {
        if (!this.agents.has(dep.agentId)) {
          throw new Error(
            `Agent ${id} depends on non-existent agent ${dep.agentId}`
          );
        }
        graph.get(id)!.add(dep.agentId);
      }
    }

    // Check for circular dependencies
    this.detectCycles(graph);

    return graph;
  }

  /**
   * Detect circular dependencies using DFS
   */
  private detectCycles(graph: Map<string, Set<string>>): void {
    const visited = new Set<string>();
    const recStack = new Set<string>();

    const dfs = (node: string): boolean => {
      visited.add(node);
      recStack.add(node);

      const neighbors = graph.get(node) || new Set();
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (dfs(neighbor)) return true;
        } else if (recStack.has(neighbor)) {
          throw new Error(
            `Circular dependency detected: ${node} -> ${neighbor}`
          );
        }
      }

      recStack.delete(node);
      return false;
    };

    for (const node of graph.keys()) {
      if (!visited.has(node)) {
        dfs(node);
      }
    }
  }

  /**
   * Topological sort to determine execution order
   */
  private topologicalSort(graph: Map<string, Set<string>>): string[] {
    const inDegree = new Map<string, number>();
    const result: string[] = [];

    // Initialize in-degrees
    for (const id of graph.keys()) {
      inDegree.set(id, 0);
    }

    // Calculate in-degrees
    for (const [_, deps] of graph) {
      for (const dep of deps) {
        inDegree.set(dep, (inDegree.get(dep) || 0) + 1);
      }
    }

    // Find all nodes with in-degree 0
    const queue: string[] = [];
    for (const [id, degree] of inDegree) {
      if (degree === 0) {
        queue.push(id);
      }
    }

    // Process queue
    while (queue.length > 0) {
      // Sort by priority
      queue.sort((a, b) => {
        const agentA = this.agents.get(a)!;
        const agentB = this.agents.get(b)!;
        return agentA.getPriority() - agentB.getPriority();
      });

      const current = queue.shift()!;
      result.push(current);

      const deps = graph.get(current) || new Set();
      for (const dep of deps) {
        const newDegree = (inDegree.get(dep) || 0) - 1;
        inDegree.set(dep, newDegree);
        if (newDegree === 0) {
          queue.push(dep);
        }
      }
    }

    return result;
  }

  /**
   * Execute all registered agents
   */
  public async execute(): Promise<BuildResult> {
    const startTime = Date.now();
    const agentResults = new Map<string, AgentResult>();
    const failedAgents: string[] = [];
    const skippedAgents: string[] = [];

    this.logger.info('Starting build orchestration...');
    this.logger.info(`Total agents registered: ${this.agents.size}`);

    // Build dependency graph
    const graph = this.buildDependencyGraph();
    const executionOrder = this.topologicalSort(graph);

    this.logger.info(`Execution order: ${executionOrder.join(' -> ')}`);

    // Initialize all agents
    for (const agentId of executionOrder) {
      const agent = this.agents.get(agentId)!;
      await agent.initialize(this.context);
    }

    // Execute agents in order
    for (const agentId of executionOrder) {
      const agent = this.agents.get(agentId)!;

      // Check if dependencies succeeded
      const deps = agent.getDependencies();
      let shouldSkip = false;

      for (const dep of deps) {
        const depResult = agentResults.get(dep.agentId);
        if (dep.required && depResult && !depResult.success) {
          this.logger.warn(
            `Skipping agent ${agent.name} due to failed dependency ${dep.agentId}`
          );
          shouldSkip = true;
          skippedAgents.push(agentId);
          break;
        }
      }

      if (shouldSkip) {
        continue;
      }

      // Validate agent
      const validation = await agent.validate();
      if (!validation.valid) {
        this.logger.error(
          `Agent ${agent.name} validation failed: ${validation.reason}`
        );
        agentResults.set(agentId, {
          success: false,
          message: `Validation failed: ${validation.reason}`,
          errors: [validation.reason || 'Unknown validation error'],
        });
        failedAgents.push(agentId);
        if (!this.config.continueOnError) {
          break;
        }
        continue;
      }

      // Execute agent
      const result = await agent.execute();
      agentResults.set(agentId, result);

      if (!result.success) {
        failedAgents.push(agentId);
        if (!this.config.continueOnError) {
          this.logger.error('Build stopped due to agent failure');
          break;
        }
      }
    }

    // Cleanup all agents
    for (const agent of this.agents.values()) {
      await agent.cleanup();
    }

    const totalDuration = Date.now() - startTime;
    const success = failedAgents.length === 0;

    this.logger.info(`Build ${success ? 'completed' : 'failed'} in ${totalDuration}ms`);
    this.logger.info(`Successful agents: ${agentResults.size - failedAgents.length}`);
    this.logger.info(`Failed agents: ${failedAgents.length}`);
    this.logger.info(`Skipped agents: ${skippedAgents.length}`);

    return {
      success,
      totalDuration,
      agentResults,
      failedAgents,
      skippedAgents,
    };
  }

  /**
   * Get a specific agent by ID
   */
  public getAgent(id: string): BaseAgent | undefined {
    return this.agents.get(id);
  }

  /**
   * Get all registered agents
   */
  public getAllAgents(): BaseAgent[] {
    return Array.from(this.agents.values());
  }

  /**
   * Get the communicator for inter-agent communication
   */
  public getCommunicator(): AgentCommunicator {
    return this.communicator;
  }

  /**
   * Get the shared context
   */
  public getContext(): AgentContext {
    return this.context;
  }
}
