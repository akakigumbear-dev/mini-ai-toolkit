import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GenerationJobEntity } from './entities/generation-job.entity';
import { GenerationsController } from './generations.controller';
import { GenerationsService } from './generations.service';
import { StatusConsumerService } from '../queue/status-consumer.service';

@Module({
  imports: [TypeOrmModule.forFeature([GenerationJobEntity])],
  controllers: [GenerationsController],
  providers: [GenerationsService],
  exports: [GenerationsService],
})
export class GenerationsModule implements OnModuleInit {
  constructor(
    private readonly generationsService: GenerationsService,
    private readonly statusConsumer: StatusConsumerService,
  ) {}

  onModuleInit() {
    // Wire up the status consumer to the generations service
    this.statusConsumer.setStatusHandler(
      this.generationsService.handleStatusUpdate.bind(this.generationsService),
    );
  }
}
