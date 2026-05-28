async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error ?? res.statusText)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

export interface Provider {
  id: string
  name: string
  account_uuid: string
  cap: number
  is_active: boolean
  window_start_hour: number | null
  window_end_hour: number | null
  window_timezone: string
  rate_limited_until: string | null
  total_input_tokens: number
  total_output_tokens: number
  created_at: string
  updated_at: string
}

export interface ProviderSettings {
  cap: number
  window_start_hour: number | null
  window_end_hour: number | null
  window_timezone: string
}

export interface User {
  id: string
  api_key: string
  cap: number
  total_input_tokens: number
  total_output_tokens: number
  created_at: string
}

export const api = {
  providers: {
    list: () => request<Provider[]>("/admin/providers"),
    get: (id: string) => request<Provider>(`/admin/providers/${id}`),
    updateRefreshToken: (id: string, refreshToken: string) =>
      request<void>(`/admin/providers/${id}/refresh-token`, {
        method: "PATCH",
        body: JSON.stringify({ refresh_token: refreshToken }),
      }),
    updateSettings: (id: string, settings: ProviderSettings) =>
      request<void>(`/admin/providers/${id}/settings`, {
        method: "PATCH",
        body: JSON.stringify(settings),
      }),
    setActive: (id: string, active: boolean) =>
      request<void>(`/admin/providers/${id}/active`, {
        method: "PATCH",
        body: JSON.stringify({ active }),
      }),
    delete: (id: string) =>
      request<void>(`/admin/providers/${id}`, { method: "DELETE" }),
  },
  users: {
    list: () => request<User[]>("/admin/users"),
    get: (id: string) => request<User>(`/admin/users/${id}`),
    create: () => request<User>("/admin/users", { method: "POST" }),
    updateCap: (id: string, cap: number) =>
      request<void>(`/admin/users/${id}/cap`, {
        method: "PATCH",
        body: JSON.stringify({ cap }),
      }),
    rotateKey: (id: string) =>
      request<User>(`/admin/users/${id}/rotate-key`, { method: "POST" }),
    delete: (id: string) =>
      request<void>(`/admin/users/${id}`, { method: "DELETE" }),
  },
}

// Self-service: uses caller-supplied API key instead of admin context
export async function meRequest<T>(apiKey: string, path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      ...init?.headers,
    },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error ?? res.statusText)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

export const me = {
  get: (key: string) => meRequest<User>(key, "/user/me"),
  updateCap: (key: string, cap: number) =>
    meRequest<void>(key, "/user/me/cap", { method: "PATCH", body: JSON.stringify({ cap }) }),
  rotateKey: (key: string) =>
    meRequest<User>(key, "/user/me/rotate-key", { method: "POST" }),
}
