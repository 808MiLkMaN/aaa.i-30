# Agent-Based Build System

A powerful, extensible build automation system that uses intelligent agents to handle complex build situations for web applications, 3D games, and compiled programs.

## Overview

The Agent-Based Build System provides a flexible framework for orchestrating complex build pipelines through autonomous agents. Each agent handles a specific aspect of the build process (compilation, testing, asset processing, etc.) and can communicate with other agents to coordinate tasks.

## Features

- **Multi-Project Support**: Build web apps (Next.js, React), 3D games (Unity, Unreal, Three.js, Godot), and programs (C/C++, Rust, Go, Java)
- **Intelligent Orchestration**: Automatic dependency resolution and parallel execution
- **Extensible Architecture**: Easy to add custom agents for specific build requirements
- **Asset Processing**: Automatic optimization of 3D models, textures, audio, and video
- **Configuration-Driven**: YAML/JSON configuration files for reproducible builds
- **Error Recovery**: Continue-on-error support and detailed error reporting
- **Testing Integration**: Built-in support for unit tests, validation, and security scans

## Installation

```bash
npm install -g agent-build-system
# or
yarn global add agent-build-system
# or
pnpm add -g agent-build-system
```

## Quick Start

### 1. Initialize a Build Configuration

```bash
# For web applications
agent-build init webapp

# For 3D games
agent-build init game3d

# For compiled programs
agent-build init program
```

This creates a `build-config.json` in your project root.

### 2. Run the Build

```bash
agent-build build build-config.json
```

Or simply:

```bash
agent-build build
```

The system will automatically find the configuration file in your project root.

## Architecture

### Core Components

1. **BaseAgent**: Abstract base class for all agents
2. **BuildOrchestrator**: Coordinates agent execution and dependency resolution
3. **AgentContext**: Shared context and communication between agents
4. **ConfigLoader**: Loads and validates build configurations

### Agent Types

#### Web Application Agents

- `webapp-deps-install`: Installs npm/pnpm/yarn dependencies
- `webapp-typescript-build`: Compiles TypeScript code
- `webapp-nextjs-build`: Builds Next.js applications
- `webapp-lint`: Runs code linting
- `webapp-test`: Runs test suite

#### 3D Game Agents

- `game3d-unity-build`: Builds Unity projects
- `game3d-unreal-build`: Builds Unreal Engine projects
- `game3d-threejs-build`: Builds Three.js web games
- `game3d-godot-build`: Builds Godot projects

#### Program Build Agents

- `program-cmake-build`: Builds C/C++ projects with CMake
- `program-make-build`: Builds projects with Make
- `program-rust-build`: Builds Rust projects with Cargo
- `program-go-build`: Builds Go projects
- `program-maven-build`: Builds Java projects with Maven
- `program-gradle-build`: Builds Java projects with Gradle

#### Shared Agents

- `shared-dependency-resolution`: Analyzes and verifies dependencies
- `shared-asset-processing`: Processes and optimizes assets
- `test-unit`: Runs unit tests
- `test-build-validation`: Validates build output
- `test-security-scan`: Scans for security vulnerabilities

## Configuration

### Basic Configuration Structure

```json
{
  "name": "My Project Build",
  "version": "1.0.0",
  "type": "webapp",
  "buildDir": "./build",
  "tempDir": "./.temp",
  "parallelism": 4,
  "continueOnError": false,
  "agents": [
    {
      "id": "deps",
      "type": "webapp-deps-install",
      "enabled": true,
      "priority": "critical"
    },
    {
      "id": "build",
      "type": "webapp-nextjs-build",
      "enabled": true,
      "priority": "high",
      "dependencies": ["deps"],
      "config": {
        "outputDir": "dist"
      }
    }
  ],
  "global": {
    "environment": "production"
  }
}
```

### YAML Configuration

```yaml
name: My Project Build
version: 1.0.0
type: webapp
buildDir: ./build
parallelism: 4
continueOnError: false

agents:
  - id: deps
    type: webapp-deps-install
    enabled: true
    priority: critical

  - id: build
    type: webapp-nextjs-build
    enabled: true
    priority: high
    dependencies:
      - deps
    config:
      outputDir: dist

global:
  environment: production
```

### Configuration Options

| Option | Type | Description |
|--------|------|-------------|
| `name` | string | Build configuration name |
| `version` | string | Configuration version |
| `type` | string | Project type: `webapp`, `game3d`, `program`, or `mixed` |
| `buildDir` | string | Output directory for build artifacts |
| `tempDir` | string | Temporary directory for intermediate files |
| `parallelism` | number | Maximum parallel agent execution (default: 4) |
| `continueOnError` | boolean | Continue build if an agent fails (default: false) |
| `agents` | array | List of agents to execute |
| `global` | object | Global configuration shared with all agents |

### Agent Configuration

| Option | Type | Description |
|--------|------|-------------|
| `id` | string | Unique identifier for the agent |
| `type` | string | Agent type (see Agent Types above) |
| `enabled` | boolean | Whether to run this agent (default: true) |
| `priority` | string | Execution priority: `critical`, `high`, `normal`, `low` |
| `dependencies` | array | List of agent IDs this agent depends on |
| `config` | object | Agent-specific configuration |

## Examples

### Example 1: Next.js Web Application

```json
{
  "name": "Next.js App Build",
  "type": "webapp",
  "agents": [
    {
      "id": "deps",
      "type": "webapp-deps-install",
      "priority": "critical"
    },
    {
      "id": "lint",
      "type": "webapp-lint",
      "dependencies": ["deps"]
    },
    {
      "id": "typescript",
      "type": "webapp-typescript-build",
      "dependencies": ["deps"]
    },
    {
      "id": "build",
      "type": "webapp-nextjs-build",
      "priority": "high",
      "dependencies": ["deps", "typescript"]
    },
    {
      "id": "test",
      "type": "webapp-test",
      "dependencies": ["deps"]
    },
    {
      "id": "validate",
      "type": "test-build-validation",
      "dependencies": ["build"]
    }
  ]
}
```

### Example 2: Unity 3D Game

```json
{
  "name": "Unity Game Build",
  "type": "game3d",
  "agents": [
    {
      "id": "deps",
      "type": "shared-dependency-resolution",
      "priority": "critical"
    },
    {
      "id": "assets",
      "type": "shared-asset-processing",
      "config": {
        "textures": {
          "compress": true,
          "format": "webp",
          "quality": 85
        },
        "models": {
          "optimize": true,
          "compression": "draco"
        }
      }
    },
    {
      "id": "build-windows",
      "type": "game3d-unity-build",
      "priority": "high",
      "dependencies": ["deps", "assets"],
      "config": {
        "platform": "Windows"
      }
    },
    {
      "id": "build-webgl",
      "type": "game3d-unity-build",
      "priority": "high",
      "dependencies": ["deps", "assets"],
      "config": {
        "platform": "WebGL"
      }
    }
  ]
}
```

### Example 3: Rust Program

```json
{
  "name": "Rust Program Build",
  "type": "program",
  "agents": [
    {
      "id": "deps",
      "type": "shared-dependency-resolution",
      "priority": "critical"
    },
    {
      "id": "build",
      "type": "program-rust-build",
      "priority": "high",
      "dependencies": ["deps"],
      "config": {
        "releaseMode": true
      }
    },
    {
      "id": "test",
      "type": "test-unit",
      "dependencies": ["deps"]
    },
    {
      "id": "security",
      "type": "test-security-scan",
      "dependencies": ["build"]
    }
  ]
}
```

### Example 4: Mixed Project (C++ with Web UI)

```json
{
  "name": "Mixed C++ and Web Build",
  "type": "mixed",
  "agents": [
    {
      "id": "cpp-deps",
      "type": "shared-dependency-resolution",
      "priority": "critical"
    },
    {
      "id": "cpp-build",
      "type": "program-cmake-build",
      "priority": "high",
      "dependencies": ["cpp-deps"],
      "config": {
        "buildType": "Release",
        "jobs": 8
      }
    },
    {
      "id": "web-deps",
      "type": "webapp-deps-install",
      "priority": "critical"
    },
    {
      "id": "web-build",
      "type": "webapp-nextjs-build",
      "priority": "high",
      "dependencies": ["web-deps", "cpp-build"]
    },
    {
      "id": "validate",
      "type": "test-build-validation",
      "dependencies": ["cpp-build", "web-build"]
    }
  ]
}
```

## Creating Custom Agents

You can extend the system with custom agents:

```typescript
import { BaseAgent, AgentContext, AgentResult } from 'agent-build-system';

export class MyCustomAgent extends BaseAgent {
  constructor() {
    super('custom-my-agent', 'My Custom Agent', 'Does custom build tasks');
  }

  protected async onInitialize(context: AgentContext): Promise<void> {
    // Initialize your agent
    this.addDependency('other-agent-id', true);
  }

  protected async onExecute(context: AgentContext): Promise<AgentResult> {
    try {
      // Perform your build task
      context.logger.info('Running custom build task...');

      // Access shared data
      const someData = context.sharedData.get('key');

      // Store results
      context.sharedData.set('result', 'success');

      return {
        success: true,
        message: 'Custom task completed',
        data: { /* your data */ }
      };
    } catch (error) {
      return {
        success: false,
        message: 'Custom task failed',
        errors: [error.message]
      };
    }
  }

  protected async onValidate(context: AgentContext): Promise<{ valid: boolean; reason?: string }> {
    // Validate if agent can run
    return { valid: true };
  }

  protected async onCleanup(context: AgentContext): Promise<void> {
    // Cleanup resources
  }
}
```

## CLI Reference

### Commands

- `agent-build build [config] [project-root]` - Run build
- `agent-build init <type>` - Initialize configuration
- `agent-build help` - Show help
- `agent-build version` - Show version

### Environment Variables

- `DEBUG=1` - Enable debug logging
- `CI=true` - Enable CI mode (affects test behavior)

## Troubleshooting

### Build Fails with "Agent not found"

Make sure the agent type is correctly specified in your configuration. Check the available agent types in the documentation.

### Dependencies Not Installing

Ensure the package manager is correctly detected. Check that `package.json`, `Cargo.toml`, `go.mod`, etc. exist in your project root.

### Agent Validation Fails

Review the validation requirements for each agent. For example, `webapp-nextjs-build` requires `next.config.ts` or `next.config.js` to exist.

## Performance Tips

1. **Use Parallelism**: Set `parallelism` to the number of CPU cores
2. **Disable Unused Agents**: Set `enabled: false` for agents you don't need
3. **Optimize Dependencies**: Only specify required dependencies to allow parallel execution
4. **Asset Processing**: Disable asset compression for development builds

## Contributing

Contributions are welcome! Please see CONTRIBUTING.md for guidelines.

## License

MIT License - see LICENSE file for details.

## Support

- GitHub Issues: https://github.com/yourusername/agent-build-system/issues
- Documentation: https://docs.agent-build.dev
- Discord: https://discord.gg/agent-build
