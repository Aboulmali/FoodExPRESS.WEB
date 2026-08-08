import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import type { ReactNode } from "react"
import { api, decodeJwt, setToken } from "../lib/api"
import type { JwtUser } from "../lib/api"

interface RegisterData {
  email: string
  password: string
  firstName: string
  lastName: string
  phoneNumber: string
  role?: number
}

interface AuthState {
  user: JwtUser | null
  token: string | null
  roles: string[]
  hasRole: (...roles: string[]) => boolean
  login: (email: string, password: string) => Promise<void>
  register: (data: RegisterData) => Promise<void>
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

  const register = useCallback(async (data: RegisterData) => {
    await api.register(data)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem("foodexpress_token")
    applyToken(null)
    setSession({ token: null, user: null })
  }, [])

  useEffect(() => {
    const onUnauthorized = () => {
      if (session.token) logout()
    }
    window.addEventListener("foodexpress:unauthorized", onUnauthorized)
    return () => window.removeEventListener("foodexpress:unauthorized", onUnauthorized)
  }, [session.token, logout])

  const roles = useMemo(
    () => session.user?.roles ?? session.user?.realm_access?.roles ?? [],
    [session.user],
  )

  const hasRole = useCallback(
    (...required: string[]) => required.some((r) => roles.includes(r)),
    [roles],
  )

  return (
    <AuthContext.Provider
      value={{ user: session.user, token: session.token, roles, hasRole, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth doit être utilisé dans <AuthProvider>")
  return ctx
}