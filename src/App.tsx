import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/app/ProtectedRoute";
import { AppRedirect } from "@/components/app/AppRedirect";
import { AppLayoutWrapper } from "@/components/app/AppLayoutWrapper";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { CookieConsentBanner } from "@/components/CookieConsentBanner";
import Index from "./pages/Index";
import Onboarding from "./pages/app/Onboarding";
import Home from "./pages/app/Home";
import Admin from "./pages/app/Admin";
import SendFeedback from "./pages/app/SendFeedback";
import ViiBList from "./pages/app/ViiBList";
import Search from "./pages/app/Search";
import Watchlist from "./pages/app/Watchlist";
import Social from "./pages/app/Social";
import Mood from "./pages/app/Mood";
import Together from "./pages/app/Together";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import About from "./pages/About";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AnimatedRoutes = () => {
  const location = useLocation();
  
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Index />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/app" element={<AppRedirect />} />
        <Route path="/app/onboarding" element={<Onboarding />} />
        <Route path="/app/onboarding/:step" element={<Onboarding />} />
        <Route path="/app/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
        <Route element={<ProtectedRoute><AppLayoutWrapper /></ProtectedRoute>}>
          <Route path="/app/home" element={<Home />} />
          <Route path="/app/feedback" element={<SendFeedback />} />
          <Route path="/app/viiblist" element={<ViiBList />} />
          <Route path="/app/search" element={<Search />} />
          <Route path="/app/watchlist" element={<Watchlist />} />
          <Route path="/app/social" element={<Social />} />
          <Route path="/app/mood" element={<Mood />} />
          <Route path="/app/together" element={<Together />} />
        </Route>
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/about" element={<About />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AnimatePresence>
  );
};

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <AnimatedRoutes />
            <CookieConsentBanner />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
