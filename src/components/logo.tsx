import { Link } from "react-router-dom"

export function Logo({ className }: { className?: string }) {
  return (
    <Link to="/" className={"flex items-center gap-2.5 " + (className ?? "")}>
      <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-xl font-extrabold text-primary-foreground">
        F
      </div>
      <div className="leading-tight">
        <p className="text-[15px] font-bold tracking-tight">FoodExpress</p>
        <p className="text-[11px] text-muted-foreground">Livraison en un clic</p>
      </div>
    </Link>
  )
}