import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqp-connection-manager';
import { ChannelWrapper } from 'amqp-connection-manager';
import { Channel } from 'amqplib';
import {
  EXCHANGES,
  QUEUES,
  JobStatusUpdateMessage,
} from '@mini-ai-toolkit/shared-types';

@Injectable()
export class StatusPublisherService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(StatusPublisherService.name);
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
      this.logger.log('Status publisher connected to RabbitMQ');
    });

    this.channel = this.connection.createChannel({
      setup: async (ch: Channel) => {
        await ch.assertExchange(EXCHANGES.STATUS, 'fanout', { durable: true });
        await ch.assertQueue(QUEUES.STATUS_UPDATES, { durable: true });
        await ch.bindQueue(QUEUES.STATUS_UPDATES, EXCHANGES.STATUS, '');
      },
    });

    await this.channel.waitForConnect();
    this.logger.log('Status publisher channel ready');
  }

  async publish(update: JobStatusUpdateMessage): Promise<void> {
    await this.channel.publish(
      EXCHANGES.STATUS,
      '',
      Buffer.from(JSON.stringify(update)),
      { persistent: true },
    );
    this.logger.log(
      `Published status update: ${update.jobId} → ${update.status}`,
    );
  }

  async onModuleDestroy() {
    await this.channel?.close();
    await this.connection?.close();
  }
}
