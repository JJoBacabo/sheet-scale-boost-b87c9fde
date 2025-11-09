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
import Billing from "./pages/Billing";
import TestBrevo from "./pages/TestBrevo";
import TestPage from "./pages/TestPage";

// Configure React Query for optimal performance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes - data stays fresh
      gcTime: 10 * 60 * 1000, // 10 minutes - cache time (formerly cacheTime)
      refetchOnWindowFocus: false, // Don't refetch on window focus
      refetchOnMount: true, // Refetch on component mount
      retry: 1, // Retry failed requests once
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    },
    mutations: {
      retry: 1, // Retry failed mutations once
    },
  },
});

const AppContent = () => {
  useSubscriptionCheck();
  
  return (
    <>
      <TrialExpiredModal />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/dashboard" element={<><TrialBanner /><Dashboard /></>} />
        <Route path="/campaign-control" element={<><TrialBanner /><CampaignControl /></>} />
        <Route path="/meta-dashboard" element={<><TrialBanner /><MetaDashboard /></>} />
        <Route path="/products" element={<><TrialBanner /><Products /></>} />
        <Route path="/profit-sheet" element={<><TrialBanner /><ProfitSheet /></>} />
        <Route path="/product-research" element={<><TrialBanner /><ProductResearch /></>} />
        <Route path="/settings" element={<><TrialBanner /><Settings /></>} />
        <Route path="/integrations" element={<><TrialBanner /><Integrations /></>} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/facebook-callback" element={<FacebookCallback />} />
        <Route path="/admin/support" element={<AdminSupport />} />
        <Route path="/billing" element={<><TrialBanner /><Billing /></>} />
        <Route path="/test-brevo" element={<TestBrevo />} />
        <Route path="/test-page" element={<TestPage />} />
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