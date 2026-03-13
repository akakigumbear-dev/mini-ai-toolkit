import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { GenerationService } from './generation.service';
import { GenerationJobEntity } from '../entities/generation-job.entity';
import { EnhancementService } from '../enhancement/enhancement.service';
import { PollinationsTextProvider } from '../providers/pollinations-text.provider';
import { PollinationsImageProvider } from '../providers/pollinations-image.provider';
import { MockTextProvider } from '../providers/mock-text.provider';
import { StatusPublisherService } from '../status/status-publisher.service';
import { JobStatus, JobType } from '@mini-ai-toolkit/shared-types';

describe('GenerationService', () => {
  let service: GenerationService;

  const mockJobRepo = {
    findOne: jest.fn(),
  };

  const mockEnhancement = {
    enhance: jest.fn().mockReturnValue('enhanced prompt'),
  };

  const mockPollinationsText = {
    name: 'pollinations-text',
    generate: jest.fn(),
  };

  const mockPollinationsImage = {
    name: 'pollinations-image',
    generate: jest.fn(),
  };

  const mockTextProvider = {
    name: 'mock-text',
    generate: jest.fn(),
  };

  const mockStatusPublisher = {
    publish: jest.fn().mockResolvedValue(undefined),
  };

  const mockConfig = {
    get: jest.fn().mockReturnValue('10000'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GenerationService,
        { provide: ConfigService, useValue: mockConfig },
        {
          provide: getRepositoryToken(GenerationJobEntity),
          useValue: mockJobRepo,
        },
        { provide: EnhancementService, useValue: mockEnhancement },
        { provide: PollinationsTextProvider, useValue: mockPollinationsText },
        { provide: PollinationsImageProvider, useValue: mockPollinationsImage },
        { provide: MockTextProvider, useValue: mockTextProvider },
        { provide: StatusPublisherService, useValue: mockStatusPublisher },
      ],
    }).compile();

    service = module.get<GenerationService>(GenerationService);
  });

  describe('processJob', () => {
    it('should process a text generation job successfully', async () => {
      const message = {
        jobId: 'uuid-1',
        type: JobType.TEXT,
        prompt: 'Hello world',
        parameters: null,
      };

      mockJobRepo.findOne.mockResolvedValue({
        id: 'uuid-1',
        status: JobStatus.QUEUED,
      });

      mockPollinationsText.generate.mockResolvedValue({
        text: 'Generated text',
        provider: 'pollinations-text',
      });

      await service.processJob(message);

      // Should emit generating status
      expect(mockStatusPublisher.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          jobId: 'uuid-1',
          status: JobStatus.GENERATING,
        }),
      );

      // Should enhance the prompt
      expect(mockEnhancement.enhance).toHaveBeenCalledWith(
        'Hello world',
        JobType.TEXT,
      );

      // Should emit completed status with result
      expect(mockStatusPublisher.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          jobId: 'uuid-1',
          status: JobStatus.COMPLETED,
          resultText: 'Generated text',
          provider: 'pollinations-text',
        }),
      );
    });

    it('should process an image generation job successfully', async () => {
      const message = {
        jobId: 'uuid-2',
        type: JobType.IMAGE,
        prompt: 'A sunset',
        parameters: null,
      };

      mockJobRepo.findOne.mockResolvedValue({
        id: 'uuid-2',
        status: JobStatus.QUEUED,
      });

      mockPollinationsImage.generate.mockResolvedValue({
        imageUrl: 'https://image.pollinations.ai/prompt/sunset',
        provider: 'pollinations-image',
      });

      await service.processJob(message);

      expect(mockStatusPublisher.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          jobId: 'uuid-2',
          status: JobStatus.COMPLETED,
          resultImageUrl: 'https://image.pollinations.ai/prompt/sunset',
        }),
      );
    });

    it('should skip cancelled jobs', async () => {
      const message = {
        jobId: 'uuid-3',
        type: JobType.TEXT,
        prompt: 'test',
        parameters: null,
      };

      mockJobRepo.findOne.mockResolvedValue({
        id: 'uuid-3',
        status: JobStatus.CANCELLED,
      });

      await service.processJob(message);

      expect(mockStatusPublisher.publish).not.toHaveBeenCalled();
      expect(mockPollinationsText.generate).not.toHaveBeenCalled();
    });

    it('should fall back to mock provider on text generation failure', async () => {
      const message = {
        jobId: 'uuid-4',
        type: JobType.TEXT,
        prompt: 'test',
        parameters: null,
      };

      mockJobRepo.findOne.mockResolvedValue({
        id: 'uuid-4',
        status: JobStatus.QUEUED,
      });

      mockPollinationsText.generate.mockRejectedValue(
        new Error('API unavailable'),
      );

      mockTextProvider.generate.mockResolvedValue({
        text: 'Mock text result',
        provider: 'mock-text',
      });

      await service.processJob(message);

      expect(mockTextProvider.generate).toHaveBeenCalled();
      expect(mockStatusPublisher.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          jobId: 'uuid-4',
          status: JobStatus.COMPLETED,
          provider: 'mock-text',
        }),
      );
    });

    it('should emit failed status when all providers fail', async () => {
      const message = {
        jobId: 'uuid-5',
        type: JobType.IMAGE,
        prompt: 'test',
        parameters: null,
      };

      mockJobRepo.findOne.mockResolvedValue({
        id: 'uuid-5',
        status: JobStatus.QUEUED,
      });

      mockPollinationsImage.generate.mockRejectedValue(
        new Error('Image API down'),
      );

      await service.processJob(message);

      expect(mockStatusPublisher.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          jobId: 'uuid-5',
          status: JobStatus.FAILED,
          errorMessage: 'Image API down',
        }),
      );
    });
  });
});
