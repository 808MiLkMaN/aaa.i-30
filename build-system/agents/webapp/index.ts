/**
 * Web Application Build Agents
 * Specialized agents for building web applications (Next.js, React, Vue, etc.)
 */

import { BaseAgent, AgentContext, AgentResult, AgentPriority } from '../../core/agent';
import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

/**
 * Dependency Installation Agent
 * Installs project dependencies using npm, pnpm, or yarn
 */
export class DependencyInstallAgent extends BaseAgent {
  private packageManager: 'npm' | 'pnpm' | 'yarn' | 'bun' = 'npm';

  constructor() {
    super(
      'webapp-deps-install',
      'Dependency Installation',
      'Installs project dependencies using the detected package manager'
    );
    this.setPriority(AgentPriority.CRITICAL);
  }

  protected async onInitialize(context: AgentContext): Promise<void> {
    // Detect package manager
    if (existsSync(join(context.projectRoot, 'pnpm-lock.yaml'))) {
      this.packageManager = 'pnpm';
    } else if (existsSync(join(context.projectRoot, 'yarn.lock'))) {
      this.packageManager = 'yarn';
    } else if (existsSync(join(context.projectRoot, 'bun.lockb'))) {
      this.packageManager = 'bun';
    } else {
      this.packageManager = 'npm';
    }

    context.logger.info(`Detected package manager: ${this.packageManager}`);
    context.sharedData.set('packageManager', this.packageManager);
  }

  protected async onExecute(context: AgentContext): Promise<AgentResult> {
    try {
      const installCmd = `${this.packageManager} install`;
      context.logger.info(`Running: ${installCmd}`);

      execSync(installCmd, {
        cwd: context.projectRoot,
        stdio: 'inherit',
        encoding: 'utf-8',
      });

      return {
        success: true,
        message: `Dependencies installed successfully with ${this.packageManager}`,
        data: { packageManager: this.packageManager },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        message: 'Failed to install dependencies',
        errors: [errorMessage],
      };
    }
  }

  protected async onValidate(context: AgentContext): Promise<{
    valid: boolean;
    reason?: string;
  }> {
    const packageJsonPath = join(context.projectRoot, 'package.json');
    if (!existsSync(packageJsonPath)) {
      return { valid: false, reason: 'package.json not found' };
    }
    return { valid: true };
  }

  protected async onCleanup(context: AgentContext): Promise<void> {
    // No cleanup needed
  }
}

/**
 * TypeScript Compilation Agent
 * Compiles TypeScript code
 */
export class TypeScriptBuildAgent extends BaseAgent {
  constructor() {
    super(
      'webapp-typescript-build',
      'TypeScript Compilation',
      'Compiles TypeScript code using tsc'
    );
    this.setPriority(AgentPriority.HIGH);
  }

  protected async onInitialize(context: AgentContext): Promise<void> {
    this.addDependency('webapp-deps-install', true);
  }

  protected async onExecute(context: AgentContext): Promise<AgentResult> {
    try {
      const packageManager = context.sharedData.get('packageManager') || 'npm';
      const tscCmd = `${packageManager} run tsc --noEmit`;

      context.logger.info(`Running TypeScript compiler...`);
      execSync(tscCmd, {
        cwd: context.projectRoot,
        stdio: 'inherit',
        encoding: 'utf-8',
      });

      return {
        success: true,
        message: 'TypeScript compilation successful',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        message: 'TypeScript compilation failed',
        errors: [errorMessage],
      };
    }
  }

  protected async onValidate(context: AgentContext): Promise<{
    valid: boolean;
    reason?: string;
  }> {
    const tsconfigPath = join(context.projectRoot, 'tsconfig.json');
    if (!existsSync(tsconfigPath)) {
      return { valid: false, reason: 'tsconfig.json not found' };
    }
    return { valid: true };
  }

  protected async onCleanup(context: AgentContext): Promise<void> {
    // No cleanup needed
  }
}

/**
 * Next.js Build Agent
 * Builds Next.js applications
 */
export class NextJSBuildAgent extends BaseAgent {
  constructor() {
    super(
      'webapp-nextjs-build',
      'Next.js Build',
      'Builds Next.js application for production'
    );
    this.setPriority(AgentPriority.HIGH);
  }

  protected async onInitialize(context: AgentContext): Promise<void> {
    this.addDependency('webapp-deps-install', true);
  }

  protected async onExecute(context: AgentContext): Promise<AgentResult> {
    try {
      const packageManager = context.sharedData.get('packageManager') || 'npm';
      const buildCmd = `${packageManager} run build`;

      context.logger.info(`Building Next.js application...`);
      const startTime = Date.now();

      execSync(buildCmd, {
        cwd: context.projectRoot,
        stdio: 'inherit',
        encoding: 'utf-8',
      });

      const buildTime = Date.now() - startTime;

      return {
        success: true,
        message: `Next.js build completed in ${buildTime}ms`,
        data: { buildTime },
        artifacts: [join(context.projectRoot, '.next')],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        message: 'Next.js build failed',
        errors: [errorMessage],
      };
    }
  }

  protected async onValidate(context: AgentContext): Promise<{
    valid: boolean;
    reason?: string;
  }> {
    const nextConfigPath = join(context.projectRoot, 'next.config.ts');
    const nextConfigJsPath = join(context.projectRoot, 'next.config.js');
    const nextConfigMjsPath = join(context.projectRoot, 'next.config.mjs');

    if (
      !existsSync(nextConfigPath) &&
      !existsSync(nextConfigJsPath) &&
      !existsSync(nextConfigMjsPath)
    ) {
      return { valid: false, reason: 'Next.js config not found' };
    }
    return { valid: true };
  }

  protected async onCleanup(context: AgentContext): Promise<void> {
    // No cleanup needed
  }
}

/**
 * Lint Agent
 * Runs linting on the codebase
 */
export class LintAgent extends BaseAgent {
  constructor() {
    super(
      'webapp-lint',
      'Code Linting',
      'Runs linting checks on the codebase'
    );
    this.setPriority(AgentPriority.NORMAL);
  }

  protected async onInitialize(context: AgentContext): Promise<void> {
    this.addDependency('webapp-deps-install', true);
  }

  protected async onExecute(context: AgentContext): Promise<AgentResult> {
    try {
      const packageManager = context.sharedData.get('packageManager') || 'npm';
      const lintCmd = `${packageManager} run lint`;

      context.logger.info(`Running linter...`);
      execSync(lintCmd, {
        cwd: context.projectRoot,
        stdio: 'inherit',
        encoding: 'utf-8',
      });

      return {
        success: true,
        message: 'Linting passed',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        message: 'Linting failed',
        errors: [errorMessage],
      };
    }
  }

  protected async onValidate(context: AgentContext): Promise<{
    valid: boolean;
    reason?: string;
  }> {
    // Check if lint script exists in package.json
    try {
      const packageJsonPath = join(context.projectRoot, 'package.json');
      const packageJson = require(packageJsonPath);
      if (!packageJson.scripts?.lint) {
        return { valid: false, reason: 'No lint script found in package.json' };
      }
      return { valid: true };
    } catch (error) {
      return { valid: false, reason: 'Could not read package.json' };
    }
  }

  protected async onCleanup(context: AgentContext): Promise<void> {
    // No cleanup needed
  }
}

/**
 * Test Runner Agent
 * Runs tests for the web application
 */
export class TestRunnerAgent extends BaseAgent {
  constructor() {
    super(
      'webapp-test',
      'Test Runner',
      'Runs test suite for the web application'
    );
    this.setPriority(AgentPriority.NORMAL);
  }

  protected async onInitialize(context: AgentContext): Promise<void> {
    this.addDependency('webapp-deps-install', true);
  }

  protected async onExecute(context: AgentContext): Promise<AgentResult> {
    try {
      const packageManager = context.sharedData.get('packageManager') || 'npm';
      const testCmd = `${packageManager} run test`;

      context.logger.info(`Running tests...`);
      execSync(testCmd, {
        cwd: context.projectRoot,
        stdio: 'inherit',
        encoding: 'utf-8',
        env: { ...process.env, CI: 'true' },
      });

      return {
        success: true,
        message: 'All tests passed',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        message: 'Tests failed',
        errors: [errorMessage],
      };
    }
  }

  protected async onValidate(context: AgentContext): Promise<{
    valid: boolean;
    reason?: string;
  }> {
    try {
      const packageJsonPath = join(context.projectRoot, 'package.json');
      const packageJson = require(packageJsonPath);
      if (!packageJson.scripts?.test) {
        return { valid: false, reason: 'No test script found in package.json' };
      }
      return { valid: true };
    } catch (error) {
      return { valid: false, reason: 'Could not read package.json' };
    }
  }

  protected async onCleanup(context: AgentContext): Promise<void> {
    // No cleanup needed
  }
}
