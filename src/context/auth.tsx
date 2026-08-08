import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import type { ReactNode } from "react"
import { api, clearSession, decodeJwt, getAccessToken, getRefreshToken, refreshAccessToken, setSessionTokens } from "../lib/api"
import type { JwtUser } from "../lib/api"

interface RegisterData {
  email: string
  password: string
  firstName: string
  lastName: string
  phoneNumber: string
}

interface AuthState {
  user: JwtUser | null
  token: string | null
  roles: string[]
  hasRole: (...roles: string[]) => boolean
  login: (email: string, password: string) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

function readSession(): { user: JwtUser | null; token: string | null } {
  const token = getAccessToken()
  if (!token) return { user: null, token: null }
  return { user: decodeJwt(token), token }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState(readSession)

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.login(email, password)
    setSessionTokens({ accessToken: res.accessToken, refreshToken: res.refreshToken })
    setSession({ token: res.accessToken, user: decodeJwt(res.accessToken) })
  }, [])

  const register = useCallback(async (data: RegisterData) => {
    await api.register(data)
  }, [])

  const logout = useCallback(async () => {
    try {
      if (getRefreshToken()) await api.logout()
    } catch {
      /* révoquant est best effort : on nettoie même si Keycloak est injoignable */
    } finally {
      clearSession()
      setSession({ token: null, user: null })
    }
  }, [])

  // Renouvellement préventif : 60 s avant l'expiration du JWT
  const expiresAt = session.token ? (decodeJwt(session.token)?.exp ?? 0) * 1000 : 0
  useEffect(() => {
    if (!expiresAt) return
    const delay = Math.max(0, expiresAt - Date.now() - 60_000)
    const timer = setTimeout(() => {
      refreshAccessToken()
        ?.then((fresh) => fresh && setSession({ token: fresh, user: decodeJwt(fresh) }))
        .catch(() => undefined)
    }, delay)
    return () => clearTimeout(timer)
  }, [expiresAt, session?.token])

  useEffect(() => {
    const onUnauthorized = () => {
      if (session?.token) void logout()
    }
    window.addEventListener("foodexpress:unauthorized", onUnauthorized)
    return () => window.removeEventListener("foodexpress:unauthorized", onUnauthorized)
  }, [session?.token, logout])

  const roles = useMemo(
    () => session?.user?.roles ?? session?.user?.realm_access?.roles ?? [],
    [session],
  )

  const hasRole = useCallback(
    (...required: string[]) => required.some((r) => roles.includes(r)),
    [roles],
  )

  return (
    <AuthContext.Provider
      value={{
        user: session?.user ?? null,
        token: session?.token ?? null,
        roles,
        hasRole,
        login,
        register,
        logout,
      }}
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