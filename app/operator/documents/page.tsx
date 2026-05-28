/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/operator/documents/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import api from "@/src/services/api";
import {
  FileText,
  Brain,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Loader2,
  Search,
  Building2,
  Calendar,
  Shield,
  Eye,
  Sparkles,
  TrendingUp,
  Zap,
  ArrowRight,
  Plus,
  Package,
  CheckCircle2,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [extractingId, setExtractingId] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [editedData, setEditedData] = useState<any>({});
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [filterSupplier, setFilterSupplier] = useState<string>("all");

  // Estado do modal de criação de lote
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [creatingBatch, setCreatingBatch] = useState(false);
  const [batchSuccess, setBatchSuccess] = useState(false);
  const [batchForm, setBatchForm] = useState({
    batchId: "",
    productName: "",
    productDescription: "",
    quantity: "",
    unit: "",
  });

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
      // Usar o gateway correto do Pinata
      const url = `https://gateway.pinata.cloud/ipfs/${doc.ipfsHash}`;
      console.log("🔗 IPFS URL:", url);
      setPdfUrl(url);
    }
  };

  const handleValidate = async () => {
    if (!selectedDoc) return;
    setValidating(true);
    try {
      await api.post(`/documents/${selectedDoc.id}/validate`, {
        extractedData: editedData,
      });
      alert("✅ Documento validado e enviado para especialista!");
      setSelectedDoc(null);
      await fetchDocuments();
    } catch (error: any) {
      alert(error.response?.data?.message || "Erro ao validar");
    } finally {
      setValidating(false);
    }
  };

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchForm.batchId || !batchForm.productName) return;
    setCreatingBatch(true);
    try {
      await api.post("/batches", {
        batchId: batchForm.batchId,
        productName: batchForm.productName,
        productDescription: batchForm.productDescription || undefined,
        quantity: batchForm.quantity
          ? parseFloat(batchForm.quantity)
          : undefined,
        unit: batchForm.unit || undefined,
      });
      setBatchSuccess(true);
      setTimeout(() => {
        setBatchSuccess(false);
        setShowBatchModal(false);
        setBatchForm({
          batchId: "",
          productName: "",
          productDescription: "",
          quantity: "",
          unit: "",
        });
      }, 1800);
    } catch (error: any) {
      alert(error.response?.data?.message || "Erro ao criar lote");
    } finally {
      setCreatingBatch(false);
    }
  };

  const getStatusConfig = (status: string) => {
    const configs: Record<string, any> = {
      PENDING: {
        color: "text-amber-600",
        icon: Clock,
        label: "Aguardando IA",
        bg: "bg-amber-50",
        border: "border-amber-200",
        gradient: "from-amber-50 to-orange-50",
      },
      PROCESSING: {
        color: "text-blue-600",
        icon: Loader2,
        label: "Processando",
        bg: "bg-blue-50",
        border: "border-blue-200",
        gradient: "from-blue-50 to-indigo-50",
      },
      EXTRACTED: {
        color: "text-emerald-600",
        icon: Brain,
        label: "Pronto para Validar",
        bg: "bg-emerald-50",
        border: "border-emerald-200",
        gradient: "from-emerald-50 to-teal-50",
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

  // ✅ Lista única de fornecedores para filtro
  const uniqueSuppliers = Array.from(
    new Set(documents.map((doc) => doc.supplier.name)),
  );

  // ✅ Filtragem por busca e fornecedor
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header com gradiente */}
      <div className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <div className="flex justify-between items-center">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg">
                  <Shield className="w-4 h-4 text-white" />
                </div>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Painel do Operador
                </span>
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                Extração de Dados
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Processe documentos e extraia dados usando inteligência
                artificial
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowBatchModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl text-sm font-semibold shadow-md hover:shadow-lg transition-all duration-200"
              >
                <Plus className="w-4 h-4" />
                Novo Lote
              </button>
              <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl shadow-lg">
                <Shield className="w-4 h-4 text-white" />
                <span className="text-sm font-medium text-white">Operador</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Total Documentos</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {stats.total}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-xl">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Aguardando IA</p>
                <p className="text-3xl font-bold text-amber-600 mt-1">
                  {stats.pending}
                </p>
              </div>
              <div className="p-3 bg-amber-100 rounded-xl">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Prontos para Validar</p>
                <p className="text-3xl font-bold text-emerald-600 mt-1">
                  {stats.extracted}
                </p>
              </div>
              <div className="p-3 bg-emerald-100 rounded-xl">
                <Brain className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Barra de Busca e Filtro */}
        <div className="mb-6 flex flex-wrap gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por documento, fornecedor ou lote..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/50 backdrop-blur-sm transition-all"
            />
          </div>

          {/* ✅ Filtro por fornecedor */}
          {uniqueSuppliers.length > 0 && (
            <select
              value={filterSupplier}
              onChange={(e) => setFilterSupplier(e.target.value)}
              className="px-4 py-2.5 border border-gray-200 rounded-xl bg-white/50 backdrop-blur-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-700"
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

        {/* Lista de Documentos */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
            <p className="text-gray-500">Carregando documentos...</p>
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="text-center py-20 bg-white/50 backdrop-blur-sm rounded-2xl border border-gray-200">
            <FileText className="w-20 h-20 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-700">
              Nenhum documento pendente
            </h3>
            <p className="text-gray-400 mt-2">
              {searchTerm || filterSupplier !== "all"
                ? "Tente outros filtros de busca"
                : "Aguardando upload de fornecedores"}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredDocs.map((doc) => {
              const status = getStatusConfig(doc.processingStatus);
              const StatusIcon = status.icon;
              const typeConfig = getTypeLabel(doc.docType);

              return (
                <div
                  key={doc.id}
                  className={cn(
                    "bg-white rounded-xl shadow-sm border transition-all duration-300 hover:shadow-md hover:scale-[1.01]",
                    status.border,
                  )}
                >
                  <div className="p-5">
                    <div className="flex justify-between items-start flex-wrap gap-4">
                      <div className="flex gap-4 flex-1 min-w-0">
                        <div className={cn("p-3 rounded-xl", typeConfig.bg)}>
                          <FileText
                            className={cn("w-5 h-5", typeConfig.color)}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-2">
                            <h3 className="font-semibold text-gray-900 truncate">
                              {doc.originalName}
                            </h3>
                            <span
                              className={cn(
                                "text-xs px-2 py-1 rounded-full font-medium",
                                typeConfig.bg,
                                typeConfig.color,
                              )}
                            >
                              {typeConfig.label}
                            </span>
                            <span
                              className={cn(
                                "text-xs px-2 py-1 rounded-full flex items-center gap-1",
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
                          <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <Building2 className="w-3.5 h-3.5" />
                              {doc.supplier.name}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              {format(
                                new Date(doc.uploadedAt),
                                "dd/MM/yyyy HH:mm",
                                { locale: ptBR },
                              )}
                            </span>
                            {doc.batch ? (
                              <span className="flex items-center gap-1 text-emerald-600">
                                <Package className="w-3.5 h-3.5" />
                                Lote: {doc.batch.batchId}
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-amber-500">
                                <HelpCircle className="w-3.5 h-3.5" />
                                Sem lote associado
                              </span>
                            )}
                          </div>
                          {doc.confidenceScore && (
                            <div className="mt-3 flex items-center gap-2">
                              <span className="text-xs text-gray-500">
                                Confiança da IA:
                              </span>
                              <div className="flex-1 max-w-[200px] bg-gray-200 rounded-full h-2">
                                <div
                                  className={cn(
                                    "h-2 rounded-full transition-all duration-500",
                                    doc.confidenceScore >= 80
                                      ? "bg-emerald-500"
                                      : doc.confidenceScore >= 50
                                        ? "bg-amber-500"
                                        : "bg-red-500",
                                  )}
                                  style={{ width: `${doc.confidenceScore}%` }}
                                />
                              </div>
                              <span className="text-xs font-semibold">
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
                          className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-sm font-medium flex items-center gap-2 transition-all shadow-md hover:shadow-lg disabled:opacity-50"
                        >
                          {extractingId === doc.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Zap className="w-4 h-4" />
                          )}
                          Extrair com IA
                        </button>
                      )}

                      {doc.processingStatus === "EXTRACTED" && (
                        <button
                          onClick={() => handleOpenValidation(doc)}
                          className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-sm font-medium flex items-center gap-2 transition-all shadow-md hover:shadow-lg"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Validar Dados
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal de Validação */}
        {selectedDoc && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden animate-in zoom-in duration-300">
              {/* Modal Header */}
              <div className="p-6 border-b bg-gradient-to-r from-slate-50 to-gray-50">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl shadow-md">
                      <Shield className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">
                        Validar Documento
                      </h2>
                      <div className="flex items-center gap-2 mt-1">
                        <FileText className="w-3.5 h-3.5 text-gray-400" />
                        <p className="text-sm text-gray-500">
                          {selectedDoc.originalName}
                        </p>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedDoc(null)}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all duration-200"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="flex flex-col flex-1 h-[calc(90vh-100px)]">
                <div className="w-full flex flex-col flex-1 min-h-0 bg-white">
                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Botão de Visualizar PDF */}
                    {pdfUrl && (
                      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <FileText className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="text-sm font-semibold text-blue-900">
                              Documento Original
                            </h3>
                            <p className="text-xs text-blue-700 mt-0.5">
                              Fornecedor: {selectedDoc.supplier.name}
                            </p>
                          </div>
                        </div>
                        <a
                          href={pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-all shadow-sm"
                        >
                          <Eye className="w-4 h-4" />
                          Visualizar PDF
                        </a>
                      </div>
                    )}

                    {/* Card de Confiança */}
                    <div
                      className={cn(
                        "rounded-xl p-5 border-2 transition-all duration-300",
                        (selectedDoc.confidenceScore || 70) >= 80
                          ? "bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200"
                          : (selectedDoc.confidenceScore || 70) >= 50
                            ? "bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200"
                            : "bg-gradient-to-br from-red-50 to-orange-50 border-red-200",
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
                          <span className="text-sm font-semibold text-gray-700">
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
                        <div className="bg-white/50 rounded-full h-2.5 overflow-hidden">
                          <div
                            className={cn(
                              "h-2.5 rounded-full transition-all duration-500",
                              (selectedDoc.confidenceScore || 70) >= 80
                                ? "bg-emerald-500"
                                : (selectedDoc.confidenceScore || 70) >= 50
                                  ? "bg-amber-500"
                                  : "bg-red-500",
                            )}
                            style={{
                              width: `${selectedDoc.confidenceScore || 70}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Formulário de edição */}
                    <div className="space-y-5">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Nome do Produto
                          <span className="text-red-500 ml-1">*</span>
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
                          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900"
                          placeholder="Ex: Camisa Social Azul"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Quantidade
                            <span className="text-red-500 ml-1">*</span>
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
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Unidade
                            <span className="text-red-500 ml-1">*</span>
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
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="kg, L, un..."
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          CO₂ Emitido (kg)
                          <span className="text-red-500 ml-1">*</span>
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
                          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="0.00"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Fornecedor
                        </label>
                        <div className="relative">
                          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
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
                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                      </div>

                      {!selectedDoc.batch && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                          <div className="flex items-start gap-3">
                            <Package className="w-5 h-5 text-amber-600 mt-0.5" />
                            <div>
                              <p className="text-sm font-semibold text-amber-800">
                                Lote será criado automaticamente
                              </p>
                              <p className="text-xs text-amber-700 mt-1">
                                Após validar os dados, um lote será criado
                                automaticamente com base nas informações
                                fornecidas.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Modal Footer */}
                  <div className="p-6 border-t border-gray-200 flex justify-end gap-3 bg-gray-50 rounded-b-2xl">
                    <button
                      onClick={() => setSelectedDoc(null)}
                      className="px-6 py-2.5 border-2 border-gray-300 rounded-xl text-gray-700 font-semibold hover:bg-gray-100 transition-all"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleValidate}
                      disabled={validating}
                      className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl flex items-center gap-2 transition-all shadow-md hover:shadow-lg disabled:opacity-50 font-semibold"
                    >
                      {validating ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Validando...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          Confirmar Validação{" "}
                          {!selectedDoc.batch && "e Criar Lote"}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Criação de Lote */}
        {showBatchModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
              <div className="p-6 border-b bg-gradient-to-r from-emerald-50 to-teal-50">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-emerald-500 rounded-xl shadow-md">
                      <Package className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">
                        Criar Novo Lote
                      </h2>
                      <p className="text-sm text-gray-500 mt-0.5">
                        O lote ficará disponível para os fornecedores
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowBatchModal(false);
                      setBatchSuccess(false);
                    }}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {batchSuccess ? (
                <div className="p-12 flex flex-col items-center justify-center">
                  <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle2 className="w-10 h-10 text-emerald-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">
                    Lote Criado!
                  </h3>
                  <p className="text-gray-500 mt-2 text-center">
                    O lote <strong>{batchForm.batchId}</strong> já está
                    disponível para os fornecedores.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleCreateBatch} className="p-6 space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      ID do Lote <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={batchForm.batchId}
                      onChange={(e) =>
                        setBatchForm({
                          ...batchForm,
                          batchId: e.target.value
                            .toUpperCase()
                            .replace(/\s/g, "-"),
                        })
                      }
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-gray-900 font-mono"
                      placeholder="Ex: LOTE-2025-001"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Nome do Produto <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={batchForm.productName}
                      onChange={(e) =>
                        setBatchForm({
                          ...batchForm,
                          productName: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      placeholder="Ex: Polietileno Reciclado"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Descrição
                      <span className="text-gray-400 font-normal ml-1">
                        (opcional)
                      </span>
                    </label>
                    <textarea
                      rows={2}
                      value={batchForm.productDescription}
                      onChange={(e) =>
                        setBatchForm({
                          ...batchForm,
                          productDescription: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                      placeholder="Descreva o produto ou processo produtivo..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                        Quantidade
                        <span className="text-gray-400 font-normal ml-1">
                          (opcional)
                        </span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={batchForm.quantity}
                        onChange={(e) =>
                          setBatchForm({
                            ...batchForm,
                            quantity: e.target.value,
                          })
                        }
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                        Unidade
                        <span className="text-gray-400 font-normal ml-1">
                          (opcional)
                        </span>
                      </label>
                      <input
                        type="text"
                        value={batchForm.unit}
                        onChange={(e) =>
                          setBatchForm({ ...batchForm, unit: e.target.value })
                        }
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        placeholder="kg, L, un, t..."
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowBatchModal(false)}
                      className="px-5 py-2.5 border-2 border-gray-200 rounded-xl text-gray-700 font-semibold hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={
                        creatingBatch ||
                        !batchForm.batchId ||
                        !batchForm.productName
                      }
                      className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl font-semibold flex items-center gap-2 shadow-md disabled:opacity-50"
                    >
                      {creatingBatch ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />{" "}
                          Criando...
                        </>
                      ) : (
                        <>
                          <Package className="w-4 h-4" /> Criar Lote
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
