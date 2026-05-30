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
  Package,
  Eye,
  ExternalLink,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import api from "@/services/api";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  batch: { batchId: string; productName: string } | null;
  validatedBy?: { name: string };
  ipfsHash?: string;
}

interface Batch {
  id: string;
  batchId: string;
  productName: string;
  productDescription?: string;
  co2Emitted: number;
  isCompliant: boolean;
  status: string;
  blockchainTxHash?: string;
  createdAt: string;
  batchSuppliers: Array<{
    id: string;
    supplier: { name: string; cnpj: string };
    productName: string;
    co2Emitted: number;
  }>;
}

export default function SpecialistDashboardPage() {
  const { user } = useAuth();

  // Estado dos Documentos
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [validating, setValidating] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [reason, setReason] = useState("");

  // Estado dos Lotes
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(true);
  const [registeringBatch, setRegisteringBatch] = useState<string | null>(null);

  // MetaMask
  const [metaMaskInstalled, setMetaMaskInstalled] = useState(false);
  const [metaMaskConnected, setMetaMaskConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"documents" | "batches">(
    "documents",
  );

  // ✅ Verificar MetaMask
  useEffect(() => {
    const checkMetaMask = () => {
      const hasMetaMask =
        typeof window !== "undefined" && window.ethereum?.isMetaMask === true;
      setMetaMaskInstalled(hasMetaMask);

      if (hasMetaMask) {
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

  // ✅ Conectar MetaMask
  const connectMetaMask = async (): Promise<boolean> => {
    if (!metaMaskInstalled) {
      alert(
        "❌ MetaMask não detectado!\n\n" +
          "Para registrar na blockchain, você precisa:\n" +
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

  // 🔹 Buscar documentos validados pelo Operador
  const fetchDocuments = async () => {
    try {
      setLoadingDocs(true);
      setError(null);
      const response = await api.get("/documents/awaiting-review");
      setDocuments(response.data);
    } catch (error: any) {
      console.error("❌ Erro ao buscar documentos:", error);
      setError(error.response?.data?.message || error.message);
    } finally {
      setLoadingDocs(false);
    }
  };

  const fetchBatches = async () => {
    try {
      setLoadingBatches(true);
      const response = await api.get("/batches");

      // 🔥 CORREÇÃO: Mostrar apenas lotes que NÃO são da PROVENI
      // e que NÃO são do padrão automático
      const pendingBatches = response.data.filter(
        (batch: any) =>
          // Excluir lotes da PROVENI
          batch.company?.name !== "PROVENI Tecnologia" &&
          // Excluir lotes que começam com proveni-nf-
          !batch.batchId?.startsWith("proveni-nf-") &&
          // Ainda não está na blockchain
          !batch.blockchainTxHash &&
          // Está em estado válido
          (batch.status === "DRAFT" ||
            batch.status === "COMPLETED" ||
            batch.status === "VALIDATED"),
      );

      setBatches(pendingBatches);
      console.log(
        `📦 ${pendingBatches.length} lotes finais aguardando registro`,
      );
    } catch (error: any) {
      console.error("❌ Erro ao buscar lotes:", error);
    } finally {
      setLoadingBatches(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
    fetchBatches();
  }, []);

  // ✅ VALIDAR DOCUMENTO (apenas marcar como OK, NÃO registrar na blockchain)
  const handleValidateDocument = async () => {
    if (!selectedDoc) return;

    setValidating(true);
    setError(null);

    try {
      await api.post(`/documents/${selectedDoc.id}/validate`, {
        notes: reason || "Documento validado pelo especialista",
      });

      alert("✅ Documento validado com sucesso!");
      setSelectedDoc(null);
      setReason("");
      await fetchDocuments();
    } catch (error: any) {
      console.error("❌ Erro ao validar:", error);
      const errorMessage = error.response?.data?.message || error.message;
      setError(errorMessage);
      alert(`❌ Erro ao validar:\n${errorMessage}`);
    } finally {
      setValidating(false);
    }
  };

  // ❌ REJEITAR DOCUMENTO
  const handleRejectDocument = async () => {
    if (!selectedDoc) return;
    if (!reason) {
      alert("Informe o motivo da rejeição");
      return;
    }

    setValidating(true);
    setError(null);

    try {
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
      setValidating(false);
    }
  };

  // 🔗 REGISTRAR LOTE FINAL NA BLOCKCHAIN
  const handleRegisterBatch = async (batchId: string) => {
    const isConnected = await connectMetaMask();
    if (!isConnected) return;

    setRegisteringBatch(batchId);
    setError(null);

    try {
      await api.post(`/batches/${batchId}/register-blockchain`);
      alert("✅ Lote registrado na blockchain com sucesso!");
      await fetchBatches();
      await fetchDocuments();
    } catch (error: any) {
      console.error("❌ Erro ao registrar lote:", error);
      const errorMessage = error.response?.data?.message || error.message;
      setError(errorMessage);
      alert(`❌ Erro ao registrar:\n${errorMessage}`);
    } finally {
      setRegisteringBatch(null);
    }
  };

  // Filtrar documentos por busca
  const filteredDocs = documents.filter(
    (doc) =>
      doc.originalName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (doc.batch?.batchId || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase()),
  );

  const statsDocs = {
    total: documents.length,
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

        {/* Header */}
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
                  Gestão de Documentos e Lotes
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  Valide documentos e registre lotes finais na blockchain
                </p>
              </div>

              <div className="flex items-center gap-3 animate-fade-up animation-delay-100">
                {!metaMaskInstalled ? (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-50">
                    <div className="w-2 h-2 rounded-full animate-pulse bg-red-600" />
                    <span className="text-xs font-semibold text-red-700">
                      ⚠️ MetaMask não detectado
                    </span>
                  </div>
                ) : metaMaskConnected ? (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50">
                    <div className="w-2 h-2 rounded-full animate-pulse bg-emerald-600" />
                    <span className="text-xs font-semibold text-emerald-700">
                      🔗 MetaMask Conectado
                    </span>
                  </div>
                ) : (
                  <button
                    onClick={connectMetaMask}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full transition-all hover:scale-105 bg-amber-50 text-amber-600"
                  >
                    <div className="w-2 h-2 rounded-full animate-pulse bg-amber-600" />
                    <span className="text-xs font-semibold">
                      🦊 Conectar MetaMask
                    </span>
                  </button>
                )}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-50">
                  <UserCheck className="w-3.5 h-3.5 text-teal-700" />
                  <span className="text-xs font-semibold text-teal-700">
                    Operação Segura
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-10">
          {/* Hero Section */}
          <div className="mb-10 text-center animate-fade-up">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-4 bg-purple-50">
              <Award className="w-3 h-3 text-purple-600" />
              <span className="text-xs font-semibold text-purple-600">
                Registro Imutável
              </span>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Blockchain para Rastreabilidade
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Valide documentos dos fornecedores e registre os lotes finais na
              blockchain
            </p>
          </div>

          {/* Tabs */}
          <Tabs
            defaultValue="documents"
            className="animate-fade-up animation-delay-100"
            onValueChange={(value) =>
              setActiveTab(value as "documents" | "batches")
            }
          >
            <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-8">
              <TabsTrigger value="documents" className="gap-2">
                <FileText className="w-4 h-4" />
                Documentos ({statsDocs.total})
              </TabsTrigger>
              <TabsTrigger value="batches" className="gap-2">
                <Package className="w-4 h-4" />
                Lotes para Registrar ({batches.length})
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: DOCUMENTOS */}
            <TabsContent value="documents" className="space-y-6">
              {/* Barra de Pesquisa */}
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

              {/* Mensagem de erro */}
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  {error}
                </div>
              )}

              {/* Lista de Documentos */}
              {loadingDocs ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white/80 backdrop-blur-sm rounded-2xl border-2 border-gray-200">
                  <Loader2 className="w-10 h-10 animate-spin mb-4 text-[#134B8A]" />
                  <p className="text-gray-600 font-semibold">
                    Carregando documentos...
                  </p>
                </div>
              ) : filteredDocs.length === 0 ? (
                <div className="text-center py-20 bg-white/80 backdrop-blur-sm rounded-2xl border-2 border-gray-200">
                  <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600 font-semibold">
                    Nenhum documento aguardando revisão
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Todos os documentos foram processados
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredDocs.map((doc, idx) => (
                    <div
                      key={doc.id}
                      onClick={() => setSelectedDoc(doc)}
                      className="group bg-white rounded-xl border-2 border-gray-200 p-5 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-teal-500 cursor-pointer animate-fade-up"
                      style={{ animationDelay: `${idx * 50}ms` }}
                    >
                      <div className="flex items-start gap-4 flex-wrap">
                        <div className="p-2.5 rounded-xl bg-teal-50">
                          <FileText className="w-5 h-5 text-teal-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-3 mb-2">
                            <h3 className="font-bold text-gray-900 text-lg">
                              {doc.originalName}
                            </h3>
                            <Badge className="bg-green-100 text-green-700">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Pré-validado pelo Operador
                            </Badge>
                          </div>
                          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                            <span className="flex items-center gap-1.5 font-medium">
                              <Building2 className="w-3.5 h-3.5 text-gray-400" />
                              {doc.supplier.name}
                            </span>
                            <span className="flex items-center gap-1.5 font-medium">
                              <Calendar className="w-3.5 h-3.5 text-gray-400" />
                              {format(
                                new Date(doc.uploadedAt),
                                "dd/MM/yyyy HH:mm",
                                { locale: ptBR },
                              )}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="text-sm font-semibold text-teal-600">
                            Validar
                          </span>
                          <ChevronRight className="w-4 h-4 text-teal-600" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* TAB 2: LOTES PARA REGISTRAR */}
            <TabsContent value="batches" className="space-y-6">
              {loadingBatches ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white/80 backdrop-blur-sm rounded-2xl border-2 border-gray-200">
                  <Loader2 className="w-10 h-10 animate-spin mb-4 text-[#134B8A]" />
                  <p className="text-gray-600 font-semibold">
                    Carregando lotes...
                  </p>
                </div>
              ) : batches.length === 0 ? (
                <div className="text-center py-20 bg-white/80 backdrop-blur-sm rounded-2xl border-2 border-gray-200">
                  <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600 font-semibold">
                    Nenhum lote aguardando registro
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Os lotes criados pelo Manager aparecerão aqui
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {batches.map((batch, idx) => (
                    <div
                      key={batch.id}
                      className="bg-white rounded-xl border-2 border-gray-200 p-6 transition-all duration-300 hover:shadow-xl animate-fade-up"
                      style={{ animationDelay: `${idx * 100}ms` }}
                    >
                      <div className="flex justify-between items-start flex-wrap gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2 flex-wrap">
                            <h2 className="text-xl font-bold text-gray-900">
                              {batch.batchId}
                            </h2>
                            <Badge className="bg-blue-100 text-blue-700">
                              Lote Final
                            </Badge>
                            <Badge
                              className={cn(
                                batch.isCompliant
                                  ? "bg-green-100 text-green-700"
                                  : "bg-red-100 text-red-700",
                              )}
                            >
                              {batch.isCompliant
                                ? "✅ Conforme"
                                : "❌ Não Conforme"}
                            </Badge>
                          </div>
                          <p className="text-gray-700 font-medium mb-2">
                            {batch.productName}
                          </p>
                          {batch.productDescription && (
                            <p className="text-sm text-gray-500 mb-3">
                              {batch.productDescription}
                            </p>
                          )}
                          <div className="flex flex-wrap gap-4 text-sm mb-4">
                            <span className="flex items-center gap-1 font-semibold text-teal-600">
                              <Leaf className="w-4 h-4" />
                              CO₂ Total: {batch.co2Emitted} kg
                            </span>
                            <span className="flex items-center gap-1 text-gray-500">
                              <Building2 className="w-4 h-4" />
                              Fornecedores: {batch.batchSuppliers?.length || 0}
                            </span>
                          </div>

                          {/* Lista de Fornecedores */}
                          {batch.batchSuppliers &&
                            batch.batchSuppliers.length > 0 && (
                              <div className="mt-3 pt-3 border-t border-gray-100">
                                <p className="text-xs font-semibold text-gray-400 uppercase mb-2">
                                  Fornecedores vinculados:
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {batch.batchSuppliers.map((bs) => (
                                    <div
                                      key={bs.id}
                                      className="flex justify-between items-center p-2 bg-gray-50 rounded-lg"
                                    >
                                      <span className="text-sm font-medium text-gray-700">
                                        {bs.supplier.name}
                                      </span>
                                      <span className="text-sm font-semibold text-teal-600">
                                        {bs.co2Emitted} kg CO₂
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                        </div>

                        <Button
                          onClick={() => handleRegisterBatch(batch.batchId)}
                          disabled={
                            registeringBatch === batch.batchId ||
                            !metaMaskConnected
                          }
                          className="gap-2 bg-gradient-to-r from-[#059669] to-[#1E6B6B] hover:shadow-lg transition-all"
                        >
                          {registeringBatch === batch.batchId ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Registrando...
                            </>
                          ) : (
                            <>
                              <Shield className="w-4 h-4" />
                              Registrar na Blockchain
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* MODAL DE VALIDAÇÃO DE DOCUMENTO */}
      {selectedDoc && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden animate-in zoom-in duration-300">
            {/* Header */}
            <div className="p-6 border-b-2 bg-gradient-to-r from-slate-50 to-gray-50 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-gradient-to-r from-[#134B8A] to-[#7C3AED]">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Revisão Especializada
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5 font-medium">
                    Análise técnica do documento
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedDoc(null)}
                className="p-2 hover:bg-gray-200 rounded-full transition-all"
              >
                <XCircle className="w-5 h-5 text-gray-500 hover:text-gray-700" />
              </button>
            </div>

            {/* Conteúdo */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)] space-y-5">
              {/* Informações do Documento */}
              <div className="rounded-xl p-5 border-2 bg-gray-50 border-gray-200">
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
                    <p className="text-gray-500 text-xs font-semibold">CNPJ</p>
                    <p className="font-medium text-gray-800 mt-0.5">
                      {selectedDoc.supplier.cnpj}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs font-semibold">
                      Data de Envio
                    </p>
                    <p className="font-medium text-gray-800 mt-0.5">
                      {format(
                        new Date(selectedDoc.uploadedAt),
                        "dd/MM/yyyy HH:mm",
                        { locale: ptBR },
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Dados Extraídos */}
              {selectedDoc.extractedData && (
                <div className="rounded-xl p-5 border-2 bg-emerald-50 border-emerald-200">
                  <h3 className="text-xs font-bold text-emerald-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                    <TrendingUp className="w-3.5 h-3.5" />
                    DADOS EXTRAÍOS PELA IA
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
                      <p className="font-bold mt-0.5 flex items-center gap-1.5 text-teal-700">
                        <Leaf className="w-3.5 h-3.5" />
                        {selectedDoc.extractedData.co2Emitted || "N/A"} kg CO₂
                        equivalente
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Ver Documento Original IPFS */}
              {selectedDoc.ipfsHash && (
                <a
                  href={`https://gateway.pinata.cloud/ipfs/${selectedDoc.ipfsHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 p-3 bg-gray-100 rounded-xl text-gray-700 hover:bg-gray-200 transition-all"
                >
                  <Eye className="w-4 h-4" />
                  <span className="font-medium">
                    Visualizar Documento Original (IPFS)
                  </span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}

              {/* Parecer Técnico */}
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
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
              <button
                onClick={handleRejectDocument}
                disabled={validating}
                className="px-5 py-2.5 bg-white border-2 border-red-300 rounded-xl flex items-center gap-2 transition-all hover:bg-red-50 hover:border-red-400 font-bold disabled:opacity-50"
                style={{ color: "#DC2626" }}
              >
                <XCircle className="w-4 h-4" />
                Rejeitar Documento
              </button>
              <button
                onClick={handleValidateDocument}
                disabled={validating}
                className="relative overflow-hidden group px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all font-bold disabled:opacity-50 bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md hover:shadow-lg"
              >
                <span className="relative z-10 flex items-center">
                  {validating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Validar Documento
                    </>
                  )}
                </span>
                {!validating && (
                  <span className="absolute inset-0 -translate-x-full group-hover:translate-x-0 transition-transform duration-500 bg-gradient-to-r from-white/20 to-transparent" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
