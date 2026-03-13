import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { JobType } from '@mini-ai-toolkit/shared-types';

export class CreateGenerationDto {
  @IsString()
  @IsNotEmpty({ message: 'Prompt cannot be empty' })
  @MinLength(1, { message: 'Prompt must be at least 1 character' })
  @MaxLength(2000, { message: 'Prompt must be at most 2000 characters' })
  prompt: string;

  @IsEnum(JobType, { message: 'Type must be either "text" or "image"' })
  type: JobType;

  @IsOptional()
  parameters?: Record<string, unknown>;
}
