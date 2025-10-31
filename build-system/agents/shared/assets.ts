/**
 * Asset Processing Agent
 * Handles processing of 3D models, textures, audio, video, and other media assets
 */

import { BaseAgent, AgentContext, AgentResult, AgentPriority } from '../../core/agent';
import { execSync } from 'child_process';
import { existsSync, readdirSync, statSync, copyFileSync, mkdirSync } from 'fs';
import { join, extname, basename } from 'path';

export interface AssetProcessingConfig {
  textures?: {
    compress?: boolean;
    format?: 'webp' | 'jpg' | 'png' | 'ktx2' | 'basis';
    quality?: number;
    generateMipmaps?: boolean;
  };
  models?: {
    optimize?: boolean;
    format?: 'gltf' | 'glb' | 'fbx' | 'obj';
    compression?: 'draco' | 'meshopt' | 'none';
  };
  audio?: {
    compress?: boolean;
    format?: 'mp3' | 'ogg' | 'wav' | 'aac';
    bitrate?: number;
  };
}

/**
 * Asset Processing Agent
 * Processes and optimizes game/app assets
 */
export class AssetProcessingAgent extends BaseAgent {
  private config: AssetProcessingConfig = {};
  private processedFiles: string[] = [];

  constructor(config?: AssetProcessingConfig) {
    super(
      'shared-asset-processing',
      'Asset Processing',
      'Processes and optimizes 3D models, textures, audio, and video assets'
    );
    if (config) this.config = config;
    this.setPriority(AgentPriority.NORMAL);
  }

  protected async onInitialize(context: AgentContext): Promise<void> {
    // Merge config from context
    if (context.config.assetProcessing) {
      this.config = { ...this.config, ...context.config.assetProcessing };
    }
    context.sharedData.set('assetProcessingConfig', this.config);
  }

  protected async onExecute(context: AgentContext): Promise<AgentResult> {
    try {
      const startTime = Date.now();
      const warnings: string[] = [];

      const assetsDir = join(context.projectRoot, 'assets');
      const outputDir = join(context.buildDir, 'assets');

      if (!existsSync(assetsDir)) {
        context.logger.warn('No assets directory found, skipping asset processing');
        return {
          success: true,
          message: 'No assets to process',
          warnings: ['No assets directory found'],
        };
      }

      if (!existsSync(outputDir)) {
        mkdirSync(outputDir, { recursive: true });
      }

      context.logger.info('Processing assets...');

      // Process textures
      const textureResults = await this.processTextures(
        assetsDir,
        outputDir,
        context,
        warnings
      );

      // Process 3D models
      const modelResults = await this.processModels(
        assetsDir,
        outputDir,
        context,
        warnings
      );

      // Process audio
      const audioResults = await this.processAudio(
        assetsDir,
        outputDir,
        context,
        warnings
      );

      this.processedFiles.push(...textureResults, ...modelResults, ...audioResults);

      const buildTime = Date.now() - startTime;

      return {
        success: true,
        message: `Processed ${this.processedFiles.length} assets in ${buildTime}ms`,
        data: {
          processedFiles: this.processedFiles,
          textureCount: textureResults.length,
          modelCount: modelResults.length,
          audioCount: audioResults.length,
        },
        warnings: warnings.length > 0 ? warnings : undefined,
        artifacts: [outputDir],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        message: 'Asset processing failed',
        errors: [errorMessage],
      };
    }
  }

  private async processTextures(
    assetsDir: string,
    outputDir: string,
    context: AgentContext,
    warnings: string[]
  ): Promise<string[]> {
    const processed: string[] = [];
    const textureExts = ['.png', '.jpg', '.jpeg', '.tga', '.bmp'];

    const findTextures = (dir: string): string[] => {
      const files: string[] = [];
      const entries = readdirSync(dir);

      for (const entry of entries) {
        const fullPath = join(dir, entry);
        const stat = statSync(fullPath);

        if (stat.isDirectory()) {
          files.push(...findTextures(fullPath));
        } else if (textureExts.includes(extname(entry).toLowerCase())) {
          files.push(fullPath);
        }
      }

      return files;
    };

    const textures = findTextures(assetsDir);

    for (const texture of textures) {
      try {
        const outputPath = join(outputDir, basename(texture));

        if (this.config.textures?.compress) {
          // Use ImageMagick or similar tool if available
          try {
            const quality = this.config.textures.quality || 85;
            execSync(
              `convert "${texture}" -quality ${quality} "${outputPath}"`,
              { stdio: 'pipe' }
            );
            context.logger.info(`Compressed texture: ${basename(texture)}`);
          } catch (err) {
            // Fallback to simple copy if ImageMagick is not available
            warnings.push(`Could not compress ${basename(texture)}, copying instead`);
            copyFileSync(texture, outputPath);
          }
        } else {
          copyFileSync(texture, outputPath);
        }

        processed.push(outputPath);
      } catch (error) {
        warnings.push(`Failed to process texture: ${basename(texture)}`);
      }
    }

    return processed;
  }

  private async processModels(
    assetsDir: string,
    outputDir: string,
    context: AgentContext,
    warnings: string[]
  ): Promise<string[]> {
    const processed: string[] = [];
    const modelExts = ['.gltf', '.glb', '.fbx', '.obj', '.dae'];

    const findModels = (dir: string): string[] => {
      const files: string[] = [];
      const entries = readdirSync(dir);

      for (const entry of entries) {
        const fullPath = join(dir, entry);
        const stat = statSync(fullPath);

        if (stat.isDirectory()) {
          files.push(...findModels(fullPath));
        } else if (modelExts.includes(extname(entry).toLowerCase())) {
          files.push(fullPath);
        }
      }

      return files;
    };

    const models = findModels(assetsDir);

    for (const model of models) {
      try {
        const outputPath = join(outputDir, basename(model));

        if (this.config.models?.optimize) {
          // Use gltf-pipeline or similar tool if available
          try {
            if (extname(model).toLowerCase() === '.gltf' || extname(model).toLowerCase() === '.glb') {
              const compression = this.config.models.compression || 'draco';
              execSync(
                `gltf-pipeline -i "${model}" -o "${outputPath}" --draco.compressionLevel=10`,
                { stdio: 'pipe' }
              );
              context.logger.info(`Optimized model: ${basename(model)}`);
            } else {
              copyFileSync(model, outputPath);
            }
          } catch (err) {
            warnings.push(`Could not optimize ${basename(model)}, copying instead`);
            copyFileSync(model, outputPath);
          }
        } else {
          copyFileSync(model, outputPath);
        }

        processed.push(outputPath);
      } catch (error) {
        warnings.push(`Failed to process model: ${basename(model)}`);
      }
    }

    return processed;
  }

  private async processAudio(
    assetsDir: string,
    outputDir: string,
    context: AgentContext,
    warnings: string[]
  ): Promise<string[]> {
    const processed: string[] = [];
    const audioExts = ['.wav', '.mp3', '.ogg', '.m4a', '.aac'];

    const findAudio = (dir: string): string[] => {
      const files: string[] = [];
      const entries = readdirSync(dir);

      for (const entry of entries) {
        const fullPath = join(dir, entry);
        const stat = statSync(fullPath);

        if (stat.isDirectory()) {
          files.push(...findAudio(fullPath));
        } else if (audioExts.includes(extname(entry).toLowerCase())) {
          files.push(fullPath);
        }
      }

      return files;
    };

    const audioFiles = findAudio(assetsDir);

    for (const audio of audioFiles) {
      try {
        const outputPath = join(outputDir, basename(audio));

        if (this.config.audio?.compress) {
          // Use ffmpeg if available
          try {
            const bitrate = this.config.audio.bitrate || 128;
            const format = this.config.audio.format || 'mp3';
            const outputWithFormat = outputPath.replace(
              extname(outputPath),
              `.${format}`
            );

            execSync(
              `ffmpeg -i "${audio}" -b:a ${bitrate}k "${outputWithFormat}" -y`,
              { stdio: 'pipe' }
            );
            context.logger.info(`Compressed audio: ${basename(audio)}`);
            processed.push(outputWithFormat);
          } catch (err) {
            warnings.push(`Could not compress ${basename(audio)}, copying instead`);
            copyFileSync(audio, outputPath);
            processed.push(outputPath);
          }
        } else {
          copyFileSync(audio, outputPath);
          processed.push(outputPath);
        }
      } catch (error) {
        warnings.push(`Failed to process audio: ${basename(audio)}`);
      }
    }

    return processed;
  }

  protected async onValidate(context: AgentContext): Promise<{
    valid: boolean;
    reason?: string;
  }> {
    // Always valid - will just skip if no assets found
    return { valid: true };
  }

  protected async onCleanup(context: AgentContext): Promise<void> {
    this.processedFiles = [];
  }
}
