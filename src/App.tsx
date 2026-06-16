import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import { GlobalLoadingOverlay } from "@/components/GlobalLoadingOverlay";
import { LoadingProvider } from "@/contexts/LoadingContext";
import Login from "@/pages/Login";
import Servicos from "@/pages/Servicos";
import Clientes from "@/pages/Clientes";
import Fornecedores from "@/pages/Fornecedores";
import Estoque from "@/pages/Estoque";
import Dashboard from "@/pages/Dashboard";
import Relatorios from "@/pages/Relatorios";
import RelatorioCustos from "@/pages/relatorios/Custos";
import RelatorioPagamentos from "@/pages/relatorios/Pagamentos";
import Configuracoes from "@/pages/Configuracoes";
import ConfigGeral from "@/pages/configuracoes/Geral";
import ConfigMaquininhas from "@/pages/configuracoes/Maquininhas";
import ConfigMarcasModelos from "@/pages/configuracoes/MarcasModelos";

const queryClient = new QueryClient();

function ProtectedRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Servicos />} />
        <Route path="/clientes" element={<Clientes />} />
        <Route path="/fornecedores" element={<Fornecedores />} />
        <Route path="/estoque" element={<Estoque />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/relatorios" element={<Relatorios />} />
        <Route path="/relatorios/custos" element={<RelatorioCustos />} />
        <Route path="/relatorios/pagamentos" element={<RelatorioPagamentos />} />
        <Route path="/configuracoes" element={<Configuracoes />} />
        <Route path="/configuracoes/geral" element={<ConfigGeral />} />
        <Route path="/configuracoes/maquininhas" element={<ConfigMaquininhas />} />
        <Route path="/configuracoes/marcas-modelos" element={<ConfigMarcasModelos />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppLayout>
  );
}

function AuthGate() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return <Login />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LoadingProvider>
      <TooltipProvider>
        <Sonner />
        <GlobalLoadingOverlay />
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<AuthGate />} />
              <Route path="/*" element={<ProtectedRoutes />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </LoadingProvider>
  </QueryClientProvider>
);

export default App;
