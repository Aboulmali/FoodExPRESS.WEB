import { createContext, useCallback, useContext, useState } from "react"
import type { ReactNode } from "react"
import { api, decodeJwt, setToken } from "../lib/api"
import type { JwtUser } from "../lib/api"

interface AuthState {
  user: JwtUser | null
  token: string | null
  login: (email: string, password: string) => Promise<void>
  register: (data: {
    email: string
    password: string
    firstName: string
    lastName: string
    phoneNumber: string
  }) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthState | null>(null)

function readSession(): { user: JwtUser | null; token: string | null } {
  const token = localStorage.getItem("foodexpress_token")
  if (!token) return { user: null, token: null }
  return { user: decodeJwt(token), token }
}

function applyToken(token: string | null) {
  setToken(token)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState(readSession)

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.login(email, password)
    localStorage.setItem("foodexpress_token", res.accessToken)
    applyToken(res.accessToken)
    setSession({ token: res.accessToken, user: decodeJwt(res.accessToken) })
  }, [])

  const register = useCallback(
    async (data: { email: string; password: string; firstName: string; lastName: string; phoneNumber: string }) => {
      await api.register(data)
    },
    [],
  )

  const logout = useCallback(() => {
    localStorage.removeItem("foodexpress_token")
    applyToken(null)
    setSession({ token: null, user: null })
  }, [])

  return (
    <AuthContext.Provider value={{ user: session.user, token: session.token, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth doit être utilisé dans <AuthProvider>")
  return ctx
}