import { useCallback, useState } from "react"
import { Link } from "react-router-dom"
import { ChevronRight, PackageOpen } from "lucide-react"
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

export function OrdersPage() {
  const { user } = useAuth()
  const [orders, setOrders] = useState<OrderDto[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    if (!user) return
    api
      .myOrders(user.sub)
      .then((list) => setOrders(list))
      .catch((err) => toast.error(err instanceof ApiError ? err.message : "Impossible de charger les commandes"))
      .finally(() => setLoading(false))
  }, [user])

  usePolling(load, 10_000, !!user)

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
        <h1 className="text-2xl font-bold tracking-tight">Mes commandes</h1>
        <p className="text-sm text-muted-foreground">Suivez l'état de vos commandes en temps réel.</p>
      </div>

      {orders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <PackageOpen className="size-10 text-muted-foreground" />
            <p className="font-medium">Aucune commande pour le moment</p>
            <p className="text-sm text-muted-foreground">Parcourez les restaurants et commandez votre premier repas.</p>
            <Button asChild>
              <Link to="/">Découvrir les restaurants</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <Link key={order.id} to={`/orders/${order.id}`} className="block">
              <Card className="transition-shadow hover:shadow-md">
                <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">Commande {order.orderNumber}</p>
                      <Badge variant={statusTone(order.status) as "default"}>{statusLabel(order.status)}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {order.restaurantName} · {order.items.length} article{order.items.length > 1 ? "s" : ""} ·{" "}
                      {formatDateTime(order.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-base font-bold">{formatMAD(order.totalAmount)}</p>
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}