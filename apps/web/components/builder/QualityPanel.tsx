'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Gauge, Sparkles } from 'lucide-react';
import type { FieldSchema, QualityIssue, QualityIssueType, QualityReport } from '@formforge/types';
import { apiFetch } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const TYPE_LABEL: Record<QualityIssueType, string> = {
  DOUBLE_BARRELLED: 'Double-barrelled',
  LEADING: 'Leading',
  AMBIGUOUS: 'Ambiguous',
  REDUNDANT: 'Redundant',
  READABILITY: 'Readability',
  REQUIRED_RATIO: 'Too many required',
  LONG_FORM: 'Long form',
  COVERAGE: 'Objective not covered'
};

const SEVERITY_STYLE: Record<QualityIssue['severity'], string> = {
  high: 'bg-red-100 text-red-800',
  medium: 'bg-amber-100 text-amber-800',
  low: 'bg-slate-100 text-slate-700',
  info: 'bg-sky-100 text-sky-800'
};

const scoreStyle = (score: number) =>
  score >= 85 ? 'text-emerald-600' : score >= 70 ? 'text-amber-600' : 'text-red-600';

const formatSeconds = (s: number) => (s >= 60 ? `${Math.floor(s / 60)} min ${s % 60} s` : `${s} s`);

export function QualityPanel({
  workspaceId,
  fields,
  objective,
  onSelectField
}: {
  workspaceId: string;
  fields: FieldSchema[];
  objective: string;
  onSelectField: (id: string) => void;
}) {
  const [report, setReport] = useState<QualityReport | null>(null);

  const analyze = useMutation({
    mutationFn: (deep: boolean) =>
      apiFetch<QualityReport>(`/api/v1/workspaces/${workspaceId}/quality/analyze`, {
        method: 'POST',
        body: JSON.stringify({ fields, objective: objective.trim() || null, deep })
      }),
    onSuccess: setReport
  });
  const { mutate } = analyze;

  // The rule layer is instant, so it re-runs shortly after each edit.
  const signature = useMemo(() => JSON.stringify([fields, objective]), [fields, objective]);
  useEffect(() => {
    if (fields.length === 0) {
      setReport(null);
      return;
    }
    const t = setTimeout(() => mutate(false), 800);
    return () => clearTimeout(t);
  }, [signature, fields.length, mutate]);

  const labelOf = (id: string | null | undefined) => fields.find((f) => f.id === id)?.label ?? '';
  const formIssues = report?.issues.filter((i) => i.fieldId === null) ?? [];
  const fieldIssues = report?.issues.filter((i) => i.fieldId !== null) ?? [];
  const reviewing = analyze.isPending && analyze.variables === true;

  return (
    <section aria-label="Form quality" className="space-y-4 rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <Gauge className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-sm text-muted-foreground">Quality score</p>
            <p className={cn('text-2xl font-bold', report ? scoreStyle(report.score) : 'text-muted-foreground')}>
              {report ? `${report.score}/100` : '–'}
            </p>
          </div>
          {report && (
            <div className="text-sm text-muted-foreground">
              <p>Estimated time: {formatSeconds(report.estimatedSeconds)}</p>
              <p>Required: {Math.round(report.requiredRatio * 100)}% of questions</p>
            </div>
          )}
          {report?.aiReviewed && <Badge variant="secondary">AI reviewed</Badge>}
        </div>
        <Button variant="outline" size="sm" onClick={() => mutate(true)} disabled={fields.length === 0 || analyze.isPending}>
          <Sparkles className="mr-2 h-4 w-4" />
          {reviewing ? 'Reviewing…' : 'Review with AI'}
        </Button>
      </div>

      {analyze.isError && (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {(analyze.error as Error).message}
        </p>
      )}

      {report && report.issues.length === 0 && (
        <p className="text-sm text-emerald-700">No problems found. Questions look clear, neutral and focused.</p>
      )}

      {report && report.issues.length > 0 && (
        <ul className="space-y-2">
          {[...formIssues, ...fieldIssues].map((issue, idx) => (
            <li key={`${issue.fieldId}-${issue.type}-${idx}`} className="rounded-md border p-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className={cn('rounded px-2 py-0.5 text-xs font-medium', SEVERITY_STYLE[issue.severity])}>
                  {TYPE_LABEL[issue.type]}
                </span>
                {issue.source === 'ai' && <Badge variant="secondary">AI</Badge>}
                {issue.fieldId ? (
                  <button
                    type="button"
                    className="text-left font-medium underline-offset-2 hover:underline"
                    onClick={() => onSelectField(issue.fieldId!)}
                  >
                    {labelOf(issue.fieldId)}
                  </button>
                ) : (
                  <span className="font-medium">Whole form</span>
                )}
              </div>
              <p className="mt-1 text-muted-foreground">
                {issue.message} <span className="text-foreground">{issue.suggestion}</span>
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
