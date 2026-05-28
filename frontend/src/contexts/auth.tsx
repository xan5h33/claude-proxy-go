"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from "react"
import { getToken, setToken, clearToken, parseToken, isTokenValid } from "@/lib/auth"
import { User } from "@/lib/api"

interface AuthContextValue {
  user: User | null
  token: string | null
  isAdmin: boolean
  isLoading: boolean
  setAuth: (token: string, user: User) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  token: null,
  isAdmin: false,
  isLoading: true,
  setAuth: () => {},
  logout: () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setTokenState] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const stored = getToken()
    if (stored && isTokenValid(stored)) {
      const payload = parseToken(stored)
      if (payload) {
        setTokenState(stored)
        // Fetch full user info
        fetch("/api/user/me", {
          headers: { Authorization: `Bearer ${stored}` },
        })
          .then((r) => r.ok ? r.json() : null)
          .then((u) => { if (u) setUser(u) })
          .catch(() => {})
          .finally(() => setIsLoading(false))
        return
      }
    }
    clearToken()
    setIsLoading(false)
  }, [])

  const setAuth = (tok: string, u: User) => {
    setToken(tok)
    setTokenState(tok)
    setUser(u)
  }

  const logout = () => {
    clearToken()
    setTokenState(null)
    setUser(null)
    window.location.href = "/login"
  }

  const isAdmin = user?.is_admin ?? false

  return (
    <AuthContext.Provider value={{ user, token, isAdmin, isLoading, setAuth, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
