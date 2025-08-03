import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/components/AuthProvider";
import { PatientProvider } from "@/contexts/PatientContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import PatientDashboard from "./pages/PatientDashboard";
import RolesGPTHealth from "./pages/RolesGPTHealth";
import HealthInsights from "./pages/HealthInsights";
import HealthReports from "./pages/HealthReports";
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

const App = () => {

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <PatientProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/patient-dashboard" element={<PatientDashboard />} />
                <Route path="/rolesgpt-health" element={<RolesGPTHealth />} />
                <Route path="/health-insights" element={<HealthInsights />} />
                <Route path="/health-reports" element={<HealthReports />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </PatientProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;