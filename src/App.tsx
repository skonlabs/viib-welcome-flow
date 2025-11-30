import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { ProtectedRoute } from "@/components/app/ProtectedRoute";
import { AppRedirect } from "@/components/app/AppRedirect";
import Index from "./pages/Index";
import Onboarding from "./pages/app/Onboarding";
import Home from "./pages/app/Home";
import Admin from "./pages/app/Admin";
import SendFeedback from "./pages/app/SendFeedback";
import ViiBList from "./pages/app/ViiBList";
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
        <Route path="/app/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
        <Route path="/app/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
        <Route path="/app/feedback" element={<ProtectedRoute><SendFeedback /></ProtectedRoute>} />
        <Route path="/app/viiblist" element={<ProtectedRoute><ViiBList /></ProtectedRoute>} />
        <Route path="/app/onboarding" element={<Onboarding />} />
        <Route path="/app/onboarding/:step" element={<Onboarding />} />
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
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AnimatedRoutes />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
