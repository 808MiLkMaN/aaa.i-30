/**
 * 3D Game Build Agents
 * Specialized agents for building 3D games (Unity, Unreal, Three.js, etc.)
 */

import { BaseAgent, AgentContext, AgentResult, AgentPriority } from '../../core/agent';
import { execSync, exec } from 'child_process';
import { existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Unity Build Agent
 * Builds Unity game projects
 */
export class UnityBuildAgent extends BaseAgent {
  private unityPath?: string;
  private platform: 'Windows' | 'macOS' | 'Linux' | 'iOS' | 'Android' | 'WebGL' = 'Windows';

  constructor(platform?: 'Windows' | 'macOS' | 'Linux' | 'iOS' | 'Android' | 'WebGL') {
    super(
      'game3d-unity-build',
      'Unity Build',
      'Builds Unity game project for specified platform'
    );
    if (platform) {
      this.platform = platform;
    }
    this.setPriority(AgentPriority.HIGH);
  }

  protected async onInitialize(context: AgentContext): Promise<void> {
    // Detect Unity installation
    this.unityPath = this.findUnityPath();
    if (this.unityPath) {
      context.logger.info(`Found Unity at: ${this.unityPath}`);
    }

    // Get platform from config if specified
    if (context.config.platform) {
      this.platform = context.config.platform;
    }

    context.sharedData.set('unityPlatform', this.platform);
  }

  private findUnityPath(): string | undefined {
    const commonPaths = [
      '/Applications/Unity/Hub/Editor',
      'C:\\Program Files\\Unity\\Hub\\Editor',
      '/opt/Unity/Editor',
    ];

    for (const basePath of commonPaths) {
      if (existsSync(basePath)) {
        const versions = readdirSync(basePath);
        if (versions.length > 0) {
          return join(basePath, versions[0], 'Editor', 'Unity');
        }
      }
    }

    return undefined;
  }

  protected async onExecute(context: AgentContext): Promise<AgentResult> {
    try {
      if (!this.unityPath) {
        return {
          success: false,
          message: 'Unity installation not found',
          errors: ['Please install Unity or specify Unity path in config'],
        };
      }

      const buildPath = join(context.buildDir, 'unity', this.platform);
      const projectPath = context.projectRoot;

      context.logger.info(`Building Unity project for ${this.platform}...`);
      const startTime = Date.now();

      const buildCmd = `"${this.unityPath}" -quit -batchmode -projectPath "${projectPath}" -buildTarget ${this.platform} -buildPath "${buildPath}" -executeMethod BuildScript.Build -logFile -`;

      execSync(buildCmd, {
        cwd: context.projectRoot,
        stdio: 'inherit',
        encoding: 'utf-8',
      });

      const buildTime = Date.now() - startTime;

      return {
        success: true,
        message: `Unity build completed for ${this.platform} in ${buildTime}ms`,
        data: { platform: this.platform, buildPath },
        artifacts: [buildPath],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        message: `Unity build failed for ${this.platform}`,
        errors: [errorMessage],
      };
    }
  }

  protected async onValidate(context: AgentContext): Promise<{
    valid: boolean;
    reason?: string;
  }> {
    const assetsPath = join(context.projectRoot, 'Assets');
    const projectSettingsPath = join(context.projectRoot, 'ProjectSettings');

    if (!existsSync(assetsPath) || !existsSync(projectSettingsPath)) {
      return { valid: false, reason: 'Not a valid Unity project' };
    }

    return { valid: true };
  }

  protected async onCleanup(context: AgentContext): Promise<void> {
    // No cleanup needed
  }
}

/**
 * Unreal Engine Build Agent
 * Builds Unreal Engine game projects
 */
export class UnrealBuildAgent extends BaseAgent {
  private platform: 'Win64' | 'Mac' | 'Linux' | 'IOS' | 'Android' = 'Win64';
  private configuration: 'Development' | 'Shipping' | 'Debug' = 'Development';

  constructor(
    platform?: 'Win64' | 'Mac' | 'Linux' | 'IOS' | 'Android',
    configuration?: 'Development' | 'Shipping' | 'Debug'
  ) {
    super(
      'game3d-unreal-build',
      'Unreal Engine Build',
      'Builds Unreal Engine game project'
    );
    if (platform) this.platform = platform;
    if (configuration) this.configuration = configuration;
    this.setPriority(AgentPriority.HIGH);
  }

  protected async onInitialize(context: AgentContext): Promise<void> {
    if (context.config.platform) {
      this.platform = context.config.platform;
    }
    if (context.config.configuration) {
      this.configuration = context.config.configuration;
    }

    context.sharedData.set('unrealPlatform', this.platform);
    context.sharedData.set('unrealConfiguration', this.configuration);
  }

  protected async onExecute(context: AgentContext): Promise<AgentResult> {
    try {
      // Find .uproject file
      const uprojectFiles = readdirSync(context.projectRoot).filter(f =>
        f.endsWith('.uproject')
      );

      if (uprojectFiles.length === 0) {
        return {
          success: false,
          message: 'No .uproject file found',
          errors: ['Unreal project file not found'],
        };
      }

      const projectFile = join(context.projectRoot, uprojectFiles[0]);
      const buildPath = join(context.buildDir, 'unreal', this.platform);

      context.logger.info(
        `Building Unreal project for ${this.platform} (${this.configuration})...`
      );
      const startTime = Date.now();

      // Use Unreal Automation Tool (UAT)
      const uatCmd = process.platform === 'win32'
        ? 'RunUAT.bat'
        : 'RunUAT.sh';

      const buildCmd = `${uatCmd} BuildCookRun -project="${projectFile}" -platform=${this.platform} -configuration=${this.configuration} -build -cook -stage -archive -archivedirectory="${buildPath}"`;

      execSync(buildCmd, {
        cwd: context.projectRoot,
        stdio: 'inherit',
        encoding: 'utf-8',
      });

      const buildTime = Date.now() - startTime;

      return {
        success: true,
        message: `Unreal build completed for ${this.platform} in ${buildTime}ms`,
        data: { platform: this.platform, configuration: this.configuration },
        artifacts: [buildPath],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        message: `Unreal build failed for ${this.platform}`,
        errors: [errorMessage],
      };
    }
  }

  protected async onValidate(context: AgentContext): Promise<{
    valid: boolean;
    reason?: string;
  }> {
    const uprojectFiles = readdirSync(context.projectRoot).filter(f =>
      f.endsWith('.uproject')
    );

    if (uprojectFiles.length === 0) {
      return { valid: false, reason: 'Not a valid Unreal Engine project' };
    }

    return { valid: true };
  }

  protected async onCleanup(context: AgentContext): Promise<void> {
    // No cleanup needed
  }
}

/**
 * Three.js Build Agent
 * Builds Three.js web-based 3D applications
 */
export class ThreeJSBuildAgent extends BaseAgent {
  constructor() {
    super(
      'game3d-threejs-build',
      'Three.js Build',
      'Builds Three.js 3D web application'
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

      context.logger.info(`Building Three.js application...`);
      const startTime = Date.now();

      execSync(buildCmd, {
        cwd: context.projectRoot,
        stdio: 'inherit',
        encoding: 'utf-8',
      });

      const buildTime = Date.now() - startTime;
      const distPath = join(context.projectRoot, 'dist');

      return {
        success: true,
        message: `Three.js build completed in ${buildTime}ms`,
        data: { buildTime },
        artifacts: [distPath],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        message: 'Three.js build failed',
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

      if (!packageJson.dependencies?.three && !packageJson.devDependencies?.three) {
        return { valid: false, reason: 'Three.js not found in dependencies' };
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, reason: 'Could not validate Three.js project' };
    }
  }

  protected async onCleanup(context: AgentContext): Promise<void> {
    // No cleanup needed
  }
}

/**
 * Godot Build Agent
 * Builds Godot game projects
 */
export class GodotBuildAgent extends BaseAgent {
  private godotPath?: string;
  private platform: 'Windows' | 'Linux' | 'macOS' | 'Android' | 'iOS' | 'HTML5' = 'Windows';

  constructor(platform?: 'Windows' | 'Linux' | 'macOS' | 'Android' | 'iOS' | 'HTML5') {
    super(
      'game3d-godot-build',
      'Godot Build',
      'Builds Godot game project'
    );
    if (platform) this.platform = platform;
    this.setPriority(AgentPriority.HIGH);
  }

  protected async onInitialize(context: AgentContext): Promise<void> {
    // Try to find Godot executable
    this.godotPath = context.config.godotPath || 'godot';

    if (context.config.platform) {
      this.platform = context.config.platform;
    }

    context.sharedData.set('godotPlatform', this.platform);
  }

  protected async onExecute(context: AgentContext): Promise<AgentResult> {
    try {
      const projectFile = join(context.projectRoot, 'project.godot');

      if (!existsSync(projectFile)) {
        return {
          success: false,
          message: 'project.godot not found',
          errors: ['Not a valid Godot project'],
        };
      }

      const buildPath = join(context.buildDir, 'godot', this.platform);
      const exportPreset = this.platform;

      context.logger.info(`Building Godot project for ${this.platform}...`);
      const startTime = Date.now();

      const exportCmd = `${this.godotPath} --export "${exportPreset}" "${buildPath}"`;

      execSync(exportCmd, {
        cwd: context.projectRoot,
        stdio: 'inherit',
        encoding: 'utf-8',
      });

      const buildTime = Date.now() - startTime;

      return {
        success: true,
        message: `Godot build completed for ${this.platform} in ${buildTime}ms`,
        data: { platform: this.platform },
        artifacts: [buildPath],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        message: `Godot build failed for ${this.platform}`,
        errors: [errorMessage],
      };
    }
  }

  protected async onValidate(context: AgentContext): Promise<{
    valid: boolean;
    reason?: string;
  }> {
    const projectFile = join(context.projectRoot, 'project.godot');
    if (!existsSync(projectFile)) {
      return { valid: false, reason: 'Not a valid Godot project' };
    }
    return { valid: true };
  }

  protected async onCleanup(context: AgentContext): Promise<void> {
    // No cleanup needed
  }
}
