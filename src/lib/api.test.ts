import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { api, ApiError, clearSession, decodeJwt, getAccessToken, refreshAccessToken, setSessionTokens } from "./api"

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(status === 204 ? null : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

function makeJwt(payload: Record<string, unknown>): string {
  const enc = (o: unknown) =>
    btoa(JSON.stringify(o)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
  return `${enc({ alg: "HS256", typ: "JWT" })}.${enc(payload)}.fake`
}

describe("client API – session et refresh token", () => {
  beforeEach(() => {
    localStorage.clear()
    clearSession()
    vi.stubGlobal("fetch", vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("attache le Bearer token aux requêtes authentifiées", async () => {
    setSessionTokens({ accessToken: "jwt-1", refreshToken: "r1" })
    vi.mocked(fetch).mockResolvedValue(jsonResponse([], 200))

    await api.myOrders("user-1")

    const [url, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit]
    expect(url).toBe("/api/orders/customer/user-1")
    expect((init.headers as Headers).get("Authorization")).toBe("Bearer jwt-1")
  })

  it("401 → refresh silencieux puis retry une fois avec le nouveau token", async () => {
    setSessionTokens({ accessToken: "expired", refreshToken: "r1" })
    const calls = vi.fn((url: string) =>
      url.includes("/api/auth/refresh")
        ? jsonResponse({ accessToken: "fresh-jwt", refreshToken: "r2", expiresIn: 300, tokenType: "Bearer" })
        : jsonResponse([{ id: "o1" }], 200),
    )
    let apiCalls = 0
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes("/api/auth/refresh")) return Promise.resolve(calls(url))
      apiCalls += 1
      return Promise.resolve(apiCalls === 1 ? jsonResponse(null, 401) : jsonResponse([{ id: "o1" }], 200))
    })

    const orders = await api.allOrders()

    expect(orders).toEqual([{ id: "o1" }])
    expect(calls).toHaveBeenCalledTimes(1)
    expect(getAccessToken()).toBe("fresh-jwt")
  })

  it("single-flight : deux 401 simultanés ne déclenchent qu'un seul refresh", async () => {
    setSessionTokens({ accessToken: "expired", refreshToken: "r1" })
    let refreshCalls = 0
    let apiCalls = 0
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes("/api/auth/refresh")) {
        refreshCalls += 1
        return Promise.resolve(
          jsonResponse({ accessToken: "fresh-jwt", refreshToken: "r2", expiresIn: 300, tokenType: "Bearer" }),
        )
      }
      apiCalls += 1
      return Promise.resolve(apiCalls <= 2 ? jsonResponse(null, 401) : jsonResponse({ ok: true }, 200))
    })

    await Promise.all([api.users(), api.allOrders()])

    expect(refreshCalls).toBe(1)
  })

  it("refresh invalide → session purgée, événement unauthorized, erreur 401", async () => {
    setSessionTokens({ accessToken: "expired", refreshToken: "dead" })
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "Session expirée" }, 401))

    const spy = vi.spyOn(window, "dispatchEvent")
    await expect(api.users()).rejects.toMatchObject({ status: 401 })

    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ type: "foodexpress:unauthorized" }))
    expect(localStorage.getItem("foodexpress_token")).toBeNull()
    expect(localStorage.getItem("foodexpress_refresh_token")).toBeNull()
  })

  it("refreshAccessToken renvoie null s'il n'y a pas de refresh token", async () => {
    expect(refreshAccessToken()).toBeNull()
  })

  it("register n'envoie jamais de rôle (le backend force Customer)", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({}, 201))

    await api.register({ email: "a@b.c", password: "pw", firstName: "A", lastName: "B", phoneNumber: "06" })

    const [url, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit]
    expect(url).toBe("/api/auth/register")
    const body = JSON.parse(String(init.body)) as Record<string, unknown>
    expect(body).not.toHaveProperty("role")
    expect(body).toEqual({ email: "a@b.c", password: "pw", firstName: "A", lastName: "B", phoneNumber: "06" })
  })

  it("logout envoie le refresh token pour révocation", async () => {
    setSessionTokens({ accessToken: "jwt", refreshToken: "r-revoke" })
    vi.mocked(fetch).mockResolvedValue(jsonResponse(null, 204))

    await api.logout()

    const [url, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit]
    expect(url).toBe("/api/auth/logout")
    expect(JSON.parse(String(init.body))).toEqual({ refreshToken: "r-revoke" })
  })

  it("decodeJwt extrait exp et roles", () => {
    const jwt = makeJwt({ sub: "u1", exp: 1_800_000_000, realm_access: { roles: ["Customer", "Admin"] } })

    const decoded = decodeJwt(jwt)

    expect(decoded?.sub).toBe("u1")
    expect(decoded?.exp).toBe(1_800_000_000)
    expect(decoded?.roles).toEqual(["Customer", "Admin"])
  })

  it("ApiError expose le message du serveur", async () => {
    setSessionTokens({ accessToken: "jwt", refreshToken: "r" })
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "Stock insuffisant" }, 400))

    await expect(api.createOrder({} as never)).rejects.toMatchObject({
      status: 400,
      message: "Stock insuffisant",
    } as ApiError)
  })
})