export type QualityIssueType =
  | 'DOUBLE_BARRELLED'
  | 'LEADING'
  | 'AMBIGUOUS'
  | 'REDUNDANT'
  | 'READABILITY'
  | 'REQUIRED_RATIO'
  | 'LONG_FORM'
  | 'COVERAGE';

export type QualitySeverity = 'high' | 'medium' | 'low' | 'info';

export type QualityIssue = {
  /** Field the issue belongs to; null for form-level issues. */
  fieldId: string | null;
  type: QualityIssueType;
  severity: QualitySeverity;
  message: string;
  suggestion: string;
  /** For REDUNDANT: the earlier question this one overlaps with. */
  relatedFieldId?: string;
  /** 'rules' = instant checks, 'ai' = optional model review. */
  source: 'rules' | 'ai';
};

export type FieldQuality = {
  fieldId: string;
  estimatedSeconds: number;
  /** Flesch Reading Ease of the label (higher is easier). */
  readingEase: number;
};

export type QualityReport = {
  /** 0-100: 100 minus the weighted penalties of all issues. */
  score: number;
  estimatedSeconds: number;
  requiredRatio: number;
  fields: FieldQuality[];
  issues: QualityIssue[];
  /** True when the AI review layer ran on top of the rules. */
  aiReviewed: boolean;
};

/** Penalty per issue (report Eqn 4.1). Coverage gaps are informational. */
export const QUALITY_PENALTY: Record<QualityIssueType, number> = {
  DOUBLE_BARRELLED: 12,
  LEADING: 12,
  AMBIGUOUS: 8,
  REDUNDANT: 8,
  READABILITY: 5,
  REQUIRED_RATIO: 6,
  LONG_FORM: 6,
  COVERAGE: 0
};
