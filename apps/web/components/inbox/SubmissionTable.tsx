'use client';

import type { FieldSchema } from '@formforge/types';
import { formatDate } from '@/lib/utils';
import { formatAnswer } from '@/lib/format-answer';
import { Button } from '@/components/ui/button';

type Submission = {
  id: string;
  submittedAt: string;
  responses: Record<string, unknown>;
};

export function SubmissionTable({
  items,
  fields = [],
  onSelect
}: {
  items: Submission[];
  fields?: FieldSchema[];
  onSelect: (id: string) => void;
}) {
  // Preview = first question in form order that the respondent answered.
  const previewOf = (s: Submission) => {
    const field = fields.find((f) => s.responses[f.id] !== undefined && s.responses[f.id] !== '');
    return field ? `${field.label}: ${formatAnswer(field, s.responses[field.id])}` : String(Object.values(s.responses)[0] ?? '—');
  };
  return (
    <div className="overflow-hidden rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-4 py-2 text-left">Submitted</th>
            <th className="px-4 py-2 text-left">Preview</th>
            <th className="px-4 py-2 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((s) => {
            const preview = previewOf(s);
            return (
              <tr key={s.id} className="border-t">
                <td className="px-4 py-2">{formatDate(s.submittedAt)}</td>
                <td className="px-4 py-2 truncate max-w-xs">{preview}</td>
                <td className="px-4 py-2 text-right">
                  <Button size="sm" variant="outline" onClick={() => onSelect(s.id)}>
                    View
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
