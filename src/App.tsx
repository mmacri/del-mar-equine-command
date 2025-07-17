import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { LoginForm } from "@/components/LoginForm";
import { Layout } from "@/components/Layout";
import { Dashboard } from "@/pages/Dashboard";
import { CommandCenter } from "@/pages/CommandCenter";
import { ProblemsView } from "@/pages/ProblemsView";
import { HorsesPage } from "@/pages/HorsesPage";
import { OwnersPage } from "@/pages/OwnersPage";
import { RacesPage } from "@/pages/RacesPage";
import { DataGridPage } from "@/pages/DataGridPage";
import { ReportsPage } from "@/pages/ReportsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AppContent() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginForm />;
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/command" element={<CommandCenter />} />
        <Route path="/problems" element={<ProblemsView />} />
        <Route path="/horses" element={<HorsesPage />} />
        <Route path="/owners" element={<OwnersPage />} />
        <Route path="/races" element={<RacesPage />} />
        <Route path="/data-grid" element={<DataGridPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
