/**
 * Testing and Validation Agents
 * Agents for running tests and validating builds
 */

import { BaseAgent, AgentContext, AgentResult, AgentPriority } from '../../core/agent';
import { execSync } from 'child_process';
import { existsSync, statSync } from 'fs';
import { join } from 'path';

/**
 * Unit Test Runner Agent
 * Runs unit tests for the project
 */
export class UnitTestAgent extends BaseAgent {
  private framework?: string;

  constructor() {
    super(
      'test-unit',
      'Unit Tests',
      'Runs unit tests for the project'
    );
    this.setPriority(AgentPriority.NORMAL);
  }

  protected async onInitialize(context: AgentContext): Promise<void> {
    // Detect test framework
    this.framework = this.detectTestFramework(context.projectRoot);
    if (this.framework) {
      context.logger.info(`Detected test framework: ${this.framework}`);
    }
  }

  private detectTestFramework(root: string): string | undefined {
    const packageJsonPath = join(root, 'package.json');

    if (existsSync(packageJsonPath)) {
      try {
        const packageJson = require(packageJsonPath);
        const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

        if (deps.jest) return 'jest';
        if (deps.vitest) return 'vitest';
        if (deps.mocha) return 'mocha';
        if (deps.playwright) return 'playwright';
      } catch {}
    }

    // Check for other languages
    if (existsSync(join(root, 'Cargo.toml'))) return 'cargo-test';
    if (existsSync(join(root, 'go.mod'))) return 'go-test';
    if (existsSync(join(root, 'pom.xml'))) return 'maven-test';
    if (existsSync(join(root, 'build.gradle'))) return 'gradle-test';

    return undefined;
  }

  protected async onExecute(context: AgentContext): Promise<AgentResult> {
    try {
      if (!this.framework) {
        return {
          success: true,
          message: 'No test framework detected, skipping tests',
          warnings: ['No test framework found'],
        };
      }

      context.logger.info(`Running unit tests with ${this.framework}...`);
      const startTime = Date.now();

      let testCmd = '';

      switch (this.framework) {
        case 'jest':
          testCmd = 'npm run test';
          break;
        case 'vitest':
          testCmd = 'npm run test';
          break;
        case 'playwright':
          testCmd = 'npm run test';
          break;
        case 'cargo-test':
          testCmd = 'cargo test';
          break;
        case 'go-test':
          testCmd = 'go test ./...';
          break;
        case 'maven-test':
          testCmd = 'mvn test';
          break;
        case 'gradle-test':
          testCmd = './gradlew test';
          break;
        default:
          testCmd = 'npm test';
      }

      execSync(testCmd, {
        cwd: context.projectRoot,
        stdio: 'inherit',
        encoding: 'utf-8',
        env: { ...process.env, CI: 'true' },
      });

      const buildTime = Date.now() - startTime;

      return {
        success: true,
        message: `All unit tests passed in ${buildTime}ms`,
        data: { framework: this.framework, duration: buildTime },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        message: 'Unit tests failed',
        errors: [errorMessage],
      };
    }
  }

  protected async onValidate(context: AgentContext): Promise<{
    valid: boolean;
    reason?: string;
  }> {
    // Always valid - will skip if no tests found
    return { valid: true };
  }

  protected async onCleanup(context: AgentContext): Promise<void> {
    // No cleanup needed
  }
}

/**
 * Build Validation Agent
 * Validates that the build output is correct and complete
 */
export class BuildValidationAgent extends BaseAgent {
  constructor() {
    super(
      'test-build-validation',
      'Build Validation',
      'Validates build output and artifacts'
    );
    this.setPriority(AgentPriority.NORMAL);
  }

  protected async onInitialize(context: AgentContext): Promise<void> {
    // No initialization needed
  }

  protected async onExecute(context: AgentContext): Promise<AgentResult> {
    try {
      context.logger.info('Validating build output...');
      const startTime = Date.now();
      const warnings: string[] = [];
      const errors: string[] = [];

      // Check if build directory exists
      if (!existsSync(context.buildDir)) {
        errors.push('Build directory does not exist');
      } else {
        // Check build directory size
        const size = this.getDirectorySize(context.buildDir);
        context.logger.info(`Build output size: ${this.formatBytes(size)}`);

        if (size === 0) {
          warnings.push('Build directory is empty');
        }

        if (size > 1024 * 1024 * 1024) {
          // > 1GB
          warnings.push('Build output is very large (>1GB)');
        }
      }

      // Check for common build artifacts based on project type
      const expectedArtifacts = this.getExpectedArtifacts(context);
      for (const artifact of expectedArtifacts) {
        const artifactPath = join(context.projectRoot, artifact);
        if (!existsSync(artifactPath)) {
          warnings.push(`Expected artifact not found: ${artifact}`);
        }
      }

      const buildTime = Date.now() - startTime;

      if (errors.length > 0) {
        return {
          success: false,
          message: 'Build validation failed',
          errors,
          warnings: warnings.length > 0 ? warnings : undefined,
        };
      }

      return {
        success: true,
        message: `Build validation completed in ${buildTime}ms`,
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        message: 'Build validation failed',
        errors: [errorMessage],
      };
    }
  }

  private getDirectorySize(dir: string): number {
    let size = 0;

    try {
      const { readdirSync } = require('fs');
      const files = readdirSync(dir);

      for (const file of files) {
        const filePath = join(dir, file);
        const stat = statSync(filePath);

        if (stat.isDirectory()) {
          size += this.getDirectorySize(filePath);
        } else {
          size += stat.size;
        }
      }
    } catch {}

    return size;
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  private getExpectedArtifacts(context: AgentContext): string[] {
    const artifacts: string[] = [];

    // Check for Next.js
    if (existsSync(join(context.projectRoot, 'next.config.ts'))) {
      artifacts.push('.next');
    }

    // Check for Unity
    if (existsSync(join(context.projectRoot, 'Assets'))) {
      artifacts.push('Library');
    }

    // Check for Rust
    if (existsSync(join(context.projectRoot, 'Cargo.toml'))) {
      artifacts.push('target');
    }

    // Check for Go
    if (existsSync(join(context.projectRoot, 'go.mod'))) {
      artifacts.push('build');
    }

    return artifacts;
  }

  protected async onValidate(context: AgentContext): Promise<{
    valid: boolean;
    reason?: string;
  }> {
    return { valid: true };
  }

  protected async onCleanup(context: AgentContext): Promise<void> {
    // No cleanup needed
  }
}

/**
 * Security Scan Agent
 * Scans the build for security vulnerabilities
 */
export class SecurityScanAgent extends BaseAgent {
  constructor() {
    super(
      'test-security-scan',
      'Security Scan',
      'Scans for security vulnerabilities'
    );
    this.setPriority(AgentPriority.NORMAL);
  }

  protected async onInitialize(context: AgentContext): Promise<void> {
    // No initialization needed
  }

  protected async onExecute(context: AgentContext): Promise<AgentResult> {
    try {
      context.logger.info('Running security scan...');
      const startTime = Date.now();
      const warnings: string[] = [];

      // Check for npm audit if Node project
      if (existsSync(join(context.projectRoot, 'package.json'))) {
        try {
          execSync('npm audit --audit-level=high', {
            cwd: context.projectRoot,
            stdio: 'pipe',
            encoding: 'utf-8',
          });
        } catch (error) {
          warnings.push('npm audit found vulnerabilities');
        }
      }

      // Check for Cargo audit if Rust project
      if (existsSync(join(context.projectRoot, 'Cargo.toml'))) {
        try {
          execSync('cargo audit', {
            cwd: context.projectRoot,
            stdio: 'pipe',
            encoding: 'utf-8',
          });
        } catch (error) {
          warnings.push('cargo audit found vulnerabilities or is not installed');
        }
      }

      const buildTime = Date.now() - startTime;

      return {
        success: true,
        message: `Security scan completed in ${buildTime}ms`,
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        message: 'Security scan failed',
        errors: [errorMessage],
      };
    }
  }

  protected async onValidate(context: AgentContext): Promise<{
    valid: boolean;
    reason?: string;
  }> {
    return { valid: true };
  }

  protected async onCleanup(context: AgentContext): Promise<void> {
    // No cleanup needed
  }
}
