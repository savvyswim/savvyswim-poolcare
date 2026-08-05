import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import Services from "./pages/Services.tsx";
import PoolCleaningFrisco from "./pages/PoolCleaningFrisco.tsx";
import RequestInspection from "./pages/RequestInspection.tsx";
import Privacy from "./pages/Privacy.tsx";
import Terms from "./pages/Terms.tsx";
import SetPassword from "./pages/SetPassword.tsx";
import Auth from "./pages/Auth.tsx";
import Portal from "./pages/Portal.tsx";
import { isAppHost } from "@/hooks/useAppHost";
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
import Projects from "@/crm/pages/Projects";
import ProjectDetail from "@/crm/pages/ProjectDetail";
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
import { RequireModule } from "@/crm/components/RequireModule";

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
            <Route path="/" element={isAppHost() ? <Navigate to="/portal" replace /> : <Index />} />
            <Route path="/portal" element={<Portal />} />
            <Route path="/services" element={<Services />} />
            <Route path="/pool-cleaning-frisco-tx" element={<PoolCleaningFrisco />} />
            <Route path="/set-password" element={<SetPassword />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/privacy-policy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/terms-and-conditions" element={<Terms />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/admin/crm/login" element={<Auth />} />
            <Route path="/admin/crm/app" element={<RequireModule module="console"><CrmApp /></RequireModule>} />
            <Route path="/admin/crm/legacy" element={<AdminCRM />} />
            <Route element={<CrmLayout />}>
              <Route path="/admin/crm" element={<RoutePage />} />
              <Route path="/admin/crm/customers" element={<CustomersPage />} />
              <Route path="/admin/crm/customers/:id" element={<CustomerDetail />} />
              <Route path="/admin/crm/pipeline" element={<Pipeline />} />
              <Route path="/admin/crm/jobs" element={<Jobs />} />
              <Route path="/admin/crm/projects" element={<Projects />} />
              <Route path="/admin/crm/projects/:id" element={<ProjectDetail />} />
              <Route path="/admin/crm/alerts" element={<Alerts />} />
              <Route path="/admin/crm/technicians" element={<Technicians />} />
              <Route path="/admin/crm/products" element={<Products />} />
              <Route path="/admin/crm/finance" element={<Finance />} />
              <Route path="/admin/crm/trucks" element={<Trucks />} />
              <Route path="/admin/crm/inventory" element={<Inventory />} />
              <Route path="/admin/crm/email" element={<EmailCenter />} />
              <Route path="/admin/crm/reports" element={<Reports />} />
              <Route path="/admin/crm/connect" element={<WebsiteConnect />} />
              <Route path="/admin/crm/settings" element={<CrmSettings />} />
            </Route>

            {/* Legacy /crm/* URLs redirect into the admin area */}
            <Route path="/crm/*" element={<Navigate to="/admin/crm" replace />} />
            <Route path="/crm" element={<Navigate to="/admin/crm" replace />} />

            <Route path="/admin" element={<Navigate to="/admin/crm" replace />} />
            <Route path="/admin/designs" element={<RequireModule module="designs"><AdminDesigns /></RequireModule>} />
            <Route path="/admin/cleaning" element={<RequireModule module="cleaning"><AdminCleaning /></RequireModule>} />
            <Route path="/admin/store" element={<RequireModule module="store"><AdminStore /></RequireModule>} />
            <Route path="/admin/team" element={<RequireModule module="team"><AdminTeam /></RequireModule>} />
            <Route path="/admin/activity" element={<RequireModule module="activity"><AdminActivity /></RequireModule>} />

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
