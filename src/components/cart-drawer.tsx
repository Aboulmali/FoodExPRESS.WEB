import { useMemo, useState } from "react"
import type { ChangeEvent } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { ArrowLeft, Check, ChevronRight, Minus, Phone, Plus, ShoppingBag, Trash2, Truck } from "lucide-react"
import { useCart } from "../context/cart"
import { useAuth } from "../context/auth"
import { api, ApiError } from "../lib/api"
import type { Dish } from "../lib/api"
import { formatMAD } from "../lib/format"
import { SmartImage } from "./smart-image"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Separator } from "./ui/separator"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "./ui/sheet"
import { Textarea } from "./ui/textarea"

const DELIVERY_FEE = 15

type Step = "cart" | "checkout"

interface DeliveryForm {
  phone: string
  address: string
  notes: string
}

export function CartDrawer({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
const { items, subtotal, remove, clear, setQuantity } = useCart()
const { user } = useAuth()
const navigate = useNavigate()

const [step, setStep] = useState<Step>("cart")
const [form, setForm] = useState<DeliveryForm>({ phone: "", address: "", notes: "" })
const [busy, setBusy] = useState(false)

const restaurant = useMemo(
  () => (items.length === 0 ? undefined : { id: items[0].dish.restaurantId, name: items[0].dish.restaurantName }),
  [items],
)

const mixedRestaurant = useMemo(
  () => items.some((i) => i.dish.restaurantId !== restaurant?.id),
  [items, restaurant],
)

  const setField = (key: keyof DeliveryForm) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  const bump = (dish: Dish, delta: number) => {
    const next = items.find((i) => i.dish.id === dish.id)?.quantity ?? 0
    const target = next + delta
    if (target > dish.stock) {
      toast.error(`Stock limité : ${dish.stock} restant(s)`)
      return
    }
    if (target < 1) {
      remove(dish.id)
      return
    }
    setQuantity(dish.id, target)
  }

  const checkout = () => {
    if (!user) {
      onOpenChange(false)
      toast.info("Connectez-vous pour commander")
      navigate("/login")
      return
    }
    if (mixedRestaurant) {
      toast.error("Panier multi-restaurants : faites des commandes séparées")
      return
    }
    setStep("checkout")
  }

  const placeOrder = async () => {
    if (!restaurant || items.length === 0) return
    if (!form.address.trim() || !form.phone.trim()) {
      toast.error("Adresse de livraison et téléphone requis")
      return
    }
    setBusy(true)
    try {
      const order = await api.createOrder({
        customerId: user?.sub ?? "",
        customerName: user?.name ?? user?.preferred_username ?? "Client",
        customerPhone: form.phone.trim(),
        restaurantId: restaurant.id,
        deliveryAddress: form.address.trim(),
        deliveryLatitude: 0,
        deliveryLongitude: 0,
        notes: form.notes.trim() || undefined,
        items: items.map((i) => ({ dishId: i.dish.id, quantity: i.quantity })),
      })
      clear()
      setForm({ phone: "", address: "", notes: "" })
      setStep("cart")
      onOpenChange(false)
      toast.success(`Commande ${order.orderNumber} envoyée !`)
      navigate(`/orders/${order.id}`)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Impossible de passer la commande")
      setStep("cart")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next)
        if (!next) setStep("cart")
      }}
    >
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b px-5 py-4">
          <div className="flex items-center gap-2">
            <SheetTitle className="flex items-center gap-2 text-base">
              {step === "cart" ? (
                <>
                  <ShoppingBag className="size-4 text-primary" />
                  Votre commande
                </>
              ) : (
                <>
                  <Truck className="size-4 text-primary" />
                  Livraison
                </>
              )}
            </SheetTitle>
            {step === "checkout" && (
              <Button variant="ghost" size="icon" onClick={() => setStep("cart")} aria-label="Retour au panier">
                <ArrowLeft className="size-4" />
              </Button>
            )}
          </div>
          {step === "cart" ? (
            <SheetDescription>
              {restaurant ? (
                <span className="flex items-center gap-1.5 text-sm">
                  <span className="size-1.5 rounded-full bg-emerald-500" />
                  {restaurant.name}
                </span>
              ) : (
                "Votre sélection"
              )}
            </SheetDescription>
          ) : (
            <SheetDescription>Adresse et coordonnées de livraison</SheetDescription>
          )}
        </SheetHeader>

        {step === "cart" ? (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {items.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 pb-10 text-center">
                  <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10">
                    <ShoppingBag className="size-6 text-primary" />
                  </div>
                  <p className="text-sm font-medium">Votre panier est vide</p>
                  <p className="text-xs text-muted-foreground">Ajoutez quelques plats pour commencer.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {mixedRestaurant && (
                    <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
                      <ShoppingBag className="mt-0.5 size-3.5 shrink-0" />
                      <span>
                        Votre panier contient des plats de plusieurs restaurants. Chaque restaurant doit être commandé séparément.
                      </span>
                    </div>
                  )}
                  {items.map((item) => (
                    <div key={item.dish.id} className="flex gap-3 rounded-xl border bg-card p-3">
                      <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted text-xs font-bold">
                        <SmartImage src={item.dish.imageUrl} alt={item.dish.name} className="size-full" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="truncate text-sm font-medium">{item.dish.name}</p>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="-mr-1 -mt-1 size-6 text-muted-foreground"
                            onClick={() => remove(item.dish.id)}
                            aria-label="Retirer"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">{formatMAD(item.dish.price)} / unité</p>
                        <div className="mt-2 flex items-center gap-2">
                          <Button variant="outline" size="icon" className="size-7" onClick={() => bump(item.dish, -1)} aria-label="Moins">
                            <Minus className="size-3" />
                          </Button>
                          <span className="w-6 text-center text-sm font-semibold tabular-nums">{item.quantity}</span>
                          <Button variant="outline" size="icon" className="size-7" onClick={() => bump(item.dish, +1)} disabled={item.quantity >= item.dish.stock}>
                            <Plus className="size-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex flex-col items-end justify-between">
                        <p className="text-sm font-semibold">{formatMAD(item.dish.price * item.quantity)}</p>
                        {item.quantity >= item.dish.stock && <p className="text-[10px] text-amber-600">Max dispo</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {items.length > 0 && (
              <div className="border-t bg-muted/40 px-5 py-4">
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Sous-total</span>
                    <span>{formatMAD(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Livraison</span>
                    <span>{formatMAD(DELIVERY_FEE)}</span>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex items-center justify-between text-base font-bold">
                    <span>Total</span>
                    <span className="text-primary">{formatMAD(subtotal + DELIVERY_FEE)}</span>
                  </div>
                </div>
                <Button className="mt-4 w-full" size="lg" onClick={checkout} disabled={mixedRestaurant}>
                  Commander
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-4">
            <div className="rounded-xl border bg-card p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Nombre d'articles</span>
                <span className="font-medium">
                  {items.reduce((n, i) => n + i.quantity, 0)}
                </span>
              </div>
              <div className="mt-1 flex justify-between">
                <span className="text-muted-foreground">Total à payer</span>
                <span className="font-bold text-primary">{formatMAD(subtotal + DELIVERY_FEE)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="delivery-phone">Téléphone*</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="delivery-phone"
                  type="tel"
                  placeholder="06 12 34 56 78"
                  value={form.phone}
                  onChange={setField("phone")}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="delivery-address">Adresse de livraison*</Label>
              <Textarea
                id="delivery-address"
                placeholder="N°, rue, quartier, ville…"
                value={form.address}
                onChange={setField("address")}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="delivery-notes">Note (optionnelle)</Label>
              <Textarea
                id="delivery-notes"
                placeholder="Porte 4, code 1234, consignes…"
                value={form.notes}
                onChange={setField("notes")}
                rows={2}
              />
            </div>

            <Button
              className="mt-auto w-full"
              size="lg"
              onClick={placeOrder}
              disabled={busy || items.length === 0}
            >
              {busy ? (
                "Envoi en cours…"
              ) : (
                <>
                  <Check className="size-4" />
                  Confirmer la commande
                </>
              )}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}