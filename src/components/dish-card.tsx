import { Flame, Leaf, Plus } from "lucide-react"
import type { Dish } from "../lib/api"
import { useCart } from "../context/cart"
import { formatMAD } from "../lib/format"
import { SmartImage } from "./smart-image"
import { Badge } from "./ui/badge"
import { Button } from "./ui/button"
import { Card, CardContent } from "./ui/card"
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip"

export function DishCard({ dish }: { dish: Dish }) {
  const { add } = useCart()
  const soldOut = !dish.isAvailable || dish.stock === 0

  return (
    <Card className="overflow-hidden">
      <div className="relative h-32 w-full bg-muted">
        <SmartImage src={dish.imageUrl} alt={dish.name} className="size-full object-cover" />
        <div className="absolute right-2 top-2 flex gap-1.5">
          {dish.isVegetarian && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="flex size-6 items-center justify-center rounded-full bg-emerald-500/90 text-white">
                  <Leaf className="size-3.5" />
                </span>
              </TooltipTrigger>
              <TooltipContent>Végétarien</TooltipContent>
            </Tooltip>
          )}
          {dish.isSpicy && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="flex size-6 items-center justify-center rounded-full bg-red-500/90 text-white">
                  <Flame className="size-3.5" />
                </span>
              </TooltipTrigger>
              <TooltipContent>Épicé</TooltipContent>
            </Tooltip>
          )}
          {soldOut && <Badge variant="secondary" className="text-[10px]">Épuisé</Badge>}
        </div>
      </div>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h4 className="truncate font-semibold">{dish.name}</h4>
            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{dish.description}</p>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <div>
            <p className="text-base font-bold">{formatMAD(dish.price)}</p>
            <p className="text-[11px] text-muted-foreground">
              {dish.preparationTimeMinutes} min
              {dish.stock > 0 && dish.stock <= 10 ? ` · ${dish.stock} restants` : ""}
            </p>
          </div>
          <Button size="sm" className="gap-1" disabled={soldOut} onClick={() => add(dish)}>
            <Plus className="size-4" />
            Ajouter
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}