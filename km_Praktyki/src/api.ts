import type { TextItem } from './types'

const API_URL = import.meta.env.VITE_API_URL ?? '/api'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => null)
    throw new Error(error?.detail ?? 'Nie udało się połączyć z serwerem.')
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}

export const textApi = {
  list: () => request<TextItem[]>('/texts'),
  create: (content: string) =>
    request<TextItem>('/texts', {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),
  remove: (id: number) =>
    request<void>(`/texts/${id}`, {
      method: 'DELETE',
    }),
}
