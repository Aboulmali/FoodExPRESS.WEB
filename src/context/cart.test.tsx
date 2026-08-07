import { describe, it, expect, vi, beforeEach } from "vitest"
import { act, renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { CartProvider, useCart } from "./cart"
import type { Dish } from "../lib/api"
import { api, ApiError } from "../lib/api"

vi.mock("../lib/api", () => {
  class FakeApiError extends Error {
    status: number
    constructor(message: string, status: number) {
      super(message)
      this.status = status
    }
  }
  return {
    api: { dish: vi.fn() },
    ApiError: FakeApiError,
  }
})

const baseDish = (over: Partial<Dish> = {}): Dish => ({
  id: "d1",
  name: "Pizza",
  description: "",
  price: 10,
  imageUrl: null,
  stock: 5,
  isAvailable: true,
  isVegetarian: false,
  isSpicy: false,
  preparationTimeMinutes: 20,
  restaurantId: "r1",
  restaurantName: "Resto 1",
  categoryId: "c1",
  ...over,
})

const wrapper = ({ children }: { children: ReactNode }) => <CartProvider>{children}</CartProvider>

describe("CartProvider – ajout et quantités", () => {
  beforeEach(() => {
    vi.mocked(api.dish).mockReset()
    localStorage.clear()
  })

  it("ajoute un plat avec quantité 1 et calcule count/subtotal", async () => {
    const { result } = renderHook(() => useCart(), { wrapper })

    act(() => result.current.add(baseDish()))
    expect(result.current.items).toHaveLength(1)
    expect(result.current.items[0].quantity).toBe(1)
    expect(result.current.count).toBe(1)
    expect(result.current.subtotal).toBe(10)
  })

  it("ajouter deux fois le même plat incrémente la quantité, pas la ligne", () => {
    const { result } = renderHook(() => useCart(), { wrapper })

    act(() => {
      result.current.add(baseDish())
      result.current.add(baseDish())
    })
    expect(result.current.items).toHaveLength(1)
    expect(result.current.items[0].quantity).toBe(2)
    expect(result.current.subtotal).toBe(20)
  })

  it("plafonne la quantité au stock disponible", () => {
    const { result } = renderHook(() => useCart(), { wrapper })
    act(() => {
      result.current.add(baseDish({ stock: 2 }))
      result.current.add(baseDish({ stock: 2 }))
      result.current.add(baseDish({ stock: 2 }))
    })
    expect(result.current.items[0].quantity).toBe(2)
  })

  it("setQuantity à 1 retire l'article du panier", () => {
    const { result } = renderHook(() => useCart(), { wrapper })
    act(() => {
      result.current.add(baseDish())
      result.current.setQuantity("d1", 0)
    })
    expect(result.current.items).toHaveLength(0)
    expect(result.current.count).toBe(0)
  })

  it("remove retire l'article et clear vide le panier", () => {
    const { result } = renderHook(() => useCart(), { wrapper })
    act(() => {
      result.current.add(baseDish())
      result.current.add(baseDish({ id: "d2", name: "Pâtes" }))
      result.current.remove("d1")
    })
    expect(result.current.items).toHaveLength(1)
    act(() => result.current.clear())
    expect(result.current.items).toHaveLength(0)
  })

  it("persiste les références (dishId + quantité) dans localStorage", () => {
    const { result } = renderHook(() => useCart(), { wrapper })
    act(() => result.current.add(baseDish({ price: 25 })))
    const stored = JSON.parse(localStorage.getItem("foodexpress_cart") ?? "[]")
    expect(stored).toEqual([expect.objectContaining({ dishId: "d1", quantity: 1 })])
  })
})

describe("CartProvider – réhydratation depuis le serveur", () => {
  beforeEach(() => {
    vi.mocked(api.dish).mockReset()
    localStorage.clear()
  })

  it("rafraîchit le prix depuis le serveur et met à jour le sous-total", async () => {
    localStorage.setItem(
      "foodexpress_cart",
      JSON.stringify([{ dishId: "d1", quantity: 2, name: "Pizza", price: 10, stock: 5 }]),
    )
    vi.mocked(api.dish).mockResolvedValue(baseDish({ price: 14 }))

    const { result } = renderHook(() => useCart(), { wrapper })
    await waitFor(() => expect(result.current.items).toHaveLength(1))

    expect(result.current.items[0].dish.price).toBe(14)
    expect(result.current.subtotal).toBe(28)
  })

  it("borne la quantité au stock frais du serveur", async () => {
    localStorage.setItem(
      "foodexpress_cart",
      JSON.stringify([{ dishId: "d1", quantity: 9, name: "Pizza", price: 10, stock: 5 }]),
    )
    vi.mocked(api.dish).mockResolvedValue(baseDish({ stock: 3 }))

    const { result } = renderHook(() => useCart(), { wrapper })
    await waitFor(() => expect(result.current.items).toHaveLength(1))
    expect(result.current.items[0].quantity).toBe(3)
  })

  it("écarte un plat supprimé (404) ou épuisé", async () => {
    localStorage.setItem(
      "foodexpress_cart",
      JSON.stringify([
        { dishId: "d1", quantity: 1, name: "A", price: 10, stock: 5 },
        { dishId: "d2", quantity: 1, name: "B", price: 8, stock: 5 },
      ]),
    )
    vi.mocked(api.dish)
      .mockRejectedValueOnce(new ApiError("introuvable", 404))
      .mockResolvedValueOnce(baseDish({ id: "d2", stock: 0, isAvailable: false }))

    const { result } = renderHook(() => useCart(), { wrapper })
    await waitFor(() => expect(result.current.items).toHaveLength(0))
  })

  it("conserve le panier (snapshot) si le serveur est injoignable", async () => {
    localStorage.setItem(
      "foodexpress_cart",
      JSON.stringify([{ dishId: "d1", quantity: 2, name: "Pizza", price: 10, stock: 5 }]),
    )
    vi.mocked(api.dish).mockRejectedValue(new ApiError("offline", 0))

    const { result } = renderHook(() => useCart(), { wrapper })
    await waitFor(() => expect(result.current.items).toHaveLength(1))
    expect(result.current.items[0].dish.price).toBe(10)
    expect(result.current.subtotal).toBe(20)
  })
})