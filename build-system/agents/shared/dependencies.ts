/**
 * Dependency Resolution Agent
 * Handles dependency resolution and verification for various project types
 */

import { BaseAgent, AgentContext, AgentResult, AgentPriority } from '../../core/agent';
import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

export interface DependencyInfo {
  name: string;
  version: string;
  type: 'runtime' | 'dev' | 'build';
  resolved: boolean;
  location?: string;
}

/**
 * Dependency Resolution Agent
 * Analyzes and resolves project dependencies
 */
export class DependencyResolutionAgent extends BaseAgent {
  private dependencies: DependencyInfo[] = [];
  private missingDependencies: string[] = [];

  constructor() {
    super(
      'shared-dependency-resolution',
      'Dependency Resolution',
      'Analyzes and verifies project dependencies'
    );
    this.setPriority(AgentPriority.CRITICAL);
  }

  protected async onInitialize(context: AgentContext): Promise<void> {
    // No initialization needed
  }

  protected async onExecute(context: AgentContext): Promise<AgentResult> {
    try {
      const startTime = Date.now();

      context.logger.info('Analyzing project dependencies...');

      // Detect project type and analyze dependencies
      if (this.isNodeProject(context.projectRoot)) {
        await this.analyzeNodeDependencies(context);
      } else if (this.isPythonProject(context.projectRoot)) {
        await this.analyzePythonDependencies(context);
      } else if (this.isRustProject(context.projectRoot)) {
        await this.analyzeRustDependencies(context);
      } else if (this.isGoProject(context.projectRoot)) {
        await this.analyzeGoDependencies(context);
      } else if (this.isMavenProject(context.projectRoot)) {
        await this.analyzeMavenDependencies(context);
      } else if (this.isGradleProject(context.projectRoot)) {
        await this.analyzeGradleDependencies(context);
      } else {
        context.logger.warn('Unknown project type, skipping dependency analysis');
        return {
          success: true,
          message: 'Unknown project type',
          warnings: ['Could not determine project type'],
        };
      }

      const buildTime = Date.now() - startTime;

      // Store dependency info in shared data
      context.sharedData.set('dependencies', this.dependencies);
      context.sharedData.set('missingDependencies', this.missingDependencies);

      if (this.missingDependencies.length > 0) {
        return {
          success: false,
          message: `Found ${this.missingDependencies.length} missing dependencies`,
          errors: this.missingDependencies.map(dep => `Missing: ${dep}`),
          data: {
            total: this.dependencies.length,
            missing: this.missingDependencies.length,
          },
        };
      }

      return {
        success: true,
        message: `Analyzed ${this.dependencies.length} dependencies in ${buildTime}ms`,
        data: {
          dependencies: this.dependencies,
          total: this.dependencies.length,
          runtime: this.dependencies.filter(d => d.type === 'runtime').length,
          dev: this.dependencies.filter(d => d.type === 'dev').length,
          build: this.dependencies.filter(d => d.type === 'build').length,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        message: 'Dependency analysis failed',
        errors: [errorMessage],
      };
    }
  }

  private isNodeProject(root: string): boolean {
    return existsSync(join(root, 'package.json'));
  }

  private isPythonProject(root: string): boolean {
    return (
      existsSync(join(root, 'requirements.txt')) ||
      existsSync(join(root, 'setup.py')) ||
      existsSync(join(root, 'pyproject.toml'))
    );
  }

  private isRustProject(root: string): boolean {
    return existsSync(join(root, 'Cargo.toml'));
  }

  private isGoProject(root: string): boolean {
    return existsSync(join(root, 'go.mod'));
  }

  private isMavenProject(root: string): boolean {
    return existsSync(join(root, 'pom.xml'));
  }

  private isGradleProject(root: string): boolean {
    return (
      existsSync(join(root, 'build.gradle')) ||
      existsSync(join(root, 'build.gradle.kts'))
    );
  }

  private async analyzeNodeDependencies(context: AgentContext): Promise<void> {
    try {
      const packageJsonPath = join(context.projectRoot, 'package.json');
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

      // Parse dependencies
      const deps = packageJson.dependencies || {};
      const devDeps = packageJson.devDependencies || {};

      for (const [name, version] of Object.entries(deps)) {
        this.dependencies.push({
          name,
          version: version as string,
          type: 'runtime',
          resolved: this.checkNodeModuleExists(context.projectRoot, name),
        });
      }

      for (const [name, version] of Object.entries(devDeps)) {
        this.dependencies.push({
          name,
          version: version as string,
          type: 'dev',
          resolved: this.checkNodeModuleExists(context.projectRoot, name),
        });
      }

      // Check for missing dependencies
      this.missingDependencies = this.dependencies
        .filter(d => !d.resolved)
        .map(d => d.name);
    } catch (error) {
      context.logger.error('Failed to analyze Node.js dependencies');
    }
  }

  private checkNodeModuleExists(root: string, moduleName: string): boolean {
    return existsSync(join(root, 'node_modules', moduleName));
  }

  private async analyzePythonDependencies(context: AgentContext): Promise<void> {
    try {
      const reqPath = join(context.projectRoot, 'requirements.txt');

      if (existsSync(reqPath)) {
        const content = readFileSync(reqPath, 'utf-8');
        const lines = content.split('\n').filter(l => l.trim() && !l.startsWith('#'));

        for (const line of lines) {
          const [name, version] = line.split('==');
          this.dependencies.push({
            name: name.trim(),
            version: version?.trim() || 'latest',
            type: 'runtime',
            resolved: this.checkPythonPackageExists(name.trim()),
          });
        }

        this.missingDependencies = this.dependencies
          .filter(d => !d.resolved)
          .map(d => d.name);
      }
    } catch (error) {
      context.logger.error('Failed to analyze Python dependencies');
    }
  }

  private checkPythonPackageExists(packageName: string): boolean {
    try {
      execSync(`python -c "import ${packageName}"`, { stdio: 'pipe' });
      return true;
    } catch {
      return false;
    }
  }

  private async analyzeRustDependencies(context: AgentContext): Promise<void> {
    try {
      const cargoTomlPath = join(context.projectRoot, 'Cargo.toml');

      if (existsSync(cargoTomlPath)) {
        const content = readFileSync(cargoTomlPath, 'utf-8');

        // Simple TOML parsing for dependencies section
        const depsMatch = content.match(/\[dependencies\]([\s\S]*?)(\[|$)/);
        if (depsMatch) {
          const depsSection = depsMatch[1];
          const depLines = depsSection.split('\n').filter(l => l.includes('='));

          for (const line of depLines) {
            const [name, version] = line.split('=').map(s => s.trim());
            if (name && version) {
              this.dependencies.push({
                name,
                version: version.replace(/['"]/g, ''),
                type: 'runtime',
                resolved: true, // Cargo handles resolution
              });
            }
          }
        }
      }
    } catch (error) {
      context.logger.error('Failed to analyze Rust dependencies');
    }
  }

  private async analyzeGoDependencies(context: AgentContext): Promise<void> {
    try {
      const goModPath = join(context.projectRoot, 'go.mod');

      if (existsSync(goModPath)) {
        const content = readFileSync(goModPath, 'utf-8');
        const lines = content.split('\n');

        let inRequireBlock = false;

        for (const line of lines) {
          if (line.trim().startsWith('require (')) {
            inRequireBlock = true;
            continue;
          }

          if (inRequireBlock && line.trim() === ')') {
            inRequireBlock = false;
            continue;
          }

          if (inRequireBlock || line.trim().startsWith('require ')) {
            const match = line.match(/([^\s]+)\s+v?([^\s]+)/);
            if (match) {
              this.dependencies.push({
                name: match[1],
                version: match[2],
                type: 'runtime',
                resolved: true, // Go modules handle resolution
              });
            }
          }
        }
      }
    } catch (error) {
      context.logger.error('Failed to analyze Go dependencies');
    }
  }

  private async analyzeMavenDependencies(context: AgentContext): Promise<void> {
    try {
      context.logger.info('Analyzing Maven dependencies...');

      // Use mvn dependency:list to get dependencies
      const output = execSync('mvn dependency:list', {
        cwd: context.projectRoot,
        encoding: 'utf-8',
        stdio: 'pipe',
      });

      const lines = output.split('\n');
      for (const line of lines) {
        const match = line.match(/([^:]+):([^:]+):([^:]+):([^:]+):([^:]+)/);
        if (match) {
          this.dependencies.push({
            name: `${match[1]}:${match[2]}`,
            version: match[4],
            type: match[5] === 'test' ? 'dev' : 'runtime',
            resolved: true,
          });
        }
      }
    } catch (error) {
      context.logger.error('Failed to analyze Maven dependencies');
    }
  }

  private async analyzeGradleDependencies(context: AgentContext): Promise<void> {
    try {
      context.logger.info('Analyzing Gradle dependencies...');

      const gradleWrapper = existsSync(join(context.projectRoot, 'gradlew'))
        ? './gradlew'
        : 'gradle';

      // Use gradle dependencies to get dependency tree
      const output = execSync(`${gradleWrapper} dependencies --configuration runtimeClasspath`, {
        cwd: context.projectRoot,
        encoding: 'utf-8',
        stdio: 'pipe',
      });

      const lines = output.split('\n');
      for (const line of lines) {
        const match = line.match(/([^:]+):([^:]+):([^\s]+)/);
        if (match) {
          this.dependencies.push({
            name: `${match[1]}:${match[2]}`,
            version: match[3],
            type: 'runtime',
            resolved: true,
          });
        }
      }
    } catch (error) {
      context.logger.error('Failed to analyze Gradle dependencies');
    }
  }

  protected async onValidate(context: AgentContext): Promise<{
    valid: boolean;
    reason?: string;
  }> {
    // Always valid - will analyze whatever project type is detected
    return { valid: true };
  }

  protected async onCleanup(context: AgentContext): Promise<void> {
    this.dependencies = [];
    this.missingDependencies = [];
  }
}
