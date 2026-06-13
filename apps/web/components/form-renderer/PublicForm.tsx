'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import type { FieldSchema } from '@formforge/types';
import { apiFetch } from '@/lib/api';
import { FieldRenderer } from './FieldRenderer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function PublicForm({
  slug,
  name,
  fields
}: {
  slug: string;
  name: string;
  fields: FieldSchema[];
}) {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, reset } = useForm<Record<string, string>>();

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    const responses: Record<string, unknown> = { ...values };
    await apiFetch(`/api/public/forms/${slug}/submit`, {
      method: 'POST',
      body: JSON.stringify({ responses })
    });
    setSubmitted(true);
    reset();
  });

  if (submitted) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <h2 className="text-xl font-semibold">Thank you!</h2>
          <p className="text-muted-foreground">Your response has been recorded.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{name}</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={onSubmit}>
          {fields.map((field) => (
            <FieldRenderer key={field.id} field={field} register={register} />
          ))}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" className="w-full">
            Submit
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
