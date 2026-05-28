/* eslint-disable react-hooks/preserve-manual-memoization */
/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/supplier/documents/page.tsx
"use client";

import { cn } from "@/lib/utils";
import { useAuth } from "@/src/hooks/useAuth";
import api from "@/src/services/api";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  CloudUpload,
  FileText,
  Package,
  X,
  Shield,
  Database,
  Lock,
  ArrowRight,
  Loader2,
  Info,
  History,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  status: "uploading" | "done" | "error";
  progress: number;
  documentId?: string;
  ipfsHash?: string;
}

interface SubmittedDocument {
  id: string;
  originalName: string;
  docType: string;
  processingStatus: string;
  uploadedAt: string;
  ipfsHash?: string;
  batch?: {
    batchId: string;
    productName: string;
  };
}

// ACCEPTED_TYPES
const ACCEPTED_TYPES = {
  "application/pdf": "PDF",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "XLSX",
  "application/vnd.ms-excel": "XLS",
  "text/xml": "XML",
  "application/xml": "XML",
  "image/jpeg": "JPG",
  "image/png": "PNG",
};

const UNIQUE_FILE_TYPES = Array.from(new Set(Object.values(ACCEPTED_TYPES)));

const getStatusConfig = (status: string) => {
  const statusMap: Record<string, { label: string; color: string; icon: any }> =
    {
      PENDING: {
        label: "Aguardando",
        color: "bg-yellow-100 text-yellow-800",
        icon: Clock,
      },
      PROCESSING: {
        label: "Processando",
        color: "bg-blue-100 text-blue-800",
        icon: Loader2,
      },
      EXTRACTED: {
        label: "Dados Extraídos",
        color: "bg-indigo-100 text-indigo-800",
        icon: CheckCircle,
      },
      VALIDATED: {
        label: "Validado",
        color: "bg-green-100 text-green-800",
        icon: CheckCircle,
      },
      ON_CHAIN: {
        label: "Na Blockchain",
        color: "bg-emerald-100 text-emerald-800",
        icon: CheckCircle2,
      },
      REJECTED: {
        label: "Rejeitado",
        color: "bg-red-100 text-red-800",
        icon: XCircle,
      },
      NEEDS_REVIEW: {
        label: "Necessita Revisão",
        color: "bg-orange-100 text-orange-800",
        icon: AlertCircle,
      },
    };
  return (
    statusMap[status] || {
      label: status,
      color: "bg-gray-100 text-gray-800",
      icon: FileText,
    }
  );
};

export default function SupplierDocumentsPage() {
  const { user } = useAuth();
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [submittedDocuments, setSubmittedDocuments] = useState<
    SubmittedDocument[]
  >([]);
  const [docType, setDocType] = useState("INVOICE");
  const [uploading, setUploading] = useState(false);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ✅ Função para buscar documentos
  const fetchSubmittedDocuments = useCallback(async () => {
    if (!user?.companyId) return;

    setLoadingDocs(true);
    try {
      const response = await api.get("/documents", {
        params: { supplierId: user.companyId },
      });
      setSubmittedDocuments(response.data);
    } catch (error: any) {
      console.error("Erro ao buscar documentos:", error);
    } finally {
      setLoadingDocs(false);
    }
  }, [user?.companyId]);

  useEffect(() => {
    const abortController = new AbortController();

    const loadDocuments = async () => {
      if (!user?.companyId) return;

      setLoadingDocs(true);
      try {
        const response = await api.get("/documents", {
          params: { supplierId: user.companyId },
          signal: abortController.signal,
        });
        if (!abortController.signal.aborted) {
          setSubmittedDocuments(response.data);
        }
      } catch (error: any) {
        if (error.name !== "CanceledError" && error.name !== "AbortError") {
          console.error("Erro ao buscar documentos:", error);
        }
      } finally {
        if (!abortController.signal.aborted) {
          setLoadingDocs(false);
        }
      }
    };

    loadDocuments();

    return () => abortController.abort();
  }, [user?.companyId]);

  const handleUpload = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("docType", docType);

    if (user?.companyId) {
      formData.append("supplierId", user.companyId);
    }

    const response = await api.post("/documents/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    return response.data;
  };

  const handleFiles = useCallback(
    async (fileList: FileList) => {
      const newFiles = Array.from(fileList).map((file) => ({
        id: crypto.randomUUID(),
        name: file.name,
        size: file.size,
        type: file.type,
        status: "uploading" as const,
        progress: 0,
      }));

      setFiles((prev) => [...prev, ...newFiles]);
      setUploading(true);
      setErrorMessage(null);
      setUploadSuccess(false);

      for (const fileObj of newFiles) {
        const file = Array.from(fileList).find((f) => f.name === fileObj.name);
        if (!file) continue;

        try {
          const interval = setInterval(() => {
            setFiles((prev) =>
              prev.map((f) =>
                f.id === fileObj.id
                  ? { ...f, progress: Math.min(f.progress + 10, 90) }
                  : f,
              ),
            );
          }, 200);

          const result = await handleUpload(file);
          clearInterval(interval);

          setFiles((prev) =>
            prev.map((f) =>
              f.id === fileObj.id
                ? {
                    ...f,
                    status: "done",
                    progress: 100,
                    documentId: result.id,
                    ipfsHash: result.ipfsHash,
                  }
                : f,
            ),
          );
        } catch (error: any) {
          console.error("Upload error:", error);
          setErrorMessage(error.response?.data?.message || "Erro no upload");
          setFiles((prev) =>
            prev.map((f) =>
              f.id === fileObj.id ? { ...f, status: "error", progress: 0 } : f,
            ),
          );

          setTimeout(() => {
            setFiles((prev) => prev.filter((f) => f.id !== fileObj.id));
          }, 3000);
        }
      }

      setUploading(false);

      // Verificar se todos os arquivos foram enviados com sucesso
      setTimeout(() => {
        setFiles((currentFiles) => {
          const allSuccess = currentFiles.every((f) => f.status === "done");
          if (allSuccess && currentFiles.length > 0) {
            setUploadSuccess(true);
            setTimeout(() => setUploadSuccess(false), 5000);
            // Recarregar lista de documentos
            fetchSubmittedDocuments();
            // Limpar arquivos da lista após 2 segundos
            setTimeout(() => {
              setFiles([]);
            }, 2000);
          }
          return currentFiles;
        });
      }, 500);
    },
    [docType, fetchSubmittedDocuments],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles],
  );

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const successCount = files.filter((f) => f.status === "done").length;
  const errorCount = files.filter((f) => f.status === "error").length;

  const getDocTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      INVOICE: "Nota Fiscal",
      CARBON_REPORT: "Relatório de Carbono",
      CERTIFICATE: "Certificado",
      TRANSPORT: "Conhecimento de Transporte",
      OTHER: "Outros",
    };
    return types[type] || type;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-lg">
                  <Shield className="w-4 h-4 text-white" />
                </div>
                <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">
                  Upload Seguro
                </span>
              </div>
              <h1 className="text-2xl font-bold text-gray-800">
                Envio de Documentos
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                Seus documentos serão processados e associados a um lote
              </p>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-xl">
              <Building2 className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">
                {user?.companyName || "Fornecedor"}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Cards de Status */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <Package className="w-5 h-5 text-emerald-500 mb-2" />
            <p className="text-gray-500 text-xs">Status</p>
            <p className="text-gray-800 font-semibold">
              Aguardando Processamento
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <Database className="w-5 h-5 text-blue-500 mb-2" />
            <p className="text-gray-500 text-xs">Documentos Enviados</p>
            <p className="text-gray-800 font-semibold">
              {submittedDocuments.length}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <Lock className="w-5 h-5 text-purple-500 mb-2" />
            <p className="text-gray-500 text-xs">Armazenamento</p>
            <p className="text-gray-800 font-semibold text-sm">
              IPFS + Blockchain
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <History className="w-5 h-5 text-orange-500 mb-2" />
            <p className="text-gray-500 text-xs">Último Envio</p>
            <p className="text-gray-800 font-semibold text-sm">
              {submittedDocuments[0]?.uploadedAt
                ? format(
                    new Date(submittedDocuments[0].uploadedAt),
                    "dd/MM/yyyy",
                  )
                : "Nenhum"}
            </p>
          </div>
        </div>

        {/* Toast de Sucesso */}
        {uploadSuccess && (
          <div className="fixed top-20 right-4 z-50 animate-in slide-in-from-top-5 duration-300">
            <div className="bg-emerald-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              <span>Documento enviado com sucesso!</span>
            </div>
          </div>
        )}

        {/* Mensagem de Erro */}
        {errorMessage && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            {errorMessage}
          </div>
        )}

        {/* Informação sobre o Lote */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-500 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-blue-800">
                Como funciona o processo?
              </h3>
              <p className="text-sm text-blue-700 mt-1">
                1. Você envia os documentos aqui
                <br />
                2. O operador processa e extrai os dados
                <br />
                3. O especialista cria o lote e registra na blockchain
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Formulário de Upload */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              Novo Documento
            </h2>

            <div className="mb-4">
              <label className="block text-sm text-gray-700 mb-2">
                Tipo de Documento *
              </label>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-800 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="INVOICE">Nota Fiscal (NF-e/XML)</option>
                <option value="CARBON_REPORT">Relatório de Carbono</option>
                <option value="CERTIFICATE">Certificado</option>
                <option value="TRANSPORT">Conhecimento de Transporte</option>
                <option value="OTHER">Outros</option>
              </select>
            </div>

            {/* Área de Upload */}
            <div
              onDrop={onDrop}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onClick={() => inputRef.current?.click()}
              className={cn(
                "relative flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed py-8 cursor-pointer transition-all",
                isDragging
                  ? "border-emerald-500 bg-emerald-50 scale-[1.02]"
                  : "border-gray-300 bg-gray-50 hover:border-emerald-400 hover:bg-emerald-50/50",
                uploading && "opacity-50 cursor-wait",
              )}
            >
              <input
                ref={inputRef}
                type="file"
                multiple
                accept=".pdf,.xlsx,.xls,.xml,.jpg,.jpeg,.png"
                className="hidden"
                onChange={(e) => e.target.files && handleFiles(e.target.files)}
                disabled={uploading}
              />

              {uploading ? (
                <Loader2 className="w-12 h-12 animate-spin text-emerald-500" />
              ) : (
                <CloudUpload
                  className={cn(
                    "w-12 h-12",
                    isDragging ? "text-emerald-500" : "text-gray-400",
                  )}
                />
              )}
              <div className="text-center">
                <p className="text-gray-700 font-medium">
                  {uploading
                    ? "Enviando arquivos..."
                    : "Arraste e solte arquivos aqui"}
                </p>
                <p className="text-gray-400 text-sm mt-1">
                  {uploading
                    ? "Aguarde, isso pode levar alguns segundos"
                    : "ou clique para selecionar"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                {UNIQUE_FILE_TYPES.map((type) => (
                  <span
                    key={type}
                    className="text-xs px-2 py-1 bg-gray-100 rounded text-gray-600"
                  >
                    {type}
                  </span>
                ))}
              </div>
            </div>

            {/* Lista de Arquivos em Upload */}
            {files.length > 0 && (
              <div className="mt-4">
                <div className="flex justify-between items-center mb-2">
                  <p className="text-gray-600 text-sm">
                    {uploading ? "Enviando" : "Prontos"} ({successCount}/
                    {files.length})
                  </p>
                  {!uploading && successCount === files.length && (
                    <button
                      onClick={() => setFiles([])}
                      className="text-red-500 text-xs hover:text-red-600"
                    >
                      Limpar todos
                    </button>
                  )}
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {files.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <FileText className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-800 text-sm truncate">
                          {file.name}
                        </p>
                        {file.status === "uploading" && (
                          <>
                            <div className="mt-1 h-1 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-emerald-500 rounded-full transition-all"
                                style={{ width: `${file.progress}%` }}
                              />
                            </div>
                            <p className="text-gray-400 text-xs mt-1">
                              Enviando... {file.progress}%
                            </p>
                          </>
                        )}
                        {file.status === "done" && (
                          <p className="text-emerald-600 text-xs flex items-center gap-1 mt-1">
                            <CheckCircle2 className="w-3 h-3" />
                            {files.length > 1
                              ? "Documento enviado com sucesso"
                              : "Enviado com sucesso"}
                          </p>
                        )}
                        {file.status === "error" && (
                          <p className="text-red-500 text-xs mt-1">
                            Erro no upload
                          </p>
                        )}
                      </div>
                      <span className="text-gray-400 text-xs flex-shrink-0">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </span>
                      {file.status === "done" && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      )}
                      {file.status === "error" && (
                        <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                      )}
                      {!uploading &&
                        file.status !== "uploading" &&
                        file.status !== "done" && (
                          <button
                            onClick={() => removeFile(file.id)}
                            className="text-gray-400 hover:text-red-500 flex-shrink-0"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                    </div>
                  ))}
                </div>
                {errorCount > 0 && (
                  <p className="text-red-500 text-xs mt-2">
                    {errorCount} arquivo(s) com erro. Tente novamente.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Lista de Documentos Enviados */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-800">
                Histórico de Documentos
              </h2>
              <button
                onClick={fetchSubmittedDocuments}
                disabled={loadingDocs}
                className="text-gray-400 hover:text-emerald-500 transition-colors"
              >
                <RefreshCw
                  className={cn("w-4 h-4", loadingDocs && "animate-spin")}
                />
              </button>
            </div>

            {loadingDocs ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
              </div>
            ) : submittedDocuments.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Nenhum documento enviado ainda</p>
                <p className="text-gray-400 text-sm mt-1">
                  Envie seus documentos através do formulário ao lado
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {submittedDocuments.map((doc) => {
                  const statusConfig = getStatusConfig(doc.processingStatus);
                  const StatusIcon = statusConfig.icon;
                  return (
                    <div
                      key={doc.id}
                      className="p-3 bg-gray-50 rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <FileText className="w-4 h-4 text-gray-400" />
                            <p className="font-medium text-gray-800 text-sm truncate">
                              {doc.originalName}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2 text-xs">
                            <span className="px-2 py-0.5 bg-gray-200 rounded text-gray-600">
                              {getDocTypeLabel(doc.docType)}
                            </span>
                            <span
                              className={cn(
                                "px-2 py-0.5 rounded flex items-center gap-1",
                                statusConfig.color,
                              )}
                            >
                              <StatusIcon
                                className={cn(
                                  "w-3 h-3",
                                  doc.processingStatus === "PROCESSING" &&
                                    "animate-spin",
                                )}
                              />
                              {statusConfig.label}
                            </span>
                          </div>
                          <p className="text-gray-400 text-xs mt-2">
                            {format(
                              new Date(doc.uploadedAt),
                              "dd/MM/yyyy 'às' HH:mm",
                              { locale: ptBR },
                            )}
                          </p>
                          {doc.batch && (
                            <p className="text-emerald-600 text-xs mt-1">
                              Lote: {doc.batch.batchId}
                            </p>
                          )}
                        </div>
                        {doc.ipfsHash && (
                          <a
                            href={`https://gateway.pinata.cloud/ipfs/${doc.ipfsHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-400 hover:text-emerald-500"
                            title="Ver no IPFS"
                          >
                            <Eye className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
