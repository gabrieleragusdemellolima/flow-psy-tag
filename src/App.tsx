import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import AppLayout from "@/components/AppLayout";
import OperatorGate from "@/components/OperatorGate";
import { OperatorProvider } from "@/hooks/useOperator";
import Index from "./pages/Index";
import LoadTag from "./pages/LoadTag";
import POS from "./pages/POS";
import Inventory from "./pages/Inventory";
import Reports from "./pages/Reports";
import Admin from "./pages/Admin";
import Courtesy from "./pages/Courtesy";
import Customers from "./pages/Customers";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <OperatorProvider>
        <OperatorGate>
          <BrowserRouter>
            <AppLayout>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/load-tag" element={<LoadTag />} />
                <Route path="/pos" element={<POS />} />
                <Route path="/inventory" element={<Inventory />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/courtesy" element={<Courtesy />} />
                <Route path="/customers" element={<Customers />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </AppLayout>
          </BrowserRouter>
        </OperatorGate>
      </OperatorProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

