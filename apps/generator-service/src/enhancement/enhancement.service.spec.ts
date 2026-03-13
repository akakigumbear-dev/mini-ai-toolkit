import { EnhancementService } from './enhancement.service';
import { JobType } from '@mini-ai-toolkit/shared-types';

describe('EnhancementService', () => {
  let service: EnhancementService;

  beforeEach(() => {
    service = new EnhancementService();
  });

  it('should enhance text prompts with system instructions', () => {
    const result = service.enhance('What is TypeScript?', JobType.TEXT);

    expect(result).toContain('What is TypeScript?');
    expect(result).toContain('helpful');
    expect(result).toContain('User request:');
  });

  it('should enhance image prompts with quality modifiers', () => {
    const result = service.enhance('A sunset over mountains', JobType.IMAGE);

    expect(result).toContain('A sunset over mountains');
    expect(result).toContain('high quality');
    expect(result).toContain('4k');
  });

  it('should preserve the original prompt in both types', () => {
    const textResult = service.enhance('test prompt', JobType.TEXT);
    const imageResult = service.enhance('test prompt', JobType.IMAGE);

    expect(textResult).toContain('test prompt');
    expect(imageResult).toContain('test prompt');
  });
});
