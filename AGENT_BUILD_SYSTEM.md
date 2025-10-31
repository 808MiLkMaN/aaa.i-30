# Agent-Based Build System

## Project Overview

This repository contains a comprehensive **Agent-Based Build System** designed to solve complex build situations for:

- **Web Applications** (Next.js, React, Vue, etc.)
- **3D Video Games** (Unity, Unreal Engine, Three.js, Godot)
- **Compiled Programs** (C/C++, Rust, Go, Java, etc.)

## Architecture

The system uses an intelligent agent-based architecture where autonomous agents handle specific build tasks and coordinate through a central orchestrator.

### Key Features

✅ **Multi-Project Support**: Handle diverse project types with specialized agents
✅ **Dependency Resolution**: Automatic dependency graph building and validation
✅ **Parallel Execution**: Run independent agents concurrently for faster builds
✅ **Asset Processing**: Optimize 3D models, textures, audio, and video
✅ **Configuration-Driven**: YAML/JSON configs for reproducible builds
✅ **Extensible**: Easy to create custom agents for specific needs
✅ **Error Recovery**: Continue-on-error mode and detailed reporting
✅ **Testing Integration**: Unit tests, validation, and security scanning

## Directory Structure

```
build-system/
├── core/                   # Core agent system
│   ├── agent.ts           # Base agent class and interfaces
│   └── orchestrator.ts    # Build orchestration engine
├── agents/                 # Specialized build agents
│   ├── webapp/            # Web app agents (Next.js, React, etc.)
│   ├── game3d/            # 3D game agents (Unity, Unreal, etc.)
│   ├── program/           # Program agents (CMake, Rust, Go, etc.)
│   └── shared/            # Shared agents (deps, assets, testing)
├── config/                # Configuration system
│   └── loader.ts          # Config loading and validation
├── cli/                   # Command-line interface
│   └── index.ts           # CLI entry point
├── examples/              # Example configurations
│   ├── webapp-build-config.json
│   ├── game3d-build-config.yaml
│   ├── program-build-config.json
│   └── programmatic-usage.ts
├── index.ts               # Main exports
├── package.json           # Package configuration
├── tsconfig.json          # TypeScript configuration
└── README.md              # Documentation
```

## Agent Types

### Web Application Agents
- **webapp-deps-install**: Installs npm/pnpm/yarn/bun dependencies
- **webapp-typescript-build**: Compiles TypeScript code
- **webapp-nextjs-build**: Builds Next.js applications
- **webapp-lint**: Runs code linting (ESLint, Biome, etc.)
- **webapp-test**: Runs test suite (Jest, Vitest, Playwright)

### 3D Game Agents
- **game3d-unity-build**: Builds Unity projects for multiple platforms
- **game3d-unreal-build**: Builds Unreal Engine projects
- **game3d-threejs-build**: Builds Three.js web-based 3D applications
- **game3d-godot-build**: Builds Godot game projects

### Program Build Agents
- **program-cmake-build**: Builds C/C++ projects with CMake
- **program-make-build**: Builds projects with Makefiles
- **program-rust-build**: Builds Rust projects with Cargo
- **program-go-build**: Builds Go applications
- **program-maven-build**: Builds Java projects with Maven
- **program-gradle-build**: Builds Java projects with Gradle

### Shared Agents
- **shared-dependency-resolution**: Analyzes and verifies dependencies
- **shared-asset-processing**: Processes and optimizes assets (textures, models, audio)
- **test-unit**: Runs unit tests for any project type
- **test-build-validation**: Validates build output and artifacts
- **test-security-scan**: Scans for security vulnerabilities

## Quick Start

### 1. Install Dependencies

```bash
cd build-system
npm install
```

### 2. Build the System

```bash
npm run build
```

### 3. Initialize a Project

```bash
# For web applications
node dist/cli/index.js init webapp

# For 3D games
node dist/cli/index.js init game3d

# For compiled programs
node dist/cli/index.js init program
```

### 4. Run a Build

```bash
node dist/cli/index.js build build-config.json
```

## Example Usage

### Web Application Build

```json
{
  "name": "My Web App",
  "type": "webapp",
  "agents": [
    {
      "id": "deps",
      "type": "webapp-deps-install",
      "priority": "critical"
    },
    {
      "id": "build",
      "type": "webapp-nextjs-build",
      "dependencies": ["deps"]
    }
  ]
}
```

### 3D Game Build

```yaml
name: Unity Game Build
type: game3d
agents:
  - id: assets
    type: shared-asset-processing
    config:
      textures:
        compress: true
        quality: 85
  - id: build
    type: game3d-unity-build
    dependencies: [assets]
    config:
      platform: Windows
```

### Programmatic Usage

```typescript
import { BuildOrchestrator } from './core/orchestrator';
import { NextJSBuildAgent } from './agents/webapp';

const orchestrator = new BuildOrchestrator({
  projectRoot: process.cwd(),
}, logger);

orchestrator.registerAgent(new NextJSBuildAgent());
const result = await orchestrator.execute();
```

## Creating Custom Agents

Extend the `BaseAgent` class to create custom agents:

```typescript
import { BaseAgent, AgentContext, AgentResult } from './core/agent';

export class MyCustomAgent extends BaseAgent {
  constructor() {
    super('my-custom-agent', 'My Agent', 'Custom build task');
  }

  protected async onExecute(context: AgentContext): Promise<AgentResult> {
    // Implement your build logic
    return {
      success: true,
      message: 'Build completed'
    };
  }
}
```

## Configuration Options

| Option | Type | Description |
|--------|------|-------------|
| `name` | string | Build configuration name |
| `type` | string | Project type: webapp, game3d, program, mixed |
| `buildDir` | string | Output directory |
| `parallelism` | number | Max parallel agents |
| `continueOnError` | boolean | Continue on failure |
| `agents` | array | List of agents to execute |

## Benefits

### For Web Applications
- Automatic package manager detection
- TypeScript compilation with error checking
- Linting and code quality checks
- Integrated testing
- Production-optimized builds

### For 3D Games
- Multi-platform builds (Windows, macOS, Linux, iOS, Android, WebGL)
- Asset optimization (texture compression, model optimization)
- Build pipeline automation
- Support for Unity, Unreal, Three.js, Godot

### For Compiled Programs
- Support for CMake, Make, Cargo, Go modules
- Parallel compilation
- Cross-platform builds
- Dependency management
- Security scanning

## Advanced Features

### Dependency Graph Resolution
Agents can declare dependencies on other agents. The orchestrator automatically:
- Builds a dependency graph
- Detects circular dependencies
- Determines optimal execution order
- Runs independent agents in parallel

### Inter-Agent Communication
Agents can share data through the shared context:

```typescript
// Agent A stores data
context.sharedData.set('key', value);

// Agent B retrieves data
const value = context.sharedData.get('key');
```

### Priority-Based Execution
Agents can have different priorities:
- **Critical**: Must run first (e.g., dependency installation)
- **High**: Important tasks (e.g., compilation)
- **Normal**: Standard tasks (e.g., testing)
- **Low**: Optional tasks (e.g., documentation)

## Testing

The system includes comprehensive testing agents:

- **Unit Tests**: Automatically detects test framework (Jest, Vitest, Playwright, etc.)
- **Build Validation**: Verifies build output is correct and complete
- **Security Scanning**: Uses npm audit, cargo audit, etc.

## Performance

Optimizations for fast builds:

- **Parallel Execution**: Run up to N agents concurrently
- **Dependency Caching**: Share data between agents
- **Incremental Builds**: Skip unchanged steps
- **Resource Management**: Efficient cleanup

## Troubleshooting

### Common Issues

**"Agent not found"**
- Check agent type spelling in configuration
- Ensure agent is registered in AgentFactory

**"Dependencies not installing"**
- Verify package.json exists
- Check package manager is installed

**"Validation failed"**
- Review agent validation requirements
- Check required files exist

## Future Enhancements

Potential improvements:

- [ ] Docker container support
- [ ] Cloud build distribution
- [ ] Caching layer for faster rebuilds
- [ ] Visual build pipeline editor
- [ ] Real-time build monitoring
- [ ] Plugin system for third-party agents
- [ ] Machine learning for build optimization

## Contributing

Contributions welcome! To add a new agent:

1. Create agent class extending `BaseAgent`
2. Implement required methods
3. Add to agent factory
4. Write tests
5. Update documentation

## License

MIT License - see LICENSE file for details.

## Support

- Documentation: See README.md in build-system/
- Examples: See examples/ directory
- Issues: Create GitHub issue for bugs/features

---

**Built with TypeScript** | **Extensible Architecture** | **Production Ready**
