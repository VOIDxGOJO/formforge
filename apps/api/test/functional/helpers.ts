import request from 'supertest';
import type { z } from 'zod';
import type { AIProvider, StructuredRequest } from '../../src/lib/ai/provider.js';
import { createApp } from '../../src/app.js';

export const app = createApp();

let counter = 0;
/** Registers a fresh user and returns a cookie-keeping agent plus their personal workspace id. */
export const newUser = async (name = 'Test User') => {
  const agent = request.agent(app);
  const email = `user${Date.now()}_${counter++}@formforge.test`;
  const password = 'Str0ng-pass-123';
  const reg = await agent.post('/api/v1/auth/register').send({ name, email, password });
  if (reg.status !== 201) throw new Error(`register failed: ${reg.status} ${JSON.stringify(reg.body)}`);
  const ws = await agent.get('/api/v1/workspaces');
  return { agent, email, password, workspaceId: ws.body.data[0].id as string };
};

/** Creates a form and sets its fields; returns { id, slug }. */
export const createForm = async (agent: ReturnType<typeof request.agent>, workspaceId: string, name: string, fields: unknown[], extra: Record<string, unknown> = {}) => {
  const created = await agent.post(`/api/v1/workspaces/${workspaceId}/forms`).send({ name });
  if (created.status !== 201) throw new Error(`create form failed: ${created.status} ${JSON.stringify(created.body)}`);
  const patched = await agent.patch(`/api/v1/workspaces/${workspaceId}/forms/${created.body.data.id}`).send({ fields, ...extra });
  if (patched.status !== 200) throw new Error(`patch form failed: ${patched.status} ${JSON.stringify(patched.body)}`);
  return { id: created.body.data.id as string, slug: created.body.data.slug as string };
};

/** Deterministic stand-in for the model: answers by schema name. */
export class FakeAI implements AIProvider {
  readonly name = 'fake';
  calls: StructuredRequest[] = [];

  async generateStructured<T>(schema: z.ZodType<T>, request: StructuredRequest): Promise<T> {
    this.calls.push(request);
    return schema.parse(this.answer(request));
  }

  async embed(texts: string[]) {
    // Two clear groups: stipend complaints and everything else.
    return texts.map((t) => (/stipend/i.test(t) ? [1, 0, 0.01] : [0, 1, 0.01]));
  }

  private answer(request: StructuredRequest): unknown {
    switch (request.name) {
      case 'generated_form':
        return {
          title: 'Internship Feedback',
          description: null,
          objectives: ['Understand mentoring quality'],
          questions: [
            q('How often did you meet your mentor?', 'DROPDOWN', ['Never', 'Monthly', 'Weekly'], 'mentor_frequency'),
            q('Overall, how satisfied were you with the internship?', 'RATING', null, 'overall_satisfaction'),
            q('What should the company improve?', 'TEXTAREA', null, 'improvements')
          ]
        };
      case 'quality_review':
        return { reviews: [] };
      case 'personas': {
        const n = Number(request.user.match(/Write (\d+) personas/)?.[1] ?? 10);
        return { personas: Array.from({ length: n }, (_, i) => `Persona ${i + 1} is an intern with a ${i % 2 ? 'good' : 'difficult'} experience.`) };
      }
      case 'synthetic_answers': {
        const data = JSON.parse(request.user.slice(request.user.indexOf('<<<') + 3, request.user.lastIndexOf('>>>')));
        return {
          respondents: data.map((p: { persona: number; questions: Array<{ questionId: string; options?: string[] }> }) => ({
            persona: p.persona,
            answers: p.questions.map((qq) => ({ questionId: qq.questionId, choice: qq.options ? 'A' : String(1 + (p.persona % 5)) }))
          }))
        };
      }
      case 'response_insights': {
        const n = request.user.split('\n').filter((l) => /^\d+\. /.test(l)).length;
        return {
          summary: 'Interns mention late stipends.',
          topics: [{ label: 'Stipend', description: 'Late payment.', answers: [1] }],
          sentiment: Array.from({ length: n }, (_, i) => ({ n: i + 1, label: 'negative' }))
        };
      }
      case 'insight_merge':
        return { summary: 'Overall: late stipends.', topics: [{ label: 'Stipend', description: 'Late payment.', from: [1] }], groups: [] };
      default:
        throw new Error(`FakeAI has no answer for ${request.name}`);
    }
  }
}

const q = (label: string, type: string, options: string[] | null, target: string) => ({
  label,
  type,
  required: type !== 'TEXTAREA',
  placeholder: null,
  options,
  objective: 'Learn about the internship',
  informationTarget: target,
  estimatedSeconds: 10,
  relevance: 0.8
});
