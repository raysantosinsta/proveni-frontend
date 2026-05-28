/* eslint-disable @typescript-eslint/no-explicit-any */
// app/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/src/hooks/useAuth";
import {
  User,
  Mail,
  Building2,
  Briefcase,
  LogOut,
  Bell,
  Boxes,
  Factory,
  Leaf,
  ShieldCheck,
  AlertTriangle,
  Search,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import api from "@/src/services/api";
import { cn } from "@/lib/utils";

// Mapeamento de roles para rotas
const roleRoutes: Record<string, string> = {
  SUPPLIER: "/supplier/documents",
  OPERATOR: "/operator/documents",
  SPECIALIST: "/specialist/documents",
  MANAGER: "/dashboard",
  ADMIN: "/admin/dashboard",
};

// Nomes amigáveis para roles
const roleNames: Record<string, string> = {
  SUPPLIER: "Fornecedor",
  OPERATOR: "Operador",
  SPECIALIST: "Especialista ESG",
  MANAGER: "Gestor ESG",
  ADMIN: "Administrador",
};

interface Batch {
  id: string;
  batchId: string;
  productName: string;
  co2Emitted: number;
  status: string;
  company?: { name: string };
  createdAt: string;
}

interface DashboardStats {
  totalBatches: number;
  totalCO2: number;
  complianceScore: number;
  totalSuppliers: number;
  pendingDocuments: number;
  onChainBatches: number;
}

export default function DashboardPage() {
  const { user, logout, isAuthenticated, initialized } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [recentBatches, setRecentBatches] = useState<Batch[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalBatches: 0,
    totalCO2: 0,
    complianceScore: 0,
    totalSuppliers: 0,
    pendingDocuments: 0,
    onChainBatches: 0,
  });

  useEffect(() => {
    if (initialized && !isAuthenticated) {
      router.push("/login");
    }
  }, [initialized, isAuthenticated, router]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;

      try {
        setLoading(true);
        const role = user.role;

        // Para MANAGER, ADMIN e SPECIALIST - buscar dados da empresa
        if (role === "MANAGER" || role === "ADMIN" || role === "SPECIALIST") {
          // Buscar estatísticas do dashboard da empresa
          try {
            const dashboardRes = await api.get("/companies/dashboard");
            const dashboardData = dashboardRes.data;

            setStats((prev) => ({
              ...prev,
              totalBatches: dashboardData.totalBatches || 0,
              totalCO2: dashboardData.totalCO2 || 0,
              complianceScore: Math.round(dashboardData.compliantRate || 0),
              totalSuppliers: dashboardData.totalSuppliers || 0,
            }));
          } catch (error) {
            console.error("Erro ao buscar dashboard stats:", error);
          }

          // Buscar lotes recentes
          try {
            const batchesRes = await api.get("/batches");
            const batches = batchesRes.data || [];
            setRecentBatches(batches.slice(0, 5));

            const totalCO2FromBatches = batches.reduce(
              (sum: number, batch: Batch) => sum + (batch.co2Emitted || 0),
              0,
            );
            const onChainBatches = batches.filter(
              (b: Batch) =>
                b.status === "COMPLETED" ||
                b.status === "ON_CHAIN" ||
                b.status === "BLOCKCHAIN",
            ).length;

            setStats((prev) => ({
              ...prev,
              totalBatches: batches.length,
              totalCO2: totalCO2FromBatches,
              onChainBatches,
              complianceScore:
                batches.length > 0
                  ? Math.round((onChainBatches / batches.length) * 100)
                  : prev.complianceScore,
            }));
          } catch (error) {
            console.error("Erro ao buscar lotes:", error);
          }
        }

        // Para OPERATOR - buscar documentos pendentes
        if (role === "OPERATOR") {
          try {
            const pendingDocsRes = await api.get("/documents/pending");
            const pendingDocs = pendingDocsRes.data || [];
            setStats((prev) => ({
              ...prev,
              pendingDocuments: pendingDocs.length,
            }));
          } catch (error) {
            console.error("Erro ao buscar documentos pendentes:", error);
          }
        }

        // Para SUPPLIER - buscar documentos do fornecedor
        if (role === "SUPPLIER" && user.companyId) {
          try {
            const docsRes = await api.get("/documents", {
              params: { supplierId: user.companyId },
            });
            const docs = docsRes.data || [];
            const pendingDocs = docs.filter(
              (d: any) => d.processingStatus === "PENDING",
            );
            setStats((prev) => ({
              ...prev,
              totalBatches: docs.length,
              pendingDocuments: pendingDocs.length,
            }));
          } catch (error) {
            console.error("Erro ao buscar documentos do fornecedor:", error);
          }
        }
      } catch (error) {
        console.error("Erro ao carregar dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated && user) {
      fetchDashboardData();
    }
  }, [isAuthenticated, user]);

  if (!initialized || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  const handleGoToModule = () => {
    if (user?.role && roleRoutes[user.role]) {
      router.push(roleRoutes[user.role]);
    } else {
      router.push("/");
    }
  };

  const getRoleBadgeColor = (role: string) => {
    const colors: Record<string, string> = {
      SUPPLIER: "bg-emerald-100 text-emerald-800",
      OPERATOR: "bg-blue-100 text-blue-800",
      SPECIALIST: "bg-purple-100 text-purple-800",
      MANAGER: "bg-amber-100 text-amber-800",
      ADMIN: "bg-red-100 text-red-800",
    };
    return colors[role] || "bg-gray-100 text-gray-800";
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      DRAFT: "bg-gray-100 text-gray-600",
      PROCESSING: "bg-blue-100 text-blue-600",
      AWAITING_REVIEW: "bg-yellow-100 text-yellow-600",
      VALIDATED: "bg-green-100 text-green-600",
      REJECTED: "bg-red-100 text-red-600",
      COMPLETED: "bg-emerald-100 text-emerald-600",
      ON_CHAIN: "bg-purple-100 text-purple-600",
      BLOCKCHAIN: "bg-indigo-100 text-indigo-600",
      ERROR: "bg-red-100 text-red-600",
    };
    return colors[status] || "bg-gray-100 text-gray-600";
  };

  return (
    <div className="min-h-screen bg-slate-100">
      {/* HEADER */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-lg">
                <Leaf className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">
                  CarbonChain ESG
                </h1>
                <p className="text-xs text-gray-500">
                  Monitoramento de carbono e blockchain
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Pesquisar..."
                  className="w-72 bg-gray-50 pl-10 border-gray-200"
                />
              </div>

              <Button variant="outline" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                {stats.pendingDocuments > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center">
                    {stats.pendingDocuments > 9 ? "9+" : stats.pendingDocuments}
                  </span>
                )}
              </Button>

              <Avatar>
                <AvatarFallback className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white">
                  {user.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <button
                onClick={logout}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sair</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Saudação e Perfil */}
        <div className="mb-8 flex flex-wrap justify-between items-start gap-4">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Olá, {user.name.split(" ")[0]}! 👋
            </h2>
            <p className="text-gray-600">
              Bem-vindo de volta ao seu painel de controle
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Badge
              className={cn(
                "px-4 py-2 text-sm font-semibold",
                getRoleBadgeColor(user.role),
              )}
            >
              {roleNames[user.role] || user.role}
            </Badge>
            <Button
              onClick={handleGoToModule}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
            >
              Ir para módulo principal
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Cards do Perfil do Usuário */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="rounded-xl shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <User className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Nome</p>
                  <p className="font-medium text-gray-800 truncate">
                    {user.name}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Mail className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">E-mail</p>
                  <p className="font-medium text-gray-800 truncate">
                    {user.email}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <Briefcase className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Perfil</p>
                  <p className="font-medium text-gray-800">
                    {roleNames[user.role] || user.role}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {user.companyName && (
            <Card className="rounded-xl shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <Building2 className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Empresa</p>
                    <p className="font-medium text-gray-800 truncate">
                      {user.companyName}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* KPI CARDS */}
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <Card className="rounded-xl shadow-sm">
            <CardContent className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">
                    {user.role === "SUPPLIER"
                      ? "Documentos enviados"
                      : "Lotes monitorados"}
                  </p>
                  <h2 className="text-3xl font-bold text-slate-800">
                    {stats.totalBatches}
                  </h2>
                </div>
                <div className="rounded-xl bg-blue-100 p-3">
                  <Boxes className="text-blue-600" />
                </div>
              </div>
              {stats.onChainBatches > 0 && (
                <Badge className="bg-green-100 text-green-700">
                  {stats.onChainBatches} na blockchain
                </Badge>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-xl shadow-sm">
            <CardContent className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">CO₂ emitido</p>
                  <h2 className="text-3xl font-bold text-slate-800">
                    {stats.totalCO2.toFixed(2)} t
                  </h2>
                </div>
                <div className="rounded-xl bg-red-100 p-3">
                  <Leaf className="text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl shadow-sm">
            <CardContent className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Score médio ESG</p>
                  <h2 className="text-3xl font-bold text-slate-800">
                    {stats.complianceScore}%
                  </h2>
                </div>
                <div className="rounded-xl bg-green-100 p-3">
                  <ShieldCheck className="text-green-600" />
                </div>
              </div>
              <Progress value={stats.complianceScore} className="h-2" />
            </CardContent>
          </Card>

          <Card className="rounded-xl shadow-sm">
            <CardContent className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">
                    {user.role === "OPERATOR" || user.role === "SPECIALIST"
                      ? "Documentos pendentes"
                      : user.role === "SUPPLIER"
                        ? "Em processamento"
                        : "Fornecedores ativos"}
                  </p>
                  <h2 className="text-3xl font-bold text-slate-800">
                    {user.role === "OPERATOR" || user.role === "SPECIALIST"
                      ? stats.pendingDocuments
                      : user.role === "SUPPLIER"
                        ? stats.pendingDocuments
                        : stats.totalSuppliers}
                  </h2>
                </div>
                <div className="rounded-xl bg-yellow-100 p-3">
                  <AlertTriangle className="text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* TABELA DE LOTES RECENTES */}
        {(user.role === "MANAGER" ||
          user.role === "ADMIN" ||
          user.role === "SPECIALIST") && (
          <Card className="rounded-xl shadow-sm">
            <CardContent className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-800">
                  Últimos lotes
                </h3>
                <Button variant="outline" onClick={handleGoToModule}>
                  Ver todos
                </Button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-slate-500">
                      <th className="pb-3 font-medium">Lote</th>
                      <th className="pb-3 font-medium">Produto</th>
                      <th className="pb-3 font-medium">CO₂ (t)</th>
                      <th className="pb-3 font-medium">Status</th>
                      <th className="pb-3 font-medium">Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentBatches.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="py-8 text-center text-gray-500"
                        >
                          Nenhum lote encontrado
                        </td>
                      </tr>
                    ) : (
                      recentBatches.map((batch) => (
                        <tr
                          key={batch.id}
                          className="border-b transition hover:bg-slate-50"
                        >
                          <td className="py-4 font-medium text-slate-700">
                            {batch.batchId}
                          </td>
                          <td className="py-4">{batch.productName}</td>
                          <td className="py-4">
                            {batch.co2Emitted?.toFixed(2) || "0"} t
                          </td>
                          <td className="py-4">
                            <Badge className={getStatusColor(batch.status)}>
                              {batch.status}
                            </Badge>
                          </td>
                          <td className="py-4 text-gray-500">
                            {format(new Date(batch.createdAt), "dd/MM/yyyy", {
                              locale: ptBR,
                            })}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Seção de Boas-vindas para usuários sem dados */}
        {stats.totalBatches === 0 && stats.pendingDocuments === 0 && (
          <Card className="rounded-xl shadow-sm mt-6">
            <CardContent className="p-8 text-center">
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShieldCheck className="w-10 h-10 text-emerald-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                Bem-vindo ao CarbonChain ESG
              </h3>
              <p className="text-gray-500 max-w-md mx-auto">
                Clique no botão Ir para módulo principal para começar a usar o
                sistema.
              </p>
              <Button
                onClick={handleGoToModule}
                className="mt-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
              >
                Acessar Módulo Principal
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
