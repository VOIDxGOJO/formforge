import { Suspense } from 'react';
import { AuthLayout } from '@/components/layouts/AuthLayout';
import { AcceptInviteClient } from './accept-invite-client';

export default function AcceptInvitePage() {
  return (
    <AuthLayout>
      <Suspense fallback={null}>
        <AcceptInviteClient />
      </Suspense>
    </AuthLayout>
  );
}
