/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/operator/documents/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Brain,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  Search,
  Building2,
  Calendar,
  Shield,
  Eye,
  TrendingUp,
  Zap,
  Package,
  HelpCircle,
  ArrowRight,
  Boxes,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import api from "@/services/api";
import { useAuth } from "@/hooks/useAuth";

interface Document {
  id: string;
  originalName: string;
  docType: string;
  processingStatus: string;
  ipfsHash: string;
  confidenceScore?: number;
  extractedData?: any;
  uploadedAt: string;
  supplier: { name: string; cnpj: string };
  batch: { batchId: string; productName: string } | null;
}

export default function OperatorDocumentsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [extractingId, setExtractingId] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [editedData, setEditedData] = useState<any>({});
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [filterSupplier, setFilterSupplier] = useState<string>("all");

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get("/documents/pending");
      setDocuments(response.data);
    } catch (error) {
      console.error("Erro:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleExtractAI = async (documentId: string) => {
    setExtractingId(documentId);
    try {
      await api.post(`/documents/${documentId}/extract-ai`);
      await fetchDocuments();
      alert("✅ Extração concluída com sucesso!");
    } catch (error: any) {
      alert(error.response?.data?.message || "Erro ao extrair");
    } finally {
      setExtractingId(null);
    }
  };

  const handleOpenValidation = async (doc: Document) => {
    setSelectedDoc(doc);
    setEditedData(doc.extractedData || {});

    if (doc.ipfsHash) {
      const url = `https://gateway.pinata.cloud/ipfs/${doc.ipfsHash}`;
      console.log("🔗 IPFS URL:", url);
      setPdfUrl(url);
    }
  };

  const extractInvoiceNumber = (data: any, doc: Document): string => {
    if (data.invoiceNumber && data.invoiceNumber.toString().trim()) {
      return data.invoiceNumber.toString().replace(/\D/g, "");
    }
    if (data.nfNumber && data.nfNumber.toString().trim()) {
      return data.nfNumber.toString().replace(/\D/g, "");
    }
    if (data.numeroNota && data.numeroNota.toString().trim()) {
      return data.numeroNota.toString().replace(/\D/g, "");
    }
    if (data.nfeNumber && data.nfeNumber.toString().trim()) {
      return data.nfeNumber.toString().replace(/\D/g, "");
    }

    const patterns = [
      /(?:NFe|NF-e|NFS-e|NOTA\s*FISCAL)[\s-]*(\d+)/i,
      /(?:nota|fiscal)[\s-]*(\d+)/i,
      /(\d{30,44})/,
      /(\d{6,9})/,
    ];

    for (const pattern of patterns) {
      const match = doc.originalName.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return Date.now().toString();
  };

  const handleValidate = async () => {
    if (!selectedDoc) return;
    setValidating(true);

    try {
      await api.post(`/documents/${selectedDoc.id}/validate`, {
        extractedData: editedData,
      });

      alert("✅ Documento validado! O lote foi criado automaticamente.");
      setSelectedDoc(null);
      await fetchDocuments();
    } catch (error: any) {
      console.error("Erro detalhado:", error);

      if (error.response?.status === 403) {
        alert("❌ Erro de permissão!");
      } else if (error.response?.data?.message) {
        alert(error.response.data.message);
      } else {
        alert("Erro ao validar documento");
      }
    } finally {
      setValidating(false);
    }
  };

  const handleGoToModule = () => {
    router.push("/operator/dashboard");
  };

  const getStatusConfig = (status: string) => {
    const configs: Record<string, any> = {
      PENDING: {
        color: "text-amber-600",
        icon: Clock,
        label: "Aguardando IA",
        bg: "bg-amber-50",
        border: "border-amber-200",
      },
      PROCESSING: {
        color: "text-blue-600",
        icon: Loader2,
        label: "Processando",
        bg: "bg-blue-50",
        border: "border-blue-200",
      },
      EXTRACTED: {
        color: "text-emerald-600",
        icon: Brain,
        label: "Pronto para Validar",
        bg: "bg-emerald-50",
        border: "border-emerald-200",
      },
    };
    return configs[status] || configs.PENDING;
  };

  const getTypeLabel = (type: string) => {
    const types: Record<string, { label: string; color: string; bg: string }> =
      {
        INVOICE: {
          label: "Nota Fiscal",
          color: "text-indigo-600",
          bg: "bg-indigo-50",
        },
        CARBON_REPORT: {
          label: "Relatório Carbono",
          color: "text-emerald-600",
          bg: "bg-emerald-50",
        },
        CERTIFICATE: {
          label: "Certificado",
          color: "text-amber-600",
          bg: "bg-amber-50",
        },
        TRANSPORT: { label: "CT-e", color: "text-cyan-600", bg: "bg-cyan-50" },
        OTHER: { label: "Outro", color: "text-gray-600", bg: "bg-gray-50" },
      };
    return types[type] || types.OTHER;
  };

  const uniqueSuppliers = Array.from(
    new Set(documents.map((doc) => doc.supplier.name)),
  );

  const filteredDocs = documents.filter((doc) => {
    const matchesSearch =
      doc.originalName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (doc.batch?.batchId || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

    const matchesSupplier =
      filterSupplier === "all" || doc.supplier.name === filterSupplier;

    return matchesSearch && matchesSupplier;
  });

  const stats = {
    total: documents.length,
    pending: documents.filter((d) => d.processingStatus === "PENDING").length,
    extracted: documents.filter((d) => d.processingStatus === "EXTRACTED")
      .length,
  };

  const previewBatchId = () => {
    if (!selectedDoc) return "";
    const invoiceNumber = extractInvoiceNumber(editedData, selectedDoc);
    return `proveni-nf-${invoiceNumber}`;
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
          <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="flex justify-between items-center">
              <div className="animate-fade-up">
                <div className="flex items-center gap-2 mb-1">
                  <div className="p-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg">
                    <Shield className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Painel do Operador
                  </span>
                </div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                  Extração de Dados
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  Processe documentos e extraia dados usando inteligência
                  artificial
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-12">
          {/* Hero CTA - Progressive Disclosure */}
          <div className="mb-16 text-center animate-fade-up">
            <div
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-4"
              style={{ backgroundColor: "#EDE9FE" }}
            >
              <Zap className="w-3 h-3" style={{ color: "#7C3AED" }} />
              <span
                className="text-xs font-semibold"
                style={{ color: "#7C3AED" }}
              >
                IA Avançada
              </span>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Validação Inteligente de Documentos
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto mb-8">
              Utilize IA para extrair dados automaticamente e garantir a
              rastreabilidade da sua cadeia de suprimentos
            </p>
            <button
              onClick={handleGoToModule}
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

          {/* Stats Cards com 8px Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            {[
              {
                label: "Total Documentos",
                value: stats.total,
                icon: FileText,
                color: "#134B8A",
              },
              {
                label: "Aguardando IA",
                value: stats.pending,
                icon: Clock,
                color: "#DC2626",
              },
              {
                label: "Prontos para Validar",
                value: stats.extracted,
                icon: Brain,
                color: "#059669",
              },
            ].map((stat, idx) => (
              <div
                key={idx}
                className="bg-white rounded-xl border border-gray-200 p-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 animate-fade-up"
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm">{stat.label}</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">
                      {stat.value}
                    </p>
                  </div>
                  <div
                    className="p-3 rounded-xl"
                    style={{ backgroundColor: `${stat.color}10` }}
                  >
                    <stat.icon
                      className="w-6 h-6"
                      style={{ color: stat.color }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Role-Aware Personalization Card */}
          <div className="mb-12 animate-fade-up animation-delay-200">
            <div
              className={cn(
                "rounded-xl p-8 border transition-all duration-300 hover:shadow-xl hover:-translate-y-1",
                user?.role === "OPERATOR" && "ring-2 shadow-lg",
                "bg-gradient-to-br from-white to-[#D4EAEA] border-[#D4EAEA]",
              )}
              style={user?.role === "OPERATOR" ? { ringColor: "#134B8A" } : {}}
            >
              <div
                className="p-2 rounded-lg w-fit mb-4"
                style={{ backgroundColor: "#D4EAEA" }}
              >
                <Boxes className="h-5 w-5" style={{ color: "#1E6B6B" }} />
              </div>
              <h3 className="font-semibold text-gray-800 mb-3 text-xl">
                Operador - Seu Perfil
              </h3>
              <p className="text-gray-600 mb-4">
                Você tem acesso à validação de documentos e criação automática
                de lotes
              </p>
              <ul className="space-y-2">
                {[
                  "Validação de documentos fiscais",
                  "Criação automática de lotes",
                  "Visualização de documentos IPFS",
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-2 text-sm text-gray-600"
                  >
                    <CheckCircle
                      className="w-4 h-4"
                      style={{ color: "#059669" }}
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Filtros - Inputs com alto contraste */}
          <div className="mb-8 flex flex-wrap gap-4 animate-fade-up animation-delay-300">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Buscar por documento, fornecedor ou lote..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-white border-2 border-gray-300 rounded-xl focus:border-[#134B8A] focus:ring-2 focus:ring-[#134B8A] focus:ring-offset-2 focus:outline-none text-gray-900 placeholder-gray-500 transition-all"
                style={{ fontWeight: "500" }}
              />
            </div>

            {uniqueSuppliers.length > 0 && (
              <select
                value={filterSupplier}
                onChange={(e) => setFilterSupplier(e.target.value)}
                className="px-4 py-2.5 bg-white border-2 border-gray-300 rounded-xl focus:border-[#134B8A] focus:ring-2 focus:ring-[#134B8A] focus:ring-offset-2 focus:outline-none text-gray-900 font-medium transition-all cursor-pointer"
              >
                <option value="all">Todos os fornecedores</option>
                {uniqueSuppliers.map((supplier) => (
                  <option key={supplier} value={supplier}>
                    {supplier}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Lista de Documentos com Staggered Animation */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2
                className="w-10 h-10 animate-spin mb-4"
                style={{ color: "#134B8A" }}
              />
              <p className="text-gray-600 font-medium">
                Carregando documentos...
              </p>
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="text-center py-20 bg-white/80 backdrop-blur-sm rounded-2xl border-2 border-gray-200">
              <FileText className="w-20 h-20 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-800">
                Nenhum documento pendente
              </h3>
              <p className="text-gray-500 mt-2">
                {searchTerm || filterSupplier !== "all"
                  ? "Tente outros filtros de busca"
                  : "Aguardando upload de fornecedores"}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredDocs.map((doc, idx) => {
                const status = getStatusConfig(doc.processingStatus);
                const StatusIcon = status.icon;
                const typeConfig = getTypeLabel(doc.docType);

                return (
                  <div
                    key={doc.id}
                    className={cn(
                      "bg-white rounded-xl border-2 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 animate-fade-up",
                      status.border,
                    )}
                    style={{ animationDelay: `${idx * 50}ms` }}
                  >
                    <div className="p-6">
                      <div className="flex justify-between items-start flex-wrap gap-4">
                        <div className="flex gap-4 flex-1 min-w-0">
                          <div className={cn("p-3 rounded-xl", typeConfig.bg)}>
                            <FileText
                              className={cn("w-5 h-5", typeConfig.color)}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-2">
                              <h3 className="font-semibold text-gray-900 truncate text-base">
                                {doc.originalName}
                              </h3>
                              <span
                                className={cn(
                                  "text-xs px-2 py-1 rounded-full font-semibold",
                                  typeConfig.bg,
                                  typeConfig.color,
                                )}
                              >
                                {typeConfig.label}
                              </span>
                              <span
                                className={cn(
                                  "text-xs px-2 py-1 rounded-full flex items-center gap-1 font-semibold",
                                  status.bg,
                                  status.color,
                                )}
                              >
                                <StatusIcon
                                  className={cn(
                                    "w-3 h-3",
                                    doc.processingStatus === "PROCESSING" &&
                                      "animate-spin",
                                  )}
                                />
                                {status.label}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                              <span className="flex items-center gap-1 font-medium">
                                <Building2 className="w-3.5 h-3.5" />
                                {doc.supplier.name}
                              </span>
                              <span className="flex items-center gap-1 font-medium">
                                <Calendar className="w-3.5 h-3.5" />
                                {format(
                                  new Date(doc.uploadedAt),
                                  "dd/MM/yyyy HH:mm",
                                  { locale: ptBR },
                                )}
                              </span>
                              {doc.batch ? (
                                <span
                                  className="flex items-center gap-1 font-semibold"
                                  style={{ color: "#059669" }}
                                >
                                  <Package className="w-3.5 h-3.5" />
                                  Lote: {doc.batch.batchId}
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-amber-600 font-medium">
                                  <HelpCircle className="w-3.5 h-3.5" />
                                  Sem lote associado
                                </span>
                              )}
                            </div>
                            {doc.confidenceScore && (
                              <div className="mt-3 flex items-center gap-2">
                                <span className="text-xs font-semibold text-gray-600">
                                  Confiança da IA:
                                </span>
                                <div className="flex-1 max-w-[200px] bg-gray-200 rounded-full h-2.5">
                                  <div
                                    className={cn(
                                      "h-2.5 rounded-full transition-all duration-500",
                                      doc.confidenceScore >= 80
                                        ? "bg-emerald-500"
                                        : doc.confidenceScore >= 50
                                          ? "bg-amber-500"
                                          : "bg-red-500",
                                    )}
                                    style={{ width: `${doc.confidenceScore}%` }}
                                  />
                                </div>
                                <span className="text-xs font-bold text-gray-700">
                                  {doc.confidenceScore}%
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {doc.processingStatus === "PENDING" && (
                          <button
                            onClick={() => handleExtractAI(doc.id)}
                            disabled={extractingId === doc.id}
                            className="relative overflow-hidden group px-5 py-2.5 text-white rounded-xl text-sm font-semibold flex items-center gap-2 transition-all shadow-md hover:shadow-lg disabled:opacity-50 focus:ring-2 focus:ring-offset-2 focus:ring-[#7C3AED]"
                            style={{
                              background:
                                "linear-gradient(135deg, #134B8A, #7C3AED)",
                            }}
                          >
                            <span className="relative z-10 flex items-center">
                              {extractingId === doc.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Zap className="w-4 h-4" />
                              )}
                              Extrair com IA
                            </span>
                            <span className="absolute inset-0 -translate-x-full group-hover:translate-x-0 transition-transform duration-500 bg-gradient-to-r from-white/20 to-transparent" />
                          </button>
                        )}

                        {doc.processingStatus === "EXTRACTED" && (
                          <button
                            onClick={() => handleOpenValidation(doc)}
                            className="relative overflow-hidden group px-5 py-2.5 text-white rounded-xl text-sm font-semibold flex items-center gap-2 transition-all shadow-md hover:shadow-lg focus:ring-2 focus:ring-offset-2 focus:ring-[#1E6B6B]"
                            style={{
                              background:
                                "linear-gradient(135deg, #059669, #1E6B6B)",
                            }}
                          >
                            <span className="relative z-10 flex items-center">
                              <CheckCircle className="w-4 h-4" />
                              Validar Dados
                            </span>
                            <span className="absolute inset-0 -translate-x-full group-hover:translate-x-0 transition-transform duration-500 bg-gradient-to-r from-white/20 to-transparent" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Modal de Validação - Inputs com alto contraste */}
          {selectedDoc && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
              <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden animate-in zoom-in duration-300">
                <div className="p-6 border-b bg-gradient-to-r from-slate-50 to-gray-50">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <div
                        className="p-2.5 rounded-xl shadow-md"
                        style={{
                          background:
                            "linear-gradient(135deg, #134B8A, #7C3AED)",
                        }}
                      >
                        <Shield className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-gray-900">
                          Validar Documento
                        </h2>
                        <div className="flex items-center gap-2 mt-1">
                          <FileText className="w-3.5 h-3.5 text-gray-500" />
                          <p className="text-sm text-gray-600 font-medium">
                            {selectedDoc.originalName}
                          </p>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedDoc(null)}
                      className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all duration-200 focus:ring-2 focus:ring-offset-2 focus:ring-[#134B8A]"
                    >
                      <XCircle className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="flex flex-col flex-1 h-[calc(90vh-100px)]">
                  <div className="w-full flex flex-col flex-1 min-h-0 bg-white">
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                      {pdfUrl && (
                        <div
                          className="rounded-xl p-4 flex items-center justify-between border-2"
                          style={{
                            backgroundColor: "#1E6B6B10",
                            borderColor: "#1E6B6B30",
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className="p-2 rounded-lg"
                              style={{ backgroundColor: "#1E6B6B20" }}
                            >
                              <FileText
                                className="w-5 h-5"
                                style={{ color: "#1E6B6B" }}
                              />
                            </div>
                            <div>
                              <h3 className="text-sm font-bold text-gray-900">
                                Documento Original
                              </h3>
                              <p className="text-xs text-gray-600 mt-0.5 font-medium">
                                Fornecedor: {selectedDoc.supplier.name}
                              </p>
                            </div>
                          </div>
                          <a
                            href={pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 text-white text-sm font-semibold rounded-lg transition-all shadow-md hover:shadow-lg focus:ring-2 focus:ring-offset-2 focus:ring-[#134B8A]"
                            style={{
                              backgroundColor: "#134B8A",
                            }}
                          >
                            <Eye className="w-4 h-4" />
                            Visualizar PDF
                          </a>
                        </div>
                      )}

                      {!selectedDoc.batch && (
                        <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
                          <div className="flex items-start gap-3">
                            <Package className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm font-semibold text-blue-800">
                                📦 Ao validar, um lote será criado
                                automaticamente
                              </p>
                              <p className="text-xs text-blue-700 mt-1">
                                ID do lote:{" "}
                                <code className="font-mono">
                                  {previewBatchId()}
                                </code>
                              </p>
                              <p className="text-xs text-blue-600 mt-2">
                                Este lote poderá ser usado pelo Manager para
                                compor o produto final.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      <div
                        className={cn(
                          "rounded-xl p-5 border-2 transition-all duration-300",
                          (selectedDoc.confidenceScore || 70) >= 80
                            ? "bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-300"
                            : (selectedDoc.confidenceScore || 70) >= 50
                              ? "bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-300"
                              : "bg-gradient-to-br from-red-50 to-orange-50 border-red-300",
                        )}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div
                              className={cn(
                                "p-1.5 rounded-lg",
                                (selectedDoc.confidenceScore || 70) >= 80
                                  ? "bg-emerald-200"
                                  : (selectedDoc.confidenceScore || 70) >= 50
                                    ? "bg-amber-200"
                                    : "bg-red-200",
                              )}
                            >
                              <TrendingUp
                                className={cn(
                                  "w-4 h-4",
                                  (selectedDoc.confidenceScore || 70) >= 80
                                    ? "text-emerald-700"
                                    : (selectedDoc.confidenceScore || 70) >= 50
                                      ? "text-amber-700"
                                      : "text-red-700",
                                )}
                              />
                            </div>
                            <span className="text-sm font-bold text-gray-800">
                              Precisão da Extração
                            </span>
                          </div>
                          <span
                            className={cn(
                              "text-2xl font-bold",
                              (selectedDoc.confidenceScore || 70) >= 80
                                ? "text-emerald-700"
                                : (selectedDoc.confidenceScore || 70) >= 50
                                  ? "text-amber-700"
                                  : "text-red-700",
                            )}
                          >
                            {selectedDoc.confidenceScore || 70}%
                          </span>
                        </div>
                        <div className="relative mb-3">
                          <div className="bg-white/60 rounded-full h-2.5 overflow-hidden">
                            <div
                              className={cn(
                                "h-2.5 rounded-full transition-all duration-500",
                                (selectedDoc.confidenceScore || 70) >= 80
                                  ? "bg-emerald-600"
                                  : (selectedDoc.confidenceScore || 70) >= 50
                                    ? "bg-amber-600"
                                    : "bg-red-600",
                              )}
                              style={{
                                width: `${selectedDoc.confidenceScore || 70}%`,
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-5">
                        {/* Número da Nota Fiscal */}
                        <div>
                          <label className="block text-sm font-bold text-gray-800 mb-2">
                            Número da Nota Fiscal
                            <span className="text-red-600 ml-1">*</span>
                            <span className="text-xs text-gray-500 ml-2 font-normal">
                              (Usado para criar o lote automaticamente)
                            </span>
                          </label>
                          <input
                            type="text"
                            value={
                              editedData.invoiceNumber ||
                              editedData.nfNumber ||
                              ""
                            }
                            onChange={(e) => {
                              const value = e.target.value.replace(/\D/g, "");
                              setEditedData({
                                ...editedData,
                                invoiceNumber: value,
                                nfNumber: value,
                              });
                            }}
                            className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:border-[#134B8A] focus:ring-2 focus:ring-[#134B8A] focus:ring-offset-2 focus:outline-none text-gray-900 font-mono font-semibold text-base transition-all"
                            placeholder="Ex: 123456"
                          />

                          {!selectedDoc.batch && (
                            <div
                              className="mt-4 p-5 rounded-xl border-2"
                              style={{
                                background:
                                  "linear-gradient(135deg, #05966910, #1E6B6B10)",
                                borderColor: "#05966930",
                              }}
                            >
                              <div className="flex items-start gap-3">
                                <div
                                  className="p-2 rounded-lg flex-shrink-0"
                                  style={{ backgroundColor: "#05966920" }}
                                >
                                  <Package
                                    className="w-5 h-5"
                                    style={{ color: "#059669" }}
                                  />
                                </div>
                                <div className="flex-1">
                                  <p
                                    className="text-sm font-bold mb-1"
                                    style={{ color: "#059669" }}
                                  >
                                    📦 Lote será criado automaticamente
                                  </p>
                                  <p className="text-xs text-gray-700 mb-2">
                                    Ao confirmar a validação, um lote será
                                    criado com o padrão:
                                  </p>
                                  <code
                                    className="block mt-2 text-sm font-mono font-bold p-2 rounded-lg bg-white/80"
                                    style={{ color: "#059669" }}
                                  >
                                    {previewBatchId()}
                                  </code>
                                  <p className="text-xs text-gray-600 mt-2">
                                    Baseado no número da nota fiscal informado
                                    acima.
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}

                          {selectedDoc.batch && (
                            <div className="mt-3 p-4 bg-gray-100 border-2 border-gray-300 rounded-lg">
                              <div className="flex items-center gap-2">
                                <Package className="w-4 h-4 text-gray-600" />
                                <span className="text-sm font-semibold text-gray-700">
                                  Documento já possui lote:{" "}
                                  <span className="font-bold text-gray-900">
                                    {selectedDoc.batch.batchId}
                                  </span>
                                </span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Nome do Produto */}
                        <div>
                          <label className="block text-sm font-bold text-gray-800 mb-2">
                            Nome do Produto
                            <span className="text-red-600 ml-1">*</span>
                          </label>
                          <input
                            type="text"
                            value={editedData.productName || ""}
                            onChange={(e) =>
                              setEditedData({
                                ...editedData,
                                productName: e.target.value,
                              })
                            }
                            className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:border-[#134B8A] focus:ring-2 focus:ring-[#134B8A] focus:ring-offset-2 focus:outline-none text-gray-900 font-medium transition-all"
                            placeholder="Ex: Camisa Social Azul"
                          />
                        </div>

                        {/* Quantidade e Unidade */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-bold text-gray-800 mb-2">
                              Quantidade
                              <span className="text-red-600 ml-1">*</span>
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={editedData.quantity || ""}
                              onChange={(e) =>
                                setEditedData({
                                  ...editedData,
                                  quantity: parseFloat(e.target.value),
                                })
                              }
                              className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:border-[#134B8A] focus:ring-2 focus:ring-[#134B8A] focus:ring-offset-2 focus:outline-none text-gray-900 font-medium transition-all"
                              placeholder="0"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-bold text-gray-800 mb-2">
                              Unidade
                              <span className="text-red-600 ml-1">*</span>
                            </label>
                            <input
                              type="text"
                              value={editedData.unit || ""}
                              onChange={(e) =>
                                setEditedData({
                                  ...editedData,
                                  unit: e.target.value,
                                })
                              }
                              className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:border-[#134B8A] focus:ring-2 focus:ring-[#134B8A] focus:ring-offset-2 focus:outline-none text-gray-900 font-medium transition-all"
                              placeholder="kg, L, un..."
                            />
                          </div>
                        </div>

                        {/* CO₂ Emitido */}
                        <div>
                          <label className="block text-sm font-bold text-gray-800 mb-2">
                            CO₂ Emitido (kg)
                            <span className="text-red-600 ml-1">*</span>
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={editedData.co2Emitted || ""}
                            onChange={(e) =>
                              setEditedData({
                                ...editedData,
                                co2Emitted: parseFloat(e.target.value),
                              })
                            }
                            className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:border-[#134B8A] focus:ring-2 focus:ring-[#134B8A] focus:ring-offset-2 focus:outline-none text-gray-900 font-medium transition-all"
                            placeholder="0.00"
                          />
                        </div>

                        {/* Fornecedor */}
                        <div>
                          <label className="block text-sm font-bold text-gray-800 mb-2">
                            Fornecedor
                          </label>
                          <div className="relative">
                            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                            <input
                              type="text"
                              value={
                                editedData.supplier || selectedDoc.supplier.name
                              }
                              onChange={(e) =>
                                setEditedData({
                                  ...editedData,
                                  supplier: e.target.value,
                                })
                              }
                              className="w-full pl-10 pr-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:border-[#134B8A] focus:ring-2 focus:ring-[#134B8A] focus:ring-offset-2 focus:outline-none text-gray-900 font-medium transition-all"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Modal Footer */}
                    <div className="p-6 border-t-2 border-gray-200 flex justify-end gap-3 bg-gray-50 rounded-b-2xl">
                      <button
                        onClick={() => setSelectedDoc(null)}
                        className="px-6 py-2.5 border-2 border-gray-400 rounded-xl text-gray-800 font-bold hover:bg-gray-200 transition-all focus:ring-2 focus:ring-offset-2 focus:ring-[#134B8A]"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleValidate}
                        disabled={validating}
                        className="relative overflow-hidden group px-6 py-2.5 text-white rounded-xl flex items-center gap-2 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 font-bold focus:ring-2 focus:ring-offset-2 focus:ring-[#1E6B6B]"
                        style={{
                          background:
                            "linear-gradient(135deg, #059669, #1E6B6B)",
                        }}
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
                              Confirmar Validação{" "}
                              {!selectedDoc.batch && "e Criar Lote"}
                            </>
                          )}
                        </span>
                        <span className="absolute inset-0 -translate-x-full group-hover:translate-x-0 transition-transform duration-500 bg-gradient-to-r from-white/20 to-transparent" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
