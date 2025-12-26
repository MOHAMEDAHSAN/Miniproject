import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import AnalysisPage from "./pages/AnalysisPage";
import TestAnalysisPage from "./pages/TestAnalysisPage";
import ListPropertyPage from "./pages/ListPropertyPage";
import VerificationPage from "./pages/VerificationPage";
import MarketplacePage from "./pages/MarketplacePage";
import PropertyDetailPage from "./pages/PropertyDetailPage";
import AdminDashboard from "./pages/AdminDashboard";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import ProfilePage from "./pages/ProfilePage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public routes - viewable by anyone */}
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/marketplace" element={<MarketplacePage />} />
            <Route path="/property/:propertyId" element={<PropertyDetailPage />} />

            {/* Protected routes - require login */}
            <Route path="/analysis" element={<ProtectedRoute><AnalysisPage /></ProtectedRoute>} />
<Route path="/test-analysis" element={<ProtectedRoute><TestAnalysisPage /></ProtectedRoute>} /> {/* */}
            
            <Route path="/list-property" element={<ProtectedRoute><ListPropertyPage /></ProtectedRoute>} />
            <Route path="/verification/:propertyId" element={<ProtectedRoute><VerificationPage /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute requireAdmin><AdminDashboard /></ProtectedRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
