import { useMemo, useState } from "react"
import { NavLink, Outlet } from "react-router-dom"
import { LogOut, Menu, PackageOpen, ShieldCheck, ShoppingBag, Store } from "lucide-react"
import { useAuth } from "../context/auth"
import { useCart } from "../context/cart"
import { ThemeToggle } from "./theme-toggle"
import { Logo } from "./logo"
import { CartDrawer } from "./cart-drawer"
import { Badge } from "./ui/badge"
import { Button } from "./ui/button"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "./ui/sheet"
import { Avatar, AvatarFallback } from "./ui/avatar"

const ROLE_LABELS: Record<string, string> = {
  Admin: "Administrateur",
  Customer: "Client",
  RestaurantOwner: "Restaurateur",
  DeliveryPerson: "Livreur",
}

function initialsOf(u: { name?: string; preferred_username?: string } | null): string {
  if (!u) return "?"
  const name = u.name ?? u.preferred_username ?? ""
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("")
}

export function AppLayout() {
  const { user, roles, hasRole, logout } = useAuth()
  const { count } = useCart()
  const [cartOpen, setCartOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const roleLabel = roles.map((r) => ROLE_LABELS[r]).filter(Boolean).join(", ") || null

  const items = useMemo(
    () => [
      { to: "/", label: "Restaurants", icon: Store, end: true },
      ...(hasRole("Customer", "Admin")
        ? [{ to: "/orders", label: "Mes commandes", icon: PackageOpen, end: false }]
        : []),
    ],
    [hasRole],
  )

  const nav = (
    <nav className="flex flex-col gap-1">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors " +
            (isActive ? "bg-primary text-primary-foreground" : "hover:bg-muted")
          }
          onClick={() => setMenuOpen(false)}
        >
          <item.icon className="size-4" />
          {item.label}
        </NavLink>
      ))}
    </nav>
  )

  return (
    <div className="flex min-h-dvh">
      {/* Sidebar desktop */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r bg-sidebar p-4 md:flex">
        <Logo />
        <div className="mt-8 flex-1">{nav}</div>
        <div className="flex items-center gap-3 rounded-xl border p-3">
          <Avatar className="size-9">
            <AvatarFallback>{initialsOf(user)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{user?.name ?? user?.preferred_username ?? "Invité"}</p>
            <p className="truncate text-xs text-muted-foreground">{user?.email ?? "Non connecté"}</p>
            {roleLabel && (
              <p className="mt-0.5 flex items-center gap-1 text-xs font-medium text-primary">
                <ShieldCheck className="size-3" />
                {roleLabel}
              </p>
            )}
          </div>
          {user && (
            <Button variant="ghost" size="icon" className="text-muted-foreground" onClick={logout} aria-label="Se déconnecter">
              <LogOut className="size-4" />
            </Button>
          )}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
          <div className="mx-auto flex h-14 w-full max-w-7xl items-center gap-2 px-4 md:px-8">
            {/* Mobile menu */}
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden" aria-label="Menu">
                  <Menu className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64">
                <SheetTitle className="sr-only">Menu</SheetTitle>
                <Logo />
                <div className="mt-8">{nav}</div>
              </SheetContent>
            </Sheet>

            <div className="md:hidden">
              <Logo />
            </div>

            <div className="flex-1" />

            <ThemeToggle />
            <Button variant="outline" size="icon" onClick={() => setCartOpen(true)} aria-label="Panier" className="relative">
              <ShoppingBag className="size-5" />
              {count > 0 && (
                <Badge className="absolute -right-1.5 -top-1.5 h-5 min-w-5 px-1 text-[10px]">
                  {count}
                </Badge>
              )}
            </Button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 md:px-8">
          <Outlet />
        </main>

        <footer className="mt-auto border-t bg-muted/40">
          <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-10 sm:grid-cols-2 md:grid-cols-4 md:px-8">
            <div className="space-y-3 sm:col-span-2">
              <Logo />
              <p className="max-w-xs text-sm text-muted-foreground">
                Vos plats favoris, livrés en quelques clics. Suivi de commande en temps réel dans toute la ville.
              </p>
            </div>
            <div>
              <p className="mb-3 text-sm font-semibold">Navigation</p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <NavLink to="/" end className="hover:text-foreground">
                    Restaurants
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/orders" className="hover:text-foreground">
                    Mes commandes
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/register" className="hover:text-foreground">
                    Créer un compte
                  </NavLink>
                </li>
              </ul>
            </div>
            <div>
              <p className="mb-3 text-sm font-semibold">Aide</p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a href="mailto:support@foodexpress.ma" className="hover:text-foreground">
                    Nous contacter
                  </a>
                </li>
                <li>Lundi – Samedi, 9h – 23h</li>
                <li>+212 5 22 00 00 00</li>
              </ul>
            </div>
          </div>
          <div className="border-t py-4 text-center text-xs text-muted-foreground">
            FoodExpress © {new Date().getFullYear()} — .NET 10 · RabbitMQ · React
          </div>
        </footer>
      </div>

      <CartDrawer open={cartOpen} onOpenChange={setCartOpen} />
    </div>
  )
}