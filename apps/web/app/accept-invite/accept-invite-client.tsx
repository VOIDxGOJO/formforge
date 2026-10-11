'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import { useWorkspaceStore } from '@/hooks/use-workspace';

export function AcceptInviteClient() {
  const params = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const setWorkspaceId = useWorkspaceStore((s) => s.setWorkspaceId);
  const { user, isLoading } = useAuth();

  const workspaceId = params.get('workspace');
  const token = params.get('token');
  const here = `/accept-invite?${params.toString()}`;

  const accept = useMutation({
    mutationFn: () =>
      apiFetch(`/api/v1/workspaces/${workspaceId}/accept-invite`, {
        method: 'POST',
        body: JSON.stringify({ token })
      }),
    onSuccess: () => {
      if (workspaceId) setWorkspaceId(workspaceId);
      void queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      router.push('/dashboard');
    }
  });

  if (!workspaceId || !token) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Invalid invitation link</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          This link is incomplete. Ask the person who invited you to send a new invitation.
        </CardContent>
      </Card>
    );
  }

  if (isLoading) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Join workspace</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {user ? (
          <>
            <p className="text-sm text-muted-foreground">
              You are signed in as <span className="font-medium text-foreground">{user.email}</span>. The
              invitation must have been sent to this address.
            </p>
            {accept.isError && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {(accept.error as Error).message}
              </p>
            )}
            <Button className="w-full" onClick={() => accept.mutate()} disabled={accept.isPending}>
              {accept.isPending ? 'Joining…' : 'Accept invitation'}
            </Button>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Sign in or create an account with the e-mail address the invitation was sent to.
            </p>
            <div className="flex gap-3">
              <Button asChild className="flex-1">
                <Link href={`/login?next=${encodeURIComponent(here)}`}>Sign in</Link>
              </Button>
              <Button asChild variant="outline" className="flex-1">
                <Link href={`/register?next=${encodeURIComponent(here)}`}>Create account</Link>
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
