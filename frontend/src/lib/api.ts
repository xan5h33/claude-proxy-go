import { getToken, clearToken } from "./auth"

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken()
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  })
  if (res.status === 401) {
    clearToken()
    if (typeof window !== "undefined") window.location.href = "/login"
    throw new Error("Unauthorized")
  }
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
  email: string
  api_key: string
  is_admin: boolean
  balance: number | undefined
  total_input_tokens: number
  total_output_tokens: number
  created_at: string
}

export interface UsageLog {
  id: string
  user_id: string
  provider_id: string
  input_tokens: number
  output_tokens: number
  created_at: string
}

export interface AuthResponse {
  token: string
  user: User
}

export const auth = {
  register: (email: string, password: string) =>
    request<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  login: (email: string, password: string) =>
    request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
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
    topUp: (id: string, amount: number) =>
      request<User>(`/admin/users/${id}/topup`, {
        method: "POST",
        body: JSON.stringify({ amount }),
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
  rotateKey: (key: string) =>
    meRequest<User>(key, "/user/me/rotate-key", { method: "POST" }),
  listProviders: (key: string) => meRequest<Provider[]>(key, "/user/me/providers"),
  registerProvider: (key: string, data: {
    name: string; refresh_token: string; access_token?: string
    account_uuid: string; device_id: string; billing: string; cap?: number
  }) => meRequest<Provider>(key, "/user/me/providers", { method: "POST", body: JSON.stringify(data) }),
  updateProviderTokens: (key: string, providerId: string, refreshToken: string) =>
    meRequest<void>(key, `/user/me/providers/${providerId}/tokens`, {
      method: "PATCH", body: JSON.stringify({ refresh_token: refreshToken }),
    }),
  setProviderActive: (key: string, providerId: string, active: boolean) =>
    meRequest<void>(key, `/user/me/providers/${providerId}/active`, {
      method: "PATCH", body: JSON.stringify({ active }),
    }),
}

// JWT-based self-service (uses stored token instead of passed key)
export const dashboard = {
  getMe: () => request<User>("/user/me"),
  rotateKey: () => request<User>("/user/me/rotate-key", { method: "POST" }),
  listProviders: () => request<Provider[]>("/user/me/providers"),
  registerProvider: (data: {
    name: string; refresh_token: string; access_token?: string
    account_uuid: string; device_id: string; billing: string; cap?: number
  }) => request<Provider>("/user/me/providers", { method: "POST", body: JSON.stringify(data) }),
  updateProviderTokens: (id: string, refreshToken: string) =>
    request<void>(`/user/me/providers/${id}/tokens`, { method: "PATCH", body: JSON.stringify({ refresh_token: refreshToken }) }),
  setProviderActive: (id: string, active: boolean) =>
    request<void>(`/user/me/providers/${id}/active`, { method: "PATCH", body: JSON.stringify({ active }) }),
  updateProviderSettings: (id: string, settings: ProviderSettings) =>
    request<void>(`/user/me/providers/${id}/settings`, { method: "PATCH", body: JSON.stringify(settings) }),
  getUsage: () => request<UsageLog[]>("/user/me/usage"),
}
