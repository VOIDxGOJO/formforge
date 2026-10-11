import {
  QUALITY_PENALTY,
  estimateFieldSeconds,
  type FieldSchema,
  type QualityIssue,
  type QualityIssueType,
  type QualityReport,
  type QualitySeverity
} from '@formforge/types';
import {
  LEXICAL_REDUNDANCY_THRESHOLD,
  contentTokens,
  isAmbiguous,
  isDoubleBarrelled,
  isLeading,
  lexicalSimilarity,
  readingEase,
  wordCount
} from './rules.js';

export const SEVERITY: Record<QualityIssueType, QualitySeverity> = {
  DOUBLE_BARRELLED: 'high',
  LEADING: 'high',
  AMBIGUOUS: 'medium',
  REDUNDANT: 'medium',
  READABILITY: 'low',
  REQUIRED_RATIO: 'low',
  LONG_FORM: 'low',
  COVERAGE: 'info'
};

const MIN_READING_EASE = 50;
// Flesch scores are meaningless on a few words ("Your college email (optional)" scores 34).
const MIN_WORDS_FOR_READING_EASE = 6;
const MAX_WORDS = 25;
const MAX_REQUIRED_RATIO = 0.7;
const MAX_FORM_SECONDS = 300;

const issue = (
  type: QualityIssueType,
  fieldId: string | null,
  message: string,
  suggestion: string,
  extra: Partial<QualityIssue> = {}
): QualityIssue => ({ fieldId, type, severity: SEVERITY[type], message, suggestion, source: 'rules', ...extra });

export const scoreIssues = (issues: QualityIssue[]): number =>
  Math.max(0, 100 - issues.reduce((sum, i) => sum + QUALITY_PENALTY[i.type], 0));

const fieldText = (f: FieldSchema) =>
  [f.label, f.objective ?? '', (f.informationTarget ?? '').replace(/_/g, ' ')].join(' ');

/** Objective clauses (split on ; . newline) that share no content word with any question. */
const uncoveredObjectives = (objective: string, fields: FieldSchema[]): string[] => {
  const fieldTokens = fields.map((f) => contentTokens(fieldText(f)));
  return objective
    .split(/[;\n]|\.\s/)
    .map((c) => c.trim())
    .filter((c) => {
      const tokens = [...contentTokens(c)].filter((t) => t.length > 3);
      return tokens.length > 0 && !fieldTokens.some((ft) => tokens.some((t) => ft.has(t)));
    });
};

export type AnalyzeInput = { fields: FieldSchema[]; objective?: string | null };

/** Instant, deterministic rule layer. */
export const analyzeWithRules = ({ fields, objective }: AnalyzeInput): QualityReport => {
  const issues: QualityIssue[] = [];
  const perField = fields.map((f) => ({
    fieldId: f.id,
    estimatedSeconds: f.estimatedSeconds ?? estimateFieldSeconds(f),
    readingEase: Math.round(readingEase(f.label) * 10) / 10
  }));

  fields.forEach((f, i) => {
    const label = f.label.trim();
    if (!label) return;
    if (isDoubleBarrelled(label)) {
      issues.push(issue('DOUBLE_BARRELLED', f.id, 'This question asks about more than one thing.', 'Split it into separate questions, one topic each.'));
    }
    if (isLeading(label)) {
      issues.push(issue('LEADING', f.id, 'The wording suggests an expected answer.', 'Remove evaluative words and ask neutrally, e.g. "How would you rate ...?".'));
    }
    if (isAmbiguous(label)) {
      issues.push(issue('AMBIGUOUS', f.id, 'A vague word is used without a reference frame.', 'Add a time window, unit or scale (e.g. "in the last 30 days", "hours per week").'));
    }
    const ease = perField[i]!.readingEase;
    const words = wordCount(label);
    if ((words >= MIN_WORDS_FOR_READING_EASE && ease < MIN_READING_EASE) || words > MAX_WORDS) {
      issues.push(
        issue('READABILITY', f.id, words > MAX_WORDS ? `Long question (${words} words).` : `Hard to read (reading ease ${Math.round(ease)}).`, 'Use shorter sentences and everyday words.')
      );
    }
    // Redundancy: report on the later question, pointing at the closest earlier one.
    let best: { id: string; label: string; score: number } | null = null;
    for (const prev of fields.slice(0, i)) {
      const sameTarget = !!f.informationTarget && f.informationTarget === prev.informationTarget;
      const score = sameTarget ? 1 : lexicalSimilarity(label, prev.label);
      if (score >= LEXICAL_REDUNDANCY_THRESHOLD && (!best || score > best.score)) best = { id: prev.id, label: prev.label, score };
    }
    if (best) {
      issues.push(
        issue('REDUNDANT', f.id, `Overlaps with "${best.label}".`, 'Remove one of the two, or make them ask about different things.', { relatedFieldId: best.id })
      );
    }
  });

  const required = fields.filter((f) => f.required).length;
  const requiredRatio = fields.length ? required / fields.length : 0;
  if (fields.length >= 3 && requiredRatio > MAX_REQUIRED_RATIO) {
    issues.push(issue('REQUIRED_RATIO', null, `${Math.round(requiredRatio * 100)}% of questions are required.`, 'Make questions optional unless the form cannot do without them.'));
  }
  const estimatedSeconds = perField.reduce((s, f) => s + f.estimatedSeconds, 0);
  if (estimatedSeconds > MAX_FORM_SECONDS) {
    issues.push(issue('LONG_FORM', null, `Estimated completion time is ${Math.round(estimatedSeconds / 60)} min ${estimatedSeconds % 60} s.`, 'Remove low-relevance questions or turn on adaptive mode.'));
  }
  for (const clause of objective ? uncoveredObjectives(objective, fields) : []) {
    issues.push(issue('COVERAGE', null, `No question seems to cover: "${clause}".`, 'Add a question for this objective or remove it from the objective.'));
  }

  return {
    score: scoreIssues(issues),
    estimatedSeconds,
    requiredRatio: Math.round(requiredRatio * 100) / 100,
    fields: perField,
    issues,
    aiReviewed: false
  };
};
