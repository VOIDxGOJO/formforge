export type SentimentLabel = 'positive' | 'neutral' | 'negative';

export type SentimentCounts = Record<SentimentLabel, number>;

export interface InsightTopic {
  label: string;
  description: string;
  /** Number of answers the topic covers. */
  count: number;
  /** Up to three masked answers that illustrate the topic. */
  examples: string[];
}

export interface InsightCluster {
  questionId: string;
  question: string;
  label: string;
  size: number;
  /** Masked answers closest to the cluster centre. */
  quotes: string[];
}

export interface InsightSentiment extends SentimentCounts {
  byQuestion: Array<{ questionId: string; label: string } & SentimentCounts>;
  /** Personal details masked before any text left the server, by type. */
  masked: Record<string, number>;
}

export interface ResponseInsights {
  id: string;
  summary: string;
  topics: InsightTopic[];
  sentiment: InsightSentiment;
  clusters: InsightCluster[];
  /** Number of submissions the insight was computed from. */
  basedOn: number;
  createdAt: string;
}

export interface InsightStatus {
  insight: ResponseInsights | null;
  /** True while a background computation is running for this form. */
  running: boolean;
  /** Submissions received since the latest insight. */
  newSince: number;
  textQuestions: number;
  lastError: string | null;
}
