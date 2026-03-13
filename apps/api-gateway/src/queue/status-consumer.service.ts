import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqp-connection-manager';
import { ChannelWrapper } from 'amqp-connection-manager';
import { Channel, ConsumeMessage } from 'amqplib';
import {
  QUEUES,
  EXCHANGES,
  JobStatusUpdateMessage,
} from '@mini-ai-toolkit/shared-types';

@Injectable()
export class StatusConsumerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(StatusConsumerService.name);
  private connection: amqp.AmqpConnectionManager;
  private channel: ChannelWrapper;

  // Will be set by GenerationsModule after initialization
  private statusHandler: (update: JobStatusUpdateMessage) => Promise<void>;

  constructor(private readonly config: ConfigService) {}

  setStatusHandler(
    handler: (update: JobStatusUpdateMessage) => Promise<void>,
  ) {
    this.statusHandler = handler;
  }

  async onModuleInit() {
    const host = this.config.get('RABBITMQ_HOST', 'rabbitmq');
    const port = this.config.get('RABBITMQ_PORT', '5672');
    const user = this.config.get('RABBITMQ_USER', 'guest');
    const pass = this.config.get('RABBITMQ_PASSWORD', 'guest');
    const url = `amqp://${user}:${pass}@${host}:${port}`;

    this.connection = amqp.connect([url]);

    this.connection.on('connect', () => {
      this.logger.log('Status consumer connected to RabbitMQ');
    });

    this.channel = this.connection.createChannel({
      setup: async (ch: Channel) => {
        await ch.assertExchange(EXCHANGES.STATUS, 'fanout', { durable: true });
        await ch.assertQueue(QUEUES.STATUS_UPDATES, { durable: true });
        await ch.bindQueue(QUEUES.STATUS_UPDATES, EXCHANGES.STATUS, '');
        await ch.prefetch(1);

        await ch.consume(QUEUES.STATUS_UPDATES, (msg: ConsumeMessage | null) => {
          if (!msg) return;
          this.handleMessage(msg, ch);
        });
      },
    });

    this.logger.log('Status consumer listening');
  }

  private async handleMessage(msg: ConsumeMessage, ch: Channel) {
    try {
      const update: JobStatusUpdateMessage = JSON.parse(
        msg.content.toString(),
      );
      this.logger.log(
        `Status update received: ${update.jobId} → ${update.status}`,
      );

      if (this.statusHandler) {
        await this.statusHandler(update);
      }

      ch.ack(msg);
    } catch (error) {
      this.logger.error('Failed to process status update', error);
      ch.nack(msg, false, false); // Don't requeue poison messages
    }
  }

  async onModuleDestroy() {
    await this.channel?.close();
    await this.connection?.close();
  }
}
