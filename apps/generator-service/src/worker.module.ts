import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GenerationJobEntity } from './entities/generation-job.entity';
import { GenerationService } from './generation/generation.service';
import { JobConsumerService } from './consumer/job-consumer.service';
import { StatusPublisherService } from './status/status-publisher.service';
import { EnhancementService } from './enhancement/enhancement.service';
import { PollinationsTextProvider } from './providers/pollinations-text.provider';
import { PollinationsImageProvider } from './providers/pollinations-image.provider';
import { MockTextProvider } from './providers/mock-text.provider';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('POSTGRES_HOST', 'localhost'),
        port: parseInt(config.get('POSTGRES_PORT', '5432'), 10),
        username: config.get('POSTGRES_USER', 'toolkit'),
        password: config.get('POSTGRES_PASSWORD', 'toolkit_secret'),
        database: config.get('POSTGRES_DB', 'mini_ai_toolkit'),
        entities: [GenerationJobEntity],
        synchronize: false, // Gateway handles schema sync
        logging: false,
      }),
    }),

    TypeOrmModule.forFeature([GenerationJobEntity]),
  ],
  providers: [
    GenerationService,
    JobConsumerService,
    StatusPublisherService,
    EnhancementService,
    PollinationsTextProvider,
    PollinationsImageProvider,
    MockTextProvider,
  ],
})
export class WorkerModule {}
