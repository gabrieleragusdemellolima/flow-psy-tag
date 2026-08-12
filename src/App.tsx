import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import AppLayout from "@/components/AppLayout";
import OperatorGate from "@/components/OperatorGate";
import AdminRoute from "@/components/AdminRoute";
import { AuthProvider } from "@/hooks/useAuth";
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
      <AuthProvider>
        <OperatorGate>
          <BrowserRouter>
            <AppLayout>
              <Routes>
                {/* Sellers (operators) */}
                <Route path="/load-tag" element={<LoadTag />} />
                <Route path="/pos" element={<POS />} />

                {/* Admin only */}
                <Route path="/" element={<AdminRoute><Index /></AdminRoute>} />
                <Route path="/inventory" element={<AdminRoute><Inventory /></AdminRoute>} />
                <Route path="/reports" element={<AdminRoute><Reports /></AdminRoute>} />
                <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
                <Route path="/courtesy" element={<AdminRoute><Courtesy /></AdminRoute>} />
                <Route path="/customers" element={<AdminRoute><Customers /></AdminRoute>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </AppLayout>
          </BrowserRouter>
        </OperatorGate>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

