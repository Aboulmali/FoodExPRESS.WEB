const mad = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "MAD", maximumFractionDigits: 0 })

export function formatMAD(amount: number): string {
  return mad.format(amount)
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return "à l'instant"
  const m = Math.floor(s / 60)
  if (m < 60) return `il y a ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `il y a ${h} h`
  const j = Math.floor(h / 24)
  return `il y a ${j} j`
}

export const STATUS_LABELS: Record<string, string> = {
  Pending: "En attente",
  Accepted: "Acceptée",
  Preparing: "En préparation",
  Ready: "Prête",
  OnDelivery: "En livraison",
  Delivered: "Livrée",
  Cancelled: "Annulée",
}

export const ORDER_STEPS = [
  "Pending",
  "Accepted",
  "Preparing",
  "Ready",
  "OnDelivery",
  "Delivered",
] as const

export function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status
}

export function statusTone(status: string): string {
  switch (status) {
    case "Delivered":
      return "success"
    case "Cancelled":
      return "destructive"
    case "Pending":
      return "secondary"
    default:
      return "default"
  }
}

export function stepIndex(status: string): number {
  const i = ORDER_STEPS.indexOf(status as (typeof ORDER_STEPS)[number])
  return i < 0 ? (status === "Cancelled" ? -1 : 0) : i
}