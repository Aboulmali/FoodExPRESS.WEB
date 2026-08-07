import { describe, it, expect, vi, beforeEach } from "vitest"
import { act, renderHook } from "@testing-library/react"
import type { ReactNode } from "react"
import { AuthProvider, useAuth } from "./auth"
import { api } from "../lib/api"

vi.mock("../lib/api", () => {
  return {
    api: { login: vi.fn(), register: vi.fn() },
    decodeJwt: (jwt: string) => {
      const part = jwt.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")
      return JSON.parse(
        decodeURIComponent(
          atob(part)
            .split("")
            .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
            .join(""),
        ),
      )
    },
    setToken: vi.fn(),
  }
})

function makeJwt(payload: Record<string, unknown>): string {
  const enc = (o: unknown) =>
    btoa(JSON.stringify(o)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
  return `${enc({ alg: "RS256", typ: "JWT" })}.${enc(payload)}.fake-signature`
}

const wrapper = ({ children }: { children: ReactNode }) => <AuthProvider>{children}</AuthProvider>

describe("AuthProvider – connexion", () => {
  beforeEach(() => {
    vi.mocked(api.login).mockReset()
    vi.mocked(api.register).mockReset()
    localStorage.clear()
  })

  it("login stocke le token, décode l'utilisateur et met à jour l'état", async () => {
    const jwt = makeJwt({ sub: "u1", email: "sara@test.com", name: "Sara Alami" })
    vi.mocked(api.login).mockResolvedValue({ accessToken: jwt, refreshToken: "r", expiresIn: 300, tokenType: "Bearer" })

    const { result } = renderHook(() => useAuth(), { wrapper })
    await act(async () => {
      await result.current.login("Sara@test.com", "pw")
    })

    expect(localStorage.getItem("foodexpress_token")).toBe(jwt)
    expect(result.current.user?.email).toBe("sara@test.com")
    expect(result.current.user?.name).toBe("Sara Alami")
  })

  it("état initial déconnecté", () => {
    const { result } = renderHook(() => useAuth(), { wrapper })
    expect(result.current.user).toBeNull()
  })

  it("restaure la session depuis localStorage au chargement", () => {
    const jwt = makeJwt({ sub: "u2", email: "client1@test.com" })
    localStorage.setItem("foodexpress_token", jwt)

    const { result } = renderHook(() => useAuth(), { wrapper })
    expect(result.current.user?.sub).toBe("u2")
    expect(result.current.token).toBe(jwt)
  })

  it("logout efface le token et l'état", async () => {
    const jwt = makeJwt({ sub: "u1" })
    vi.mocked(api.login).mockResolvedValue({ accessToken: jwt, refreshToken: "r", expiresIn: 300, tokenType: "Bearer" })

    const { result } = renderHook(() => useAuth(), { wrapper })
    await act(async () => {
      await result.current.login("a@b.c", "pw")
      result.current.logout()
    })

    expect(localStorage.getItem("foodexpress_token")).toBeNull()
    expect(result.current.user).toBeNull()
  })
})

describe("AuthProvider – inscription", () => {
  it("register transmet les données à l'API", async () => {
    vi.mocked(api.register).mockResolvedValue({})

    const { result } = renderHook(() => useAuth(), { wrapper })
    await act(async () => {
      await result.current.register({ email: "x@y.com", password: "pw", firstName: "A", lastName: "B", phoneNumber: "06" })
    })

    expect(api.register).toHaveBeenCalledWith({ email: "x@y.com", password: "pw", firstName: "A", lastName: "B", phoneNumber: "06" })
  })
})