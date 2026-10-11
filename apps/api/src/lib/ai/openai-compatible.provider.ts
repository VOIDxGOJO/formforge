import type { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import type { AIConfig } from './config.js';
import { AIError, type AIProvider, type StructuredRequest } from './provider.js';

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };
type FetchFn = typeof fetch;
type SleepFn = (ms: number) => Promise<void>;

/** Free tiers return 503 when a model is briefly overloaded; one retry usually succeeds. */
const RETRY_STATUSES = new Set([500, 503]);
const RETRY_DELAY_MS = 1500;

/** Number of extra attempts after the first one when the output fails validation. */
const MAX_REPAIRS = 2;

// Providers differ in which JSON Schema keywords their structured-output mode accepts
// (Gemini rejects minLength, pattern, minimum, anyOf, ...). The model gets the structure
// only; the full zod schema still validates the reply and drives the repair loop.
const STRUCTURAL_KEYWORDS = new Set(['type', 'properties', 'items', 'required', 'enum', 'additionalProperties', 'description']);

type JsonNode = Record<string, unknown>;

export const toStructuralSchema = (node: unknown): unknown => {
  if (Array.isArray(node)) return node.map(toStructuralSchema);
  if (!node || typeof node !== 'object') return node;
  const obj = node as JsonNode;
  if (Array.isArray(obj.anyOf)) {
    const variants = obj.anyOf as JsonNode[];
    const nonNull = variants.filter((s) => s.type !== 'null');
    if (nonNull.length === 1 && nonNull.length < variants.length) {
      const inner = toStructuralSchema(nonNull[0]) as JsonNode;
      return { ...inner, type: [inner.type, 'null'] };
    }
  }
  const out: JsonNode = {};
  for (const [key, value] of Object.entries(obj)) {
    if (!STRUCTURAL_KEYWORDS.has(key)) continue;
    out[key] =
      key === 'properties'
        ? Object.fromEntries(Object.entries(value as JsonNode).map(([p, s]) => [p, toStructuralSchema(s)]))
        : toStructuralSchema(value);
  }
  return out;
};

const toJsonSchema = (schema: z.ZodTypeAny) =>
  toStructuralSchema(zodToJsonSchema(schema, { target: 'openAi' })) as JsonNode;

const parseJson = (text: string): unknown => {
  // Some models wrap JSON in a ```json fence even in JSON mode.
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  return JSON.parse(cleaned);
};

/** Works with any OpenAI-compatible endpoint: Gemini, OpenAI, Ollama, Groq, ... */
export class OpenAICompatibleProvider implements AIProvider {
  readonly name: string;

  constructor(
    private readonly config: AIConfig,
    private readonly fetchFn: FetchFn = fetch,
    private readonly sleep: SleepFn = (ms) => new Promise((r) => setTimeout(r, ms))
  ) {
    this.name = config.provider;
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    if (!this.config.apiKey && this.config.provider !== 'ollama') {
      throw new AIError('AI_NOT_CONFIGURED', 'AI is not configured. Set AI_API_KEY in apps/api/.env.');
    }
    const send = async () => {
      try {
        return await this.fetchFn(`${this.config.baseUrl}${path}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(this.config.apiKey ? { Authorization: `Bearer ${this.config.apiKey}` } : {})
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(this.config.timeoutMs)
        });
      } catch (err) {
        const timedOut = err instanceof Error && err.name === 'TimeoutError';
        throw new AIError('AI_UNAVAILABLE', timedOut ? 'The AI provider did not respond in time.' : 'Could not reach the AI provider.');
      }
    };
    let res = await send();
    if (RETRY_STATUSES.has(res.status)) {
      await this.sleep(RETRY_DELAY_MS);
      res = await send();
    }
    if (res.status === 429) {
      throw new AIError('AI_RATE_LIMITED', 'The AI provider is rate limiting requests. Try again in a minute.');
    }
    if (res.status === 401 || res.status === 403) {
      throw new AIError('AI_NOT_CONFIGURED', 'The AI provider rejected the API key.');
    }
    if (!res.ok) {
      // Short excerpt of the provider's message for logs; never includes our request or key.
      const excerpt = (await res.text().catch(() => '')).slice(0, 300);
      throw new AIError('AI_UNAVAILABLE', `The AI provider returned an error (HTTP ${res.status}).`, {
        providerStatus: res.status,
        providerMessage: excerpt
      });
    }
    return (await res.json()) as T;
  }

  async generateStructured<T>(schema: z.ZodType<T>, request: StructuredRequest): Promise<T> {
    const messages: ChatMessage[] = [
      { role: 'system', content: request.system },
      { role: 'user', content: request.user }
    ];
    const responseFormat = {
      type: 'json_schema',
      json_schema: { name: request.name, strict: true, schema: toJsonSchema(schema as z.ZodTypeAny) }
    };

    let lastProblem = '';
    for (let attempt = 0; attempt <= MAX_REPAIRS; attempt++) {
      const data = await this.post<{ choices?: Array<{ message?: { content?: string | null } }> }>(
        '/chat/completions',
        {
          model: this.config.model,
          messages,
          temperature: request.temperature ?? 0.2,
          response_format: responseFormat
        }
      );
      const text = data.choices?.[0]?.message?.content ?? '';
      let candidate: unknown;
      try {
        candidate = parseJson(text);
      } catch {
        lastProblem = 'The reply was not valid JSON.';
        messages.push({ role: 'assistant', content: text }, { role: 'user', content: `${lastProblem} Return only the JSON object.` });
        continue;
      }
      const parsed = schema.safeParse(candidate);
      if (parsed.success) return parsed.data;
      lastProblem = parsed.error.issues
        .slice(0, 8)
        .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
        .join('; ');
      messages.push(
        { role: 'assistant', content: text },
        { role: 'user', content: `Fix these problems and return the corrected JSON only: ${lastProblem}` }
      );
    }
    throw new AIError('AI_INVALID_OUTPUT', 'The AI model did not return a valid result. Try rephrasing the request.', {
      problem: lastProblem
    });
  }

  async embed(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    const data = await this.post<{ data?: Array<{ index: number; embedding: number[] }> }>('/embeddings', {
      model: this.config.embedModel,
      input: texts
    });
    const rows = data.data ?? [];
    if (rows.length !== texts.length) {
      throw new AIError('AI_INVALID_OUTPUT', 'The AI provider returned the wrong number of embeddings.');
    }
    return [...rows].sort((a, b) => a.index - b.index).map((r) => r.embedding);
  }
}
