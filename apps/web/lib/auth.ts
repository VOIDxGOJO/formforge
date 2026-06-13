import { apiFetch } from './api';

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  workspaces: Array<{ id: string; name: string; slug: string }>;
};

export const getSession = () => apiFetch<AuthUser>('/api/v1/auth/me', { skipAuthRedirect: true });

export const clearSession = async () => {
  await apiFetch<{ message: string }>('/api/v1/auth/logout', { method: 'POST' });
};
