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

export async function apiFetch<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {})
    }
  });

  const json = (await res.json()) as ApiResponse<T>;

  if (!res.ok || !json.success) {
    if (res.status === 401 && !options.skipAuthRedirect && typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    const err = !json.success ? json.error : { code: 'UNKNOWN', message: 'Request failed' };
    throw new ApiClientError(err.code, err.message, res.status, err.details);
  }

  return json.data;
}
