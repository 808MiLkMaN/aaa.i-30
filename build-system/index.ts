/**
 * Agent-Based Build System
 * Main entry point for the build system
 */

// Core
export {
  BaseAgent,
  AgentStatus,
  AgentPriority,
  AgentContext,
  AgentResult,
  AgentDependency,
  AgentCommunicator,
  Logger,
} from './core/agent';

export {
  BuildOrchestrator,
  OrchestratorConfig,
  BuildResult,
} from './core/orchestrator';

// Configuration
export {
  ConfigLoader,
  BuildConfig,
  BuildAgentConfig,
} from './config/loader';

// Web App Agents
export {
  DependencyInstallAgent,
  TypeScriptBuildAgent,
  NextJSBuildAgent,
  LintAgent,
  TestRunnerAgent,
} from './agents/webapp';

// 3D Game Agents
export {
  UnityBuildAgent,
  UnrealBuildAgent,
  ThreeJSBuildAgent,
  GodotBuildAgent,
} from './agents/game3d';

// Program Build Agents
export {
  CMakeBuildAgent,
  MakeBuildAgent,
  RustBuildAgent,
  GoBuildAgent,
  MavenBuildAgent,
  GradleBuildAgent,
} from './agents/program';

// Shared Agents
export {
  AssetProcessingAgent,
  AssetProcessingConfig,
} from './agents/shared/assets';

export {
  DependencyResolutionAgent,
  DependencyInfo,
} from './agents/shared/dependencies';

export {
  UnitTestAgent,
  BuildValidationAgent,
  SecurityScanAgent,
} from './agents/shared/testing';
