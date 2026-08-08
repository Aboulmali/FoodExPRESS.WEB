import { useCallback, useRef, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { ArrowLeft, MapPin, Phone, Store, X } from "lucide-react"
import { toast } from "sonner"
import { api, ApiError } from "../lib/api"
import type { OrderDto } from "../lib/api"
import { OrderTimeline } from "../components/order-timeline"
import { SmartImage } from "../components/smart-image"
import { Badge } from "../components/ui/badge"
import { Button } from "../components/ui/button"
import { Card, CardContent } from "../components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog"
import { Separator } from "../components/ui/separator"
import { Skeleton } from "../components/ui/skeleton"
import { usePolling } from "../lib/use-polling"
import { formatDateTime, formatMAD, statusLabel } from "../lib/format"

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [order, setOrder] = useState<OrderDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const statusRef = useRef<string | null>(null)

  const load = useCallback(() => {
    if (!id) return
    api
      .order(id)
      .then((next) => {
        setOrder(next)
        const prev = statusRef.current
        if (prev && prev !== next.status) {
          if (next.status === "Cancelled") toast.info("Commande annulée")
          else toast.success(`Statut mis à jour : ${statusLabel(next.status)}`)
          statusRef.current = next.status
        }
        if (prev === null) statusRef.current = next.status
      })
      .catch((err) => toast.error(err instanceof ApiError ? err.message : "Impossible de charger la commande"))
      .finally(() => setLoading(false))
  }, [id])

  const finalStatus = order?.status === "Delivered" || order?.status === "Cancelled"
  usePolling(load, 10_000, !!id && !finalStatus)

  const cancel = async () => {
    if (!order) return
    setCancelling(true)
    try {
      await api.cancelOrder(order.id, "Annulée par le client")
      setCancelOpen(false)
      toast.success("Commande annulée")
      load()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Impossible d'annuler la commande")
    } finally {
      setCancelling(false)
    }
  }

  const cancellable = order && (order.status === "Pending" || order.status === "Accepted")

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-56 rounded-2xl" />
      </div>
    )
  }

  if (!order) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <p className="font-medium">Commande introuvable</p>
          <Button variant="outline" className="mt-4" asChild>
            <Link to="/orders">Retour à mes commandes</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Button variant="ghost" size="sm" className="-ml-2" asChild>
        <Link to="/orders">
          <ArrowLeft className="size-4" />
          Mes commandes
        </Link>
      </Button>

      <Card>
        <CardContent className="space-y-4 p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold">Commande {order.orderNumber}</h1>
                <Badge variant={order.status === "Cancelled" ? "destructive" : "default"}>
                  {order.status === "Cancelled" ? "Annulée" : order.status}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Passée le {formatDateTime(order.createdAt)} · {order.restaurantName}
              </p>
            </div>
            {cancellable && (
              <Button variant="destructive" size="sm" onClick={() => setCancelOpen(true)}>
                <X className="size-4" />
                Annuler
              </Button>
            )}
          </div>

          <Separator />

          <OrderTimeline order={order} />

          <Separator />

          <div className="space-y-3">
            {order.items.map((item) => (
              <div key={item.id} className="flex items-center gap-3">
                <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted text-xs font-bold">
                  <SmartImage src={item.dishImageUrl} alt={item.dishName} className="size-full" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.dishName}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.quantity} × {formatMAD(item.unitPrice)}
                  </p>
                </div>
                <p className="text-sm font-semibold">{formatMAD(item.subtotal)}</p>
              </div>
            ))}
          </div>

          <Separator />

          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Sous-total</span>
              <span>{formatMAD(order.subtotal)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Livraison</span>
              <span>{formatMAD(order.deliveryFee)}</span>
            </div>
            <div className="flex justify-between text-base font-bold">
              <span>Total</span>
              <span>{formatMAD(order.totalAmount)}</span>
            </div>
          </div>

          <div className="grid gap-2 rounded-xl bg-muted/60 p-4 text-sm">
            <p className="flex items-center gap-2 font-medium">
              <Store className="size-4" />
              {order.restaurantName}
            </p>
            <p className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="size-4" />
              {order.deliveryAddress}
            </p>
            {order.customerPhone && (
              <p className="flex items-center gap-2 text-muted-foreground">
                <Phone className="size-4" />
                {order.customerPhone}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Annuler la commande ?</DialogTitle>
            <DialogDescription>
              Cette action est irréversible. Le stock des plats sera restitué automatiquement.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelOpen(false)}>
              Garder la commande
            </Button>
            <Button variant="destructive" onClick={cancel} disabled={cancelling}>
              {cancelling ? "Annulation…" : "Confirmer l'annulation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}