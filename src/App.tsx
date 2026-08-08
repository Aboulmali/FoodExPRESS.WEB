import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import { AuthProvider } from "./context/auth"
import { CartProvider } from "./context/cart"
import { ErrorBoundary } from "./components/error-boundary"
import { AppLayout } from "./components/app-layout"
import { Protected, RequireRole } from "./components/protected"
import { Toaster } from "./components/ui/sonner"
import { HomePage } from "./pages/home"
import { MenuPage } from "./pages/menu"
import { OrdersPage } from "./pages/orders"
import { OrderDetailPage } from "./pages/order-detail"
import { OwnerDashboardPage } from "./pages/owner-dashboard"
import { OwnerOrdersPage } from "./pages/owner-orders"
import { DeliveryPage } from "./pages/delivery"
import { AdminDashboardPage } from "./pages/admin-dashboard"
import { LoginPage, RegisterPage } from "./pages/auth"

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <BrowserRouter>
          <ErrorBoundary>
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
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </ErrorBoundary>
        </BrowserRouter>
        <Toaster />
      </CartProvider>
    </AuthProvider>
  )
}