import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import Services from "./pages/Services.tsx";
import PoolCleaningFrisco from "./pages/PoolCleaningFrisco.tsx";
import Privacy from "./pages/Privacy.tsx";
import Terms from "./pages/Terms.tsx";
import Auth from "./pages/Auth.tsx";
import AdminDesigns from "./pages/AdminDesigns.tsx";
import AdminCleaning from "./pages/AdminCleaning.tsx";
import AdminStore from "./pages/AdminStore.tsx";
import AdminTeam from "./pages/AdminTeam";
import AdminActivity from "./pages/AdminActivity";
import AdminCRM from "./pages/AdminCRM.tsx";
import CheckoutReturn from "./pages/CheckoutReturn.tsx";
import CrmApp from "./pages/CrmApp.tsx";
import CrmLayout from "@/crm/CrmLayout";
import RoutePage from "@/crm/pages/Route";
import CustomersPage from "@/crm/pages/Customers";
import CustomerDetail from "@/crm/pages/CustomerDetail";
import Pipeline from "@/crm/pages/Pipeline";
import Jobs from "@/crm/pages/Jobs";
import Alerts from "@/crm/pages/Alerts";
import Technicians from "@/crm/pages/Technicians";
import Products from "@/crm/pages/Products";
import Finance from "@/crm/pages/Finance";
import Trucks from "@/crm/pages/Trucks";
import Inventory from "@/crm/pages/Inventory";
import EmailCenter from "@/crm/pages/EmailCenter";
import Reports from "@/crm/pages/Reports";
import WebsiteConnect from "@/crm/pages/WebsiteConnect";
import CrmSettings from "@/crm/pages/Settings";

import { CartProvider } from "@/hooks/useCart";
import { CartDrawer } from "@/components/CartDrawer";
import { ScrollToTop } from "@/components/ScrollToTop";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <CartProvider>
          <ScrollToTop />
          <CartDrawer />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/services" element={<Services />} />
            <Route path="/pool-cleaning-frisco-tx" element={<PoolCleaningFrisco />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/privacy-policy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/terms-and-conditions" element={<Terms />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/crm/login" element={<Auth />} />
            <Route path="/crm/app" element={<CrmApp />} />
            <Route path="/crm/legacy" element={<AdminCRM />} />
            <Route element={<CrmLayout />}>
              <Route path="/crm" element={<RoutePage />} />
              <Route path="/crm/customers" element={<CustomersPage />} />
              <Route path="/crm/customers/:id" element={<CustomerDetail />} />
              <Route path="/crm/pipeline" element={<Pipeline />} />
              <Route path="/crm/jobs" element={<Jobs />} />
              <Route path="/crm/alerts" element={<Alerts />} />
              <Route path="/crm/technicians" element={<Technicians />} />
              <Route path="/crm/products" element={<Products />} />
              <Route path="/crm/finance" element={<Finance />} />
              <Route path="/crm/trucks" element={<Trucks />} />
              <Route path="/crm/inventory" element={<Inventory />} />
              <Route path="/crm/email" element={<EmailCenter />} />
              <Route path="/crm/reports" element={<Reports />} />
              <Route path="/crm/connect" element={<WebsiteConnect />} />
              <Route path="/crm/settings" element={<CrmSettings />} />
            </Route>

            <Route path="/admin/designs" element={<AdminDesigns />} />
            <Route path="/admin/cleaning" element={<AdminCleaning />} />
            <Route path="/admin/store" element={<AdminStore />} />
            <Route path="/admin/crm" element={<AdminCRM />} />
            <Route path="/admin/team" element={<AdminTeam />} />
            <Route path="/admin/activity" element={<AdminActivity />} />
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
