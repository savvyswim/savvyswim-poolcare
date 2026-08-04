import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import Privacy from "./pages/Privacy.tsx";
import Terms from "./pages/Terms.tsx";
import Auth from "./pages/Auth.tsx";
import AdminDesigns from "./pages/AdminDesigns.tsx";
import AdminCleaning from "./pages/AdminCleaning.tsx";
import AdminStore from "./pages/AdminStore.tsx";
import AdminTeam from "./pages/AdminTeam";
import AdminActivity from "./pages/AdminActivity";
import AdminCRM from "./pages/AdminCRM.tsx";
import Store from "./pages/Store.tsx";
import ProductDetail from "./pages/ProductDetail.tsx";
import CheckoutReturn from "./pages/CheckoutReturn.tsx";

import { CartProvider } from "@/hooks/useCart";
import { CartDrawer } from "@/components/CartDrawer";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <CartProvider>
          <CartDrawer />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/privacy-policy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/terms-and-conditions" element={<Terms />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/admin/designs" element={<AdminDesigns />} />
            <Route path="/admin/cleaning" element={<AdminCleaning />} />
            <Route path="/admin/store" element={<AdminStore />} />
            <Route path="/admin/crm" element={<AdminCRM />} />
            <Route path="/admin/team" element={<AdminTeam />} />
            <Route path="/admin/activity" element={<AdminActivity />} />
            <Route path="/shop" element={<Store />} />
            <Route path="/product/:handle" element={<ProductDetail />} />
            <Route path="/checkout/return" element={<CheckoutReturn />} />

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </CartProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
