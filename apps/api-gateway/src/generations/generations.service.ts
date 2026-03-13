import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GenerationJobEntity } from './entities/generation-job.entity';
import { CreateGenerationDto } from './dto/create-generation.dto';
import { QueryGenerationsDto } from './dto/query-generations.dto';
import { QueueProducerService } from '../queue/queue-producer.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import {
  JobStatus,
  JobStatusUpdateMessage,
  WS_EVENTS,
  PaginatedResponse,
  GenerationJob,
} from '@mini-ai-toolkit/shared-types';

@Injectable()
export class GenerationsService {
  private readonly logger = new Logger(GenerationsService.name);

  constructor(
    @InjectRepository(GenerationJobEntity)
    private readonly jobRepo: Repository<GenerationJobEntity>,
    private readonly queueProducer: QueueProducerService,
    private readonly wsGateway: WebsocketGateway,
  ) {}

  async create(dto: CreateGenerationDto): Promise<GenerationJobEntity> {
    const job = this.jobRepo.create({
      prompt: dto.prompt.trim(),
      type: dto.type,
      parameters: dto.parameters || null,
      status: JobStatus.PENDING,
    });

    const saved = await this.jobRepo.save(job);
    this.logger.log(`Job created: ${saved.id} (${saved.type})`);

    // Publish to RabbitMQ
    await this.queueProducer.publishGenerationJob({
      jobId: saved.id,
      type: saved.type,
      prompt: saved.prompt,
      parameters: saved.parameters,
    });

    // Update status to queued
    saved.status = JobStatus.QUEUED;
    await this.jobRepo.save(saved);

    // Broadcast creation
    this.wsGateway.broadcastJobEvent(WS_EVENTS.JOB_CREATED, saved);

    return saved;
  }

  async findAll(
    query: QueryGenerationsDto,
  ): Promise<PaginatedResponse<GenerationJob>> {
    const { status, type, search, page = 1, limit = 20 } = query;

    const qb = this.jobRepo
      .createQueryBuilder('job')
      .orderBy('job.createdAt', 'DESC');

    if (status) {
      qb.andWhere('job.status = :status', { status });
    }
    if (type) {
      qb.andWhere('job.type = :type', { type });
    }
    if (search) {
      qb.andWhere('job.prompt ILIKE :search', { search: `%${search}%` });
    }

    const total = await qb.getCount();
    const data = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return {
      data: data as unknown as GenerationJob[],
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<GenerationJobEntity> {
    const job = await this.jobRepo.findOne({ where: { id } });
    if (!job) {
      throw new NotFoundException(`Job ${id} not found`);
    }
    return job;
  }

  async retry(id: string): Promise<GenerationJobEntity> {
    const original = await this.findOne(id);

    if (original.status !== JobStatus.FAILED) {
      throw new ConflictException(
        `Only failed jobs can be retried. Current status: ${original.status}`,
      );
    }

    // Create a new job based on the original
    const newJob = this.jobRepo.create({
      prompt: original.prompt,
      type: original.type,
      parameters: original.parameters,
      status: JobStatus.PENDING,
      retryCount: original.retryCount + 1,
      maxRetries: original.maxRetries,
    });

    const saved = await this.jobRepo.save(newJob);
    this.logger.log(`Retry job created: ${saved.id} from ${original.id}`);

    await this.queueProducer.publishGenerationJob({
      jobId: saved.id,
      type: saved.type,
      prompt: saved.prompt,
      parameters: saved.parameters,
    });

    saved.status = JobStatus.QUEUED;
    await this.jobRepo.save(saved);

    this.wsGateway.broadcastJobEvent(WS_EVENTS.JOB_CREATED, saved);

    return saved;
  }

  async cancel(id: string): Promise<GenerationJobEntity> {
    const job = await this.findOne(id);

    if (
      job.status !== JobStatus.PENDING &&
      job.status !== JobStatus.QUEUED
    ) {
      throw new ConflictException(
        `Only pending or queued jobs can be cancelled. Current status: ${job.status}`,
      );
    }

    job.status = JobStatus.CANCELLED;
    job.cancelledAt = new Date();
    const saved = await this.jobRepo.save(job);

    this.logger.log(`Job cancelled: ${saved.id}`);
    this.wsGateway.broadcastJobEvent(WS_EVENTS.JOB_STATUS, saved);

    return saved;
  }

  async handleStatusUpdate(update: JobStatusUpdateMessage): Promise<void> {
    const job = await this.jobRepo.findOne({ where: { id: update.jobId } });
    if (!job) {
      this.logger.warn(`Status update for unknown job: ${update.jobId}`);
      return;
    }

    // Don't update if already in a terminal state (cancelled takes priority)
    if (job.status === JobStatus.CANCELLED) {
      this.logger.log(`Ignoring update for cancelled job: ${job.id}`);
      return;
    }

    job.status = update.status;

    if (update.enhancedPrompt) job.enhancedPrompt = update.enhancedPrompt;
    if (update.provider) job.provider = update.provider;
    if (update.resultText) job.resultText = update.resultText;
    if (update.resultImageUrl) job.resultImageUrl = update.resultImageUrl;
    if (update.errorMessage) job.errorMessage = update.errorMessage;
    if (update.startedAt) job.startedAt = new Date(update.startedAt);
    if (update.completedAt) job.completedAt = new Date(update.completedAt);
    if (update.failedAt) job.failedAt = new Date(update.failedAt);

    await this.jobRepo.save(job);

    // Broadcast appropriate WS event
    const eventName =
      update.status === JobStatus.COMPLETED
        ? WS_EVENTS.JOB_COMPLETED
        : update.status === JobStatus.FAILED
          ? WS_EVENTS.JOB_FAILED
          : WS_EVENTS.JOB_STATUS;

    this.wsGateway.broadcastJobEvent(eventName, job);
  }
}
