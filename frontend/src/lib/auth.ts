const API_KEY_STORAGE = "ladle_api_key"

export const getToken = (): string | null =>
  typeof window !== "undefined" ? localStorage.getItem(API_KEY_STORAGE) : null

export const setToken = (t: string) => localStorage.setItem(API_KEY_STORAGE, t)

export const clearToken = () => localStorage.removeItem(API_KEY_STORAGE)
