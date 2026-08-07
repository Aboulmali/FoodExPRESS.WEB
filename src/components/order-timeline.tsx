import { Check } from "lucide-react"
import type { OrderDto } from "../lib/api"
import { ORDER_STEPS, STATUS_LABELS, stepIndex } from "../lib/format"
import { Badge } from "./ui/badge"

export function OrderTimeline({ order }: { order: OrderDto }) {
  const cancelled = order.status === "Cancelled"
  const done = stepIndex(order.status)

  if (cancelled) {
    return (
      <div className="space-y-3">
        <Badge variant="destructive" className="w-fit">Commande annulée</Badge>
        <p className="text-sm text-muted-foreground">
          Votre commande {order.orderNumber} a été annulée. Aucun débit n'a été effectué si le paiement était en attente.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Badge className="w-fit">{STATUS_LABELS[order.status] ?? order.status}</Badge>
      </div>
      <div className="flex items-center gap-1">
        {ORDER_STEPS.map((step, i) => (
          <div key={step} className="flex flex-1 items-center gap-1 last:flex-none">
            <div
              className={
                "flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold " +
                (i <= done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")
              }
            >
              {i < done ? <Check className="size-3.5" /> : i + 1}
            </div>
            {i < ORDER_STEPS.length - 1 && (
              <div className={"h-0.5 flex-1 " + (i < done ? "bg-primary" : "bg-muted")} />
            )}
          </div>
        ))}
      </div>
      <div className="hidden gap-1 sm:flex">
        {ORDER_STEPS.map((step, i) => (
          <span
            key={step}
            className={
              "flex-1 text-center text-[10px] uppercase tracking-wide " +
              (i <= done ? "text-foreground" : "text-muted-foreground")
            }
          >
            {STATUS_LABELS[step]}
          </span>
        ))}
      </div>
      {order.notes && <p className="text-xs text-muted-foreground">Note : {order.notes}</p>}
    </div>
  )
}