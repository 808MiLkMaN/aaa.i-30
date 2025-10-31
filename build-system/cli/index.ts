#!/usr/bin/env node

/**
 * Agent Build System CLI
 * Command-line interface for running agent-based builds
 */

import { BuildOrchestrator } from '../core/orchestrator';
import { ConfigLoader, BuildConfig } from '../config/loader';
import { existsSync } from 'fs';
import { resolve } from 'path';

// Import all agents
import {
  DependencyInstallAgent,
  TypeScriptBuildAgent,
  NextJSBuildAgent,
  LintAgent,
  TestRunnerAgent,
} from '../agents/webapp';

import {
  UnityBuildAgent,
  UnrealBuildAgent,
  ThreeJSBuildAgent,
  GodotBuildAgent,
} from '../agents/game3d';

import {
  CMakeBuildAgent,
  MakeBuildAgent,
  RustBuildAgent,
  GoBuildAgent,
  MavenBuildAgent,
  GradleBuildAgent,
} from '../agents/program';

import { AssetProcessingAgent } from '../agents/shared/assets';
import { DependencyResolutionAgent } from '../agents/shared/dependencies';
import {
  UnitTestAgent,
  BuildValidationAgent,
  SecurityScanAgent,
} from '../agents/shared/testing';

import { BaseAgent, Logger } from '../core/agent';

/**
 * Console Logger
 */
class ConsoleLogger implements Logger {
  info(message: string, ...args: any[]): void {
    console.log(`[INFO] ${message}`, ...args);
  }

  warn(message: string, ...args: any[]): void {
    console.warn(`[WARN] ${message}`, ...args);
  }

  error(message: string, ...args: any[]): void {
    console.error(`[ERROR] ${message}`, ...args);
  }

  debug(message: string, ...args: any[]): void {
    if (process.env.DEBUG) {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  }
}

/**
 * Agent Factory
 * Creates agent instances based on type
 */
class AgentFactory {
  static createAgent(type: string, config?: Record<string, any>): BaseAgent {
    switch (type) {
      // Web App Agents
      case 'webapp-deps-install':
        return new DependencyInstallAgent();
      case 'webapp-typescript-build':
        return new TypeScriptBuildAgent();
      case 'webapp-nextjs-build':
        return new NextJSBuildAgent();
      case 'webapp-lint':
        return new LintAgent();
      case 'webapp-test':
        return new TestRunnerAgent();

      // 3D Game Agents
      case 'game3d-unity-build':
        return new UnityBuildAgent(config?.platform);
      case 'game3d-unreal-build':
        return new UnrealBuildAgent(config?.platform, config?.configuration);
      case 'game3d-threejs-build':
        return new ThreeJSBuildAgent();
      case 'game3d-godot-build':
        return new GodotBuildAgent(config?.platform);

      // Program Build Agents
      case 'program-cmake-build':
        return new CMakeBuildAgent(config?.buildType);
      case 'program-make-build':
        return new MakeBuildAgent();
      case 'program-rust-build':
        return new RustBuildAgent(config?.releaseMode);
      case 'program-go-build':
        return new GoBuildAgent(config?.outputName);
      case 'program-maven-build':
        return new MavenBuildAgent(config?.skipTests);
      case 'program-gradle-build':
        return new GradleBuildAgent(config?.tasks);

      // Shared Agents
      case 'shared-asset-processing':
        return new AssetProcessingAgent(config);
      case 'shared-dependency-resolution':
        return new DependencyResolutionAgent();
      case 'test-unit':
        return new UnitTestAgent();
      case 'test-build-validation':
        return new BuildValidationAgent();
      case 'test-security-scan':
        return new SecurityScanAgent();

      default:
        throw new Error(`Unknown agent type: ${type}`);
    }
  }
}

/**
 * CLI Main Function
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  const logger = new ConsoleLogger();

  if (!command || command === 'help' || command === '--help' || command === '-h') {
    printHelp();
    process.exit(0);
  }

  if (command === 'version' || command === '--version' || command === '-v') {
    console.log('Agent Build System v1.0.0');
    process.exit(0);
  }

  if (command === 'init') {
    await initProject(args[1], logger);
    process.exit(0);
  }

  if (command === 'build') {
    const configPath = args[1];
    const projectRoot = args[2] || process.cwd();
    await runBuild(configPath, projectRoot, logger);
    process.exit(0);
  }

  logger.error(`Unknown command: ${command}`);
  printHelp();
  process.exit(1);
}

/**
 * Print help message
 */
function printHelp() {
  console.log(`
Agent Build System - Complex build automation with intelligent agents

USAGE:
  agent-build <command> [options]

COMMANDS:
  build <config> [project-root]   Run build with specified configuration
  init <type>                     Initialize build config for project type
  help                            Show this help message
  version                         Show version information

PROJECT TYPES (for init):
  webapp                          Web application (Next.js, React, etc.)
  game3d                          3D game (Unity, Unreal, Three.js, etc.)
  program                         Compiled program (C/C++, Rust, Go, etc.)

EXAMPLES:
  agent-build build build-config.json
  agent-build build build-config.yaml /path/to/project
  agent-build init webapp
  agent-build init game3d
  agent-build init program

CONFIGURATION:
  Place a build-config.json or build-config.yaml in your project root.
  Use 'agent-build init <type>' to generate a default configuration.

For more information, visit: https://github.com/yourusername/agent-build-system
  `);
}

/**
 * Initialize project with default configuration
 */
async function initProject(type: string, logger: Logger) {
  if (!type || !['webapp', 'game3d', 'program'].includes(type)) {
    logger.error('Invalid project type. Must be: webapp, game3d, or program');
    process.exit(1);
  }

  const config = ConfigLoader.createDefaultConfig(type as any);
  const configPath = resolve(process.cwd(), 'build-config.json');

  if (existsSync(configPath)) {
    logger.error('build-config.json already exists in current directory');
    process.exit(1);
  }

  const fs = require('fs');
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

  logger.info(`Created ${type} build configuration at ${configPath}`);
  logger.info('You can now run: agent-build build build-config.json');
}

/**
 * Run build with configuration
 */
async function runBuild(configPath: string | undefined, projectRoot: string, logger: Logger) {
  try {
    logger.info('Agent Build System v1.0.0');
    logger.info(`Project root: ${projectRoot}`);

    // Load configuration
    let config: BuildConfig;

    if (configPath) {
      const fullConfigPath = resolve(projectRoot, configPath);
      logger.info(`Loading configuration from: ${fullConfigPath}`);
      config = ConfigLoader.loadFromFile(fullConfigPath);
    } else {
      logger.info('Searching for build configuration in project root...');
      config = ConfigLoader.loadFromProject(projectRoot);
    }

    logger.info(`Build configuration: ${config.name} (${config.type})`);
    logger.info(`Agents to run: ${config.agents.filter(a => a.enabled).length}`);

    // Create orchestrator
    const orchestrator = new BuildOrchestrator(
      {
        projectRoot,
        buildDir: config.buildDir,
        tempDir: config.tempDir,
        parallelism: config.parallelism,
        continueOnError: config.continueOnError,
        config: config.global,
      },
      logger
    );

    // Create and register agents
    for (const agentConfig of config.agents) {
      if (!agentConfig.enabled) {
        logger.info(`Skipping disabled agent: ${agentConfig.id}`);
        continue;
      }

      try {
        const agent = AgentFactory.createAgent(agentConfig.type, agentConfig.config);

        // Override agent ID if specified
        if (agentConfig.id !== agent.id) {
          (agent as any).id = agentConfig.id;
        }

        // Set priority if specified
        if (agentConfig.priority) {
          const priorityMap = {
            critical: 0,
            high: 1,
            normal: 2,
            low: 3,
          };
          agent.setPriority(priorityMap[agentConfig.priority]);
        }

        // Add dependencies
        if (agentConfig.dependencies) {
          for (const dep of agentConfig.dependencies) {
            agent.addDependency(dep, true);
          }
        }

        orchestrator.registerAgent(agent);
      } catch (error) {
        logger.error(`Failed to create agent ${agentConfig.id}: ${error}`);
        process.exit(1);
      }
    }

    // Execute build
    logger.info('');
    logger.info('='.repeat(60));
    logger.info('Starting build...');
    logger.info('='.repeat(60));
    logger.info('');

    const startTime = Date.now();
    const result = await orchestrator.execute();
    const totalTime = Date.now() - startTime;

    // Print results
    logger.info('');
    logger.info('='.repeat(60));
    logger.info('Build Summary');
    logger.info('='.repeat(60));
    logger.info(`Status: ${result.success ? 'SUCCESS' : 'FAILED'}`);
    logger.info(`Total time: ${totalTime}ms`);
    logger.info(`Agents executed: ${result.agentResults.size}`);
    logger.info(`Failed agents: ${result.failedAgents.length}`);
    logger.info(`Skipped agents: ${result.skippedAgents.length}`);

    // Print agent results
    logger.info('');
    logger.info('Agent Results:');
    for (const [agentId, agentResult] of result.agentResults) {
      const status = agentResult.success ? '✓' : '✗';
      const duration = agentResult.duration ? `(${agentResult.duration}ms)` : '';
      logger.info(`  ${status} ${agentId} ${duration}`);

      if (agentResult.warnings && agentResult.warnings.length > 0) {
        for (const warning of agentResult.warnings) {
          logger.warn(`    ⚠ ${warning}`);
        }
      }

      if (agentResult.errors && agentResult.errors.length > 0) {
        for (const error of agentResult.errors) {
          logger.error(`    ✗ ${error}`);
        }
      }
    }

    logger.info('');
    logger.info('='.repeat(60));

    if (!result.success) {
      process.exit(1);
    }
  } catch (error) {
    logger.error(`Build failed: ${error}`);
    process.exit(1);
  }
}

// Run CLI
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
