import { useEffect, useMemo, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { ArrowLeft, Clock, MapPin, Phone, Star, UtensilsCrossed } from "lucide-react"
import { api, ApiError } from "../lib/api"
import type { Dish, Restaurant } from "../lib/api"
import { DishCard } from "../components/dish-card"
import { SmartImage } from "../components/smart-image"
import { Badge } from "../components/ui/badge"
import { Button } from "../components/ui/button"
import { Card, CardContent } from "../components/ui/card"
import { Skeleton } from "../components/ui/skeleton"
import { toast } from "sonner"

export function MenuPage() {
  const { id } = useParams<{ id: string }>()
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [dishes, setDishes] = useState<Dish[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let alive = true
    setLoading(true)
    Promise.all([api.restaurant(id), api.dishes(id)])
      .then(([r, d]) => {
        if (!alive) return
        setRestaurant(r)
        setDishes(d)
      })
      .catch((err) => {
        if (!alive) return
        toast.error(err instanceof ApiError ? err.message : "Impossible de charger le menu")
      })
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [id])

  const categories = useMemo(() => {
    const map = new Map<string, string>()
    for (const d of dishes) if (d.categoryName) map.set(d.categoryName, d.categoryName)
    return Array.from(map.keys())
  }, [dishes])

  const shown = useMemo(
    () => (filter ? dishes.filter((d) => d.categoryName === filter) : dishes),
    [dishes, filter],
  )

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 rounded-2xl" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-20 rounded-full" />
          <Skeleton className="h-8 w-24 rounded-full" />
          <Skeleton className="h-8 w-16 rounded-full" />
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-56 rounded-2xl" />
          ))}
        </div>
      </div>
    )
  }

  if (!restaurant) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <UtensilsCrossed className="mx-auto size-10 text-muted-foreground" />
          <p className="mt-3 font-medium">Restaurant introuvable</p>
          <Button asChild variant="outline" className="mt-4">
            <Link to="/">
              <ArrowLeft className="size-4" />
              Retour
            </Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link to="/">
          <ArrowLeft className="size-4" />
          Retour aux restaurants
        </Link>
      </Button>

      <div className="relative overflow-hidden rounded-2xl border bg-card">
        <div className="h-40 w-full bg-gradient-to-br from-emerald-500 to-lime-600">
          <SmartImage src={restaurant.coverImageUrl} alt={restaurant.name} className="size-full object-cover" />
        </div>
        <CardContent className="flex flex-col gap-3 p-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{restaurant.name}</h1>
              {restaurant.isOpen ? (
                <Badge className="bg-emerald-600 text-white">Ouvert</Badge>
              ) : (
                <Badge variant="secondary">Fermé</Badge>
              )}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <MapPin className="size-4" />
                {restaurant.address}, {restaurant.city}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="size-4" />
                {restaurant.openingTime} – {restaurant.closingTime}
              </span>
              {restaurant.phoneNumber && (
                <span className="flex items-center gap-1.5">
                  <Phone className="size-4" />
                  {restaurant.phoneNumber}
                </span>
              )}
            </div>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{restaurant.description}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1 rounded-xl bg-primary/10 px-3 py-2 text-lg font-bold">
            <Star className="size-4 fill-amber-500 text-amber-500" />
            {restaurant.rating.toFixed(1)}
          </div>
        </CardContent>
      </div>

      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Badge
            variant={filter === null ? "default" : "outline"}
            className="cursor-pointer rounded-full px-3 py-1.5 text-sm font-medium"
            onClick={() => setFilter(null)}
          >
            Tous
          </Badge>
          {categories.map((c) => (
            <Badge
              key={c}
              variant={filter === c ? "default" : "outline"}
              className="cursor-pointer rounded-full px-3 py-1.5 text-sm font-medium"
              onClick={() => setFilter(filter === c ? null : c)}
            >
              {c}
            </Badge>
          ))}
        </div>
      )}

      {shown.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            Aucun plat disponible dans cette catégorie.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((d) => (
            <DishCard key={d.id} dish={d} />
          ))}
        </div>
      )}
    </div>
  )
}