import { useCallback, useState } from "react"
import { Bike, MapPin, Phone } from "lucide-react"
import { toast } from "sonner"
import { api, ApiError } from "../lib/api"
import type { OrderDto } from "../lib/api"
import { useAuth } from "../context/auth"
import { usePolling } from "../lib/use-polling"
import { formatDateTime, formatMAD, statusLabel, statusTone } from "../lib/format"
import { Badge } from "../components/ui/badge"
import { Button } from "../components/ui/button"
import { Card, CardContent } from "../components/ui/card"
import { Skeleton } from "../components/ui/skeleton"

export function DeliveryPage() {
  const { user, hasRole } = useAuth()
  const isAdmin = hasRole("Admin")
  const [orders, setOrders] = useState<OrderDto[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) return
    try {
      const list = isAdmin ? await api.allOrders() : await api.myDeliveryOrders(user.sub)
      setOrders(isAdmin ? list.filter((o) => ["OnDelivery", "Delivered"].includes(o.status)) : list)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Impossible de charger les livraisons")
    }
  }, [user, isAdmin])

  usePolling(() => {
    if (!user) return
    setLoading(true)
    return load().finally(() => setLoading(false))
  }, 10_000, !!user)

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-52" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mes livraisons</h1>
        <p className="text-sm text-muted-foreground">
          {isAdmin ? "Suivi des livraisons en cours et livrées." : "Prenez en charge vos livraisons assignées."}
        </p>
      </div>

      {orders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <Bike className="size-10 text-muted-foreground" />
            <p className="font-medium">Aucune livraison assignée</p>
            <p className="text-sm text-muted-foreground">Les restaurateurs vous assigneront des commandes ici.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <DeliveryOrderCard key={order.id} order={order} onChanged={load} />
          ))}
        </div>
      )}
    </div>
  )
}

function DeliveryOrderCard({ order, onChanged }: { order: OrderDto; onChanged: () => Promise<void> }) {
  const [busy, setBusy] = useState(false)

  const move = async (status: number, message: string) => {
    setBusy(true)
    try {
      await api.updateDeliveryStatus(order.id, status)
      toast.success(message)
      await onChanged()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Mise à jour impossible")
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
            {order.restaurantName} · {order.items.length} article{order.items.length > 1 ? "s" : ""} ·{" "}
            {formatDateTime(order.createdAt)}
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-sm">
            <MapPin className="size-4 text-muted-foreground" />
            {order.deliveryAddress}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span>{order.customerName}</span>
            <span className="flex items-center gap-1">
              <Phone className="size-3.5" />
              {order.customerPhone}
            </span>
            {order.notes && <span className="italic">« {order.notes} »</span>}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <p className="text-base font-bold">{formatMAD(order.totalAmount)}</p>
          {order.status === "Ready" ? (
            <Button size="sm" onClick={() => move(4, "Livraison démarrée")} disabled={busy}>
              Démarrer la livraison
            </Button>
          ) : order.status === "OnDelivery" ? (
            <Button size="sm" variant="secondary" onClick={() => move(5, "Commande livrée !")} disabled={busy}>
              Marquer livrée
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}