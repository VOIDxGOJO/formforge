import type { ApiResponse } from '@formforge/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export class ApiClientError extends Error {
  code: string;
  details?: unknown;
  status: number;

  constructor(code: string, message: string, status: number, details?: unknown) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

type RequestOptions = RequestInit & { skipAuthRedirect?: boolean };

// One refresh at a time: concurrent 401s wait for the same request.
let refreshing: Promise<boolean> | null = null;

const refreshSession = (): Promise<boolean> => {
  refreshing ??= fetch(`${API_URL}/api/v1/auth/refresh`, { method: 'POST', credentials: 'include' })
    .then((r) => r.ok)
    .catch(() => false)
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
};

const send = (path: string, options: RequestOptions) =>
  fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {})
    }
  });

export async function apiFetch<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  // These answer 401 for bad credentials or a dead session; never refresh or redirect for them.
  const isAuthCall = /^\/api\/v1\/auth\/(login|register|refresh|logout)\b/.test(path);
  let res = await send(path, options);
  if (res.status === 401 && !isAuthCall && (await refreshSession())) {
    res = await send(path, options);
  }

  const json = (await res.json()) as ApiResponse<T>;

  if (!res.ok || !json.success) {
    if (res.status === 401 && !isAuthCall && !options.skipAuthRedirect && typeof window !== 'undefined') {
      const next = window.location.pathname + window.location.search;
      window.location.href = `/login?next=${encodeURIComponent(next)}`;
    }
    const err = !json.success ? json.error : { code: 'UNKNOWN', message: 'Request failed' };
    throw new ApiClientError(err.code, err.message, res.status, err.details);
  }

  return json.data;
}
