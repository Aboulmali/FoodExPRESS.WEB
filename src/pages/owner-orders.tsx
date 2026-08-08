import { useCallback, useEffect, useState } from "react"
import type { ChangeEvent, FormEvent } from "react"
import { Bike, PackageOpen, Truck } from "lucide-react"
import { toast } from "sonner"
import { api, ApiError } from "../lib/api"
import type { OrderDto, Restaurant } from "../lib/api"
import { useAuth } from "../context/auth"
import { formatDateTime, formatMAD, statusLabel, statusTone } from "../lib/format"
import { Badge } from "../components/ui/badge"
import { Button } from "../components/ui/button"
import { Card, CardContent } from "../components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../components/ui/dialog"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import { Skeleton } from "../components/ui/skeleton"

const NEXT_ACTIONS: Record<string, { label: string; value: number }> = {
  Pending: { label: "Accepter", value: 1 },
  Accepted: { label: "En préparation", value: 2 },
  Preparing: { label: "Marquer prête", value: 3 },
}

export function OwnerOrdersPage() {
  const { user } = useAuth()
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [selectedId, setSelectedId] = useState<string>("")
  const [orders, setOrders] = useState<OrderDto[]>([])
  const [loading, setLoading] = useState(true)

  const loaded = restaurants.length > 0
  const selected = selectedId === "" ? undefined : restaurants.find((r) => r.id === selectedId)

  const loadRestaurants = useCallback(async () => {
    try {
      const all = await api.restaurants()
      const mine = all.filter((r) => r.ownerId && r.ownerId === user?.sub)
      setRestaurants(mine)
      if (mine.length > 0) setSelectedId((prev) => (mine.some((r) => r.id === prev) ? prev : mine[0].id))
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Impossible de charger vos restaurants")
    }
  }, [user])

  const loadOrders = useCallback(async () => {
    if (!selectedId) return
    try {
      setOrders(await api.restaurantOrders(selectedId))
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Impossible de charger les commandes")
    }
  }, [selectedId])

  useEffect(() => {
    loadRestaurants()
  }, [loadRestaurants])

  useEffect(() => {
    if (!selectedId) return
    setLoading(true)
    loadOrders().finally(() => setLoading(false))
    const timer = setInterval(loadOrders, 15000)
    return () => clearInterval(timer)
  }, [loadOrders, selectedId])

  const pick = (e: ChangeEvent<HTMLSelectElement>) => setSelectedId(e.target.value)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Commandes du restaurant</h1>
        <p className="text-sm text-muted-foreground">Traitez les commandes reçues et assignez un livreur.</p>
      </div>

      {!loaded && restaurants.length === 0 ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-full max-w-xs" />
          <Skeleton className="h-32 rounded-2xl" />
        </div>
      ) : restaurants.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Aucun restaurant ne vous est rattaché. Créez-en un depuis « Ma gestion ».
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={selectedId}
              onChange={pick}
              className="h-9 rounded-lg border bg-background px-3 text-sm"
              aria-label="Restaurant"
            >
              {restaurants.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
            <Badge variant="secondary">{orders.length} commande{orders.length > 1 ? "s" : ""}</Badge>
          </div>

          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-2xl" />
              ))}
            </div>
          ) : orders.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
                <PackageOpen className="size-10 text-muted-foreground" />
                <p className="font-medium">Aucune commande pour le moment</p>
                <p className="text-sm text-muted-foreground">
                  {selected?.name ?? "Votre restaurant"} n'a pas encore reçu de commande.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => (
                <OwnerOrderCard key={order.id} order={order} onChanged={loadOrders} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function OwnerOrderCard({ order, onChanged }: { order: OrderDto; onChanged: () => Promise<void> }) {
  const [assignOpen, setAssignOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const next = NEXT_ACTIONS[order.status]

  const move = async () => {
    if (!next) return
    setBusy(true)
    try {
      await api.updateOrderStatus(order.id, next.value)
      toast.success(`Commande ${order.orderNumber}: ${next.label}`)
      await onChanged()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Mise à jour impossible")
    } finally {
      setBusy(false)
    }
  }

  const cancel = async () => {
    const reason = prompt("Raison de l'annulation ?")
    if (reason === null) return
    setBusy(true)
    try {
      await api.cancelOrder(order.id, reason)
      toast.success("Commande annulée")
      await onChanged()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Annulation impossible")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <CardContent className="flex flex-wrap items-start justify-between gap-4 p-4 sm:p-5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold">{order.orderNumber}</p>
            <Badge variant={statusTone(order.status) as "default"}>{statusLabel(order.status)}</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {order.customerName} · {order.customerPhone} · {order.items.length} article{order.items.length > 1 ? "s" : ""} ·{" "}
            {formatDateTime(order.createdAt)}
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">Adresse : {order.deliveryAddress}</p>
          {order.notes && <p className="mt-0.5 text-sm italic text-muted-foreground">Note : {order.notes}</p>}
          {order.status === "Ready" && (
            <p className="mt-1.5 flex items-center gap-1.5 text-sm text-muted-foreground">
              <Bike className="size-4" />
              En attente d'un livreur
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <p className="text-base font-bold">{formatMAD(order.totalAmount)}</p>
          <div className="flex flex-wrap justify-end gap-2">
            {next && (
              <Button size="sm" onClick={move} disabled={busy}>
                {next.label}
              </Button>
            )}
            {order.status === "Ready" && (
              <Button size="sm" variant="outline" onClick={() => setAssignOpen(true)}>
                <Truck className="size-4" />
                Assigner un livreur
              </Button>
            )}
            {["Pending", "Accepted", "Preparing"].includes(order.status) && (
              <Button size="sm" variant="destructive" onClick={cancel} disabled={busy}>
                Annuler
              </Button>
            )}
          </div>
        </div>
      </CardContent>
      <AssignDeliveryDialog order={order} open={assignOpen} onOpenChange={setAssignOpen} onAssigned={onChanged} />
    </Card>
  )
}

function AssignDeliveryDialog({
  order,
  open,
  onOpenChange,
  onAssigned,
}: {
  order: OrderDto
  open: boolean
  onOpenChange: (o: boolean) => void
  onAssigned: () => Promise<void>
}) {
  const [form, setForm] = useState({ deliveryPersonId: "", deliveryPersonName: "", deliveryPersonPhone: "" })
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      await api.assignDelivery(order.id, form)
      toast.success(`Livreur assigné à ${order.orderNumber}`)
      onOpenChange(false)
      await onAssigned()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Assignation impossible")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="size-5 text-primary" />
            Assigner un livreur — {order.orderNumber}
          </DialogTitle>
          <DialogDescription>Renseignez le livreur qui prendra en charge la livraison.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="dp-id">ID du livreur (UUID) *</Label>
            <Input
              id="dp-id"
              required
              value={form.deliveryPersonId}
              onChange={(e) => setForm((f) => ({ ...f, deliveryPersonId: e.target.value }))}
              placeholder="Identifiant Keycloak du livreur"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dp-name">Nom du livreur *</Label>
            <Input
              id="dp-name"
              required
              value={form.deliveryPersonName}
              onChange={(e) => setForm((f) => ({ ...f, deliveryPersonName: e.target.value }))}
              placeholder="Karim"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dp-phone">Téléphone *</Label>
            <Input
              id="dp-phone"
              required
              value={form.deliveryPersonPhone}
              onChange={(e) => setForm((f) => ({ ...f, deliveryPersonPhone: e.target.value }))}
              placeholder="06 00 00 00 00"
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={busy}>
              {busy ? "Assignation…" : "Assigner"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}