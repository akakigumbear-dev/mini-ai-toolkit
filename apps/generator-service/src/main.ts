import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { WorkerModule } from './worker.module';

async function bootstrap() {
  const logger = new Logger('GeneratorService');

  // Standalone application — no HTTP server, just RabbitMQ consumers
  const app = await NestFactory.createApplicationContext(WorkerModule);

  app.enableShutdownHooks();

  logger.log('Generator service is running (AMQP consumer)');
}

bootstrap();
