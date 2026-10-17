'use client';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
    readonly errors?: Record<string, string[]>,
  ) {
    super(message);
  }
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

interface Envelope<T> {
  success: boolean;
  message: string;
  data: T;
  meta?: PaginationMeta;
  code?: string;
  errors?: Record<string, string[]>;
}

/**
 * One refresh at a time: if five requests hit an expired access token together, they all
 * wait for the same refresh instead of racing (which the server would treat as token reuse).
 */
let refreshing: Promise<boolean> | null = null;
const refreshSession = () => {
  refreshing ??= fetch('/api/v1/auth/refresh', { method: 'POST', credentials: 'include' })
    .then((r) => r.ok || r.status === 409) // 409 = another tab just rotated it; the new cookie is set
    .catch(() => false)
    .finally(() => setTimeout(() => (refreshing = null), 0));
  return refreshing;
};

type Options = { method?: string; body?: unknown; headers?: Record<string, string>; signal?: AbortSignal };

async function request<T>(path: string, opts: Options = {}, retried = false): Promise<Envelope<T>> {
  const res = await fetch(`/api/v1${path}`, {
    method: opts.method ?? 'GET',
    credentials: 'include',
    signal: opts.signal,
    headers: { ...(opts.body !== undefined && { 'Content-Type': 'application/json' }), ...opts.headers },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  if (res.status === 204) return { success: true, message: '', data: undefined as T };
  const json = (await res.json().catch(() => ({}))) as Envelope<T>;

  if (res.status === 401 && !retried && !path.startsWith('/auth/')) {
    if (await refreshSession()) return request<T>(path, opts, true);
  }
  if (!res.ok) throw new ApiError(json.message ?? `Request failed (${res.status})`, res.status, json.code, json.errors);
  return json;
}

export const api = {
  get: async <T>(path: string, signal?: AbortSignal) => (await request<T>(path, { signal })).data,
  page: async <T>(path: string) => {
    const r = await request<T[]>(path);
    return { data: r.data, meta: r.meta! };
  },
  post: async <T>(path: string, body?: unknown, headers?: Record<string, string>) => (await request<T>(path, { method: 'POST', body, headers })).data,
  patch: async <T>(path: string, body?: unknown) => (await request<T>(path, { method: 'PATCH', body })).data,
  del: async (path: string) => {
    await request(path, { method: 'DELETE' });
  },
};

/** SWR fetcher. */
export const fetcher = <T>(path: string) => api.get<T>(path);

export const errorMessage = (err: unknown) => {
  if (err instanceof ApiError && err.errors) return `${err.message}: ${Object.values(err.errors).flat().join(', ')}`;
  return err instanceof Error ? err.message : 'Something went wrong';
};
