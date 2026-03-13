import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiProvider, GenerationResult } from './ai-provider.interface';

@Injectable()
export class PollinationsImageProvider implements AiProvider {
  readonly name = 'pollinations-image';
  private readonly logger = new Logger(PollinationsImageProvider.name);
  private readonly baseUrl: string;

  constructor(private readonly config: ConfigService) {
    this.baseUrl = this.config.get(
      'POLLINATIONS_IMAGE_URL',
      'https://image.pollinations.ai/prompt',
    );
  }

  async generate(prompt: string): Promise<GenerationResult> {
    const imageUrl = `${this.baseUrl}/${encodeURIComponent(prompt)}?width=512&height=512&nologo=true`;
    this.logger.log(`Calling Pollinations image API`);

    // Verify the URL is reachable (HEAD request)
    const response = await fetch(imageUrl, { method: 'HEAD' });

    if (!response.ok) {
      throw new Error(
        `Pollinations image API error: ${response.status} ${response.statusText}`,
      );
    }

    return { imageUrl, provider: this.name };
  }
}
