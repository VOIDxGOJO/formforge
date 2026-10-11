import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { readAIConfig } from '../src/lib/ai/config.js';
import { OpenAICompatibleProvider, toStructuralSchema } from '../src/lib/ai/openai-compatible.provider.js';

const config = readAIConfig({ AI_PROVIDER: 'gemini', AI_API_KEY: 'test-key' });
const schema = z.object({ name: z.string().min(3), score: z.number().min(0).max(1) });
const request = { name: 'thing', system: 'sys', user: 'usr' };

const reply = (content: string, status = 200) =>
  new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status });

describe('readAIConfig', () => {
  it('defaults to Gemini and accepts overrides', () => {
    expect(readAIConfig({}).provider).toBe('gemini');
    expect(readAIConfig({}).baseUrl).toContain('generativelanguage.googleapis.com');
    const custom = readAIConfig({ AI_PROVIDER: 'ollama', AI_MODEL: 'llama3.2:3b', AI_BASE_URL: 'http://box:11434/v1/' });
    expect(custom).toMatchObject({ provider: 'ollama', model: 'llama3.2:3b', baseUrl: 'http://box:11434/v1' });
  });
});

describe('OpenAICompatibleProvider.generateStructured', () => {
  it('returns validated data and sends a structural schema', async () => {
    const fetchFn = vi.fn().mockResolvedValue(reply('{"name":"Survey","score":0.5}'));
    const provider = new OpenAICompatibleProvider(config, fetchFn);
    await expect(provider.generateStructured(schema, request)).resolves.toEqual({ name: 'Survey', score: 0.5 });
    const body = JSON.parse(fetchFn.mock.calls[0]![1].body);
    expect(body.response_format.json_schema.schema.properties.score).toEqual({ type: 'number' });
    expect(fetchFn.mock.calls[0]![1].headers.Authorization).toBe('Bearer test-key');
  });

  it('feeds validation errors back to the model and accepts the repaired reply', async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(reply('{"name":"Survey","score":7}'))
      .mockResolvedValueOnce(reply('```json\n{"name":"Survey","score":0.7}\n```'));
    const provider = new OpenAICompatibleProvider(config, fetchFn);
    await expect(provider.generateStructured(schema, request)).resolves.toEqual({ name: 'Survey', score: 0.7 });
    const second = JSON.parse(fetchFn.mock.calls[1]![1].body);
    expect(second.messages.at(-1).content).toContain('score');
  });

  it('gives up after two repair attempts', async () => {
    const fetchFn = vi.fn().mockImplementation(async () => reply('not json'));
    const provider = new OpenAICompatibleProvider(config, fetchFn);
    await expect(provider.generateStructured(schema, request)).rejects.toMatchObject({ code: 'AI_INVALID_OUTPUT', statusCode: 502 });
    expect(fetchFn).toHaveBeenCalledTimes(3);
  });

  it('maps provider failures to clear errors', async () => {
    const limited = new OpenAICompatibleProvider(config, vi.fn().mockResolvedValue(new Response('{}', { status: 429 })));
    await expect(limited.generateStructured(schema, request)).rejects.toMatchObject({ code: 'AI_RATE_LIMITED' });
    const badKey = new OpenAICompatibleProvider(config, vi.fn().mockResolvedValue(new Response('{}', { status: 401 })));
    await expect(badKey.generateStructured(schema, request)).rejects.toMatchObject({ code: 'AI_NOT_CONFIGURED' });
    const down = new OpenAICompatibleProvider(config, vi.fn().mockRejectedValue(new TypeError('fetch failed')));
    await expect(down.generateStructured(schema, request)).rejects.toMatchObject({ code: 'AI_UNAVAILABLE' });
  });

  it('retries once when the model is briefly overloaded', async () => {
    const sleep = vi.fn().mockResolvedValue(undefined);
    const busyThenOk = vi
      .fn()
      .mockResolvedValueOnce(new Response('{}', { status: 503 }))
      .mockResolvedValueOnce(reply('{"name":"Survey","score":0.1}'));
    const provider = new OpenAICompatibleProvider(config, busyThenOk, sleep);
    await expect(provider.generateStructured(schema, request)).resolves.toEqual({ name: 'Survey', score: 0.1 });
    expect(sleep).toHaveBeenCalledOnce();

    const alwaysBusy = vi.fn().mockImplementation(async () => new Response('{"error":"high demand"}', { status: 503 }));
    const stuck = new OpenAICompatibleProvider(config, alwaysBusy, sleep);
    await expect(stuck.generateStructured(schema, request)).rejects.toMatchObject({
      code: 'AI_UNAVAILABLE',
      details: { providerStatus: 503 }
    });
    expect(alwaysBusy).toHaveBeenCalledTimes(2);
  });

  it('refuses to call a cloud provider without a key', async () => {
    const fetchFn = vi.fn();
    const provider = new OpenAICompatibleProvider(readAIConfig({ AI_PROVIDER: 'gemini' }), fetchFn);
    await expect(provider.generateStructured(schema, request)).rejects.toMatchObject({ code: 'AI_NOT_CONFIGURED' });
    expect(fetchFn).not.toHaveBeenCalled();
  });
});

describe('embed', () => {
  it('returns vectors in input order', async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: [{ index: 1, embedding: [2] }, { index: 0, embedding: [1] }] }))
    );
    const provider = new OpenAICompatibleProvider(config, fetchFn);
    await expect(provider.embed(['a', 'b'])).resolves.toEqual([[1], [2]]);
  });
});

describe('toStructuralSchema', () => {
  it('keeps structure and nullability, drops validation-only keywords', () => {
    const input = {
      type: 'object',
      properties: {
        tag: { type: 'string', pattern: '^[a-z]+$', maxLength: 5 },
        note: { anyOf: [{ type: 'string', maxLength: 9 }, { type: 'null' }] },
        list: { type: 'array', items: { type: 'string' }, minItems: 1 }
      },
      required: ['tag', 'note', 'list'],
      additionalProperties: false
    };
    expect(toStructuralSchema(input)).toEqual({
      type: 'object',
      properties: {
        tag: { type: 'string' },
        note: { type: ['string', 'null'] },
        list: { type: 'array', items: { type: 'string' } }
      },
      required: ['tag', 'note', 'list'],
      additionalProperties: false
    });
  });
});
