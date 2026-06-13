'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { getSession, clearSession, type AuthUser } from '@/lib/auth';
import { useRouter } from 'next/navigation';

export const useAuth = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: getSession,
    retry: false
  });

  const logout = useMutation({
    mutationFn: clearSession,
    onSuccess: () => {
      queryClient.clear();
      router.push('/login');
    }
  });

  return { user: query.data as AuthUser | undefined, ...query, logout };
};

export const useLogin = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { email: string; password: string }) =>
      apiFetch('/api/v1/auth/login', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      router.push('/dashboard');
    }
  });
};

export const useRegister = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; email: string; password: string }) =>
      apiFetch('/api/v1/auth/register', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      router.push('/dashboard');
    }
  });
};
