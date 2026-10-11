// All three providers speak the OpenAI chat/embeddings API, so one client covers them;
// only the base URL, key and model names differ.
const PRESETS = {
  gemini: {
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    // flash-lite: about 3-5 s per form; the larger flash model took 25-40 s and is often busy on the free tier.
    model: 'gemini-flash-lite-latest',
    embedModel: 'gemini-embedding-001'
  },
  openai: { baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini', embedModel: 'text-embedding-3-small' },
  ollama: { baseUrl: 'http://localhost:11434/v1', model: 'qwen2.5:3b', embedModel: 'nomic-embed-text' }
} as const;

export type AIProviderName = keyof typeof PRESETS;

export type AIConfig = {
  provider: AIProviderName;
  baseUrl: string;
  apiKey: string;
  model: string;
  embedModel: string;
  timeoutMs: number;
};

export const readAIConfig = (env: NodeJS.ProcessEnv = process.env): AIConfig => {
  const requested = (env.AI_PROVIDER ?? 'gemini').toLowerCase();
  const provider: AIProviderName = requested in PRESETS ? (requested as AIProviderName) : 'gemini';
  const preset = PRESETS[provider];
  return {
    provider,
    baseUrl: (env.AI_BASE_URL || preset.baseUrl).replace(/\/+$/, ''),
    apiKey: env.AI_API_KEY ?? '',
    model: env.AI_MODEL || preset.model,
    embedModel: env.AI_EMBED_MODEL || preset.embedModel,
    timeoutMs: Number(env.AI_TIMEOUT_MS) > 0 ? Number(env.AI_TIMEOUT_MS) : 60_000
  };
};
