import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqp-connection-manager';
import { ChannelWrapper } from 'amqp-connection-manager';
import { Channel } from 'amqplib';
import {
  QUEUES,
  EXCHANGES,
  GenerationJobMessage,
} from '@mini-ai-toolkit/shared-types';

@Injectable()
export class QueueProducerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QueueProducerService.name);
  private connection: amqp.AmqpConnectionManager;
  private channel: ChannelWrapper;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    const host = this.config.get('RABBITMQ_HOST', 'rabbitmq');
    const port = this.config.get('RABBITMQ_PORT', '5672');
    const user = this.config.get('RABBITMQ_USER', 'guest');
    const pass = this.config.get('RABBITMQ_PASSWORD', 'guest');
    const url = `amqp://${user}:${pass}@${host}:${port}`;

    this.connection = amqp.connect([url]);

    this.connection.on('connect', () => {
      this.logger.log('Producer connected to RabbitMQ');
    });

    this.connection.on('disconnect', (params: { err?: Error }) => {
      this.logger.warn('Producer disconnected from RabbitMQ', params?.err?.message);
    });

    this.channel = this.connection.createChannel({
      setup: async (ch: Channel) => {
        await ch.assertExchange(EXCHANGES.GENERATION, 'direct', {
          durable: true,
        });
        await ch.assertQueue(QUEUES.GENERATION_JOBS, { durable: true });
        await ch.bindQueue(
          QUEUES.GENERATION_JOBS,
          EXCHANGES.GENERATION,
          'process',
        );
      },
    });

    await this.channel.waitForConnect();
    this.logger.log('Producer channel ready');
  }

  async publishGenerationJob(message: GenerationJobMessage): Promise<void> {
    await this.channel.publish(
      EXCHANGES.GENERATION,
      'process',
      Buffer.from(JSON.stringify(message)),
      { persistent: true },
    );
    this.logger.log(`Published generation job: ${message.jobId}`);
  }

  async onModuleDestroy() {
    await this.channel?.close();
    await this.connection?.close();
  }
}
