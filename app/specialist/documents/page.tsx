/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/specialist/documents/page.tsx
"use client";

import { useEffect, useState } from "react";
import api from "@/src/services/api";
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
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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
        // Verificar se já está conectado
        window.ethereum?.request({ method: 'eth_accounts' }).then((accounts: any) => {
          if (accounts && accounts.length > 0) {
            setMetaMaskConnected(true);
            console.log("✅ MetaMask já conectado:", accounts[0]);
          }
        }).catch(console.error);
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

    // ✅ Verificar/Conectar MetaMask antes de registrar
    const isConnected = await connectMetaMask();
    if (!isConnected) return;

    setRegistering(true);
    setError(null);

    try {
      const payload = {
        notes: reason || "Documento aprovado pelo especialista"
      };

      console.log("📤 Enviando requisição para:", `/documents/${selectedDoc.id}/blockchain/register`);
      console.log("📦 Payload:", payload);

      const response = await api.post(`/documents/${selectedDoc.id}/blockchain/register`, payload);

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
      alert(`Erro ao rejeitar: ${error.response?.data?.message || error.message}`);
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

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <div className="flex justify-between items-center">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="p-2 bg-emerald-50 rounded-xl">
                  <Shield className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-800 tracking-tight">
                    Validação Blockchain
                  </h1>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Análise técnica de documentos para registro imutável
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {/* Indicador de status do MetaMask */}
              {!metaMaskInstalled ? (
                <div className="flex items-center gap-2 px-4 py-2 bg-red-50 rounded-full">
                  <div className="w-2 h-2 bg-red-500 rounded-full" />
                  <span className="text-sm font-medium text-red-700">
                    ⚠️ MetaMask não detectado
                  </span>
                </div>
              ) : metaMaskConnected ? (
                <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 rounded-full">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="text-sm font-medium text-emerald-700">
                    🔗 MetaMask Conectado
                  </span>
                </div>
              ) : (
                <button
                  onClick={connectMetaMask}
                  className="flex items-center gap-2 px-4 py-2 bg-amber-50 hover:bg-amber-100 rounded-full transition-colors"
                >
                  <div className="w-2 h-2 bg-amber-500 rounded-full" />
                  <span className="text-sm font-medium text-amber-700">
                    🦊 Conectar MetaMask
                  </span>
                </button>
              )}
              <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 px-3 py-1.5 rounded-full">
                <UserCheck className="w-4 h-4" />
                <span>Operação Segura</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Cards de Métricas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">
                  Documentos Pendentes
                </p>
                <p className="text-3xl font-bold text-gray-800 mt-1">
                  {stats.pending}
                </p>
              </div>
              <div className="p-3 bg-amber-50 rounded-xl">
                <Clock className="w-6 h-6 text-amber-500" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
              <div className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
              <span>Aguardando validação especializada</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">
                  Total na Blockchain
                </p>
                <p className="text-3xl font-bold text-gray-800 mt-1">
                  {stats.approved}
                </p>
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl">
                <FileCheck className="w-6 h-6 text-emerald-500" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
              <span>Documentos registrados com sucesso</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">
                  CO₂ Estimado
                </p>
                <p className="text-3xl font-bold text-gray-800 mt-1">
                  {Math.round(stats.co2Saved)} kg
                </p>
              </div>
              <div className="p-3 bg-teal-50 rounded-xl">
                <Leaf className="w-6 h-6 text-teal-500" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
              <div className="w-1.5 h-1.5 bg-teal-400 rounded-full" />
              <span>Emissões mapeadas nos lotes</span>
            </div>
          </div>
        </div>

        {/* Mensagem de erro */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
            <AlertTriangle className="w-5 h-5 inline mr-2" />
            {error}
          </div>
        )}

        {/* Barra de Pesquisa */}
        <div className="mb-8">
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por documento ou fornecedor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-gray-700 placeholder:text-gray-400"
            />
          </div>
        </div>

        {/* Lista de Documentos */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl">
            <Loader2 className="w-10 h-10 animate-spin text-emerald-500 mb-4" />
            <p className="text-gray-500 font-medium">
              Carregando documentos pendentes...
            </p>
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-10 h-10 text-gray-300" />
            </div>
            <p className="text-gray-500 font-medium">
              Nenhum documento aguardando revisão
            </p>
            <p className="text-sm text-gray-400 mt-1">
              Todos os documentos foram processados
            </p>
            <button
              onClick={fetchDocuments}
              className="mt-4 text-emerald-600 text-sm hover:text-emerald-700"
            >
              🔄 Atualizar lista
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredDocs.map((doc) => (
              <div
                key={doc.id}
                onClick={() => setSelectedDoc(doc)}
                className="group bg-white rounded-xl border border-gray-100 p-5 hover:shadow-lg hover:border-emerald-200 transition-all duration-200 cursor-pointer"
              >
                <div className="flex items-start gap-4">
                  <div className="p-2.5 bg-emerald-50 rounded-xl group-hover:bg-emerald-100 transition-colors">
                    <FileText className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-3 mb-1.5">
                      <h3 className="font-semibold text-gray-800 text-lg tracking-tight">
                        {doc.originalName}
                      </h3>
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 bg-green-50 text-green-700 rounded-full">
                        <CheckCircle className="w-3.5 h-3.5" />
                        {doc.processingStatus === "VALIDATED" ? "Pré-validado Operador" : doc.processingStatus}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1.5">
                        <Building2 className="w-4 h-4 text-gray-400" />
                        {doc.supplier.name}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        {format(new Date(doc.uploadedAt), "dd/MM/yyyy", {
                          locale: ptBR,
                        })}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <div className="w-1 h-1 bg-gray-300 rounded-full" />
                        Lote: {doc.batch?.batchId || "N/A"}
                      </span>
                      {doc.extractedData?.co2Emitted && (
                        <span className="flex items-center gap-1.5 text-teal-600">
                          <Leaf className="w-4 h-4" />
                          CO₂: {doc.extractedData.co2Emitted} kg
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-sm text-emerald-600 font-medium">
                      Analisar
                    </span>
                    <ChevronRight className="w-4 h-4 text-emerald-600" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal de Revisão */}
        {selectedDoc && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
              {/* Header do Modal */}
              <div className="p-6 border-b bg-gradient-to-r from-gray-50 to-white flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-100 rounded-xl">
                    <Shield className="w-5 h-5 text-emerald-700" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">
                      Revisão Especializada
                    </h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Análise técnica para registro blockchain
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedDoc(null)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <XCircle className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                </button>
              </div>

              {/* Conteúdo do Modal */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)] space-y-5">
                {/* Informações do Documento */}
                <div className="bg-gray-50/80 rounded-xl p-5 border border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    INFORMAÇÕES DO DOCUMENTO
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500 text-xs">Arquivo</p>
                      <p className="font-medium text-gray-800 mt-0.5">
                        {selectedDoc.originalName}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Fornecedor</p>
                      <p className="font-medium text-gray-800 mt-0.5">
                        {selectedDoc.supplier.name}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">CNPJ</p>
                      <p className="font-medium text-gray-800 mt-0.5">
                        {selectedDoc.supplier.cnpj}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Lote / Produto</p>
                      <p className="font-medium text-gray-800 mt-0.5">
                        {selectedDoc.batch?.batchId || "N/A"} •{" "}
                        {selectedDoc.batch?.productName || "N/A"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Dados Extraídos */}
                {selectedDoc.extractedData && (
                  <div className="bg-gradient-to-br from-emerald-50/40 to-teal-50/40 rounded-xl p-5 border border-emerald-100">
                    <h3 className="text-sm font-semibold text-emerald-800 uppercase tracking-wide mb-3 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      DADOS EXTRAÍOS DO DOCUMENTO
                    </h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="bg-white/60 rounded-lg p-2.5">
                        <p className="text-gray-500 text-xs">Produto</p>
                        <p className="font-semibold text-gray-800 mt-0.5">
                          {selectedDoc.extractedData.productName || "N/A"}
                        </p>
                      </div>
                      <div className="bg-white/60 rounded-lg p-2.5">
                        <p className="text-gray-500 text-xs">Quantidade</p>
                        <p className="font-semibold text-gray-800 mt-0.5">
                          {selectedDoc.extractedData.quantity || "N/A"}{" "}
                          {selectedDoc.extractedData.unit || ""}
                        </p>
                      </div>
                      <div className="bg-white/60 rounded-lg p-2.5 col-span-2">
                        <p className="text-gray-500 text-xs">
                          Emissão de CO₂ Estimada
                        </p>
                        <p className="font-semibold text-teal-700 mt-0.5 flex items-center gap-1.5">
                          <Leaf className="w-4 h-4" />
                          {selectedDoc.extractedData.co2Emitted || "N/A"} kg CO₂
                          equivalente
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Observações */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    Parecer Técnico
                  </label>
                  <textarea
                    rows={4}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Descreva sua análise detalhada, pontos de validação ou motivo da rejeição..."
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all text-gray-700 placeholder:text-gray-400 resize-none"
                  />
                  <p className="text-xs text-gray-400 mt-2">
                    O parecer será registrado no histórico do documento
                  </p>
                </div>
              </div>

              {/* Footer com Botões */}
              <div className="p-6 border-t bg-gray-50/50 flex justify-end gap-3">
                {!metaMaskConnected && metaMaskInstalled && (
                  <div className="flex-1 text-sm text-amber-600 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Conecte o MetaMask para registrar na blockchain
                  </div>
                )}
                <button
                  onClick={handleReject}
                  disabled={registering}
                  className="px-5 py-2.5 bg-white border border-red-200 text-red-600 rounded-xl flex items-center gap-2 hover:bg-red-50 hover:border-red-300 transition-all font-medium disabled:opacity-50"
                >
                  <XCircle className="w-4 h-4" />
                  Rejeitar Documento
                </button>
                <button
                  onClick={handleApprove}
                  disabled={registering || !metaMaskConnected}
                  className={`px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all font-medium ${
                    metaMaskConnected
                      ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm hover:shadow-md"
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  } disabled:opacity-50`}
                >
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
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
