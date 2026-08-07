import { Link } from "react-router-dom"
import { Clock, MapPin, Star } from "lucide-react"
import type { Restaurant } from "../lib/api"
import { SmartImage } from "./smart-image"
import { Badge } from "./ui/badge"
import { Button } from "./ui/button"
import { Card, CardContent } from "./ui/card"

const GRADIENTS = [
  "from-emerald-500 to-green-600",
  "from-lime-500 to-emerald-600",
  "from-teal-500 to-emerald-600",
  "from-green-500 to-teal-600",
  "from-emerald-600 to-teal-700",
  "from-lime-600 to-green-600",
]

export function RestaurantCard({ restaurant, index }: { restaurant: Restaurant; index: number }) {
  const g = GRADIENTS[index % GRADIENTS.length]

  return (
    <Link to={`/restaurant/${restaurant.id}`} className="group block">
      <Card className="overflow-hidden transition-shadow hover:shadow-lg">
        <div className={`relative h-36 w-full bg-gradient-to-br ${g}`}>
          <SmartImage
            src={restaurant.coverImageUrl}
            alt={restaurant.name}
            className="size-full object-cover"
          />
          <div className="absolute right-2 top-2">
            {restaurant.isOpen ? (
              <Badge className="bg-emerald-600 text-white">Ouvert</Badge>
            ) : (
              <Badge variant="secondary">Fermé</Badge>
            )}
          </div>
        </div>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate font-semibold">{restaurant.name}</h3>
              <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MapPin className="size-3.5" />
                  {restaurant.city}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="size-3.5" />
                  {restaurant.openingTime}–{restaurant.closingTime}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1 rounded-lg bg-primary/10 px-2 py-1 text-sm font-semibold">
              <Star className="size-3.5 fill-amber-500 text-amber-500" />
              {restaurant.rating.toFixed(1)}
            </div>
          </div>
          <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{restaurant.description}</p>
          <Button className="mt-3 w-full">
            Voir le menu · {restaurant.dishesCount} plats
          </Button>
        </CardContent>
      </Card>
    </Link>
  )
}