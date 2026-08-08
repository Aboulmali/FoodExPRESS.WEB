import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { api, ApiError, USER_ROLES } from "../lib/api"
import type { OrderDto, UserDto } from "../lib/api"
import { formatDateTime, formatMAD, statusLabel } from "../lib/format"
import { Badge } from "../components/ui/badge"
import { Button } from "../components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Skeleton } from "../components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs"

const ORDER_STATUSES = [
  { value: 0, label: "En attente" },
  { value: 1, label: "Acceptée" },
  { value: 2, label: "En préparation" },
  { value: 3, label: "Prête" },
  { value: 4, label: "En livraison" },
  { value: 5, label: "Livrée" },
] as const

const STATUS_TO_NUMBER: Record<string, number> = {
  Pending: 0,
  Accepted: 1,
  Preparing: 2,
  Ready: 3,
  OnDelivery: 4,
  Delivered: 5,
  Cancelled: 6,
}

export function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Administration</h1>
        <p className="text-sm text-muted-foreground">Commandes et utilisateurs de la plateforme.</p>
      </div>

      <Tabs defaultValue="orders">
        <TabsList>
          <TabsTrigger value="orders">Commandes</TabsTrigger>
          <TabsTrigger value="users">Utilisateurs</TabsTrigger>
        </TabsList>
        <TabsContent value="orders" className="mt-4">
          <OrdersTab />
        </TabsContent>
        <TabsContent value="users" className="mt-4">
          <UsersTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ==================== Commandes =====================

function OrdersTab() {
  const [orders, setOrders] = useState<OrderDto[] | null>(null)

  const load = useCallback(async () => {
    try {
      setOrders(await api.allOrders())
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Impossible de charger les commandes")
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (!orders) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    )
  }

  const updateStatus = async (id: string, newStatus: number) => {
    try {
      await api.updateOrderStatus(id, newStatus)
      toast.success("Statut mis à jour")
      await load()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Mise à jour impossible")
    }
  }

  const cancel = async (id: string) => {
    const reason = prompt("Raison de l'annulation :")
    if (reason === null) return
    try {
      await api.cancelOrder(id, reason)
      toast.success("Commande annulée")
      await load()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Annulation impossible")
    }
  }

  if (orders.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">Aucune commande.</CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {orders.map((o) => (
        <Card key={o.id}>
          <CardContent className="flex flex-wrap items-center gap-4 p-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="font-medium">{o.orderNumber}</p>
                <Badge variant={statusTone(o.status)}>{statusLabel(o.status)}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {o.customerName} · {o.restaurantName} · {formatDateTime(o.createdAt)}
              </p>
              <p className="text-xs text-muted-foreground">
                {o.items.length} article(s) · livraison {o.deliveryAddress}
              </p>
            </div>
            <div className="font-semibold">{formatMAD(o.totalAmount)}</div>
            <select
              className="h-9 rounded-md border bg-background px-2 text-sm"
              value={STATUS_TO_NUMBER[o.status] ?? -1}
              onChange={(e) => updateStatus(o.id, Number(e.target.value))}
              disabled={o.status === "Cancelled"}
            >
              {o.status === "Cancelled" && <option value={6}>Annulée</option>}
              {ORDER_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
            {o.status !== "Cancelled" && (
              <Button variant="destructive" size="sm" onClick={() => cancel(o.id)}>
                Annuler
              </Button>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function statusTone(status: string): "default" | "destructive" | "secondary" {
  switch (status) {
    case "Delivered":
      return "default"
    case "Cancelled":
      return "destructive"
    case "Pending":
      return "secondary"
    default:
      return "default"
  }
}

// ==================== Utilisateurs =====================

function UsersTab() {
  const [users, setUsers] = useState<UserDto[] | null>(null)

  const load = useCallback(async () => {
    try {
      setUsers(await api.users())
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Impossible de charger les utilisateurs")
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (!users) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Utilisateurs ({users.length})</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2">
        {users.map((u) => (
          <div key={u.id} className="flex flex-wrap items-center gap-3 rounded-xl border p-3">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">
                {u.firstName} {u.lastName}
              </p>
              <p className="truncate text-sm text-muted-foreground">{u.email}</p>
            </div>
            <p className="text-xs text-muted-foreground">depuis {formatDateTime(u.createdAt)}</p>
            <Badge variant="outline">{USER_ROLES[u.role] ?? "Inconnu"}</Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}