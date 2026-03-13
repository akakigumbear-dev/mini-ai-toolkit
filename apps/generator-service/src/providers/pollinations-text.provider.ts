import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiProvider, GenerationResult } from './ai-provider.interface';

@Injectable()
export class PollinationsTextProvider implements AiProvider {
  readonly name = 'pollinations-text';
  private readonly logger = new Logger(PollinationsTextProvider.name);
  private readonly baseUrl: string;

  constructor(private readonly config: ConfigService) {
    this.baseUrl = this.config.get(
      'POLLINATIONS_TEXT_URL',
      'https://text.pollinations.ai',
    );
  }

  async generate(prompt: string): Promise<GenerationResult> {
    const url = `${this.baseUrl}/${encodeURIComponent(prompt)}`;
    this.logger.log(`Calling Pollinations text API`);

    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'text/plain' },
    });

    if (!response.ok) {
      throw new Error(
        `Pollinations text API error: ${response.status} ${response.statusText}`,
      );
    }

    const text = await response.text();

    if (!text || text.trim().length === 0) {
      throw new Error('Pollinations returned empty response');
    }

    return { text: text.trim(), provider: this.name };
  }
}
