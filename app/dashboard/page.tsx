/* eslint-disable @typescript-eslint/no-explicit-any */
// app/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import {
  User,
  Mail,
  Building2,
  Briefcase,
  LogOut,
  Bell,
  Boxes,
  Leaf,
  ShieldCheck,
  AlertTriangle,
  Search,
  ArrowRight,
  Loader2,
  TrendingDown,
  CheckCircle,
  XCircle,
  Award,
  ExternalLink,
  Hash,
  Clock,
  TrendingUp,
  Database,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import api from "@/services/api";
import { cn } from "@/lib/utils";

// Mapeamento de roles para rotas
const roleRoutes: Record<string, string> = {
  SUPPLIER: "/supplier/documents",
  OPERATOR: "/operator/documents",
  SPECIALIST: "/specialist/documents",
  MANAGER: "/dashboard",
  ADMIN: "/admin/dashboard",
};

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
  productDescription?: string;
  quantity: number;
  unit: string;
  co2Emitted: number;
  co2PerUnit?: number;
  status: string;
  companyId?: string;
  company?: { id: string; name: string; cnpj?: string };
  supplierName?: string;
  createdAt: string;
  updatedAt: string;
  txHash?: string;
  blockchainTxHash?: string;
  blockNumber?: number;
  verifiedAt?: string;
}

interface Document {
  id: string;
  originalName: string;
  processingStatus: string;
  confidenceScore?: number;
  uploadedAt: string;
  supplier: { id: string; name: string; cnpj: string };
  batch?: { batchId: string; productName: string };
}

interface DashboardData {
  totalBatches: number;
  totalCO2: number;
  averageCO2: number;
  compliantBatches: number;
  nonCompliantBatches: number;
  complianceRate: number;
  totalSuppliers: number;
  onChainBatches: number;
  recentTransactions: Batch[];
  topSuppliers: Array<{
    supplierName: string;
    totalCO2: number;
    batchCount: number;
    complianceRate: number;
  }>;
  emissionsTrend?: {
    currentPeriod: number;
    previousPeriod: number;
    percentageChange: number;
  };
}

export default function DashboardPage() {
  const { user, logout, isAuthenticated, initialized } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    totalBatches: 0,
    totalCO2: 0,
    averageCO2: 0,
    compliantBatches: 0,
    nonCompliantBatches: 0,
    complianceRate: 0,
    totalSuppliers: 0,
    onChainBatches: 0,
    recentTransactions: [],
    topSuppliers: [],
  });
  const [pendingDocuments, setPendingDocuments] = useState(0);
  const [recentBatches, setRecentBatches] = useState<Batch[]>([]);

  useEffect(() => {
    if (initialized && !isAuthenticated) {
      router.push("/login");
    }
  }, [initialized, isAuthenticated, router]);

  useEffect(() => {
    const fetchRealData = async () => {
      if (!user) return;

      try {
        setLoading(true);
        const role = user.role;

        // Para todos os roles, buscar lotes (dados reais)
        try {
          const batchesRes = await api.get("/batches");
          const batches: Batch[] = batchesRes.data || [];

          // Calcular métricas reais
          const totalBatches = batches.length;
          const totalCO2 = batches.reduce(
            (sum, b) => sum + (b.co2Emitted || 0),
            0,
          );
          const averageCO2 = totalBatches > 0 ? totalCO2 / totalBatches : 0;

          const compliantBatches = batches.filter(
            (b) =>
              b.status === "COMPLETED" ||
              b.status === "ON_CHAIN" ||
              b.status === "BLOCKCHAIN" ||
              b.status === "VALIDATED",
          ).length;

          const nonCompliantBatches = batches.filter(
            (b) =>
              b.status === "PENDING" ||
              b.status === "REJECTED" ||
              b.status === "ERROR",
          ).length;

          const complianceRate =
            totalBatches > 0 ? (compliantBatches / totalBatches) * 100 : 0;

          const onChainBatches = batches.filter(
            (b) => b.status === "ON_CHAIN" || b.status === "BLOCKCHAIN",
          ).length;

          // Fornecedores únicos
          const uniqueSuppliers = new Map();
          batches.forEach((batch) => {
            const supplierName =
              batch.company?.name || batch.supplierName || "Desconhecido";
            if (!uniqueSuppliers.has(supplierName)) {
              uniqueSuppliers.set(supplierName, {
                supplierName,
                totalCO2: 0,
                batchCount: 0,
                compliantCount: 0,
              });
            }
            const supplier = uniqueSuppliers.get(supplierName);
            supplier.totalCO2 += batch.co2Emitted || 0;
            supplier.batchCount += 1;
            if (
              batch.status === "COMPLETED" ||
              batch.status === "ON_CHAIN" ||
              batch.status === "BLOCKCHAIN"
            ) {
              supplier.compliantCount += 1;
            }
          });

          const topSuppliers = Array.from(uniqueSuppliers.values())
            .map((s) => ({
              supplierName: s.supplierName,
              totalCO2: s.totalCO2,
              batchCount: s.batchCount,
              complianceRate:
                s.batchCount > 0 ? (s.compliantCount / s.batchCount) * 100 : 0,
            }))
            .sort((a, b) => b.totalCO2 - a.totalCO2)
            .slice(0, 3);

          // Transações recentes (com hash blockchain)
          const recentTransactions = batches
            .filter((b) => b.txHash || b.blockchainTxHash)
            .sort(
              (a, b) =>
                new Date(b.createdAt).getTime() -
                new Date(a.createdAt).getTime(),
            )
            .slice(0, 5);

          setDashboardData({
            totalBatches,
            totalCO2,
            averageCO2,
            compliantBatches,
            nonCompliantBatches,
            complianceRate,
            totalSuppliers: uniqueSuppliers.size,
            onChainBatches,
            recentTransactions,
            topSuppliers,
          });

          setRecentBatches(batches.slice(0, 5));
        } catch (error) {
          console.error("Erro ao buscar lotes:", error);
        }

        // Para OPERATOR e SPECIALIST - buscar documentos pendentes
        if (role === "OPERATOR" || role === "SPECIALIST") {
          try {
            const pendingDocsRes = await api.get("/documents/pending");
            const pendingDocs = pendingDocsRes.data || [];
            setPendingDocuments(pendingDocs.length);
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
            const pending = docs.filter(
              (d: Document) => d.processingStatus === "PENDING",
            );
            setPendingDocuments(pending.length);
          } catch (error) {
            console.error("Erro ao buscar documentos:", error);
          }
        }
      } catch (error) {
        console.error("Erro ao carregar dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated && user) {
      fetchRealData();
    }
  }, [isAuthenticated, user]);

  // Função para navegar para página de consulta blockchain
  const handleConsultBlockchain = (batchId: string) => {
    router.push(`/blockchain/verify/${encodeURIComponent(batchId)}`);
  };

  if (!initialized || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <Loader2
          className="w-8 h-8 animate-spin"
          style={{ color: "#134B8A" }}
        />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <Loader2
          className="w-8 h-8 animate-spin"
          style={{ color: "#134B8A" }}
        />
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

  const formatTxHash = (hash?: string) => {
    if (!hash) return "—";
    return `${hash.substring(0, 8)}...${hash.substring(hash.length - 6)}`;
  };

  const getTimeAgo = (date: string) => {
    return formatDistanceToNow(new Date(date), {
      addSuffix: true,
      locale: ptBR,
    });
  };

  return (
    <TooltipProvider>
      <>
        <style jsx global>{`
          @keyframes fadeUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          @keyframes blob {
            0% {
              transform: translate(0px, 0px) scale(1);
            }
            33% {
              transform: translate(30px, -50px) scale(1.1);
            }
            66% {
              transform: translate(-20px, 20px) scale(0.9);
            }
            100% {
              transform: translate(0px, 0px) scale(1);
            }
          }

          .animate-fade-up {
            animation: fadeUp 0.6s ease-out forwards;
          }

          .animate-blob {
            animation: blob 7s infinite;
          }

          .animation-delay-100 {
            animation-delay: 100ms;
          }
          .animation-delay-200 {
            animation-delay: 200ms;
          }
          .animation-delay-300 {
            animation-delay: 300ms;
          }
          .animation-delay-400 {
            animation-delay: 400ms;
          }
          .animation-delay-500 {
            animation-delay: 500ms;
          }

          @media (prefers-reduced-motion: reduce) {
            .animate-fade-up,
            .animate-blob {
              animation: none;
            }
          }
        `}</style>

        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 relative overflow-hidden">
          {/* Gradient Orbs */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div
              className="absolute -top-40 -right-40 w-80 h-80 rounded-full filter blur-3xl opacity-20 animate-blob"
              style={{ backgroundColor: "#0A2540" }}
            />
            <div
              className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full filter blur-3xl opacity-20 animate-blob animation-delay-100"
              style={{ backgroundColor: "#1E6B6B" }}
            />
            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full filter blur-3xl opacity-20 animate-blob animation-delay-200"
              style={{ backgroundColor: "#7C3AED" }}
            />
          </div>

          {/* HEADER com Glassmorphism */}
          <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-40">
            <div className="max-w-7xl mx-auto px-6 py-4">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex items-center gap-3 animate-fade-up">
                  <div
                    className="p-2 rounded-lg"
                    style={{
                      background: "linear-gradient(135deg, #0A2540, #1E6B6B)",
                    }}
                  >
                    <Leaf className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                      CarbonChain ESG
                    </h1>
                    <p className="text-xs text-gray-500">
                      Rastreabilidade e Blockchain
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 animate-fade-up animation-delay-100">
                  <div className="relative hidden md:block">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Pesquisar..."
                      className="w-64 bg-white/50 border-2 border-gray-200 focus:border-[#134B8A] focus:ring-2 focus:ring-[#134B8A] focus:ring-offset-2 pl-9"
                    />
                  </div>

                  <Button
                    variant="outline"
                    size="icon"
                    className="relative border-2 border-gray-200 hover:border-[#134B8A] transition-all"
                  >
                    <Bell className="h-5 w-5 text-gray-600" />
                    {pendingDocuments > 0 && (
                      <span
                        className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[10px] text-white flex items-center justify-center"
                        style={{ backgroundColor: "#DC2626" }}
                      >
                        {pendingDocuments > 9 ? "9+" : pendingDocuments}
                      </span>
                    )}
                  </Button>

                  <Avatar className="ring-2 ring-[#1E6B6B] ring-offset-2">
                    <AvatarFallback
                      style={{
                        background: "linear-gradient(135deg, #0A2540, #1E6B6B)",
                      }}
                      className="text-white"
                    >
                      {user.name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <button
                    onClick={logout}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-white transition-all hover:scale-105 focus:ring-2 focus:ring-offset-2"
                    style={{ backgroundColor: "#DC2626" }}
                  >
                    <LogOut className="h-4 w-4" />
                    <span className="hidden sm:inline font-semibold">Sair</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-6 py-8">
            {/* Saudação e Perfil */}
            <div className="mb-8 flex flex-wrap justify-between items-start gap-4 animate-fade-up">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">
                  Olá, {user.name.split(" ")[0]}! 👋
                </h2>
                <p className="text-gray-600">
                  Bem-vindo ao seu painel de controle ESG
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
                  className="relative overflow-hidden group transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-[1.02] focus:ring-2 focus:ring-offset-2"
                  style={{
                    background: "linear-gradient(135deg, #0A2540, #1E6B6B)",
                  }}
                >
                  <span className="relative z-10 flex items-center">
                    Ir para módulo principal
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </span>
                  <span className="absolute inset-0 -translate-x-full group-hover:translate-x-0 transition-transform duration-500 bg-gradient-to-r from-white/20 to-transparent" />
                </Button>
              </div>
            </div>

            {/* Cards do Perfil do Usuário */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 animate-fade-up animation-delay-100">
              {[
                {
                  icon: User,
                  label: "Nome",
                  value: user.name,
                  color: "#134B8A",
                  bg: "#134B8A10",
                },
                {
                  icon: Mail,
                  label: "E-mail",
                  value: user.email,
                  color: "#7C3AED",
                  bg: "#7C3AED10",
                },
                {
                  icon: Briefcase,
                  label: "Perfil",
                  value: roleNames[user.role] || user.role,
                  color: "#059669",
                  bg: "#05966910",
                },
                ...(user.companyName
                  ? [
                      {
                        icon: Building2,
                        label: "Empresa",
                        value: user.companyName,
                        color: "#F59E0B",
                        bg: "#F59E0B10",
                      },
                    ]
                  : []),
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-xl border-2 border-gray-200 p-4 transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="p-2 rounded-lg"
                      style={{ backgroundColor: item.bg }}
                    >
                      <item.icon
                        className="h-4 w-4"
                        style={{ color: item.color }}
                      />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-semibold">
                        {item.label}
                      </p>
                      <p className="font-semibold text-gray-800 truncate max-w-[180px]">
                        {item.value}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* MÉTRICAS PRINCIPAIS - DADOS REAIS */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              {/* Carbono (CO₂) */}
              <div className="bg-white rounded-xl border-2 border-gray-200 p-5 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 animate-fade-up animation-delay-200">
                <div className="flex items-center justify-between mb-3">
                  <div
                    className="p-2 rounded-lg"
                    style={{ backgroundColor: "#1E6B6B10" }}
                  >
                    <Leaf className="w-5 h-5" style={{ color: "#1E6B6B" }} />
                  </div>
                  {dashboardData.emissionsTrend?.percentageChange &&
                  dashboardData.emissionsTrend.percentageChange < 0 ? (
                    <TrendingDown
                      className="w-4 h-4"
                      style={{ color: "#059669" }}
                    />
                  ) : (
                    <TrendingUp
                      className="w-4 h-4"
                      style={{ color: "#F59E0B" }}
                    />
                  )}
                </div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  CARBONO (CO₂)
                </p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {dashboardData.totalCO2.toFixed(0)}{" "}
                  <span className="text-lg font-normal text-gray-500">kg</span>
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Média: {dashboardData.averageCO2.toFixed(0)} kg
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <div
                    className="flex-1 h-1.5 rounded-full"
                    style={{ backgroundColor: "#E5E7EB" }}
                  >
                    <div
                      className="h-1.5 rounded-full"
                      style={{
                        width: `${Math.min(100, (dashboardData.totalCO2 / 100000) * 100)}%`,
                        backgroundColor: "#1E6B6B",
                      }}
                    />
                  </div>
                  {dashboardData.emissionsTrend?.percentageChange && (
                    <span
                      className="text-xs font-semibold"
                      style={{
                        color:
                          dashboardData.emissionsTrend.percentageChange < 0
                            ? "#059669"
                            : "#DC2626",
                      }}
                    >
                      {dashboardData.emissionsTrend.percentageChange > 0
                        ? "+"
                        : ""}
                      {dashboardData.emissionsTrend.percentageChange}%
                    </span>
                  )}
                </div>
              </div>

              {/* Conformidade */}
              <div className="bg-white rounded-xl border-2 border-gray-200 p-5 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 animate-fade-up animation-delay-300">
                <div className="flex items-center justify-between mb-3">
                  <div
                    className="p-2 rounded-lg"
                    style={{ backgroundColor: "#05966910" }}
                  >
                    <ShieldCheck
                      className="w-5 h-5"
                      style={{ color: "#059669" }}
                    />
                  </div>
                  {dashboardData.complianceRate >= 80 ? (
                    <Badge className="bg-emerald-100 text-emerald-700 text-xs">
                      ▲ Alto
                    </Badge>
                  ) : dashboardData.complianceRate >= 60 ? (
                    <Badge className="bg-yellow-100 text-yellow-700 text-xs">
                      ● Médio
                    </Badge>
                  ) : (
                    <Badge className="bg-red-100 text-red-700 text-xs">
                      ▼ Baixo
                    </Badge>
                  )}
                </div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  CONFORMIDADE
                </p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {dashboardData.compliantBatches}{" "}
                  <span className="text-lg font-normal text-gray-500">
                    / {dashboardData.totalBatches}
                  </span>
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Não conformes: {dashboardData.nonCompliantBatches}
                </p>
                <div className="mt-3">
                  <Progress
                    value={dashboardData.complianceRate}
                    className="h-1.5"
                    style={{ backgroundColor: "#E5E7EB" }}
                  />
                  <p
                    className="text-xs font-semibold mt-2"
                    style={{
                      color:
                        dashboardData.complianceRate >= 80
                          ? "#059669"
                          : dashboardData.complianceRate >= 60
                            ? "#F59E0B"
                            : "#DC2626",
                    }}
                  >
                    Taxa: {dashboardData.complianceRate.toFixed(1)}%
                  </p>
                </div>
              </div>

              {/* Fornecedores */}
              <div className="bg-white rounded-xl border-2 border-gray-200 p-5 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 animate-fade-up animation-delay-400">
                <div className="flex items-center justify-between mb-3">
                  <div
                    className="p-2 rounded-lg"
                    style={{ backgroundColor: "#7C3AED10" }}
                  >
                    <Building2
                      className="w-5 h-5"
                      style={{ color: "#7C3AED" }}
                    />
                  </div>
                </div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  FORNECEDORES
                </p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {dashboardData.totalSuppliers}
                </p>
                <div className="mt-3 space-y-2">
                  {dashboardData.topSuppliers.map((supplier) => (
                    <div
                      key={supplier.supplierName}
                      className="flex justify-between items-center"
                    >
                      <span className="text-sm font-medium text-gray-700 truncate max-w-[120px]">
                        {supplier.supplierName}
                      </span>
                      <span
                        className="text-sm font-bold"
                        style={{ color: "#1E6B6B" }}
                      >
                        {supplier.totalCO2.toFixed(0)}kg
                      </span>
                    </div>
                  ))}
                  {dashboardData.topSuppliers.length === 0 && (
                    <p className="text-sm text-gray-400 text-center py-2">
                      Nenhum fornecedor
                    </p>
                  )}
                </div>
              </div>

              {/* Nota ESG */}
              <div className="bg-white rounded-xl border-2 border-gray-200 p-5 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 animate-fade-up animation-delay-500">
                <div className="flex items-center justify-between mb-3">
                  <div
                    className="p-2 rounded-lg"
                    style={{ backgroundColor: "#F59E0B10" }}
                  >
                    <Award className="w-5 h-5" style={{ color: "#F59E0B" }} />
                  </div>
                </div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  NOTA ESG
                </p>
                <div className="mt-3 space-y-2">
                  {dashboardData.topSuppliers.map((supplier) => {
                    const esgScore =
                      supplier.complianceRate * 0.5 +
                      (supplier.totalCO2 > 5000 ? 20 : 80) * 0.5;
                    const score = Math.min(
                      5,
                      Math.max(0, (esgScore / 100) * 5),
                    );
                    const isHighRisk = supplier.complianceRate < 50;

                    return (
                      <div
                        key={supplier.supplierName}
                        className="flex justify-between items-center"
                      >
                        <span className="text-sm font-medium text-gray-700 truncate max-w-[120px]">
                          {supplier.supplierName}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-gray-800">
                            ({score.toFixed(1)})
                          </span>
                          {isHighRisk && (
                            <span
                              className="text-xs font-semibold px-2 py-0.5 rounded-full"
                              style={{
                                backgroundColor: "#DC262610",
                                color: "#DC2626",
                              }}
                            >
                              precisa agir
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {dashboardData.topSuppliers.length === 0 && (
                    <p className="text-sm text-gray-400 text-center py-2">
                      Sem dados
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* TABELA DE REGISTROS NA BLOCKCHAIN - COM NOVA COLUNA CONSULTAR DADOS */}
            {(user.role === "MANAGER" ||
              user.role === "ADMIN" ||
              user.role === "SPECIALIST") && (
              <div className="animate-fade-up animation-delay-[600ms]">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div
                      className="p-1.5 rounded-lg"
                      style={{ backgroundColor: "#7C3AED10" }}
                    >
                      <Hash className="w-4 h-4" style={{ color: "#7C3AED" }} />
                    </div>
                    <h3 className="text-lg font-bold text-gray-800">
                      REGISTROS NA BLOCKCHAIN
                    </h3>
                  </div>
                  <p className="text-xs text-gray-500">Últimas transações</p>
                </div>

                <div className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr
                          className="border-b-2 border-gray-200"
                          style={{ backgroundColor: "#F8FAFC" }}
                        >
                          <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">
                            LOTE
                          </th>
                          <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">
                            FORNECEDOR
                          </th>
                          <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">
                            EMISSÕES
                          </th>
                          <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">
                            CONFORMIDADE
                          </th>
                          <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">
                            HASH (TX)
                          </th>
                          <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">
                            TEMPO
                          </th>
                          <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">
                            AÇÕES
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {dashboardData.recentTransactions.length === 0 ? (
                          <tr>
                            <td
                              colSpan={7}
                              className="px-5 py-8 text-center text-gray-500"
                            >
                              Nenhum registro na blockchain encontrado
                            </td>
                          </tr>
                        ) : (
                          dashboardData.recentTransactions.map((batch) => {
                            const isCompliant =
                              batch.status === "COMPLETED" ||
                              batch.status === "ON_CHAIN" ||
                              batch.status === "BLOCKCHAIN" ||
                              batch.status === "VALIDATED";
                            const txHash =
                              batch.txHash || batch.blockchainTxHash;

                            return (
                              <tr
                                key={batch.id}
                                className="border-b border-gray-100 transition-all hover:bg-gray-50"
                              >
                                <td className="px-5 py-3 font-mono text-xs font-bold text-gray-800">
                                  {batch.batchId}
                                </td>
                                <td className="px-5 py-3 font-medium text-gray-700">
                                  {batch.company?.name ||
                                    batch.supplierName ||
                                    "Desconhecido"}
                                </td>
                                <td
                                  className="px-5 py-3 font-semibold"
                                  style={{ color: "#1E6B6B" }}
                                >
                                  {batch.co2Emitted?.toFixed(0) || 0}kg CO₂
                                </td>
                                <td className="px-5 py-3">
                                  {isCompliant ? (
                                    <span
                                      className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold"
                                      style={{
                                        backgroundColor: "#05966910",
                                        color: "#059669",
                                      }}
                                    >
                                      <CheckCircle className="w-3 h-3" />{" "}
                                      Conforme
                                    </span>
                                  ) : (
                                    <span
                                      className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold"
                                      style={{
                                        backgroundColor: "#DC262610",
                                        color: "#DC2626",
                                      }}
                                    >
                                      <XCircle className="w-3 h-3" /> Não conf
                                    </span>
                                  )}
                                </td>
                                <td className="px-5 py-3">
                                  <code className="text-xs font-mono text-gray-600 bg-gray-100 px-2 py-1 rounded">
                                    {formatTxHash(txHash)}
                                  </code>
                                </td>
                                <td className="px-5 py-3">
                                  <div className="flex items-center gap-1 text-xs text-gray-500">
                                    <Clock className="w-3 h-3" />
                                    {getTimeAgo(batch.createdAt)}
                                  </div>
                                </td>
                                <td className="px-5 py-3">
                                  <div className="flex items-center gap-2">
                                    {/* Botão Consultar Dados com Tooltip */}
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <button
                                          onClick={() =>
                                            handleConsultBlockchain(
                                              batch.batchId,
                                            )
                                          }
                                          className="p-2 rounded-lg transition-all duration-200 flex items-center gap-1.5 font-medium text-sm"
                                          style={{
                                            backgroundColor: "#7C3AED10",
                                            color: "#7C3AED",
                                          }}
                                          onMouseEnter={(e) => {
                                            e.currentTarget.style.backgroundColor =
                                              "#7C3AED20";
                                          }}
                                          onMouseLeave={(e) => {
                                            e.currentTarget.style.backgroundColor =
                                              "#7C3AED10";
                                          }}
                                        >
                                          <Database className="w-3.5 h-3.5" />
                                          <span className="hidden sm:inline">
                                            Consultar
                                          </span>
                                        </button>
                                      </TooltipTrigger>
                                      <TooltipContent
                                        side="left"
                                        className="px-3 py-2 text-sm font-medium"
                                        style={{
                                          backgroundColor: "#0A2540",
                                          color: "white",
                                          border: "none",
                                        }}
                                      >
                                        <div className="flex items-center gap-2">
                                          <Database className="w-3.5 h-3.5" />
                                          <span>
                                            Consultar dados imutáveis na
                                            blockchain
                                          </span>
                                        </div>
                                      </TooltipContent>
                                    </Tooltip>

                                    {/* Link do Etherscan */}
                                    {txHash && (
                                      <a
                                        href={`https://sepolia.etherscan.io/tx/${txHash}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-1.5 rounded-lg transition-all hover:bg-gray-100 inline-block"
                                        title="Ver no Etherscan"
                                      >
                                        <ExternalLink className="w-4 h-4 text-gray-400" />
                                      </a>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Seção de Boas-vindas para usuários sem dados */}
            {dashboardData.totalBatches === 0 && pendingDocuments === 0 && (
              <div className="mt-8 animate-fade-up animation-delay-300">
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl border-2 border-gray-200 p-8 text-center">
                  <div
                    className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"
                    style={{ backgroundColor: "#1E6B6B10" }}
                  >
                    <ShieldCheck
                      className="w-10 h-10"
                      style={{ color: "#1E6B6B" }}
                    />
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">
                    Bem-vindo ao CarbonChain ESG
                  </h3>
                  <p className="text-gray-500 max-w-md mx-auto">
                    Clique no botão abaixo para começar a usar o sistema
                  </p>
                  <Button
                    onClick={handleGoToModule}
                    className="mt-4 relative overflow-hidden group transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-[1.02]"
                    style={{
                      background: "linear-gradient(135deg, #0A2540, #1E6B6B)",
                    }}
                  >
                    <span className="relative z-10 flex items-center">
                      Acessar Módulo Principal
                      <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </span>
                    <span className="absolute inset-0 -translate-x-full group-hover:translate-x-0 transition-transform duration-500 bg-gradient-to-r from-white/20 to-transparent" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </>
    </TooltipProvider>
  );
}
