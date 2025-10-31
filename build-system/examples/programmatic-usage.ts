/**
 * Example: Programmatic Usage of Agent Build System
 * This example shows how to use the build system programmatically
 */

import { BuildOrchestrator } from '../core/orchestrator';
import { DependencyInstallAgent, NextJSBuildAgent, LintAgent } from '../agents/webapp';
import { DependencyResolutionAgent } from '../agents/shared/dependencies';
import { BuildValidationAgent } from '../agents/shared/testing';
import { Logger } from '../core/agent';

// Create a simple console logger
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

async function buildWebApp() {
  const logger = new ConsoleLogger();

  logger.info('Starting web application build...');

  // Create orchestrator
  const orchestrator = new BuildOrchestrator(
    {
      projectRoot: process.cwd(),
      buildDir: './build',
      tempDir: './.temp',
      parallelism: 4,
      continueOnError: false,
      config: {
        environment: 'production',
      },
    },
    logger
  );

  // Create agents
  const depsResolution = new DependencyResolutionAgent();
  const depsInstall = new DependencyInstallAgent();
  const lint = new LintAgent();
  const nextBuild = new NextJSBuildAgent();
  const validate = new BuildValidationAgent();

  // Set up dependencies
  depsInstall.addDependency(depsResolution.id, true);
  lint.addDependency(depsInstall.id, true);
  nextBuild.addDependency(depsInstall.id, true);
  nextBuild.addDependency(lint.id, false); // Non-critical dependency
  validate.addDependency(nextBuild.id, true);

  // Register agents
  orchestrator.registerAgents([
    depsResolution,
    depsInstall,
    lint,
    nextBuild,
    validate,
  ]);

  // Execute build
  const result = await orchestrator.execute();

  // Print results
  logger.info('');
  logger.info('='.repeat(60));
  logger.info('Build Summary');
  logger.info('='.repeat(60));
  logger.info(`Status: ${result.success ? 'SUCCESS' : 'FAILED'}`);
  logger.info(`Total time: ${result.totalDuration}ms`);
  logger.info(`Agents executed: ${result.agentResults.size}`);
  logger.info(`Failed agents: ${result.failedAgents.length}`);
  logger.info(`Skipped agents: ${result.skippedAgents.length}`);

  if (!result.success) {
    logger.error('Build failed!');
    process.exit(1);
  }

  logger.info('Build completed successfully!');
}

// Run the build
buildWebApp().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
