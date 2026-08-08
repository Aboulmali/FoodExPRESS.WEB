import { Link, Navigate, Outlet, useLocation } from "react-router-dom"
import { Lock } from "lucide-react"
import { useAuth } from "../context/auth"
import { Button } from "./ui/button"
import { Card, CardContent } from "./ui/card"

export function Protected() {
  const { user } = useAuth()
  const location = useLocation()

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }
  return <Outlet />
}

export function RequireRole({ roles }: { roles: string[] }) {
  const { user, hasRole } = useAuth()
  const location = useLocation()

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }
  if (!hasRole(...roles)) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-muted">
          <Lock className="size-6 text-muted-foreground" />
        </div>
        <Card className="w-full max-w-md">
          <CardContent className="space-y-2 p-6 text-center">
            <h2 className="text-lg font-semibold">Accès refusé</h2>
            <p className="text-sm text-muted-foreground">
              Votre compte ({user.roles?.length ? user.roles.join(", ") : "aucun rôle"}) n'a pas les permissions
              nécessaires pour accéder à cette page.
            </p>
            <Button asChild className="mt-2">
              <Link to="/">Retour à l'accueil</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }
  return <Outlet />
}