import { useEffect, useMemo, useState } from "react"
import { Search, Store } from "lucide-react"
import { api, ApiError } from "../lib/api"
import type { Restaurant } from "../lib/api"
import { RestaurantCard } from "../components/restaurant-card"
import { Card, CardContent } from "../components/ui/card"
import { Input } from "../components/ui/input"
import { Skeleton } from "../components/ui/skeleton"
import { toast } from "sonner"

export function HomePage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("")

  useEffect(() => {
    let alive = true
    api
      .restaurants()
      .then((rests) => alive && setRestaurants(rests.filter((r) => r.isActive)))
      .catch((err) => {
        if (!alive) return
        toast.error(err instanceof ApiError ? err.message : "Impossible de charger les restaurants")
      })
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return restaurants
    return restaurants.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.city.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q),
    )
  }, [restaurants, query])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Découvrez les restaurants</h1>
        <p className="text-sm text-muted-foreground">Choisissez votre restaurant et commandez en quelques clics.</p>
      </div>

      <div className="sticky top-14 z-20 -mx-4 bg-background/80 px-4 py-2 backdrop-blur md:-mx-8 md:px-8">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un restaurant ou une ville…"
            className="pl-9"
          />
        </div>
      </div>

      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <Store className="size-10 text-muted-foreground" />
            <p className="font-medium">Aucun restaurant trouvé</p>
            <p className="text-sm text-muted-foreground">Essayez un autre nom ou une autre ville.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((r, i) => (
            <RestaurantCard key={r.id} restaurant={r} index={i} />
          ))}
        </div>
      )}
    </div>
  )
}