export interface GenerationResult {
  text?: string;
  imageUrl?: string;
  provider: string;
}

export interface AiProvider {
  readonly name: string;
  generate(prompt: string): Promise<GenerationResult>;
}
