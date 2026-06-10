"use client"

import { createContext, useContext, useEffect, useState, useRef, ReactNode } from "react"
import { useUser, useClerk } from "@clerk/nextjs"
import { User } from "@/lib/api"

const API_KEY_STORAGE = "ladle_api_key"

export const getApiKey = (): string | null =>
  typeof window !== "undefined" ? localStorage.getItem(API_KEY_STORAGE) : null

const storeApiKey = (k: string) => localStorage.setItem(API_KEY_STORAGE, k)
const clearApiKey = () => localStorage.removeItem(API_KEY_STORAGE)

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
  const { user: clerkUser, isLoaded: clerkLoaded } = useUser()
  const { signOut } = useClerk()
  const [user, setUser] = useState<User | null>(null)
  const [apiKey, setApiKeyState] = useState<string | null>(null)
  const [synced, setSynced] = useState(false)
  const syncingRef = useRef(false)

  useEffect(() => {
    if (!clerkLoaded) return

    if (!clerkUser) {
      clearApiKey()
      setUser(null)
      setApiKeyState(null)
      setSynced(false)
      syncingRef.current = false
      return
    }

    if (synced || syncingRef.current) return
    syncingRef.current = true

    fetch("/api/auth/sync", { method: "POST" })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => {
        storeApiKey(data.user.api_key)
        setApiKeyState(data.user.api_key)
        setUser(data.user)
      })
      .catch(() => {
        const existing = getApiKey()
        if (existing) {
          setApiKeyState(existing)
          fetch("/api/user/me", { headers: { Authorization: `Bearer ${existing}` } })
            .then(r => r.ok ? r.json() : null)
            .then(u => { if (u) setUser(u) })
            .catch(() => {})
        }
      })
      .finally(() => {
        setSynced(true)
        syncingRef.current = false
      })
  }, [clerkLoaded, clerkUser, synced])

  const setAuth = (token: string, u: User) => {
    storeApiKey(token)
    setApiKeyState(token)
    setUser(u)
  }

  const logout = () => {
    clearApiKey()
    setUser(null)
    setApiKeyState(null)
    setSynced(false)
    signOut({ redirectUrl: "/login" })
  }

  return (
    <AuthContext.Provider value={{
      user,
      token: apiKey,
      isAdmin: user?.is_admin ?? false,
      isLoading: !clerkLoaded || (!!clerkUser && !synced),
      setAuth,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
