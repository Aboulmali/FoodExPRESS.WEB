import { lazy, Suspense } from "react"
import { Link, BrowserRouter, Route, Routes } from "react-router-dom"
import { AuthProvider } from "./context/auth"
import { CartProvider } from "./context/cart"
import { ErrorBoundary } from "./components/error-boundary"
import { AppLayout } from "./components/app-layout"
import { Protected, RequireRole } from "./components/protected"
import { Toaster } from "./components/ui/sonner"

// Code-splitting : chaque page n'est chargée qu'à la navigation
const HomePage = lazy(() => import("./pages/home").then((m) => ({ default: m.HomePage })))
const MenuPage = lazy(() => import("./pages/menu").then((m) => ({ default: m.MenuPage })))
const OrdersPage = lazy(() => import("./pages/orders").then((m) => ({ default: m.OrdersPage })))
const OrderDetailPage = lazy(() => import("./pages/order-detail").then((m) => ({ default: m.OrderDetailPage })))
const OwnerDashboardPage = lazy(() => import("./pages/owner-dashboard").then((m) => ({ default: m.OwnerDashboardPage })))
const OwnerOrdersPage = lazy(() => import("./pages/owner-orders").then((m) => ({ default: m.OwnerOrdersPage })))
const DeliveryPage = lazy(() => import("./pages/delivery").then((m) => ({ default: m.DeliveryPage })))
const AdminDashboardPage = lazy(() => import("./pages/admin-dashboard").then((m) => ({ default: m.AdminDashboardPage })))
const LoginPage = lazy(() => import("./pages/auth").then((m) => ({ default: m.LoginPage })))
const RegisterPage = lazy(() => import("./pages/auth").then((m) => ({ default: m.RegisterPage })))

function PageLoader() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center" aria-label="Chargement de la page">
      <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <BrowserRouter>
          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />

                <Route element={<AppLayout />}>
                  <Route index element={<HomePage />} />
                  <Route path="restaurant/:id" element={<MenuPage />} />
                  <Route element={<Protected />}>
                    <Route path="orders" element={<OrdersPage />} />
                    <Route path="orders/:id" element={<OrderDetailPage />} />
                  </Route>
                  <Route element={<RequireRole roles={["RestaurantOwner", "Admin"]} />}>
                    <Route path="owner" element={<OwnerDashboardPage />} />
                    <Route path="owner/orders" element={<OwnerOrdersPage />} />
                  </Route>
                  <Route element={<RequireRole roles={["DeliveryPerson", "Admin"]} />}>
                    <Route path="delivery" element={<DeliveryPage />} />
                  </Route>
                  <Route element={<RequireRole roles={["Admin"]} />}>
                    <Route path="admin" element={<AdminDashboardPage />} />
                  </Route>
                  <Route path="*" element={<NotFound />} />
                </Route>
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </BrowserRouter>
        <Toaster />
      </CartProvider>
    </AuthProvider>
  )
}

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
      <p className="text-5xl font-bold text-primary">404</p>
      <p className="text-sm text-muted-foreground">Cette page n'existe pas.</p>
      <Link to="/" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
        Retour à l'accueil
      </Link>
    </div>
  )
}