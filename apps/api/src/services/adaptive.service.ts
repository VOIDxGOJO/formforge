import type { Prisma } from '@prisma/client';
import type { AdaptiveConfig, FieldSchema, PublicField } from '@formforge/types';
import { prisma } from '../lib/prisma.js';
import { ConflictError, NotFoundError, ValidationError } from '../lib/errors.js';
import { adaptiveConfigSchema } from '../schemas/forms.schema.js';
import { imputeMissing, nextQuestion, type EngineQuestion } from '../engine/adaptive.js';
import { fitModel, posterior, uniformModel, type RespondentModel } from '../engine/model.js';
import {
  buildPlan,
  decodeAnswer,
  encodeAnswer,
  modelMatchesBank,
  toResponseRows,
  type AdaptivePlan
} from '../engine/form-adapter.js';
import { formService } from './form.service.js';
import { submissionService, validateResponses } from './submission.service.js';

/** Refit after this many new real submissions (report Section 4.1.19). */
export const REFIT_EVERY = 25;
/** Synthetic records weigh 25 / (25 + n) after n real responses (report Eqn 4.8). */
export const syntheticWeight = (nReal: number) => 25 / (25 + nReal);
const MAX_TRAINING_ROWS = 5000;

type FormRow = { id: string; workspaceId: string; fields: unknown; adaptiveConfig: unknown; isActive: boolean };

export const configOf = (form: { adaptiveConfig: unknown }): AdaptiveConfig =>
  adaptiveConfigSchema.parse(form.adaptiveConfig ?? {});

const toPublicField = ({ id, type, label, placeholder, required, options }: FieldSchema): PublicField => ({
  id, type, label, placeholder, required, options
});

const loadModel = async (formId: string, bank: EngineQuestion[]): Promise<{ model: RespondentModel; snapshotId: string | null }> => {
  const snap = await prisma.modelSnapshot.findFirst({ where: { formId }, orderBy: { createdAt: 'desc' } });
  if (snap) {
    const theta = snap.theta as number[][][];
    if (modelMatchesBank(snap.questionIds, theta.map((byClass) => byClass[0]!.length), bank)) {
      return { model: { k: snap.k, pi: snap.pi as number[], theta, nmi: snap.nmi as number[][] }, snapshotId: snap.id };
    }
  }
  return { model: uniformModel(bank.map((b) => b.options)), snapshotId: null };
};

type Step = { fieldId: string | null; coverage: number; predictions: number[][]; answered: Map<number, number> };

/** Next question for a session: the engine first, then required non-choice questions. */
const step = (plan: AdaptivePlan, model: RespondentModel, config: AdaptiveConfig, answers: Record<string, unknown>, asked: string[]): Step => {
  const answered = new Map<number, number>();
  let elapsed = 0;
  for (const id of asked) {
    const q = plan.bank.findIndex((b) => b.id === id);
    if (q < 0 || !(id in answers)) continue;
    const option = encodeAnswer(plan.modeled[q]!, answers[id]);
    if (option === null) continue;
    answered.set(q, option);
    elapsed += plan.bank[q]!.seconds;
  }
  const d = nextQuestion(plan.bank, model, config, { answers: answered, elapsed });
  const fieldId = d.next !== null ? plan.bank[d.next]!.id : (plan.tail.find((f) => !asked.includes(f.id))?.id ?? null);
  return { fieldId, coverage: d.coverage, predictions: d.predictions, answered };
};

const refitting = new Set<string>();

export const adaptiveService = {
  /** Fits a new respondent model from real (and weighted synthetic) answers. */
  refit: async (formId: string) => {
    const form = await prisma.form.findUnique({ where: { id: formId } });
    if (!form) throw NotFoundError('Form not found');
    const plan = buildPlan(form.fields as FieldSchema[]);
    if (plan.bank.length === 0) throw ValidationError('Adaptive mode needs at least one dropdown or rating question');
    const [real, synthetic] = await Promise.all([
      prisma.submission.findMany({ where: { formId }, select: { responses: true }, orderBy: { submittedAt: 'desc' }, take: MAX_TRAINING_ROWS }),
      prisma.syntheticResponse.findMany({ where: { formId }, select: { responses: true } })
    ]);
    // Only real answers are used: predicted values live in Submission.imputed and are never trained on.
    const realRows = toResponseRows(plan.modeled, real.map((s) => s.responses as Record<string, unknown>));
    const synRows = toResponseRows(plan.modeled, synthetic.map((s) => s.responses as Record<string, unknown>));
    const w = syntheticWeight(realRows.length);
    const model = fitModel([...realRows, ...synRows], plan.bank.map((b) => b.options), {
      seed: 0,
      weights: [...realRows.map(() => 1), ...synRows.map(() => w)]
    });
    return prisma.modelSnapshot.create({
      data: {
        formId,
        k: model.k,
        questionIds: plan.bank.map((b) => b.id),
        pi: model.pi,
        theta: model.theta,
        nmi: model.nmi,
        nReal: realRows.length,
        nSynthetic: synRows.length
      },
      select: { id: true, nReal: true, nSynthetic: true, createdAt: true }
    });
  },

  /** Background refit once REFIT_EVERY new submissions have arrived since the last model. */
  maybeRefit: async (formId: string) => {
    if (refitting.has(formId)) return;
    refitting.add(formId);
    try {
      const [count, snap] = await Promise.all([
        prisma.submission.count({ where: { formId } }),
        prisma.modelSnapshot.findFirst({ where: { formId }, orderBy: { createdAt: 'desc' }, select: { nReal: true } })
      ]);
      if (count - (snap?.nReal ?? 0) >= REFIT_EVERY) await adaptiveService.refit(formId);
    } catch (err) {
      if (process.env.NODE_ENV !== 'test') console.error('[adaptive] background refit failed', err);
    } finally {
      refitting.delete(formId);
    }
  },

  // ------------------------------------------------------------ creator side
  status: async (userId: string, workspaceId: string, formId: string) => {
    const form = await formService.get(userId, workspaceId, formId);
    const plan = buildPlan(form.fields as FieldSchema[]);
    const [snap, submissions] = await Promise.all([
      prisma.modelSnapshot.findFirst({ where: { formId }, orderBy: { createdAt: 'desc' } }),
      prisma.submission.count({ where: { formId } })
    ]);
    const current =
      !!snap && modelMatchesBank(snap.questionIds, (snap.theta as number[][][]).map((c) => c[0]!.length), plan.bank);
    return {
      config: configOf(form),
      questions: {
        modeled: plan.bank.map((b, i) => ({ id: b.id, label: plan.modeled[i]!.label, anchor: b.anchor })),
        askedAfter: plan.tail.map((f) => ({ id: f.id, label: f.label })),
        skipped: plan.skipped.map((f) => ({ id: f.id, label: f.label }))
      },
      model: snap ? { nReal: snap.nReal, nSynthetic: snap.nSynthetic, createdAt: snap.createdAt, current } : null,
      submissions
    };
  },

  updateConfig: async (userId: string, workspaceId: string, formId: string, config: AdaptiveConfig) => {
    const form = await formService.get(userId, workspaceId, formId);
    if (config.enabled && buildPlan(form.fields as FieldSchema[]).bank.length === 0) {
      throw ValidationError('Add at least one dropdown or rating question before turning on adaptive mode');
    }
    await prisma.form.update({ where: { id: formId }, data: { adaptiveConfig: config as unknown as Prisma.InputJsonValue } });
    return configOf({ adaptiveConfig: config });
  },

  refitForCreator: async (userId: string, workspaceId: string, formId: string) => {
    await formService.get(userId, workspaceId, formId);
    return adaptiveService.refit(formId);
  },

  // ------------------------------------------------------------ respondent side
  start: async (slug: string) => {
    const form = (await prisma.form.findUnique({ where: { slug } })) as FormRow | null;
    if (!form || !form.isActive) throw NotFoundError('Form not found');
    const config = configOf(form);
    const plan = buildPlan(form.fields as FieldSchema[]);
    if (!config.enabled || plan.bank.length === 0) throw ValidationError('This form is not in adaptive mode');
    const { model, snapshotId } = await loadModel(form.id, plan.bank);
    const first = step(plan, model, config, {}, []);
    const session = await prisma.adaptiveSession.create({
      data: { formId: form.id, snapshotId, askedOrder: first.fieldId ? [first.fieldId] : [], posterior: [] }
    });
    const field = (form.fields as FieldSchema[]).find((f) => f.id === first.fieldId);
    return { sessionId: session.id, question: field ? toPublicField(field) : null, progress: first.coverage, answered: 0 };
  },

  answer: async (sessionId: string, fieldId: string, value: unknown) => {
    const session = await prisma.adaptiveSession.findUnique({ where: { id: sessionId }, include: { form: true } });
    if (!session || session.status !== 'ACTIVE' || !session.form.isActive) throw NotFoundError('Session not found');
    const answers = { ...(session.answers as Record<string, unknown>) };
    const pending = session.askedOrder.find((id) => !(id in answers));
    if (pending !== fieldId) throw ConflictError('This question is not the one being asked');

    const fields = session.form.fields as FieldSchema[];
    const field = fields.find((f) => f.id === fieldId);
    if (!field) throw NotFoundError('Question not found');
    const plan = buildPlan(fields);
    const isModeled = plan.bank.some((b) => b.id === fieldId);
    const empty = value === undefined || value === null || value === '';
    if (isModeled && empty) throw ValidationError(`Please answer "${field.label}"`);
    validateResponses([field], { [field.id]: value });
    answers[fieldId] = empty ? null : value;

    const config = configOf(session.form);
    const { model } = await loadModel(session.formId, plan.bank);
    const next = step(plan, model, config, answers, session.askedOrder);
    await prisma.adaptiveSession.update({
      where: { id: sessionId },
      data: {
        answers: answers as Prisma.InputJsonValue,
        askedOrder: next.fieldId ? [...session.askedOrder, next.fieldId] : session.askedOrder,
        posterior: posterior(model, next.answered).map((p) => Math.round(p * 1e6) / 1e6)
      }
    });
    const nextField = fields.find((f) => f.id === next.fieldId);
    return {
      question: nextField ? toPublicField(nextField) : null,
      progress: nextField ? next.coverage : 1,
      answered: Object.keys(answers).length,
      done: !nextField
    };
  },

  complete: async (sessionId: string, meta: { ipAddress?: string; userAgent?: string }) => {
    const session = await prisma.adaptiveSession.findUnique({ where: { id: sessionId }, include: { form: true } });
    if (!session || !session.form.isActive) throw NotFoundError('Session not found');
    const answers = session.answers as Record<string, unknown>;
    const fields = session.form.fields as FieldSchema[];
    const plan = buildPlan(fields);
    const { model } = await loadModel(session.formId, plan.bank);
    const state = step(plan, model, configOf(session.form), answers, session.askedOrder);
    if (session.askedOrder.some((id) => !(id in answers)) || state.fieldId !== null) {
      throw ConflictError('The form is not finished yet');
    }
    // Claim the session first so a double click cannot create two submissions.
    const claimed = await prisma.adaptiveSession.updateMany({
      where: { id: sessionId, status: 'ACTIVE' },
      data: { status: 'COMPLETED', completedAt: new Date() }
    });
    if (claimed.count !== 1) throw ConflictError('This form was already submitted');

    const imputed = Object.fromEntries(
      imputeMissing(plan.bank, state.answered, state.predictions).map((i) => [
        i.questionId,
        { value: decodeAnswer(plan.modeled[i.q]!, i.option), confidence: Math.round(i.confidence * 1000) / 1000 }
      ])
    );
    const responses = Object.fromEntries(Object.entries(answers).filter(([, v]) => v !== null && v !== ''));
    const result = await submissionService.record(session.form, { responses, imputed, sessionId, ...meta });
    void adaptiveService.maybeRefit(session.formId);
    return result;
  }
};
