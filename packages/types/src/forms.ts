export enum FieldType {
  TEXT = 'TEXT',
  EMAIL = 'EMAIL',
  NUMBER = 'NUMBER',
  TEXTAREA = 'TEXTAREA',
  DROPDOWN = 'DROPDOWN',
  FILE = 'FILE',
  RATING = 'RATING'
}

/** RATING fields use a fixed 1-5 scale. */
export const RATING_MIN = 1;
export const RATING_MAX = 5;

export type FieldOption = {
  label: string;
  value: string;
};

/**
 * Optional metadata used by the quality analyzer and the adaptive engine.
 * Forms created before FormForge 2.0 simply have none of these keys.
 */
export type FieldMetadata = {
  /** What this question is meant to find out, in plain words. */
  objective?: string;
  /** snake_case name of the piece of information the answer provides. */
  informationTarget?: string;
  /** Expected answering time in seconds. */
  estimatedSeconds?: number;
  /** How central the question is to the form objective, 0 to 1. */
  relevance?: number;
  /** Whether the adaptive engine may skip this question (default true for optional fields). */
  adaptive?: boolean;
};

export type FieldSchema = {
  id: string;
  type: FieldType;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: FieldOption[];
} & FieldMetadata;

/** Base answering time per field type, in seconds (report Section 4.1.8). */
export const BASE_SECONDS: Record<FieldType, number> = {
  [FieldType.TEXT]: 15,
  [FieldType.EMAIL]: 10,
  [FieldType.NUMBER]: 8,
  [FieldType.TEXTAREA]: 45,
  [FieldType.DROPDOWN]: 8,
  [FieldType.FILE]: 30,
  [FieldType.RATING]: 7
};

/** Estimated seconds to answer: base time + reading at ~3.5 words/s + 0.6 s per option. */
export const estimateFieldSeconds = (field: Pick<FieldSchema, 'type' | 'label' | 'options'>): number => {
  const words = field.label.trim().split(/\s+/).filter(Boolean).length;
  const choices = field.type === FieldType.RATING ? RATING_MAX - RATING_MIN + 1 : (field.options?.length ?? 0);
  return Math.round(BASE_SECONDS[field.type] + words / 3.5 + 0.6 * choices);
};

/** Field as sent to respondents: no internal metadata. */
export type PublicField = Pick<FieldSchema, 'id' | 'type' | 'label' | 'placeholder' | 'required' | 'options'>;

/** Weights of the utility U(q) = a*IG + b*Rel + c*Cov - d*Bur - e*Red. */
export type AdaptiveWeights = {
  informationGain: number;
  relevance: number;
  coverage: number;
  burden: number;
  redundancy: number;
};

export type AdaptiveConfig = {
  enabled: boolean;
  maxQuestions: number;
  maxSeconds: number;
  /** Share of information targets that must be covered before the engine may stop. */
  minCoverage: number;
  /** Predicted-answer probability at which a target counts as covered. */
  confidence: number;
  /** Stop when the best remaining gain is below this share of the remaining uncertainty. */
  stopGain: number;
  weights: AdaptiveWeights;
};

/** Defaults chosen in the report (Sections 4.1.10 and 7.9). */
export const DEFAULT_ADAPTIVE_CONFIG: AdaptiveConfig = {
  enabled: false,
  maxQuestions: 10,
  maxSeconds: 240,
  minCoverage: 0.8,
  confidence: 0.7,
  stopGain: 0.1,
  weights: { informationGain: 0.4, relevance: 0.15, coverage: 0.2, burden: 0.1, redundancy: 0.3 }
};

export type FormConfig = {
  id: string;
  name: string;
  slug: string;
  objective?: string | null;
  fields: FieldSchema[];
  adaptiveConfig?: AdaptiveConfig | null;
  isActive: boolean;
};

export type PublicFormConfig = {
  id: string;
  name: string;
  slug: string;
  fields: PublicField[];
  adaptive: boolean;
};
