const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080"
const ADMIN_SECRET = process.env.NEXT_PUBLIC_ADMIN_SECRET ?? ""

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "x-admin-secret": ADMIN_SECRET,
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
  window_seconds: number
  earnings: number
}

export interface User {
  id: string
  api_key: string
  balance: number
  total_used: number
  created_at: string
}

export const api = {
  providers: {
    list: () => request<Provider[]>("/admin/providers"),
    updateRefreshToken: (id: string, refreshToken: string) =>
      request<void>(`/admin/providers/${id}/refresh-token`, {
        method: "PATCH",
        body: JSON.stringify({ refresh_token: refreshToken }),
      }),
    delete: (id: string) =>
      request<void>(`/admin/providers/${id}`, { method: "DELETE" }),
  },
  users: {
    list: () => request<User[]>("/admin/users"),
    create: () => request<User>("/admin/users", { method: "POST" }),
    delete: (id: string) =>
      request<void>(`/admin/users/${id}`, { method: "DELETE" }),
  },
}
