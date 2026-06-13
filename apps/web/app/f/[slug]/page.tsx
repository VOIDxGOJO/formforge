import { PublicFormClient } from './public-form-client';

export default function PublicFormPage({ params }: { params: { slug: string } }) {
  return (
    <main className="mx-auto max-w-xl p-6">
      <PublicFormClient slug={params.slug} />
    </main>
  );
}
