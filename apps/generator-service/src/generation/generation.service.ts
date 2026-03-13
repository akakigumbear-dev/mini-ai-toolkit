import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  JobType,
  JobStatus,
  GenerationJobMessage,
  JobStatusUpdateMessage,
  GENERATION_TIMEOUT_MS,
} from '@mini-ai-toolkit/shared-types';
import { GenerationJobEntity } from '../entities/generation-job.entity';
import { EnhancementService } from '../enhancement/enhancement.service';
import { AiProvider } from '../providers/ai-provider.interface';
import { PollinationsTextProvider } from '../providers/pollinations-text.provider';
import { PollinationsImageProvider } from '../providers/pollinations-image.provider';
import { MockTextProvider } from '../providers/mock-text.provider';
import { StatusPublisherService } from '../status/status-publisher.service';

@Injectable()
export class GenerationService {
  private readonly logger = new Logger(GenerationService.name);
  private readonly timeoutMs: number;

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(GenerationJobEntity)
    private readonly jobRepo: Repository<GenerationJobEntity>,
    private readonly enhancement: EnhancementService,
    private readonly pollinationsText: PollinationsTextProvider,
    private readonly pollinationsImage: PollinationsImageProvider,
    private readonly mockText: MockTextProvider,
    private readonly statusPublisher: StatusPublisherService,
  ) {
    this.timeoutMs = parseInt(
      this.config.get('GENERATION_TIMEOUT_MS', String(GENERATION_TIMEOUT_MS)),
      10,
    );
  }

  async processJob(message: GenerationJobMessage): Promise<void> {
    const { jobId, type, prompt } = message;
    this.logger.log(`Processing job ${jobId} (${type})`);

    // Check if job was cancelled before we start
    const job = await this.jobRepo.findOne({ where: { id: jobId } });
    if (!job || job.status === JobStatus.CANCELLED) {
      this.logger.log(`Job ${jobId} is cancelled or missing, skipping`);
      return;
    }

    // Emit "generating" status
    await this.statusPublisher.publish({
      jobId,
      status: JobStatus.GENERATING,
      startedAt: new Date().toISOString(),
    });

    try {
      // Step 1: Enhance prompt
      const enhancedPrompt = this.enhancement.enhance(prompt, type);

      // Step 2: Select provider and generate with timeout
      const provider = this.selectProvider(type);
      const result = await this.withTimeout(
        provider.generate(enhancedPrompt),
        this.timeoutMs,
      );

      // Step 3: Emit completion
      const update: JobStatusUpdateMessage = {
        jobId,
        status: JobStatus.COMPLETED,
        enhancedPrompt,
        provider: result.provider,
        completedAt: new Date().toISOString(),
      };

      if (result.text) update.resultText = result.text;
      if (result.imageUrl) update.resultImageUrl = result.imageUrl;

      await this.statusPublisher.publish(update);
      this.logger.log(`Job ${jobId} completed via ${result.provider}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Job ${jobId} failed: ${errorMessage}`);

      // For text generation, try mock fallback
      if (type === JobType.TEXT && !errorMessage.includes('mock')) {
        this.logger.log(`Trying mock fallback for job ${jobId}`);
        try {
          const enhancedPrompt = this.enhancement.enhance(prompt, type);
          const result = await this.mockText.generate(enhancedPrompt);

          await this.statusPublisher.publish({
            jobId,
            status: JobStatus.COMPLETED,
            enhancedPrompt,
            provider: result.provider,
            resultText: result.text,
            completedAt: new Date().toISOString(),
          });
          this.logger.log(`Job ${jobId} completed via mock fallback`);
          return;
        } catch (fallbackError) {
          this.logger.error(`Mock fallback also failed for job ${jobId}`);
        }
      }

      await this.statusPublisher.publish({
        jobId,
        status: JobStatus.FAILED,
        errorMessage,
        failedAt: new Date().toISOString(),
      });
    }
  }

  private selectProvider(type: JobType): AiProvider {
    if (type === JobType.IMAGE) {
      return this.pollinationsImage;
    }
    return this.pollinationsText;
  }

  private withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Generation timed out after ${ms}ms`)),
          ms,
        ),
      ),
    ]);
  }
}
