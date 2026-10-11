'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { Sparkles } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useDraftStore, type FormDraft } from '@/store/draft-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

const EXAMPLE =
  'A feedback form for students who finished a summer internship. We want to know about mentoring, workload, technical learning and whether they would recommend the company to juniors.';

export function GenerateFormDialog({ workspaceId }: { workspaceId: string }) {
  const router = useRouter();
  const setDraft = useDraftStore((s) => s.setDraft);
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [objective, setObjective] = useState('');
  const [questionCount, setQuestionCount] = useState(10);

  const generate = useMutation({
    mutationFn: () =>
      apiFetch<FormDraft>(`/api/v1/workspaces/${workspaceId}/ai/forms/generate`, {
        method: 'POST',
        body: JSON.stringify({
          description: description.trim(),
          ...(objective.trim() ? { objective: objective.trim() } : {}),
          questionCount
        })
      }),
    onSuccess: (draft) => {
      setDraft(draft);
      setOpen(false);
      router.push('/dashboard/forms/draft');
    }
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !generate.isPending && setOpen(o)}>
      <DialogTrigger asChild>
        <Button variant="secondary">
          <Sparkles className="mr-2 h-4 w-4" />
          Generate with AI
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>Generate a form with AI</DialogTitle>
        <DialogDescription>
          Describe what you want to find out. You get a draft to review and edit; nothing is saved until you save it.
        </DialogDescription>
        <form
          className="mt-5 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            generate.mutate();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="ai-description">Description</Label>
            <textarea
              id="ai-description"
              rows={5}
              maxLength={2000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={EXAMPLE}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ai-objective">Objective (optional)</Label>
            <Input
              id="ai-objective"
              maxLength={1000}
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              placeholder="e.g. Decide what to change in next year's internship programme"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ai-count">Number of questions</Label>
            <select
              id="ai-count"
              value={questionCount}
              onChange={(e) => setQuestionCount(Number(e.target.value))}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {[5, 8, 10, 12, 15, 20].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          {generate.isError && (
            <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {(generate.error as Error).message}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={description.trim().length < 10 || generate.isPending}>
            {generate.isPending ? 'Generating… this takes 10-20 seconds' : 'Generate draft'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
