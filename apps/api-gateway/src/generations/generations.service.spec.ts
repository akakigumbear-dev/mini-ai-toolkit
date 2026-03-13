import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { GenerationsService } from './generations.service';
import { GenerationJobEntity } from './entities/generation-job.entity';
import { QueueProducerService } from '../queue/queue-producer.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { JobStatus, JobType } from '@mini-ai-toolkit/shared-types';

describe('GenerationsService', () => {
  let service: GenerationsService;

  const mockRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockQueueProducer = {
    publishGenerationJob: jest.fn().mockResolvedValue(undefined),
  };

  const mockWsGateway = {
    broadcastJobEvent: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GenerationsService,
        {
          provide: getRepositoryToken(GenerationJobEntity),
          useValue: mockRepo,
        },
        {
          provide: QueueProducerService,
          useValue: mockQueueProducer,
        },
        {
          provide: WebsocketGateway,
          useValue: mockWsGateway,
        },
      ],
    }).compile();

    service = module.get<GenerationsService>(GenerationsService);
  });

  describe('create', () => {
    it('should create a job and publish to queue', async () => {
      const dto = { prompt: 'Test prompt', type: JobType.TEXT };
      const mockJob = {
        id: 'uuid-1',
        prompt: 'Test prompt',
        type: JobType.TEXT,
        status: JobStatus.PENDING,
        parameters: null,
      };

      mockRepo.create.mockReturnValue(mockJob);
      mockRepo.save.mockResolvedValue(mockJob);

      const result = await service.create(dto);

      expect(mockRepo.create).toHaveBeenCalledWith({
        prompt: 'Test prompt',
        type: JobType.TEXT,
        parameters: null,
        status: JobStatus.PENDING,
      });
      expect(mockQueueProducer.publishGenerationJob).toHaveBeenCalledWith({
        jobId: 'uuid-1',
        type: JobType.TEXT,
        prompt: 'Test prompt',
        parameters: null,
      });
      expect(mockWsGateway.broadcastJobEvent).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('findOne', () => {
    it('should return a job by id', async () => {
      const mockJob = { id: 'uuid-1', prompt: 'test' };
      mockRepo.findOne.mockResolvedValue(mockJob);

      const result = await service.findOne('uuid-1');
      expect(result).toEqual(mockJob);
    });

    it('should throw NotFoundException for missing job', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne('missing-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('retry', () => {
    it('should create a new job from a failed job', async () => {
      const failedJob = {
        id: 'uuid-1',
        prompt: 'test',
        type: JobType.TEXT,
        status: JobStatus.FAILED,
        parameters: null,
        retryCount: 0,
        maxRetries: 3,
      };

      const newJob = {
        ...failedJob,
        id: 'uuid-2',
        status: JobStatus.PENDING,
        retryCount: 1,
      };

      mockRepo.findOne.mockResolvedValue(failedJob);
      mockRepo.create.mockReturnValue(newJob);
      mockRepo.save.mockResolvedValue(newJob);

      const result = await service.retry('uuid-1');

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: 'test',
          retryCount: 1,
          status: JobStatus.PENDING,
        }),
      );
      expect(mockQueueProducer.publishGenerationJob).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw ConflictException for non-failed job', async () => {
      const activeJob = {
        id: 'uuid-1',
        status: JobStatus.GENERATING,
      };

      mockRepo.findOne.mockResolvedValue(activeJob);

      await expect(service.retry('uuid-1')).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('cancel', () => {
    it('should cancel a pending job', async () => {
      const pendingJob = {
        id: 'uuid-1',
        status: JobStatus.PENDING,
        cancelledAt: null,
      };

      mockRepo.findOne.mockResolvedValue(pendingJob);
      mockRepo.save.mockImplementation((job) => Promise.resolve(job));

      const result = await service.cancel('uuid-1');

      expect(result.status).toBe(JobStatus.CANCELLED);
      expect(result.cancelledAt).toBeDefined();
      expect(mockWsGateway.broadcastJobEvent).toHaveBeenCalled();
    });

    it('should cancel a queued job', async () => {
      const queuedJob = {
        id: 'uuid-1',
        status: JobStatus.QUEUED,
        cancelledAt: null,
      };

      mockRepo.findOne.mockResolvedValue(queuedJob);
      mockRepo.save.mockImplementation((job) => Promise.resolve(job));

      const result = await service.cancel('uuid-1');
      expect(result.status).toBe(JobStatus.CANCELLED);
    });

    it('should throw ConflictException for generating job', async () => {
      const generatingJob = {
        id: 'uuid-1',
        status: JobStatus.GENERATING,
      };

      mockRepo.findOne.mockResolvedValue(generatingJob);

      await expect(service.cancel('uuid-1')).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw ConflictException for completed job', async () => {
      const completedJob = {
        id: 'uuid-1',
        status: JobStatus.COMPLETED,
      };

      mockRepo.findOne.mockResolvedValue(completedJob);

      await expect(service.cancel('uuid-1')).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('handleStatusUpdate', () => {
    it('should update job status from worker event', async () => {
      const job = {
        id: 'uuid-1',
        status: JobStatus.QUEUED,
      };

      mockRepo.findOne.mockResolvedValue(job);
      mockRepo.save.mockImplementation((j) => Promise.resolve(j));

      await service.handleStatusUpdate({
        jobId: 'uuid-1',
        status: JobStatus.GENERATING,
        startedAt: new Date().toISOString(),
      });

      expect(mockRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: JobStatus.GENERATING }),
      );
      expect(mockWsGateway.broadcastJobEvent).toHaveBeenCalled();
    });

    it('should not update cancelled jobs', async () => {
      const job = {
        id: 'uuid-1',
        status: JobStatus.CANCELLED,
      };

      mockRepo.findOne.mockResolvedValue(job);

      await service.handleStatusUpdate({
        jobId: 'uuid-1',
        status: JobStatus.GENERATING,
      });

      expect(mockRepo.save).not.toHaveBeenCalled();
    });
  });
});
