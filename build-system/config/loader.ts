/**
 * Build Configuration System
 * Loads and validates build configurations from YAML/JSON files
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { parse as parseYaml } from 'yaml';

export interface BuildAgentConfig {
  id: string;
  type: string;
  enabled?: boolean;
  priority?: 'critical' | 'high' | 'normal' | 'low';
  config?: Record<string, any>;
  dependencies?: string[];
}

export interface BuildConfig {
  name: string;
  version?: string;
  type: 'webapp' | 'game3d' | 'program' | 'mixed';
  buildDir?: string;
  tempDir?: string;
  parallelism?: number;
  continueOnError?: boolean;
  agents: BuildAgentConfig[];
  global?: Record<string, any>;
}

/**
 * Configuration Loader
 * Loads build configuration from files
 */
export class ConfigLoader {
  /**
   * Load configuration from file
   */
  public static loadFromFile(filePath: string): BuildConfig {
    if (!existsSync(filePath)) {
      throw new Error(`Configuration file not found: ${filePath}`);
    }

    const content = readFileSync(filePath, 'utf-8');
    const ext = filePath.split('.').pop()?.toLowerCase();

    let config: BuildConfig;

    if (ext === 'json') {
      config = JSON.parse(content);
    } else if (ext === 'yaml' || ext === 'yml') {
      config = parseYaml(content);
    } else {
      throw new Error(`Unsupported configuration format: ${ext}`);
    }

    return this.validateConfig(config);
  }

  /**
   * Load configuration from project root
   * Searches for build-config.json, build-config.yaml, or build-config.yml
   */
  public static loadFromProject(projectRoot: string): BuildConfig {
    const configFiles = [
      'build-config.json',
      'build-config.yaml',
      'build-config.yml',
      '.build.json',
      '.build.yaml',
      '.build.yml',
    ];

    for (const file of configFiles) {
      const filePath = join(projectRoot, file);
      if (existsSync(filePath)) {
        return this.loadFromFile(filePath);
      }
    }

    throw new Error('No build configuration file found in project root');
  }

  /**
   * Validate configuration
   */
  private static validateConfig(config: BuildConfig): BuildConfig {
    if (!config.name) {
      throw new Error('Configuration must have a name');
    }

    if (!config.type) {
      throw new Error('Configuration must have a type');
    }

    if (!['webapp', 'game3d', 'program', 'mixed'].includes(config.type)) {
      throw new Error(`Invalid configuration type: ${config.type}`);
    }

    if (!config.agents || !Array.isArray(config.agents)) {
      throw new Error('Configuration must have an agents array');
    }

    // Validate each agent config
    for (const agent of config.agents) {
      if (!agent.id) {
        throw new Error('Agent configuration must have an id');
      }

      if (!agent.type) {
        throw new Error(`Agent ${agent.id} must have a type`);
      }

      // Set defaults
      if (agent.enabled === undefined) {
        agent.enabled = true;
      }

      if (!agent.config) {
        agent.config = {};
      }

      if (!agent.dependencies) {
        agent.dependencies = [];
      }
    }

    // Set defaults for build config
    if (!config.parallelism) {
      config.parallelism = 4;
    }

    if (config.continueOnError === undefined) {
      config.continueOnError = false;
    }

    if (!config.global) {
      config.global = {};
    }

    return config;
  }

  /**
   * Create default configuration for a project type
   */
  public static createDefaultConfig(
    projectType: 'webapp' | 'game3d' | 'program'
  ): BuildConfig {
    const configs: Record<string, BuildConfig> = {
      webapp: {
        name: 'Web Application Build',
        type: 'webapp',
        agents: [
          {
            id: 'deps',
            type: 'webapp-deps-install',
            priority: 'critical',
          },
          {
            id: 'lint',
            type: 'webapp-lint',
            dependencies: ['deps'],
          },
          {
            id: 'typescript',
            type: 'webapp-typescript-build',
            dependencies: ['deps'],
          },
          {
            id: 'build',
            type: 'webapp-nextjs-build',
            priority: 'high',
            dependencies: ['deps', 'typescript'],
          },
          {
            id: 'test',
            type: 'webapp-test',
            dependencies: ['deps'],
          },
        ],
      },
      game3d: {
        name: '3D Game Build',
        type: 'game3d',
        agents: [
          {
            id: 'deps',
            type: 'shared-dependency-resolution',
            priority: 'critical',
          },
          {
            id: 'assets',
            type: 'shared-asset-processing',
            config: {
              textures: {
                compress: true,
                format: 'webp',
                quality: 85,
              },
              models: {
                optimize: true,
                compression: 'draco',
              },
            },
          },
          {
            id: 'build',
            type: 'game3d-unity-build',
            priority: 'high',
            dependencies: ['deps', 'assets'],
            config: {
              platform: 'Windows',
            },
          },
        ],
      },
      program: {
        name: 'Program Build',
        type: 'program',
        agents: [
          {
            id: 'deps',
            type: 'shared-dependency-resolution',
            priority: 'critical',
          },
          {
            id: 'build',
            type: 'program-cmake-build',
            priority: 'high',
            dependencies: ['deps'],
            config: {
              buildType: 'Release',
              jobs: 4,
            },
          },
        ],
      },
    };

    return configs[projectType];
  }
}

// Simple YAML parser (for environments without yaml library)
function parse(content: string): any {
  // This is a very basic YAML parser, you should use a proper library like 'yaml' in production
  try {
    // Try to parse as JSON first
    return JSON.parse(content);
  } catch {
    // Fallback to very basic YAML parsing (not production-ready)
    const lines = content.split('\n');
    const result: any = {};
    let currentKey = '';
    let currentArray: any[] = [];
    let inArray = false;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      if (trimmed.endsWith(':')) {
        currentKey = trimmed.slice(0, -1);
        result[currentKey] = {};
      } else if (trimmed.startsWith('- ')) {
        if (!inArray) {
          inArray = true;
          currentArray = [];
        }
        currentArray.push(trimmed.slice(2));
        result[currentKey] = currentArray;
      } else {
        const [key, ...valueParts] = trimmed.split(':');
        const value = valueParts.join(':').trim();
        result[key.trim()] = value;
        inArray = false;
      }
    }

    return result;
  }
}
