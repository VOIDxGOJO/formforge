'use client';

import { formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';

type Submission = {
  id: string;
  submittedAt: string;
  responses: Record<string, unknown>;
};

export function SubmissionTable({
  items,
  onSelect
}: {
  items: Submission[];
  onSelect: (id: string) => void;
}) {
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
            const preview = Object.values(s.responses)[0];
            return (
              <tr key={s.id} className="border-t">
                <td className="px-4 py-2">{formatDate(s.submittedAt)}</td>
                <td className="px-4 py-2 truncate max-w-xs">{String(preview ?? '—')}</td>
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
