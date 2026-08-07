import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import type { ReactNode } from "react"
import { api, ApiError } from "../lib/api"
import type { Dish } from "../lib/api"

export interface CartItem {
  dish: Dish
  quantity: number
}

interface CartState {
  items: CartItem[]
  count: number
  subtotal: number
  add: (dish: Dish) => void
  setQuantity: (dishId: string, quantity: number) => void
  remove: (dishId: string) => void
  clear: () => void
}

const CartContext = createContext<CartState | null>(null)

const STORAGE_KEY = "foodexpress_cart"

interface StoredCartItem {
  dishId: string
  quantity: number
  name?: string
  price?: number
  imageUrl?: string | null
  stock?: number
  restaurantId?: string
  restaurantName?: string
}

function readCartRefs(): StoredCartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? (JSON.parse(raw) as StoredCartItem[]) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function dishFromSnapshot(ref: StoredCartItem): Dish {
  return {
    id: ref.dishId,
    name: ref.name ?? "Plat",
    description: "",
    price: ref.price ?? 0,
    imageUrl: ref.imageUrl ?? null,
    stock: ref.stock ?? 0,
    isAvailable: true,
    isVegetarian: false,
    isSpicy: false,
    preparationTimeMinutes: 20,
    restaurantId: ref.restaurantId ?? "",
    restaurantName: ref.restaurantName ?? "",
    categoryId: "",
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])

  const persist = useCallback((next: CartItem[]) => {
    setItems(next)
    const refs: StoredCartItem[] = next.map((i) => ({
      dishId: i.dish.id,
      quantity: i.quantity,
      name: i.dish.name,
      price: i.dish.price,
      imageUrl: i.dish.imageUrl,
      stock: i.dish.stock,
      restaurantId: i.dish.restaurantId,
      restaurantName: i.dish.restaurantName,
    }))
    localStorage.setItem(STORAGE_KEY, JSON.stringify(refs))
  }, [])

  useEffect(() => {
    let alive = true

    const rehydrate = async () => {
      const saved = readCartRefs()
      if (saved.length === 0) {
        if (alive) setItems([])
        return
      }

      const resolved: CartItem[] = []
      for (const ref of saved) {
        try {
          const dish = await api.dish(ref.dishId)
          if (dish.isAvailable && dish.stock > 0) {
            resolved.push({ dish, quantity: Math.min(ref.quantity, dish.stock) })
          }
        } catch (err) {
          if (err instanceof ApiError && err.status === 404) continue
          resolved.push({ dish: dishFromSnapshot(ref), quantity: ref.quantity })
        }
      }
      if (alive) persist(resolved)
    }

    void rehydrate()
    return () => {
      alive = false
    }
  }, [persist])

  const updateCart = useCallback((updater: (prev: CartItem[]) => CartItem[]) => {
    setItems((prev) => {
      const next = updater(prev)
      const refs: StoredCartItem[] = next.map((i) => ({
        dishId: i.dish.id,
        quantity: i.quantity,
        name: i.dish.name,
        price: i.dish.price,
        imageUrl: i.dish.imageUrl,
        stock: i.dish.stock,
        restaurantId: i.dish.restaurantId,
        restaurantName: i.dish.restaurantName,
      }))
      localStorage.setItem(STORAGE_KEY, JSON.stringify(refs))
      return next
    })
  }, [])

  const add = useCallback(
    (dish: Dish) => {
      updateCart((prev) => {
        const existing = prev.find((i) => i.dish.id === dish.id)
        if (!existing) return [...prev, { dish, quantity: 1 }]
        return prev.map((i) =>
          i.dish.id === dish.id ? { ...i, quantity: Math.min(i.quantity + 1, dish.stock) } : i,
        )
      })
    },
    [updateCart],
  )

  const setQuantity = useCallback(
    (dishId: string, quantity: number) => {
      if (quantity < 1) {
        updateCart((prev) => prev.filter((i) => i.dish.id !== dishId))
        return
      }
      updateCart((prev) => prev.map((i) => (i.dish.id === dishId ? { ...i, quantity } : i)))
    },
    [updateCart],
  )

  const remove = useCallback(
    (dishId: string) => {
      updateCart((prev) => prev.filter((i) => i.dish.id !== dishId))
    },
    [updateCart],
  )

  const clear = useCallback(() => updateCart(() => []), [updateCart])

  const { count, subtotal } = useMemo(() => {
    let count = 0
    let subtotal = 0
    for (const i of items) {
      count += i.quantity
      subtotal += i.dish.price * i.quantity
    }
    return { count, subtotal }
  }, [items])

  return (
    <CartContext.Provider value={{ items, count, subtotal, add, setQuantity, remove, clear }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart(): CartState {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error("useCart doit être utilisé dans <CartProvider>")
  return ctx
}