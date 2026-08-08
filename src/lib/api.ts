// ===================== Types (contracts Restaurant/Order/User) =====================

export interface Restaurant {
  id: string
  name: string
  description: string
  address: string
  city: string
  phoneNumber: string
  email: string
  logoUrl?: string | null
  coverImageUrl?: string | null
  latitude: number
  longitude: number
  openingTime: string
  closingTime: string
  rating: number
  ownerId?: string
  isActive: boolean
  isOpen: boolean
  dishesCount: number
}

export interface Category {
  id: string
  name: string
  description?: string
  iconUrl?: string | null
  displayOrder: number
}

export interface Dish {
  id: string
  name: string
  description: string
  price: number
  imageUrl?: string | null
  stock: number
  isAvailable: boolean
  isVegetarian: boolean
  isSpicy: boolean
  preparationTimeMinutes: number
  restaurantId: string
  restaurantName: string
  categoryId: string
  categoryName?: string
}

export interface OrderItemDto {
  id: string
  dishId: string
  dishName: string
  dishImageUrl?: string | null
  quantity: number
  unitPrice: number
  subtotal: number
  specialInstructions?: string | null
}

export interface OrderDto {
  id: string
  orderNumber: string
  customerId: string
  customerName: string
  customerPhone: string
  restaurantId: string
  restaurantName: string
  deliveryAddress: string
  subtotal: number
  deliveryFee: number
  totalAmount: number
  status: string
  notes?: string | null
  createdAt: string
  items: OrderItemDto[]
}

export interface LoginResponse {
  accessToken: string
  refreshToken: string
  expiresIn: number
  tokenType: string
}

export interface UserDto {
  id: string
  email: string
  firstName: string
  lastName: string
  phoneNumber: string
  role: number
  createdAt: string
}

export const USER_ROLES = ["Customer", "RestaurantOwner", "DeliveryPerson", "Admin"] as const

export interface JwtUser {
  sub: string
  name?: string
  given_name?: string
  family_name?: string
  email?: string
  preferred_username?: string
  roles?: string[]
  realm_access?: { roles?: string[] }
  exp?: number
}

// ===================== Helpers =====================

const BASE = import.meta.env.VITE_API_URL ?? ""

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = "ApiError"
    this.status = status
  }
}

// ===================== Session (access + refresh) =====================

const TOKEN_KEY = "foodexpress_token"
const REFRESH_KEY = "foodexpress_refresh_token"

// L'access token est gardé en mémoire + localStorage pour survivre au F5.
// À terme (production) : cookie HttpOnly + flux OIDC PKCE pour fermer la fenêtre XSS.
let token: string | null = localStorage.getItem(TOKEN_KEY)
let refreshToken: string | null = localStorage.getItem(REFRESH_KEY)
let refreshPromise: Promise<string> | null = null

export function getAccessToken(): string | null {
  return token
}

export function getRefreshToken(): string | null {
  return refreshToken
}

export function setSessionTokens(t: Pick<LoginResponse, "accessToken" | "refreshToken">) {
  token = t.accessToken
  refreshToken = t.refreshToken
  localStorage.setItem(TOKEN_KEY, t.accessToken)
  localStorage.setItem(REFRESH_KEY, t.refreshToken)
}

export function clearSession() {
  token = null
  refreshToken = null
  refreshPromise = null
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(REFRESH_KEY)
}

// Refresh silencieux avec "single flight" : si plusieurs requêtes reçoivent un
// 401 en même temps, une seule passe par Keycloak, les autres réutilisent la promesse.
export function refreshAccessToken(): Promise<string> | null {
  const current = refreshToken
  if (!current) return null
  if (refreshPromise) return refreshPromise

  refreshPromise = (async () => {
    const res = await fetch(`${BASE}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: current }),
    })
    if (!res.ok) {
      throw new ApiError("Session expirée", res.status)
    }
    const t = (await res.json()) as LoginResponse
    setSessionTokens(t)
    return t.accessToken
  })()

  refreshPromise.catch(() => {
    clearSession()
  }).finally(() => {
    refreshPromise = null
  })

  return refreshPromise
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const build = () => {
    const headers = new Headers(options.headers)
    if (options.body !== undefined && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json")
    }
    if (token) headers.set("Authorization", `Bearer ${token}`)
    return { headers, init: { ...options, headers } as RequestInit }
  }

  let res: Response
  try {
    const { init } = build()
    res = await fetch(`${BASE}${path}`, init)
  } catch {
    throw new ApiError("Connexion impossible au serveur. Vérifiez que les API sont lancées.", 0)
  }

  // 401 avec token : on tente un refresh silencieux puis un retry (une seule fois)
  if (res.status === 401 && token) {
    try {
      const fresh = await refreshAccessToken()
      if (!fresh) throw new ApiError("Session expirée", 401)
      const headers = new Headers(options.headers)
      if (options.body !== undefined && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json")
      }
      headers.set("Authorization", `Bearer ${fresh}`)
      try {
        res = await fetch(`${BASE}${path}`, { ...options, headers })
      } catch {
        throw new ApiError("Connexion impossible au serveur. Vérifiez que les API sont lancées.", 0)
      }
    } catch {
      window.dispatchEvent(new Event("foodexpress:unauthorized"))
      throw new ApiError("Session expirée. Veuillez vous reconnecter.", 401)
    }
  }

  if (!res.ok) {
    if (res.status === 401 && !token) {
      window.dispatchEvent(new Event("foodexpress:unauthorized"))
    }
    let detail = res.status === 429 ? "Trop de requêtes. Réessayez dans une minute." : res.statusText
    try {
      const j = await res.json()
      detail = j?.message ?? j?.title ?? detail
    } catch {
      /* ignore */
    }
    if (res.status === 401 && !detail) detail = "Session expirée. Veuillez vous reconnecter."
    if (res.status === 403) detail = detail || "Accès refusé : permissions insuffisantes."
    throw new ApiError(detail, res.status)
  }

  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export function decodeJwt(jwt: string): JwtUser | null {
  try {
    const part = jwt.split(".")[1]
    const base64 = part.replace(/-/g, "+").replace(/_/g, "/")
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join(""),
    )
    const payload = JSON.parse(json) as JwtUser
    payload.roles = payload.realm_access?.roles ?? []
    return payload
  } catch {
    return null
  }
}

// ===================== Endpoints =====================

export const api = {
  // Catalogue (public)
  restaurants: () => request<Restaurant[]>("/api/restaurants"),
  restaurant: (id: string) => request<Restaurant>(`/api/restaurants/${id}`),
  categories: () => request<Category[]>("/api/categories"),
  dishes: (restaurantId: string) =>
    request<Dish[]>(`/api/dishes/restaurant/${restaurantId}`),
  dish: (id: string) => request<Dish>(`/api/dishes/${id}`),

  // Auth
  login: (email: string, password: string) =>
    request<LoginResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  logout: () =>
    request<void>("/api/auth/logout", {
      method: "POST",
      body: JSON.stringify({ refreshToken: getRefreshToken() }),
    }),
  register: (data: {
    email: string
    password: string
    firstName: string
    lastName: string
    phoneNumber: string
  }) =>
    request<unknown>("/api/auth/register", {
      method: "POST",
      // Sécurité : jamais de rôle envoyé depuis le client, le backend force Customer.
      body: JSON.stringify(data),
    }),

  // Commandes (auth)
  createOrder: (payload: {
    customerId: string
    customerName: string
    customerPhone: string
    restaurantId: string
    deliveryAddress: string
    deliveryLatitude: number
    deliveryLongitude: number
    notes?: string
    items: { dishId: string; quantity: number; specialInstructions?: string }[]
  }) =>
    request<OrderDto>("/api/orders", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  myOrders: (customerId: string) =>
    request<OrderDto[]>(`/api/orders/customer/${customerId}`),
  order: (id: string) => request<OrderDto>(`/api/orders/${id}`),
  cancelOrder: (id: string, reason: string) =>
    request<void>(`/api/orders/${id}/cancel`, {
      method: "POST",
      body: JSON.stringify(reason),
    }),
  allOrders: () => request<OrderDto[]>("/api/orders"),
  updateOrderStatus: (id: string, newStatus: number, reason?: string) =>
    request<OrderDto>(`/api/orders/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ newStatus, reason }),
    }),
  restaurantOrders: (restaurantId: string) =>
    request<OrderDto[]>(`/api/orders/restaurant/${restaurantId}`),
  myDeliveryOrders: (deliveryPersonId: string) =>
    request<OrderDto[]>(`/api/orders/delivery/${deliveryPersonId}`),
  assignDelivery: (id: string, payload: {
    deliveryPersonId: string
    deliveryPersonName: string
    deliveryPersonPhone: string
  }) =>
    request<OrderDto>(`/api/orders/${id}/assign-delivery`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateDeliveryStatus: (id: string, newStatus: number) =>
    request<OrderDto>(`/api/orders/${id}/delivery-status`, {
      method: "PUT",
      body: JSON.stringify({ newStatus }),
    }),

  // Gestion restaurant (RestaurantOwner ou Admin)
  createRestaurant: (data: {
    name: string
    description: string
    address: string
    city: string
    phoneNumber: string
    email: string
    latitude: number
    longitude: number
    openingTime: string
    closingTime: string
  }) =>
    request<Restaurant>("/api/restaurants", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateRestaurant: (id: string, data: {
    name: string
    description: string
    address: string
    city: string
    phoneNumber: string
    openingTime: string
    closingTime: string
    isOpen: boolean
  }) =>
    request<Restaurant>(`/api/restaurants/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  deleteRestaurant: (id: string) =>
    request<void>(`/api/restaurants/${id}`, { method: "DELETE" }),
  uploadLogo: (id: string, file: File) => {
    const form = new FormData()
    form.append("file", file)
    return request<{ logoUrl: string }>(`/api/restaurants/${id}/logo`, {
      method: "POST",
      body: form,
    })
  },

  // Gestion des plats (RestaurantOwner ou Admin)
  createDish: (data: {
    name: string
    description: string
    price: number
    stock: number
    isVegetarian: boolean
    isSpicy: boolean
    preparationTimeMinutes: number
    restaurantId: string
    categoryId: string
  }) =>
    request<Dish>("/api/dishes", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateDish: (id: string, data: {
    name: string
    description: string
    price: number
    stock: number
    isAvailable: boolean
    isVegetarian: boolean
    isSpicy: boolean
    preparationTimeMinutes: number
    categoryId: string
  }) =>
    request<Dish>(`/api/dishes/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  deleteDish: (id: string) =>
    request<void>(`/api/dishes/${id}`, { method: "DELETE" }),
  uploadDishImage: (id: string, file: File) => {
    const form = new FormData()
    form.append("file", file)
    return request<{ imageUrl: string }>(`/api/dishes/${id}/image`, {
      method: "POST",
      body: form,
    })
  },

  // Admin (utilisateurs)
  users: () => request<UserDto[]>("/api/users"),
}