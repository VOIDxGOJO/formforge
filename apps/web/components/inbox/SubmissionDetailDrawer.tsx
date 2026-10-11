'use client';

import type { FieldSchema } from '@formforge/types';
import { formatDate } from '@/lib/utils';
import { formatAnswer } from '@/lib/format-answer';
import { Button } from '@/components/ui/button';

export type SubmissionDetail = {
  submittedAt: string;
  responses: Record<string, unknown>;
  /** Values predicted by the adaptive engine for questions the respondent was not asked. */
  imputed?: Record<string, { value: unknown; confidence: number }> | null;
};

export function SubmissionDetailDrawer({
  open,
  submission,
  fields = [],
  onClose
}: {
  open: boolean;
  submission: SubmissionDetail | null;
  fields?: FieldSchema[];
  onClose: () => void;
}) {
  if (!open || !submission) return null;
  const byId = new Map(fields.map((f) => [f.id, f]));
  const label = (id: string) => byId.get(id)?.label ?? id;
  // Show answers in form order, then any keys the form no longer has.
  const answered = [
    ...fields.filter((f) => f.id in submission.responses).map((f) => f.id),
    ...Object.keys(submission.responses).filter((k) => !byId.has(k))
  ];
  const predicted = Object.entries(submission.imputed ?? {});

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <div className="h-full w-full max-w-md overflow-y-auto bg-background p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold">Submission detail</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">{formatDate(submission.submittedAt)}</p>
        <dl className="space-y-3">
          {answered.map((id) => (
            <div key={id}>
              <dt className="text-xs font-medium text-muted-foreground">{label(id)}</dt>
              <dd className="text-sm">{formatAnswer(byId.get(id), submission.responses[id])}</dd>
            </div>
          ))}
        </dl>
        {predicted.length > 0 && (
          <section className="mt-6 border-t pt-4">
            <h4 className="text-sm font-semibold">Predicted, not answered</h4>
            <p className="mb-3 text-xs text-muted-foreground">
              Adaptive mode skipped these questions. Values are the engine&apos;s best guess, not the respondent&apos;s
              answers, and are left out of the CSV export.
            </p>
            <dl className="space-y-3 text-muted-foreground">
              {predicted.map(([id, p]) => (
                <div key={id}>
                  <dt className="text-xs">{label(id)}</dt>
                  <dd className="text-sm italic">
                    {formatAnswer(byId.get(id), p.value)}{' '}
                    <span className="not-italic">· predicted, {Math.round(p.confidence * 100)}% confidence</span>
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        )}
      </div>
    </div>
  );
}
