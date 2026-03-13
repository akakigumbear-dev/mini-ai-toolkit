import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { GenerationsService } from './generations.service';
import { CreateGenerationDto } from './dto/create-generation.dto';
import { QueryGenerationsDto } from './dto/query-generations.dto';

@Controller('generations')
export class GenerationsController {
  constructor(private readonly generationsService: GenerationsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateGenerationDto) {
    return this.generationsService.create(dto);
  }

  @Get()
  async findAll(@Query() query: QueryGenerationsDto) {
    return this.generationsService.findAll(query);
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.generationsService.findOne(id);
  }

  @Post(':id/retry')
  @HttpCode(HttpStatus.CREATED)
  async retry(@Param('id', ParseUUIDPipe) id: string) {
    return this.generationsService.retry(id);
  }

  @Post(':id/cancel')
  async cancel(@Param('id', ParseUUIDPipe) id: string) {
    return this.generationsService.cancel(id);
  }
}
