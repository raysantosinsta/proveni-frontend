/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/specialist/documents/page.tsx
"use client";

import { useEffect, useState } from "react";
import {
  FileText,
  CheckCircle,
  XCircle,
  Loader2,
  Search,
  Building2,
  Calendar,
  Shield,
  Award,
  AlertTriangle,
  ChevronRight,
  TrendingUp,
  Leaf,
  Clock,
  UserCheck,
  FileCheck,
  ArrowRight,
  Boxes,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import api from "@/services/api";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

// ✅ Interface para declarar o window.ethereum
declare global {
  interface Window {
    ethereum?: {
      isMetaMask?: boolean;
      request: (args: {
        method: string;
        params?: unknown[];
      }) => Promise<unknown>;
    };
  }
}

interface Document {
  id: string;
  originalName: string;
  processingStatus: string;
  extractedData?: any;
  uploadedAt: string;
  supplier: { name: string; cnpj: string };
  batch: { batchId: string; productName: string };
  validatedBy?: { name: string };
}

export default function SpecialistDocumentsPage() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [registering, setRegistering] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [reason, setReason] = useState("");
  const [metaMaskInstalled, setMetaMaskInstalled] = useState(false);
  const [metaMaskConnected, setMetaMaskConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ Verificar MetaMask ao carregar a página
  useEffect(() => {
    const checkMetaMask = () => {
      const hasMetaMask =
        typeof window !== "undefined" && window.ethereum?.isMetaMask === true;
      setMetaMaskInstalled(hasMetaMask);

      if (!hasMetaMask) {
        console.warn("MetaMask não detectado");
      } else {
        window.ethereum
          ?.request({ method: "eth_accounts" })
          .then((accounts: any) => {
            if (accounts && accounts.length > 0) {
              setMetaMaskConnected(true);
              console.log("✅ MetaMask já conectado:", accounts[0]);
            }
          })
          .catch(console.error);
      }
    };

    checkMetaMask();
  }, []);

  // ✅ Função para conectar ao MetaMask
  const connectMetaMask = async (): Promise<boolean> => {
    if (!metaMaskInstalled) {
      alert(
        "❌ MetaMask não detectado!\n\n" +
          "Para registrar documentos na blockchain, você precisa:\n" +
          "1. Instalar a extensão MetaMask\n" +
          "2. Criar uma carteira\n" +
          "3. Recarregar esta página",
      );
      window.open("https://metamask.io/download/", "_blank");
      return false;
    }

    try {
      const accounts = (await window.ethereum!.request({
        method: "eth_requestAccounts",
      })) as string[];

      if (accounts && accounts.length > 0) {
        setMetaMaskConnected(true);
        console.log("✅ MetaMask conectado com sucesso:", accounts[0]);
        return true;
      }
      return false;
    } catch (error: any) {
      console.error("Erro ao conectar MetaMask:", error);

      if (error.code === 4001) {
        alert("⚠️ Você precisa conectar sua carteira MetaMask para continuar.");
      } else {
        alert("Erro ao conectar ao MetaMask. Verifique se está desbloqueado.");
      }
      return false;
    }
  };

  const fetchDocuments = async () => {
    try {
      setError(null);
      console.log("🔍 Buscando documentos em /documents/awaiting-review...");
      const response = await api.get("/documents/awaiting-review");
      console.log("📄 Documentos recebidos:", response.data);
      console.log(`📊 Total: ${response.data.length} documentos`);

      if (response.data.length === 0) {
        console.log("ℹ️ Nenhum documento aguardando revisão");
      }

      setDocuments(response.data);
    } catch (error: any) {
      console.error("❌ Erro ao buscar documentos:", error);
      setError(error.response?.data?.message || error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleApprove = async () => {
    if (!selectedDoc) return;

    console.log("🚀 Iniciando registro do documento:", selectedDoc.id);
    console.log("📦 Lote associado:", selectedDoc.batch?.batchId);

    const isConnected = await connectMetaMask();
    if (!isConnected) return;

    setRegistering(true);
    setError(null);

    try {
      const payload = {
        notes: reason || "Documento aprovado pelo especialista",
      };

      console.log(
        "📤 Enviando requisição para:",
        `/documents/${selectedDoc.id}/blockchain/register`,
      );
      console.log("📦 Payload:", payload);

      const response = await api.post(
        `/documents/${selectedDoc.id}/blockchain/register`,
        payload,
      );

      console.log("✅ Resposta do servidor:", response.data);
      alert("✅ Documento registrado na blockchain com sucesso!");

      setSelectedDoc(null);
      setReason("");
      await fetchDocuments();
    } catch (error: any) {
      console.error("❌ Erro detalhado no registro:", error);
      console.error("Response data:", error.response?.data);
      console.error("Response status:", error.response?.status);

      const errorMessage = error.response?.data?.message || error.message;
      setError(errorMessage);

      alert(`❌ Erro ao registrar:\n${errorMessage}`);
    } finally {
      setRegistering(false);
    }
  };

  const handleReject = async () => {
    if (!selectedDoc) return;
    if (!reason) {
      alert("Informe o motivo da rejeição");
      return;
    }

    setRegistering(true);
    setError(null);

    try {
      console.log("📤 Rejeitando documento:", selectedDoc.id);
      await api.post(`/documents/${selectedDoc.id}/reject`, { reason });
      alert("✅ Documento rejeitado");
      setSelectedDoc(null);
      setReason("");
      await fetchDocuments();
    } catch (error: any) {
      console.error("❌ Erro ao rejeitar:", error);
      alert(
        `Erro ao rejeitar: ${error.response?.data?.message || error.message}`,
      );
    } finally {
      setRegistering(false);
    }
  };

  const filteredDocs = documents.filter(
    (doc) =>
      doc.originalName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.supplier.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const stats = {
    pending: filteredDocs.length,
    approved: documents.filter((d) => d.processingStatus === "ON_CHAIN").length,
    co2Saved: documents.reduce(
      (acc, doc) => acc + (doc.extractedData?.co2Emitted || 0),
      0,
    ),
  };

  const handleGoToDashboard = () => {
    // Optimistic UI - redirecionamento imediato
    window.location.href = "/specialist/dashboard";
  };

  return (
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

        {/* Header com Glassmorphism */}
        <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-6 py-6">
            <div className="flex justify-between items-center flex-wrap gap-4">
              <div className="animate-fade-up">
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className="p-1.5 rounded-lg"
                    style={{
                      background: "linear-gradient(135deg, #134B8A, #7C3AED)",
                    }}
                  >
                    <Shield className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Especialista Blockchain
                  </span>
                </div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                  Validação Blockchain
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  Análise técnica de documentos para registro imutável
                </p>
              </div>

              <div className="flex items-center gap-3 animate-fade-up animation-delay-100">
                {/* Indicador de status do MetaMask */}
                {!metaMaskInstalled ? (
                  <div
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full"
                    style={{ backgroundColor: "#DC262610" }}
                  >
                    <div
                      className="w-2 h-2 rounded-full animate-pulse"
                      style={{ backgroundColor: "#DC2626" }}
                    />
                    <span
                      className="text-xs font-semibold"
                      style={{ color: "#DC2626" }}
                    >
                      ⚠️ MetaMask não detectado
                    </span>
                  </div>
                ) : metaMaskConnected ? (
                  <div
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full"
                    style={{ backgroundColor: "#05966910" }}
                  >
                    <div
                      className="w-2 h-2 rounded-full animate-pulse"
                      style={{ backgroundColor: "#059669" }}
                    />
                    <span
                      className="text-xs font-semibold"
                      style={{ color: "#059669" }}
                    >
                      🔗 MetaMask Conectado
                    </span>
                  </div>
                ) : (
                  <button
                    onClick={connectMetaMask}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full transition-all hover:scale-105 focus:ring-2 focus:ring-offset-2"
                    style={{ backgroundColor: "#F59E0B20", color: "#F59E0B" }}
                  >
                    <div
                      className="w-2 h-2 rounded-full animate-pulse"
                      style={{ backgroundColor: "#F59E0B" }}
                    />
                    <span className="text-xs font-semibold">
                      🦊 Conectar MetaMask
                    </span>
                  </button>
                )}
                <div
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full"
                  style={{ backgroundColor: "#1E6B6B10" }}
                >
                  <UserCheck
                    className="w-3.5 h-3.5"
                    style={{ color: "#1E6B6B" }}
                  />
                  <span
                    className="text-xs font-semibold"
                    style={{ color: "#1E6B6B" }}
                  >
                    Operação Segura
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-10">
          {/* Hero Section com Progressive Disclosure */}
          <div className="mb-12 text-center animate-fade-up">
            <div
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-4"
              style={{ backgroundColor: "#EDE9FE" }}
            >
              <Award className="w-3 h-3" style={{ color: "#7C3AED" }} />
              <span
                className="text-xs font-semibold"
                style={{ color: "#7C3AED" }}
              >
                Registro Imutável
              </span>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Blockchain para Rastreabilidade
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto mb-8">
              Valide documentos e registre na blockchain garantindo
              transparência e confiança na cadeia de suprimentos
            </p>
            <button
              onClick={handleGoToDashboard}
              className="relative overflow-hidden group transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-[1.02] focus:ring-2 focus:ring-offset-2 text-white rounded-xl px-8 py-3 font-semibold"
              style={{
                background: "linear-gradient(135deg, #0A2540, #1E6B6B)",
              }}
            >
              <span className="relative z-10 flex items-center">
                Acessar Dashboard Completo
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
              <span className="absolute inset-0 -translate-x-full group-hover:translate-x-0 transition-transform duration-500 bg-gradient-to-r from-white/20 to-transparent" />
            </button>
          </div>

          {/* Role-Aware Personalization Card */}
          <div className="mb-10 animate-fade-up animation-delay-100">
            <div
              className={cn(
                "rounded-xl p-6 border transition-all duration-300 hover:shadow-xl hover:-translate-y-1",
                user?.role === "SPECIALIST" && "ring-2 shadow-lg",
                "bg-gradient-to-br from-white to-[#EDE9FE] border-[#EDE9FE]",
              )}
              style={
                user?.role === "SPECIALIST" ? { ringColor: "#134B8A" } : {}
              }
            >
              <div
                className="p-2 rounded-lg w-fit mb-3"
                style={{ backgroundColor: "#EDE9FE" }}
              >
                <Boxes className="h-5 w-5" style={{ color: "#7C3AED" }} />
              </div>
              <h3 className="font-semibold text-gray-800 mb-2 text-lg">
                Especialista - Seu Perfil
              </h3>
              <p className="text-gray-600 text-sm mb-3">
                Você tem autoridade para validar documentos e registrar na
                blockchain
              </p>
              <ul className="space-y-1.5">
                {[
                  "Validação técnica de documentos",
                  "Registro em blockchain via MetaMask",
                  "Análise de emissões de CO₂",
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-2 text-sm text-gray-600"
                  >
                    <CheckCircle
                      className="w-3.5 h-3.5"
                      style={{ color: "#059669" }}
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Cards de Métricas - 8px Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            {[
              {
                label: "Documentos Pendentes",
                value: stats.pending,
                icon: Clock,
                color: "#F59E0B",
                bg: "#F59E0B10",
                desc: "Aguardando validação especializada",
              },
              {
                label: "Total na Blockchain",
                value: stats.approved,
                icon: FileCheck,
                color: "#059669",
                bg: "#05966910",
                desc: "Documentos registrados com sucesso",
              },
              {
                label: "CO₂ Estimado",
                value: `${Math.round(stats.co2Saved)} kg`,
                icon: Leaf,
                color: "#1E6B6B",
                bg: "#1E6B6B10",
                desc: "Emissões mapeadas nos lotes",
              },
            ].map((stat, idx) => (
              <div
                key={idx}
                className="bg-white rounded-xl border-2 border-gray-200 p-5 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 animate-fade-up"
                style={{ animationDelay: `${(idx + 2) * 100}ms` }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm font-semibold">
                      {stat.label}
                    </p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">
                      {stat.value}
                    </p>
                  </div>
                  <div
                    className="p-3 rounded-xl"
                    style={{ backgroundColor: stat.bg }}
                  >
                    <stat.icon
                      className="w-5 h-5"
                      style={{ color: stat.color }}
                    />
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                  <div
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: stat.color }}
                  />
                  <span>{stat.desc}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Mensagem de erro */}
          {error && (
            <div
              className="mb-6 p-4 rounded-xl border-2 animate-fade-up"
              style={{
                backgroundColor: "#DC262610",
                borderColor: "#DC262630",
                color: "#DC2626",
              }}
            >
              <AlertTriangle className="w-4 h-4 inline mr-2" />
              {error}
            </div>
          )}

          {/* Barra de Pesquisa - Alto Contraste */}
          <div className="mb-8 animate-fade-up animation-delay-300">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Buscar por documento ou fornecedor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border-2 border-gray-300 rounded-xl focus:border-[#134B8A] focus:ring-2 focus:ring-[#134B8A] focus:ring-offset-2 focus:outline-none text-gray-900 placeholder-gray-500 font-medium transition-all"
              />
            </div>
          </div>

          {/* Lista de Documentos */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white/80 backdrop-blur-sm rounded-2xl border-2 border-gray-200">
              <Loader2
                className="w-10 h-10 animate-spin mb-4"
                style={{ color: "#134B8A" }}
              />
              <p className="text-gray-600 font-semibold">
                Carregando documentos pendentes...
              </p>
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="text-center py-20 bg-white/80 backdrop-blur-sm rounded-2xl border-2 border-gray-200">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ backgroundColor: "#F3F4F6" }}
              >
                <FileText className="w-10 h-10 text-gray-400" />
              </div>
              <p className="text-gray-600 font-semibold">
                Nenhum documento aguardando revisão
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Todos os documentos foram processados
              </p>
              <button
                onClick={fetchDocuments}
                className="mt-4 text-sm font-semibold transition-all hover:scale-105"
                style={{ color: "#1E6B6B" }}
              >
                🔄 Atualizar lista
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredDocs.map((doc, idx) => (
                <div
                  key={doc.id}
                  onClick={() => setSelectedDoc(doc)}
                  className="group bg-white rounded-xl border-2 border-gray-200 p-5 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-[#1E6B6B] cursor-pointer animate-fade-up"
                  style={{ animationDelay: `${(idx + 4) * 50}ms` }}
                >
                  <div className="flex items-start gap-4 flex-wrap">
                    <div
                      className="p-2.5 rounded-xl transition-colors"
                      style={{ backgroundColor: "#1E6B6B10" }}
                    >
                      <FileText
                        className="w-5 h-5"
                        style={{ color: "#1E6B6B" }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-3 mb-2">
                        <h3 className="font-bold text-gray-900 text-lg">
                          {doc.originalName}
                        </h3>
                        <span
                          className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
                          style={{
                            backgroundColor: "#05966920",
                            color: "#059669",
                          }}
                        >
                          <CheckCircle className="w-3 h-3" />
                          {doc.processingStatus === "VALIDATED"
                            ? "Pré-validado Operador"
                            : doc.processingStatus}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1.5 font-medium">
                          <Building2 className="w-3.5 h-3.5 text-gray-400" />
                          {doc.supplier.name}
                        </span>
                        <span className="flex items-center gap-1.5 font-medium">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                          {format(new Date(doc.uploadedAt), "dd/MM/yyyy", {
                            locale: ptBR,
                          })}
                        </span>
                        <span className="flex items-center gap-1.5 font-medium">
                          <div className="w-1 h-1 bg-gray-400 rounded-full" />
                          Lote: {doc.batch?.batchId || "N/A"}
                        </span>
                        {doc.extractedData?.co2Emitted && (
                          <span
                            className="flex items-center gap-1.5 font-semibold"
                            style={{ color: "#1E6B6B" }}
                          >
                            <Leaf className="w-3.5 h-3.5" />
                            CO₂: {doc.extractedData.co2Emitted} kg
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span
                        className="text-sm font-semibold"
                        style={{ color: "#1E6B6B" }}
                      >
                        Analisar
                      </span>
                      <ChevronRight
                        className="w-4 h-4"
                        style={{ color: "#1E6B6B" }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Modal de Revisão - Alto Contraste */}
          {selectedDoc && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
              <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden animate-in zoom-in duration-300">
                {/* Header do Modal */}
                <div className="p-6 border-b-2 bg-gradient-to-r from-slate-50 to-gray-50 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div
                      className="p-2.5 rounded-xl"
                      style={{
                        background: "linear-gradient(135deg, #134B8A, #7C3AED)",
                      }}
                    >
                      <Shield className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">
                        Revisão Especializada
                      </h2>
                      <p className="text-xs text-gray-500 mt-0.5 font-medium">
                        Análise técnica para registro blockchain
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedDoc(null)}
                    className="p-2 hover:bg-gray-200 rounded-full transition-all focus:ring-2 focus:ring-offset-2 focus:ring-[#134B8A]"
                  >
                    <XCircle className="w-5 h-5 text-gray-500 hover:text-gray-700" />
                  </button>
                </div>

                {/* Conteúdo do Modal */}
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)] space-y-5">
                  {/* Informações do Documento */}
                  <div
                    className="rounded-xl p-5 border-2"
                    style={{
                      backgroundColor: "#F8FAFC",
                      borderColor: "#E5E7EB",
                    }}
                  >
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5" />
                      INFORMAÇÕES DO DOCUMENTO
                    </h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500 text-xs font-semibold">
                          Arquivo
                        </p>
                        <p className="font-bold text-gray-900 mt-0.5">
                          {selectedDoc.originalName}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs font-semibold">
                          Fornecedor
                        </p>
                        <p className="font-bold text-gray-900 mt-0.5">
                          {selectedDoc.supplier.name}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs font-semibold">
                          CNPJ
                        </p>
                        <p className="font-medium text-gray-800 mt-0.5">
                          {selectedDoc.supplier.cnpj}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs font-semibold">
                          Lote / Produto
                        </p>
                        <p className="font-medium text-gray-800 mt-0.5">
                          {selectedDoc.batch?.batchId || "N/A"} •{" "}
                          {selectedDoc.batch?.productName || "N/A"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Dados Extraídos */}
                  {selectedDoc.extractedData && (
                    <div
                      className="rounded-xl p-5 border-2"
                      style={{
                        backgroundColor: "#05966910",
                        borderColor: "#05966930",
                      }}
                    >
                      <h3
                        className="text-xs font-bold uppercase tracking-wide mb-3 flex items-center gap-2"
                        style={{ color: "#059669" }}
                      >
                        <TrendingUp className="w-3.5 h-3.5" />
                        DADOS EXTRAÍOS DO DOCUMENTO
                      </h3>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="rounded-lg p-2.5 bg-white/80">
                          <p className="text-gray-500 text-xs font-semibold">
                            Produto
                          </p>
                          <p className="font-bold text-gray-900 mt-0.5">
                            {selectedDoc.extractedData.productName || "N/A"}
                          </p>
                        </div>
                        <div className="rounded-lg p-2.5 bg-white/80">
                          <p className="text-gray-500 text-xs font-semibold">
                            Quantidade
                          </p>
                          <p className="font-bold text-gray-900 mt-0.5">
                            {selectedDoc.extractedData.quantity || "N/A"}{" "}
                            {selectedDoc.extractedData.unit || ""}
                          </p>
                        </div>
                        <div className="rounded-lg p-2.5 bg-white/80 col-span-2">
                          <p className="text-gray-500 text-xs font-semibold">
                            Emissão de CO₂ Estimada
                          </p>
                          <p
                            className="font-bold mt-0.5 flex items-center gap-1.5"
                            style={{ color: "#1E6B6B" }}
                          >
                            <Leaf className="w-3.5 h-3.5" />
                            {selectedDoc.extractedData.co2Emitted || "N/A"} kg
                            CO₂ equivalente
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Observações - Textarea Alto Contraste */}
                  <div>
                    <label className="block text-sm font-bold text-gray-800 mb-2 flex items-center gap-2">
                      <AlertTriangle
                        className="w-4 h-4"
                        style={{ color: "#F59E0B" }}
                      />
                      Parecer Técnico
                    </label>
                    <textarea
                      rows={4}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Descreva sua análise detalhada, pontos de validação ou motivo da rejeição..."
                      className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:border-[#134B8A] focus:ring-2 focus:ring-[#134B8A] focus:ring-offset-2 focus:outline-none text-gray-900 placeholder-gray-500 font-medium resize-none transition-all"
                    />
                    <p className="text-xs text-gray-500 mt-2 font-medium">
                      O parecer será registrado no histórico do documento
                    </p>
                  </div>
                </div>

                {/* Footer com Botões */}
                <div className="p-6 border-t-2 bg-gray-50 flex justify-end gap-3 rounded-b-2xl">
                  {!metaMaskConnected && metaMaskInstalled && (
                    <div
                      className="flex-1 text-sm font-semibold flex items-center gap-2"
                      style={{ color: "#F59E0B" }}
                    >
                      <AlertTriangle className="w-4 h-4" />
                      Conecte o MetaMask para registrar na blockchain
                    </div>
                  )}
                  <button
                    onClick={handleReject}
                    disabled={registering}
                    className="px-5 py-2.5 bg-white border-2 border-red-300 rounded-xl flex items-center gap-2 transition-all hover:bg-red-50 hover:border-red-400 font-bold disabled:opacity-50 focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    style={{ color: "#DC2626" }}
                  >
                    <XCircle className="w-4 h-4" />
                    Rejeitar Documento
                  </button>
                  <button
                    onClick={handleApprove}
                    disabled={registering || !metaMaskConnected}
                    className={`relative overflow-hidden group px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all font-bold focus:ring-2 focus:ring-offset-2 ${
                      metaMaskConnected
                        ? "text-white shadow-md hover:shadow-lg"
                        : "bg-gray-300 text-gray-500 cursor-not-allowed"
                    } disabled:opacity-50`}
                    style={
                      metaMaskConnected
                        ? {
                            background:
                              "linear-gradient(135deg, #059669, #1E6B6B)",
                          }
                        : {}
                    }
                  >
                    <span className="relative z-10 flex items-center">
                      {registering ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Processando...
                        </>
                      ) : (
                        <>
                          <Award className="w-4 h-4" />
                          {metaMaskConnected
                            ? "Aprovar e Registrar na Blockchain"
                            : "Conecte o MetaMask primeiro"}
                        </>
                      )}
                    </span>
                    {metaMaskConnected && (
                      <span className="absolute inset-0 -translate-x-full group-hover:translate-x-0 transition-transform duration-500 bg-gradient-to-r from-white/20 to-transparent" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
