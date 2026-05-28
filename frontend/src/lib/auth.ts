export const getToken = (): string | null =>
  typeof window !== "undefined" ? localStorage.getItem("token") : null

export const setToken = (t: string) => localStorage.setItem("token", t)

export const clearToken = () => localStorage.removeItem("token")

export interface TokenPayload {
  sub: string
  admin: boolean
  exp: number
}

export function parseToken(token: string): TokenPayload | null {
  try {
    const payload = token.split(".")[1]
    return JSON.parse(atob(payload))
  } catch {
    return null
  }
}

export function isTokenValid(token: string): boolean {
  const p = parseToken(token)
  if (!p) return false
  return p.exp * 1000 > Date.now()
}
