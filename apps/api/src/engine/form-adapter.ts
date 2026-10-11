import { FieldType, RATING_MAX, RATING_MIN, estimateFieldSeconds, type FieldSchema } from '@formforge/types';
import type { EngineQuestion } from './adaptive.js';
import type { ResponseRow } from './model.js';

/** Relevance used when a field has none (the builder slider also starts at 0.5). */
export const DEFAULT_RELEVANCE = 0.5;

/** Choice questions have a finite answer set, so the engine can model them. */
export const isModelable = (f: FieldSchema): boolean =>
  f.type === FieldType.RATING || (f.type === FieldType.DROPDOWN && (f.options?.length ?? 0) >= 2);

export const optionCount = (f: FieldSchema): number =>
  f.type === FieldType.RATING ? RATING_MAX - RATING_MIN + 1 : (f.options?.length ?? 0);

/** Answer value -> option index, or null when absent or invalid. */
export const encodeAnswer = (f: FieldSchema, value: unknown): number | null => {
  if (value === undefined || value === null || value === '') return null;
  if (f.type === FieldType.RATING) {
    const n = Number(value);
    return Number.isInteger(n) && n >= RATING_MIN && n <= RATING_MAX ? n - RATING_MIN : null;
  }
  const i = (f.options ?? []).findIndex((o) => o.value === value);
  return i >= 0 ? i : null;
};

/** Option index -> the value a respondent would have submitted. */
export const decodeAnswer = (f: FieldSchema, index: number): string =>
  f.type === FieldType.RATING ? String(RATING_MIN + index) : f.options![index]!.value;

export type AdaptivePlan = {
  /** Fields the engine chooses between (choice questions). */
  modeled: FieldSchema[];
  bank: EngineQuestion[];
  /** Non-choice fields that must still be asked, after the engine stops, in form order. */
  tail: FieldSchema[];
  /** Non-choice optional fields that adaptive mode leaves out. */
  skipped: FieldSchema[];
};

export const buildPlan = (fields: FieldSchema[]): AdaptivePlan => {
  const modeled = fields.filter(isModelable);
  const others = fields.filter((f) => !isModelable(f));
  const mustAsk = (f: FieldSchema) => f.required || f.adaptive === false;
  return {
    modeled,
    bank: modeled.map((f) => ({
      id: f.id,
      target: f.informationTarget || f.id,
      options: optionCount(f),
      seconds: f.estimatedSeconds ?? estimateFieldSeconds(f),
      anchor: mustAsk(f),
      relevance: f.relevance ?? DEFAULT_RELEVANCE
    })),
    tail: others.filter(mustAsk),
    skipped: others.filter((f) => !mustAsk(f))
  };
};

/** Real submissions -> training rows over the modeled fields (missing answers stay null). */
export const toResponseRows = (modeled: FieldSchema[], responses: Array<Record<string, unknown>>): ResponseRow[] =>
  responses
    .map((r) => modeled.map((f) => encodeAnswer(f, r[f.id])))
    .filter((row) => row.some((v) => v !== null));

/** A stored model is only usable while the modeled questions and their option counts are unchanged. */
export const modelMatchesBank = (questionIds: string[], optionCounts: number[], bank: EngineQuestion[]): boolean =>
  questionIds.length === bank.length &&
  bank.every((q, i) => q.id === questionIds[i] && q.options === optionCounts[i]);
