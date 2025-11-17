import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "./contexts/LanguageContext";
import { ChatProvider } from "./contexts/ChatContext";
import { CurrencyProvider } from "./contexts/CurrencyContext";
import { ChatWidget } from "@/components/chat/ChatWidget";
import { useSubscriptionCheck } from "@/hooks/useSubscriptionCheck";
import { TrialBanner } from "@/components/TrialBanner";
import { TrialExpiredModal } from "@/components/TrialExpiredModal";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import CampaignControl from "./pages/CampaignControl";
import Products from "./pages/Products";
import Settings from "./pages/Settings";
import Integrations from "./pages/Integrations";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import NotFound from "./pages/NotFound";
import FacebookCallback from "./pages/FacebookCallback";
import MetaDashboard from "./pages/MetaDashboard";
import AdminSupport from "./pages/AdminSupport";
import ProfitSheet from "./pages/ProfitSheet";
import ProductResearch from "./pages/ProductResearch";
import UpdateFacebookToken from "./pages/UpdateFacebookToken";
import Billing from "./pages/Billing";
import TestBrevo from "./pages/TestBrevo";
import TestPage from "./pages/TestPage";
import HomePageTest from "./pages/HomePageTest";
import ContactBusiness from "./pages/ContactBusiness";
import ScrollDemo from "./pages/ScrollDemo";
import StackedScroll from "./pages/StackedScroll";
import UltimateScroll from "./pages/UltimateScroll";
import SimpleScroll from "./pages/SimpleScroll";
import DashboardNew from "./pages/DashboardNew";
import SupplierQuotePage from "./pages/SupplierQuotePage";
import Notes from "./pages/Notes";

const queryClient = new QueryClient();

const AppContent = () => {
  useSubscriptionCheck();
  
  return (
    <>
      <TrialExpiredModal />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/dashboard" element={<><TrialBanner /><Dashboard /></>} />
        <Route path="/dashboard-new" element={<><TrialBanner /><DashboardNew /></>} />
        <Route path="/campaign-control" element={<><TrialBanner /><CampaignControl /></>} />
        <Route path="/meta-dashboard" element={<><TrialBanner /><MetaDashboard /></>} />
        <Route path="/products" element={<><TrialBanner /><Products /></>} />
        <Route path="/profit-sheet" element={<><TrialBanner /><ProfitSheet /></>} />
        <Route path="/product-research" element={<><TrialBanner /><ProductResearch /></>} />
        <Route path="/update-facebook-token" element={<UpdateFacebookToken />} />
        <Route path="/settings" element={<><TrialBanner /><Settings /></>} />
        <Route path="/integrations" element={<><TrialBanner /><Integrations /></>} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/facebook-callback" element={<FacebookCallback />} />
        <Route path="/facebook/callback" element={<FacebookCallback />} />
        <Route path="/admin/support" element={<AdminSupport />} />
        <Route path="/billing" element={<><TrialBanner /><Billing /></>} />
        <Route path="/contact-business" element={<ContactBusiness />} />
        <Route path="/test-brevo" element={<TestBrevo />} />
        <Route path="/test-page" element={<TestPage />} />
        <Route path="/homepage-test" element={<HomePageTest />} />
        <Route path="/scroll-demo" element={<ScrollDemo />} />
        <Route path="/stacked-scroll" element={<StackedScroll />} />
        <Route path="/ultimate-scroll" element={<UltimateScroll />} />
        <Route path="/simple-scroll" element={<SimpleScroll />} />
        <Route path="/supplier-quote/:token" element={<SupplierQuotePage />} />
        <Route path="/notes" element={<><TrialBanner /><Notes /></>} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      <ChatWidget />
    </>
  );
};

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <CurrencyProvider>
          <ChatProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <AppContent />
              </BrowserRouter>
            </TooltipProvider>
          </ChatProvider>
        </CurrencyProvider>
      </LanguageProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;