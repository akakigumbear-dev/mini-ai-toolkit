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
    // Use OpenAI-compatible POST endpoint — handles long/multiline prompts
    const url = `${this.baseUrl}/openai`;
    this.logger.log('Calling Pollinations text API (POST /openai)');

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'openai',
        messages: [
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Pollinations text API error: ${response.status} ${response.statusText}`,
      );
    }

    const data = (await response.json()) as Record<string, unknown>;

    // OpenAI-compatible response format
    const choices = data?.choices as Array<{ message?: { content?: string } }> | undefined;
    const text = choices?.[0]?.message?.content;

    if (!text || text.trim().length === 0) {
      throw new Error('Pollinations returned empty response');
    }

    return { text: text.trim(), provider: this.name };
  }
}
