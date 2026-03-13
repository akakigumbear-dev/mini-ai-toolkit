const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface RequestOptions {
  method?: string;
  body?: unknown;
  params?: Record<string, string | undefined>;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, params } = options;

  let url = `${API_URL}${path}`;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        searchParams.append(key, value);
      }
    });
    const qs = searchParams.toString();
    if (qs) url += `?${qs}`;
  }

  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message || `Request failed: ${res.status}`);
  }

  return res.json();
}

export const api = {
  createGeneration: (data: { prompt: string; type: string }) =>
    request('/generations', { method: 'POST', body: data }),

  getGenerations: (params?: Record<string, string | undefined>) =>
    request('/generations', { params }),

  getGeneration: (id: string) => request(`/generations/${id}`),

  retryGeneration: (id: string) =>
    request(`/generations/${id}/retry`, { method: 'POST' }),

  cancelGeneration: (id: string) =>
    request(`/generations/${id}/cancel`, { method: 'POST' }),
};
