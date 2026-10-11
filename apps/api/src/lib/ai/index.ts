import { readAIConfig } from './config.js';
import { OpenAICompatibleProvider } from './openai-compatible.provider.js';
import type { AIProvider } from './provider.js';

export { AIError, type AIProvider, type StructuredRequest } from './provider.js';

let instance: AIProvider | null = null;

/** Lazily built so the API (and the tests) start fine without an AI key. */
export const getAIProvider = (): AIProvider => {
  instance ??= new OpenAICompatibleProvider(readAIConfig());
  return instance;
};

/** Test hook: swap in a fake provider. */
export const setAIProvider = (provider: AIProvider | null) => {
  instance = provider;
};
