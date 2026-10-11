'use client';

import { useCallback, useEffect, useState } from 'react';
import { FieldType, RATING_MAX, RATING_MIN, type PublicField } from '@formforge/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

type Step = { question: PublicField | null; progress: number; answered: number; done?: boolean };

const post = async <T,>(path: string, body?: unknown): Promise<T> => {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message ?? 'Something went wrong');
  return json.data as T;
};

const isChoice = (q: PublicField) => q.type === FieldType.RATING || q.type === FieldType.DROPDOWN;

/** One question at a time; the server's engine picks each next question. */
export function AdaptiveForm({ slug, name }: { slug: string; name: string }) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [step, setStep] = useState<Step | null>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);

  const start = useCallback(async () => {
    setError(null);
    try {
      const s = await post<Step & { sessionId: string }>(`/api/public/forms/${slug}/sessions`);
      setSessionId(s.sessionId);
      setStep(s);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [slug]);

  useEffect(() => {
    void start();
  }, [start]);

  const answer = async (value: string | null) => {
    if (!sessionId || !step?.question || busy) return;
    setBusy(true);
    setError(null);
    try {
      const next = await post<Step>(`/api/public/sessions/${sessionId}/answers`, { fieldId: step.question.id, value });
      setText('');
      if (next.done) {
        await post(`/api/public/sessions/${sessionId}/complete`);
        setFinished(true);
      }
      setStep(next);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (finished) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <h2 className="text-xl font-semibold">Thank you!</h2>
          <p className="text-muted-foreground">Your response has been recorded.</p>
        </CardContent>
      </Card>
    );
  }

  const q = step?.question;
  const percent = Math.round((step?.progress ?? 0) * 100);

  return (
    <Card>
      <CardHeader className="space-y-3">
        <CardTitle>{name}</CardTitle>
        <div className="space-y-1">
          <div
            className="h-2 w-full overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Progress"
          >
            <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${percent}%` }} />
          </div>
          <p className="text-xs text-muted-foreground">
            {step ? `Question ${step.answered + 1} · only the questions that matter for you are asked` : 'Loading…'}
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div role="alert" className="space-y-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <p>{error}</p>
            {!sessionId && (
              <Button size="sm" variant="outline" onClick={() => void start()}>
                Try again
              </Button>
            )}
          </div>
        )}
        {q && (
          <div key={q.id} className="animate-fade-in space-y-4">
            <p className="text-lg font-medium">
              {q.label}
              {q.required && <span className="text-red-500"> *</span>}
            </p>
            {q.type === FieldType.RATING && (
              <div role="radiogroup" aria-label={q.label} className="flex gap-2">
                {Array.from({ length: RATING_MAX - RATING_MIN + 1 }, (_, i) => String(RATING_MIN + i)).map((v) => (
                  <button
                    key={v}
                    type="button"
                    role="radio"
                    aria-checked={false}
                    disabled={busy}
                    onClick={() => void answer(v)}
                    className="flex h-12 w-12 items-center justify-center rounded-md border text-base font-medium transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
                  >
                    {v}
                  </button>
                ))}
              </div>
            )}
            {q.type === FieldType.DROPDOWN && (
              <div role="radiogroup" aria-label={q.label} className="grid gap-2">
                {(q.options ?? []).map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    role="radio"
                    aria-checked={false}
                    disabled={busy}
                    onClick={() => void answer(o.value)}
                    className="rounded-md border px-4 py-3 text-left text-sm transition-colors hover:border-primary hover:bg-primary/5 disabled:opacity-50"
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            )}
            {!isChoice(q) && (
              <form
                className="space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  void answer(text.trim() || null);
                }}
              >
                {q.type === FieldType.TEXTAREA ? (
                  <textarea
                    aria-label={q.label}
                    rows={4}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder={q.placeholder}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                ) : (
                  <Input
                    aria-label={q.label}
                    type={q.type === FieldType.EMAIL ? 'email' : q.type === FieldType.NUMBER ? 'number' : 'text'}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder={q.placeholder}
                  />
                )}
                <div className="flex gap-2">
                  <Button type="submit" disabled={busy || (q.required && !text.trim())} className={cn(!q.required && 'flex-1')}>
                    {busy ? 'Saving…' : 'Next'}
                  </Button>
                  {!q.required && (
                    <Button type="button" variant="outline" disabled={busy} onClick={() => void answer(null)}>
                      Skip
                    </Button>
                  )}
                </div>
              </form>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
