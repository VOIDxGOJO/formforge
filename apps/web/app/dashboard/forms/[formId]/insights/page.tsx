'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Lightbulb, Loader2, ShieldCheck } from 'lucide-react';
import type { InsightStatus, SentimentCounts } from '@formforge/types';
import { apiFetch } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { useWorkspace } from '@/hooks/use-workspace';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const SENTIMENT: Array<[keyof SentimentCounts, string, string]> = [
  ['positive', 'Positive', 'bg-emerald-500'],
  ['neutral', 'Neutral', 'bg-slate-300'],
  ['negative', 'Negative', 'bg-red-500']
];

function SentimentBar({ counts }: { counts: SentimentCounts }) {
  const total = counts.positive + counts.neutral + counts.negative;
  if (!total) return <p className="text-sm text-muted-foreground">No labelled answers.</p>;
  return (
    <div className="space-y-2">
      <div className="flex h-3 overflow-hidden rounded-full bg-muted">
        {SENTIMENT.map(([key, , color]) => (
          <div key={key} className={color} style={{ width: `${(counts[key] / total) * 100}%` }} />
        ))}
      </div>
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        {SENTIMENT.map(([key, label, color]) => (
          <span key={key} className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${color}`} />
            {label} {Math.round((counts[key] / total) * 100)}% ({counts[key]})
          </span>
        ))}
      </div>
    </div>
  );
}

export default function InsightsPage() {
  const { formId } = useParams<{ formId: string }>();
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();
  const path = `/api/v1/workspaces/${workspaceId}/forms/${formId}/insights`;

  const status = useQuery({
    queryKey: ['insights', formId],
    enabled: !!workspaceId && !!formId,
    queryFn: () => apiFetch<InsightStatus>(path),
    // Poll while a background computation runs.
    refetchInterval: (q) => (q.state.data?.running ? 3000 : false)
  });
  const run = useMutation({
    mutationFn: () => apiFetch<InsightStatus>(path, { method: 'POST' }),
    onSuccess: (data) => queryClient.setQueryData(['insights', formId], data)
  });

  if (status.isLoading || !status.data) return <Skeleton className="h-64" />;
  const { insight, running, newSince, textQuestions, lastError } = status.data;
  const maskedTotal = insight ? Object.values(insight.sentiment.masked).reduce((a, b) => a + b, 0) : 0;
  const maxTopic = Math.max(1, ...(insight?.topics.map((t) => t.count) ?? []));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <Lightbulb className="h-6 w-6" /> Insights
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {insight
              ? `Based on ${insight.basedOn} responses, ${formatDate(insight.createdAt)}.${newSince > 0 ? ` ${newSince} new since then.` : ''} Refreshes automatically every 20 new responses.`
              : 'What respondents wrote in the open text questions: summary, topics, sentiment and groups of similar answers.'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href={`/dashboard/forms/${formId}/responses`}>Responses</Link>
          </Button>
          <Button onClick={() => run.mutate()} disabled={running || run.isPending || textQuestions === 0}>
            {running ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analysing…
              </>
            ) : insight ? (
              'Refresh insights'
            ) : (
              'Analyse responses'
            )}
          </Button>
        </div>
      </div>

      {textQuestions === 0 && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          This form has no text questions. Insights are built from open-ended answers.
        </p>
      )}
      {(lastError || run.isError) && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
          {lastError ?? (run.error as Error).message}
        </p>
      )}
      {running && !insight && (
        <p className="text-sm text-muted-foreground">
          Reading the answers. This runs in the background and usually takes under a minute; you can leave this page.
        </p>
      )}

      {insight && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="leading-relaxed">{insight.summary}</p>
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="h-4 w-4" />
                {maskedTotal > 0
                  ? `${maskedTotal} personal details (${Object.entries(insight.sentiment.masked)
                      .map(([k, v]) => `${v} ${k.toLowerCase()}`)
                      .join(', ')}) were masked before analysis.`
                  : 'Answers were checked for personal details before analysis; none were found.'}{' '}
                Generated by AI from masked text: check the quotes before acting on it.
              </p>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Sentiment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <SentimentBar counts={insight.sentiment} />
                {insight.sentiment.byQuestion.length > 1 &&
                  insight.sentiment.byQuestion.map((q) => (
                    <div key={q.questionId} className="space-y-1">
                      <p className="text-sm font-medium">{q.label}</p>
                      <SentimentBar counts={q} />
                    </div>
                  ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Topics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {insight.topics.length === 0 && <p className="text-sm text-muted-foreground">No recurring topics.</p>}
                {insight.topics.map((t) => (
                  <details key={t.label} className="group">
                    <summary className="cursor-pointer list-none space-y-1">
                      <div className="flex items-baseline justify-between gap-2 text-sm">
                        <span className="font-medium">{t.label}</span>
                        <span className="text-muted-foreground">{t.count}</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted">
                        <div
                          className="h-2 rounded-full bg-primary"
                          style={{ width: `${(t.count / maxTopic) * 100}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">{t.description}</p>
                    </summary>
                    <ul className="mt-2 space-y-1 border-l-2 pl-3 text-sm italic text-muted-foreground">
                      {t.examples.map((q, i) => (
                        <li key={i}>&ldquo;{q}&rdquo;</li>
                      ))}
                    </ul>
                  </details>
                ))}
              </CardContent>
            </Card>
          </div>

          {insight.clusters.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold">Groups of similar answers</h2>
              {Array.from(new Set(insight.clusters.map((c) => c.question))).map((question) => (
                <div key={question} className="space-y-2">
                  <p className="text-sm text-muted-foreground">{question}</p>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {insight.clusters
                      .filter((c) => c.question === question)
                      .map((c) => (
                        <Card key={`${c.questionId}-${c.label}`}>
                          <CardHeader className="pb-2">
                            <CardTitle className="flex items-baseline justify-between gap-2 text-base">
                              <span>{c.label}</span>
                              <span className="whitespace-nowrap text-sm font-normal text-muted-foreground">{c.size} answers</span>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <ul className="space-y-2 text-sm italic text-muted-foreground">
                              {c.quotes.map((q, i) => (
                                <li key={i}>&ldquo;{q}&rdquo;</li>
                              ))}
                            </ul>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
