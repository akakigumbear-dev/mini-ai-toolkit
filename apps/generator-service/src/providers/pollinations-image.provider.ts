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
    const imageUrl = `${this.baseUrl}/${encodeURIComponent(prompt)}?width=512&height=512&nologo=true&seed=${Date.now()}`;
    this.logger.log('Fetching image from Pollinations (warms cache)');

    // Fetch the image to trigger generation and warm Pollinations' cache.
    // When the browser later loads the same URL, the image is ready instantly.
    const response = await fetch(imageUrl);

    if (!response.ok) {
      throw new Error(
        `Pollinations image API error: ${response.status} ${response.statusText}`,
      );
    }

    // Consume body to complete the request
    await response.arrayBuffer();

    this.logger.log('Image generated and cached at Pollinations');
    return { imageUrl, provider: this.name };
  }
}
