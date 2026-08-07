import { Navigate, Outlet, useLocation } from "react-router-dom"
import { useAuth } from "../context/auth"

export function Protected() {
  const { user } = useAuth()
  const location = useLocation()

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }
  return <Outlet />
}