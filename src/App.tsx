import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/components/AuthProvider";
import { PatientProvider } from "@/contexts/PatientContext";
import { useAppInitialization } from "@/hooks/useAppInitialization";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import PatientDashboard from "./pages/PatientDashboard";
import NotFound from "./pages/NotFound";

// Create QueryClient outside component to avoid React dispatcher issues
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      staleTime: 5 * 60 * 1000,
    },
  },
});

// App initialization component that runs inside providers
const AppWithInitialization = () => {
  // Initialize app startup tasks (including HealthKit on iOS)
  useAppInitialization();
  
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/patient-dashboard" element={<PatientDashboard />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
};

const App = () => {

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <PatientProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <AppWithInitialization />
          </TooltipProvider>
        </PatientProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;