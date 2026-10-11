import type { z } from 'zod';
import { AppError } from '../errors.js';

export type StructuredRequest = {
  /** Short identifier for the output schema, e.g. "generated_form". */
  name: string;
  system: string;
  user: string;
  temperature?: number;
};

/**
 * Every model call in FormForge goes through this interface, so services never
 * depend on a particular vendor. Implementations must return data that already
 * passed the given zod schema.
 */
export interface AIProvider {
  readonly name: string;
  generateStructured<T>(schema: z.ZodType<T>, request: StructuredRequest): Promise<T>;
  embed(texts: string[]): Promise<number[][]>;
}

export type AIErrorCode = 'AI_NOT_CONFIGURED' | 'AI_RATE_LIMITED' | 'AI_UNAVAILABLE' | 'AI_INVALID_OUTPUT';

const STATUS: Record<AIErrorCode, number> = {
  AI_NOT_CONFIGURED: 503,
  AI_RATE_LIMITED: 503,
  AI_UNAVAILABLE: 502,
  AI_INVALID_OUTPUT: 502
};

export class AIError extends AppError {
  constructor(code: AIErrorCode, message: string, details?: unknown) {
    super(code, message, STATUS[code], details);
    this.name = 'AIError';
  }
}
