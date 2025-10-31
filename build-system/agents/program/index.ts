/**
 * Program Build Agents
 * Specialized agents for building compiled programs (C/C++, Rust, Go, etc.)
 */

import { BaseAgent, AgentContext, AgentResult, AgentPriority } from '../../core/agent';
import { execSync } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

/**
 * C/C++ Build Agent using CMake
 * Builds C/C++ projects using CMake build system
 */
export class CMakeBuildAgent extends BaseAgent {
  private buildType: 'Debug' | 'Release' | 'RelWithDebInfo' | 'MinSizeRel' = 'Release';

  constructor(buildType?: 'Debug' | 'Release' | 'RelWithDebInfo' | 'MinSizeRel') {
    super(
      'program-cmake-build',
      'CMake Build',
      'Builds C/C++ project using CMake'
    );
    if (buildType) this.buildType = buildType;
    this.setPriority(AgentPriority.HIGH);
  }

  protected async onInitialize(context: AgentContext): Promise<void> {
    if (context.config.buildType) {
      this.buildType = context.config.buildType;
    }
    context.sharedData.set('cmakeBuildType', this.buildType);
  }

  protected async onExecute(context: AgentContext): Promise<AgentResult> {
    try {
      const buildDir = join(context.projectRoot, 'build');

      if (!existsSync(buildDir)) {
        mkdirSync(buildDir, { recursive: true });
      }

      context.logger.info(`Configuring CMake project (${this.buildType})...`);

      // Configure
      const configureCmd = `cmake -S . -B build -DCMAKE_BUILD_TYPE=${this.buildType}`;
      execSync(configureCmd, {
        cwd: context.projectRoot,
        stdio: 'inherit',
        encoding: 'utf-8',
      });

      context.logger.info('Building with CMake...');
      const startTime = Date.now();

      // Build
      const buildCmd = `cmake --build build --config ${this.buildType} -j${
        context.config.jobs || 4
      }`;
      execSync(buildCmd, {
        cwd: context.projectRoot,
        stdio: 'inherit',
        encoding: 'utf-8',
      });

      const buildTime = Date.now() - startTime;

      return {
        success: true,
        message: `CMake build completed (${this.buildType}) in ${buildTime}ms`,
        data: { buildType: this.buildType, buildTime },
        artifacts: [buildDir],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        message: 'CMake build failed',
        errors: [errorMessage],
      };
    }
  }

  protected async onValidate(context: AgentContext): Promise<{
    valid: boolean;
    reason?: string;
  }> {
    const cmakeListsPath = join(context.projectRoot, 'CMakeLists.txt');
    if (!existsSync(cmakeListsPath)) {
      return { valid: false, reason: 'CMakeLists.txt not found' };
    }
    return { valid: true };
  }

  protected async onCleanup(context: AgentContext): Promise<void> {
    // No cleanup needed
  }
}

/**
 * Make Build Agent
 * Builds projects using traditional Makefiles
 */
export class MakeBuildAgent extends BaseAgent {
  constructor() {
    super(
      'program-make-build',
      'Make Build',
      'Builds project using Makefile'
    );
    this.setPriority(AgentPriority.HIGH);
  }

  protected async onInitialize(context: AgentContext): Promise<void> {
    // No initialization needed
  }

  protected async onExecute(context: AgentContext): Promise<AgentResult> {
    try {
      context.logger.info('Building with Make...');
      const startTime = Date.now();

      const jobs = context.config.jobs || 4;
      const makeCmd = `make -j${jobs}`;

      execSync(makeCmd, {
        cwd: context.projectRoot,
        stdio: 'inherit',
        encoding: 'utf-8',
      });

      const buildTime = Date.now() - startTime;

      return {
        success: true,
        message: `Make build completed in ${buildTime}ms`,
        data: { buildTime },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        message: 'Make build failed',
        errors: [errorMessage],
      };
    }
  }

  protected async onValidate(context: AgentContext): Promise<{
    valid: boolean;
    reason?: string;
  }> {
    const makefilePaths = ['Makefile', 'makefile', 'GNUmakefile'];
    const hasMarkefile = makefilePaths.some(path =>
      existsSync(join(context.projectRoot, path))
    );

    if (!hasMarkefile) {
      return { valid: false, reason: 'No Makefile found' };
    }

    return { valid: true };
  }

  protected async onCleanup(context: AgentContext): Promise<void> {
    // No cleanup needed
  }
}

/**
 * Rust Build Agent
 * Builds Rust projects using Cargo
 */
export class RustBuildAgent extends BaseAgent {
  private releaseMode: boolean = true;

  constructor(releaseMode: boolean = true) {
    super(
      'program-rust-build',
      'Rust Build',
      'Builds Rust project using Cargo'
    );
    this.releaseMode = releaseMode;
    this.setPriority(AgentPriority.HIGH);
  }

  protected async onInitialize(context: AgentContext): Promise<void> {
    if (context.config.releaseMode !== undefined) {
      this.releaseMode = context.config.releaseMode;
    }
    context.sharedData.set('rustReleaseMode', this.releaseMode);
  }

  protected async onExecute(context: AgentContext): Promise<AgentResult> {
    try {
      context.logger.info(`Building Rust project (${this.releaseMode ? 'release' : 'debug'})...`);
      const startTime = Date.now();

      const buildCmd = this.releaseMode ? 'cargo build --release' : 'cargo build';

      execSync(buildCmd, {
        cwd: context.projectRoot,
        stdio: 'inherit',
        encoding: 'utf-8',
      });

      const buildTime = Date.now() - startTime;
      const targetDir = join(
        context.projectRoot,
        'target',
        this.releaseMode ? 'release' : 'debug'
      );

      return {
        success: true,
        message: `Rust build completed in ${buildTime}ms`,
        data: { releaseMode: this.releaseMode, buildTime },
        artifacts: [targetDir],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        message: 'Rust build failed',
        errors: [errorMessage],
      };
    }
  }

  protected async onValidate(context: AgentContext): Promise<{
    valid: boolean;
    reason?: string;
  }> {
    const cargoTomlPath = join(context.projectRoot, 'Cargo.toml');
    if (!existsSync(cargoTomlPath)) {
      return { valid: false, reason: 'Cargo.toml not found' };
    }
    return { valid: true };
  }

  protected async onCleanup(context: AgentContext): Promise<void> {
    // No cleanup needed
  }
}

/**
 * Go Build Agent
 * Builds Go projects
 */
export class GoBuildAgent extends BaseAgent {
  private outputName: string = 'app';

  constructor(outputName?: string) {
    super(
      'program-go-build',
      'Go Build',
      'Builds Go project'
    );
    if (outputName) this.outputName = outputName;
    this.setPriority(AgentPriority.HIGH);
  }

  protected async onInitialize(context: AgentContext): Promise<void> {
    if (context.config.outputName) {
      this.outputName = context.config.outputName;
    }
    context.sharedData.set('goOutputName', this.outputName);
  }

  protected async onExecute(context: AgentContext): Promise<AgentResult> {
    try {
      context.logger.info('Building Go project...');
      const startTime = Date.now();

      const buildDir = join(context.buildDir, 'go');
      if (!existsSync(buildDir)) {
        mkdirSync(buildDir, { recursive: true });
      }

      const outputPath = join(buildDir, this.outputName);
      const buildCmd = `go build -o "${outputPath}"`;

      execSync(buildCmd, {
        cwd: context.projectRoot,
        stdio: 'inherit',
        encoding: 'utf-8',
      });

      const buildTime = Date.now() - startTime;

      return {
        success: true,
        message: `Go build completed in ${buildTime}ms`,
        data: { buildTime, outputPath },
        artifacts: [outputPath],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        message: 'Go build failed',
        errors: [errorMessage],
      };
    }
  }

  protected async onValidate(context: AgentContext): Promise<{
    valid: boolean;
    reason?: string;
  }> {
    const goModPath = join(context.projectRoot, 'go.mod');
    if (!existsSync(goModPath)) {
      return { valid: false, reason: 'go.mod not found' };
    }
    return { valid: true };
  }

  protected async onCleanup(context: AgentContext): Promise<void> {
    // No cleanup needed
  }
}

/**
 * Java/Maven Build Agent
 * Builds Java projects using Maven
 */
export class MavenBuildAgent extends BaseAgent {
  private skipTests: boolean = false;

  constructor(skipTests: boolean = false) {
    super(
      'program-maven-build',
      'Maven Build',
      'Builds Java project using Maven'
    );
    this.skipTests = skipTests;
    this.setPriority(AgentPriority.HIGH);
  }

  protected async onInitialize(context: AgentContext): Promise<void> {
    if (context.config.skipTests !== undefined) {
      this.skipTests = context.config.skipTests;
    }
    context.sharedData.set('mavenSkipTests', this.skipTests);
  }

  protected async onExecute(context: AgentContext): Promise<AgentResult> {
    try {
      context.logger.info('Building Java project with Maven...');
      const startTime = Date.now();

      const skipTestsFlag = this.skipTests ? '-DskipTests' : '';
      const buildCmd = `mvn clean package ${skipTestsFlag}`;

      execSync(buildCmd, {
        cwd: context.projectRoot,
        stdio: 'inherit',
        encoding: 'utf-8',
      });

      const buildTime = Date.now() - startTime;
      const targetDir = join(context.projectRoot, 'target');

      return {
        success: true,
        message: `Maven build completed in ${buildTime}ms`,
        data: { buildTime, skipTests: this.skipTests },
        artifacts: [targetDir],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        message: 'Maven build failed',
        errors: [errorMessage],
      };
    }
  }

  protected async onValidate(context: AgentContext): Promise<{
    valid: boolean;
    reason?: string;
  }> {
    const pomXmlPath = join(context.projectRoot, 'pom.xml');
    if (!existsSync(pomXmlPath)) {
      return { valid: false, reason: 'pom.xml not found' };
    }
    return { valid: true };
  }

  protected async onCleanup(context: AgentContext): Promise<void> {
    // No cleanup needed
  }
}

/**
 * Java/Gradle Build Agent
 * Builds Java projects using Gradle
 */
export class GradleBuildAgent extends BaseAgent {
  private tasks: string[] = ['build'];

  constructor(tasks?: string[]) {
    super(
      'program-gradle-build',
      'Gradle Build',
      'Builds Java project using Gradle'
    );
    if (tasks) this.tasks = tasks;
    this.setPriority(AgentPriority.HIGH);
  }

  protected async onInitialize(context: AgentContext): Promise<void> {
    if (context.config.gradleTasks) {
      this.tasks = context.config.gradleTasks;
    }
    context.sharedData.set('gradleTasks', this.tasks);
  }

  protected async onExecute(context: AgentContext): Promise<AgentResult> {
    try {
      context.logger.info('Building Java project with Gradle...');
      const startTime = Date.now();

      const gradleWrapper = existsSync(join(context.projectRoot, 'gradlew'))
        ? './gradlew'
        : 'gradle';

      const buildCmd = `${gradleWrapper} ${this.tasks.join(' ')}`;

      execSync(buildCmd, {
        cwd: context.projectRoot,
        stdio: 'inherit',
        encoding: 'utf-8',
      });

      const buildTime = Date.now() - startTime;
      const buildDir = join(context.projectRoot, 'build');

      return {
        success: true,
        message: `Gradle build completed in ${buildTime}ms`,
        data: { buildTime, tasks: this.tasks },
        artifacts: [buildDir],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        message: 'Gradle build failed',
        errors: [errorMessage],
      };
    }
  }

  protected async onValidate(context: AgentContext): Promise<{
    valid: boolean;
    reason?: string;
  }> {
    const buildGradlePath = join(context.projectRoot, 'build.gradle');
    const buildGradleKtsPath = join(context.projectRoot, 'build.gradle.kts');

    if (!existsSync(buildGradlePath) && !existsSync(buildGradleKtsPath)) {
      return { valid: false, reason: 'build.gradle or build.gradle.kts not found' };
    }

    return { valid: true };
  }

  protected async onCleanup(context: AgentContext): Promise<void> {
    // No cleanup needed
  }
}
