import { Injectable, Logger } from '@nestjs/common';
import { JobType } from '@mini-ai-toolkit/shared-types';

@Injectable()
export class EnhancementService {
  private readonly logger = new Logger(EnhancementService.name);

  enhance(prompt: string, type: JobType): string {
    const enhanced =
      type === JobType.TEXT
        ? this.enhanceTextPrompt(prompt)
        : this.enhanceImagePrompt(prompt);

    this.logger.log(`Prompt enhanced for ${type} generation`);
    return enhanced;
  }

  private enhanceTextPrompt(prompt: string): string {
    return [
      'You are a helpful, knowledgeable assistant.',
      'Provide a clear, well-structured, and informative response.',
      'Be concise but thorough.',
      '',
      `User request: ${prompt}`,
    ].join('\n');
  }

  private enhanceImagePrompt(prompt: string): string {
    return `${prompt}, high quality, detailed, professional, 4k, vibrant colors`;
  }
}
