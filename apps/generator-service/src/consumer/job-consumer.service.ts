import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqp-connection-manager';
import { ChannelWrapper } from 'amqp-connection-manager';
import { Channel, ConsumeMessage } from 'amqplib';
import {
  QUEUES,
  EXCHANGES,
  GenerationJobMessage,
} from '@mini-ai-toolkit/shared-types';
import { GenerationService } from '../generation/generation.service';

@Injectable()
export class JobConsumerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(JobConsumerService.name);
  private connection: amqp.AmqpConnectionManager;
  private channel: ChannelWrapper;

  constructor(
    private readonly config: ConfigService,
    private readonly generationService: GenerationService,
  ) {}

  async onModuleInit() {
    const host = this.config.get('RABBITMQ_HOST', 'rabbitmq');
    const port = this.config.get('RABBITMQ_PORT', '5672');
    const user = this.config.get('RABBITMQ_USER', 'guest');
    const pass = this.config.get('RABBITMQ_PASSWORD', 'guest');
    const url = `amqp://${user}:${pass}@${host}:${port}`;

    this.connection = amqp.connect([url]);

    this.connection.on('connect', () => {
      this.logger.log('Job consumer connected to RabbitMQ');
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
        await ch.prefetch(1);

        await ch.consume(
          QUEUES.GENERATION_JOBS,
          (msg: ConsumeMessage | null) => {
            if (!msg) return;
            this.handleMessage(msg, ch);
          },
        );

        this.logger.log('Job consumer listening on generation_jobs queue');
      },
    });
  }

  private async handleMessage(msg: ConsumeMessage, ch: Channel) {
    try {
      const job: GenerationJobMessage = JSON.parse(msg.content.toString());
      this.logger.log(`Received job: ${job.jobId}`);

      await this.generationService.processJob(job);

      ch.ack(msg);
      this.logger.log(`Job ${job.jobId} acknowledged`);
    } catch (error) {
      this.logger.error(
        `Failed to process job message: ${error instanceof Error ? error.message : error}`,
      );
      // Don't requeue — failure is recorded in DB, user can retry
      ch.nack(msg, false, false);
    }
  }

  async onModuleDestroy() {
    await this.channel?.close();
    await this.connection?.close();
  }
}
