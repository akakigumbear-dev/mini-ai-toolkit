import { Module, Global } from '@nestjs/common';
import { QueueProducerService } from './queue-producer.service';
import { StatusConsumerService } from './status-consumer.service';

@Global()
@Module({
  providers: [QueueProducerService, StatusConsumerService],
  exports: [QueueProducerService, StatusConsumerService],
})
export class QueueModule {}
