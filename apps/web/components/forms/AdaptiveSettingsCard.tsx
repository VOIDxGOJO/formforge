'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Shuffle } from 'lucide-react';
import type { AdaptiveConfig, AdaptiveWeights } from '@formforge/types';
import { apiFetch } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

type Status = {
  config: AdaptiveConfig;
  questions: {
    modeled: Array<{ id: string; label: string; anchor: boolean }>;
    askedAfter: Array<{ id: string; label: string }>;
    skipped: Array<{ id: string; label: string }>;
  };
  model: { nReal: number; nSynthetic: number; createdAt: string; current: boolean } | null;
  submissions: number;
};

const WEIGHTS: Array<[keyof AdaptiveWeights, string]> = [
  ['informationGain', 'Information gain'],
  ['relevance', 'Relevance'],
  ['coverage', 'Coverage'],
  ['burden', 'Burden (penalty)'],
  ['redundancy', 'Redundancy (penalty)']
];

export function AdaptiveSettingsCard({ workspaceId, formId }: { workspaceId: string; formId: string }) {
  const queryClient = useQueryClient();
  const base = `/api/v1/workspaces/${workspaceId}/forms/${formId}/adaptive`;
  const status = useQuery({ queryKey: ['adaptive', formId], queryFn: () => apiFetch<Status>(base) });
  const [config, setConfig] = useState<AdaptiveConfig | null>(null);
  useEffect(() => {
    if (status.data) setConfig(status.data.config);
  }, [status.data]);

  const save = useMutation({
    mutationFn: (next: AdaptiveConfig) => apiFetch<AdaptiveConfig>(base, { method: 'PATCH', body: JSON.stringify(next) }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['adaptive', formId] })
  });
  const refit = useMutation({
    mutationFn: () => apiFetch(`${base}/refit`, { method: 'POST' }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['adaptive', formId] })
  });

  if (!status.data || !config) return null;
  const { questions, model, submissions } = status.data;
  const set = (patch: Partial<AdaptiveConfig>) => setConfig({ ...config, ...patch });
  const num = (v: string, fallback: number) => (v === '' || Number.isNaN(Number(v)) ? fallback : Number(v));
  const canAdapt = questions.modeled.length > 0;
  const anchors = questions.modeled.filter((q) => q.anchor).length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Shuffle className="h-5 w-5" /> Adaptive mode
          </CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Respondents see one question at a time and only the questions that add information for them.
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            className="h-4 w-4 accent-primary"
            checked={config.enabled}
            disabled={!canAdapt}
            onChange={(e) => set({ enabled: e.target.checked })}
          />
          {config.enabled ? 'On' : 'Off'}
        </label>
      </CardHeader>
      <CardContent className="space-y-5 text-sm">
        {!canAdapt ? (
          <p className="rounded-md bg-amber-50 px-3 py-2 text-amber-800">
            Add at least one dropdown or rating question to use adaptive mode.
          </p>
        ) : (
          <ul className="space-y-1 text-muted-foreground">
            <li>
              <span className="font-medium text-foreground">{questions.modeled.length}</span> choice questions are chosen
              adaptively; <span className="font-medium text-foreground">{anchors}</span> required ones are always asked first.
            </li>
            {questions.askedAfter.length > 0 && (
              <li>Asked at the end: {questions.askedAfter.map((q) => `"${q.label}"`).join(', ')}.</li>
            )}
            {questions.skipped.length > 0 && (
              <li>Left out in adaptive mode (optional text): {questions.skipped.map((q) => `"${q.label}"`).join(', ')}.</li>
            )}
          </ul>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1">
            <Label htmlFor="ad-max-q">Max questions</Label>
            <Input id="ad-max-q" type="number" min={1} max={50} value={config.maxQuestions}
              onChange={(e) => set({ maxQuestions: num(e.target.value, config.maxQuestions) })} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="ad-max-s">Max time (seconds)</Label>
            <Input id="ad-max-s" type="number" min={30} max={3600} value={config.maxSeconds}
              onChange={(e) => set({ maxSeconds: num(e.target.value, config.maxSeconds) })} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="ad-cov">Min coverage before stopping (%)</Label>
            <Input id="ad-cov" type="number" min={0} max={100} value={Math.round(config.minCoverage * 100)}
              onChange={(e) => set({ minCoverage: num(e.target.value, config.minCoverage * 100) / 100 })} />
          </div>
        </div>

        <details className="rounded-md border px-3 py-2">
          <summary className="cursor-pointer font-medium">Advanced: stop rule and utility weights</summary>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="ad-conf">Confidence to count a target as covered</Label>
              <Input id="ad-conf" type="number" step={0.05} min={0.5} max={0.99} value={config.confidence}
                onChange={(e) => set({ confidence: num(e.target.value, config.confidence) })} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ad-gain">Stop when remaining gain is below</Label>
              <Input id="ad-gain" type="number" step={0.01} min={0} max={1} value={config.stopGain}
                onChange={(e) => set({ stopGain: num(e.target.value, config.stopGain) })} />
            </div>
            {WEIGHTS.map(([key, label]) => (
              <div key={key} className="space-y-1">
                <Label htmlFor={`ad-w-${key}`}>{label}</Label>
                <Input id={`ad-w-${key}`} type="number" step={0.05} min={0} max={1} value={config.weights[key]}
                  onChange={(e) => set({ weights: { ...config.weights, [key]: num(e.target.value, config.weights[key]) } })} />
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Defaults follow the evaluated settings: 10 questions, 240 s, 80% coverage, 0.70 confidence, 0.10 stop gain.</p>
        </details>

        <div className="flex items-center gap-3">
          <Button onClick={() => save.mutate(config)} disabled={save.isPending || !canAdapt}>
            {save.isPending ? 'Saving…' : 'Save adaptive settings'}
          </Button>
          {save.isSuccess && <span className="text-emerald-700">Saved</span>}
          {save.isError && <span className="text-destructive">{(save.error as Error).message}</span>}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-muted/30 px-3 py-3">
          <div>
            <p className="font-medium">
              Respondent model{' '}
              {model && !model.current && <Badge variant="warning">Questions changed, retrain</Badge>}
            </p>
            <p className="text-muted-foreground">
              {model
                ? `Trained on ${model.nReal} real${model.nSynthetic ? ` + ${model.nSynthetic} synthetic` : ''} responses, ${formatDate(model.createdAt)}. Retrains automatically every 25 new responses.`
                : 'No model yet. Until there is data the engine relies on relevance and coverage only.'}{' '}
              {submissions} responses so far.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refit.mutate()} disabled={refit.isPending || !canAdapt}>
            {refit.isPending ? 'Training…' : 'Train now'}
          </Button>
        </div>
        {refit.isError && <p className="text-destructive">{(refit.error as Error).message}</p>}
      </CardContent>
    </Card>
  );
}
