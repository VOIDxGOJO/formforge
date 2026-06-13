'use client';

import { formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export function SubmissionDetailDrawer({
  open,
  submission,
  onClose
}: {
  open: boolean;
  submission: { submittedAt: string; responses: Record<string, unknown> } | null;
  onClose: () => void;
}) {
  if (!open || !submission) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
      <div className="h-full w-full max-w-md bg-background p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold">Submission detail</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">{formatDate(submission.submittedAt)}</p>
        <dl className="space-y-3">
          {Object.entries(submission.responses).map(([key, value]) => (
            <div key={key}>
              <dt className="text-xs font-medium text-muted-foreground">{key}</dt>
              <dd className="text-sm">{JSON.stringify(value)}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
