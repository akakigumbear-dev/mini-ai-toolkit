import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { WsAwareThrottlerGuard } from './throttle/ws-throttler.guard';
import { GenerationJobEntity } from './generations/entities/generation-job.entity';
import { GenerationsModule } from './generations/generations.module';
import { QueueModule } from './queue/queue.module';
import { WebsocketModule } from './websocket/websocket.module';
import { HealthModule } from './health/health.module';

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
        synchronize: true, // Fine for a take-home; use migrations in production
        logging: false,
      }),
    }),

    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: parseInt(config.get('THROTTLE_TTL', '60'), 10) * 1000,
            limit: parseInt(config.get('THROTTLE_LIMIT', '10'), 10),
          },
        ],
      }),
    }),

    QueueModule,
    WebsocketModule,
    GenerationsModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: WsAwareThrottlerGuard,
    },
  ],
})
export class AppModule {}
