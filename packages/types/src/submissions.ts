export type SubmissionRecord = {
  id: string;
  formId: string;
  responses: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
  submittedAt: string;
};

export type SubmissionResponse = {
  id: string;
  message: string;
};
