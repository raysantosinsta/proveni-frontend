/* eslint-disable react-hooks/preserve-manual-memoization */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { cn } from "@/lib/utils";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  CloudUpload,
  FileText,
  Package,
  Shield,
  Eye,
  Clock,
  Loader2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import api from "@/services/api";
import { useAuth } from "@/hooks/useAuth";

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
  const statusMap: Record<
    string,
    { label: string; color: string; bg: string; icon: any }
  > = {
    PENDING: {
      label: "Aguardando",
      color: "text-yellow-700",
      bg: "bg-yellow-50",
      icon: Clock,
    },
    PROCESSING: {
      label: "Processando",
      color: "text-blue-700",
      bg: "bg-blue-50",
      icon: Loader2,
    },
    EXTRACTED: {
      label: "Dados Extraídos",
      color: "text-indigo-700",
      bg: "bg-indigo-50",
      icon: CheckCircle2,
    },
    VALIDATED: {
      label: "Validado",
      color: "text-green-700",
      bg: "bg-green-50",
      icon: CheckCircle2,
    },
    ON_CHAIN: {
      label: "Na Blockchain",
      color: "text-emerald-700",
      bg: "bg-emerald-50",
      icon: Shield,
    },
    REJECTED: {
      label: "Rejeitado",
      color: "text-red-700",
      bg: "bg-red-50",
      icon: X,
    },
    NEEDS_REVIEW: {
      label: "Necessita Revisão",
      color: "text-orange-700",
      bg: "bg-orange-50",
      icon: AlertCircle,
    },
  };
  return (
    statusMap[status] || {
      label: status,
      color: "text-gray-700",
      bg: "bg-gray-50",
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
    fetchSubmittedDocuments();
  }, [fetchSubmittedDocuments]);

  const handleUpload = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("docType", docType);
    if (user?.companyId) formData.append("supplierId", user.companyId);

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
                  ? { ...f, progress: Math.min(f.progress + 12, 92) }
                  : f,
              ),
            );
          }, 180);

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
        }
      }

      setUploading(false);

      setTimeout(() => {
        const allSuccess = files.every((f) => f.status === "done");
        if (allSuccess && files.length > 0) {
          setUploadSuccess(true);
          setTimeout(() => setUploadSuccess(false), 4000);
          fetchSubmittedDocuments();
          setTimeout(() => setFiles([]), 2500);
        }
      }, 600);
    },
    [docType, user?.companyId, fetchSubmittedDocuments],
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 overflow-hidden relative">
      {/* Gradient Orbs Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div
          className="absolute -left-40 top-20 w-96 h-96 rounded-full animate-blob mix-blend-multiply filter blur-3xl opacity-20"
          style={{ backgroundColor: "#0A2540" }}
        />
        <div
          className="absolute -right-40 bottom-40 w-[28rem] h-[28rem] rounded-full animate-blob animation-delay-200 mix-blend-multiply filter blur-3xl opacity-20"
          style={{ backgroundColor: "#1E6B6B" }}
        />
        <div
          className="absolute left-1/3 top-1/2 w-80 h-80 rounded-full animate-blob animation-delay-300 mix-blend-multiply filter blur-3xl opacity-20"
          style={{ backgroundColor: "#7C3AED" }}
        />
      </div>

      {/* Glassmorphism Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="p-3 rounded-2xl"
              style={{
                background: "linear-gradient(135deg, #134B8A, #1E6B6B)",
              }}
            >
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-xs font-bold tracking-widest text-[#1E6B6B] uppercase">
                CarbonChain ESG
              </span>
              <h1 className="text-3xl font-bold text-[#0A2540]">Documentos</h1>
            </div>
          </div>

          <div className="flex items-center gap-3 px-5 py-2.5 bg-white rounded-2xl border border-gray-200 shadow-sm">
            <Building2 className="w-5 h-5 text-[#1E6B6B]" />
            <span className="font-semibold text-gray-800">
              {user?.companyName || "Fornecedor"}
            </span>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 pt-12 pb-20 relative z-10">
        {/* Hero */}
        <div className="text-center mb-16 animate-fade-up">
          <div className="inline-flex items-center gap-2 px-5 py-2 bg-[#EDE9FE] text-[#7C3AED] rounded-full text-sm font-bold mb-6">
            Fornecedor • Confiança Digital
          </div>
          <h2 className="text-5xl font-bold text-[#0A2540] tracking-tighter mb-4">
            Envie com segurança.
            <br />
            Rastreie com transparência.
          </h2>
          <p className="text-xl text-gray-700 max-w-2xl mx-auto">
            Seus documentos são criptografados, processados e registrados na
            blockchain.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Upload Card */}
          <div className="lg:col-span-7">
            <div className="bg-white rounded-3xl shadow-xl border border-gray-200 p-10 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
              <div className="flex items-center gap-4 mb-8">
                <div
                  className="p-4 rounded-2xl"
                  style={{ backgroundColor: "#D4EAEA" }}
                >
                  <CloudUpload
                    className="w-9 h-9"
                    style={{ color: "#1E6B6B" }}
                  />
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-[#0A2540]">
                    Novo Envio
                  </h3>
                  <p className="text-gray-600 font-medium mt-1">
                    IPFS + Blockchain • Auditável
                  </p>
                </div>
              </div>

              <div className="mb-8">
                <label className="block text-sm font-bold text-gray-800 mb-2">
                  Tipo de Documento
                </label>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="w-full px-5 py-4 bg-white border-2 border-gray-300 rounded-2xl focus:ring-2 focus:ring-[#134B8A] focus:border-[#134B8A] text-gray-900 font-medium text-base"
                >
                  <option value="INVOICE">Nota Fiscal (NF-e / XML)</option>
                  <option value="CARBON_REPORT">Relatório de Carbono</option>
                  <option value="CERTIFICATE">Certificado</option>
                  <option value="TRANSPORT">Conhecimento de Transporte</option>
                  <option value="OTHER">Outros</option>
                </select>
              </div>

              {/* Dropzone */}
              <div
                onDrop={onDrop}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onClick={() => inputRef.current?.click()}
                className={cn(
                  "relative border-2 border-dashed rounded-3xl py-20 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 group",
                  isDragging
                    ? "border-[#1E6B6B] bg-[#F0F9F9] scale-[1.01]"
                    : "border-gray-300 hover:border-[#1E6B6B] hover:bg-gray-50",
                )}
              >
                <input
                  ref={inputRef}
                  type="file"
                  multiple
                  accept=".pdf,.xlsx,.xls,.xml,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={(e) =>
                    e.target.files && handleFiles(e.target.files)
                  }
                  disabled={uploading}
                />

                {uploading ? (
                  <Loader2
                    className="w-20 h-20 animate-spin mb-6"
                    style={{ color: "#1E6B6B" }}
                  />
                ) : (
                  <CloudUpload
                    className="w-20 h-20 mb-6 transition-transform group-hover:scale-110"
                    style={{ color: "#64748B" }}
                  />
                )}

                <p className="text-2xl font-semibold text-gray-800 mb-2 text-center">
                  {uploading
                    ? "Enviando para a rede..."
                    : "Arraste ou clique para enviar"}
                </p>
                <p className="text-gray-600 font-medium">
                  PDF, XML, XLSX, JPG • Até 50MB
                </p>

                <div className="flex flex-wrap gap-2 mt-8">
                  {UNIQUE_FILE_TYPES.map((type) => (
                    <span
                      key={type}
                      className="text-xs font-semibold px-4 py-1.5 bg-white border border-gray-300 rounded-full text-gray-700"
                    >
                      {type}
                    </span>
                  ))}
                </div>
              </div>

              {/* Upload List */}
              {files.length > 0 && (
                <div className="mt-8 space-y-3 max-h-80 overflow-y-auto pr-2">
                  {files.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center gap-4 bg-gray-50 rounded-2xl p-5 border border-gray-200"
                    >
                      <FileText className="w-5 h-5 text-[#1E6B6B] flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-800 truncate">
                          {file.name}
                        </p>
                        {file.status === "uploading" && (
                          <>
                            <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-[#1E6B6B] transition-all duration-200 rounded-full"
                                style={{ width: `${file.progress}%` }}
                              />
                            </div>
                            <p className="text-xs font-medium text-gray-600 mt-1">
                              {file.progress}% enviado
                            </p>
                          </>
                        )}
                        {file.status === "done" && (
                          <p className="text-emerald-700 text-sm font-semibold flex items-center gap-1 mt-1">
                            <CheckCircle2 className="w-4 h-4" /> Enviado com
                            sucesso
                          </p>
                        )}
                        {file.status === "error" && (
                          <p className="text-red-700 text-sm font-semibold mt-1">
                            Erro ao enviar
                          </p>
                        )}
                      </div>
                      <div className="text-xs font-medium text-gray-500">
                        {(file.size / 1024 / 1024).toFixed(1)} MB
                      </div>
                      {file.status !== "uploading" && (
                        <button
                          onClick={() => removeFile(file.id)}
                          className="text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-5 space-y-8">
            {/* Como funciona */}
            <div className="bg-white rounded-3xl p-8 border border-gray-200 shadow-sm">
              <h4 className="font-bold text-xl mb-6 text-[#0A2540] flex items-center gap-3">
                <Shield className="w-6 h-6 text-[#1E6B6B]" />
                Como funciona
              </h4>
              <div className="space-y-6">
                {[
                  "Upload criptografado",
                  "Extração automática de dados",
                  "Validação humana + IA",
                  "Registro imutável na Blockchain",
                ].map((text, i) => (
                  <div key={i} className="flex gap-4">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 text-[#7C3AED]"
                      style={{ backgroundColor: "#EDE9FE" }}
                    >
                      {i + 1}
                    </div>
                    <p className="text-gray-700 font-medium pt-0.5">{text}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Histórico - Últimos Envios */}
            <div className="bg-white rounded-3xl p-8 border border-gray-200 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h4 className="font-bold text-xl text-[#0A2540]">
                  Últimos Envios
                </h4>
                <button
                  onClick={fetchSubmittedDocuments}
                  disabled={loadingDocs}
                  className="text-gray-500 hover:text-[#1E6B6B] transition-colors"
                >
                  <Clock
                    className={cn("w-5 h-5", loadingDocs && "animate-spin")}
                  />
                </button>
              </div>

              {loadingDocs ? (
                <div className="flex justify-center py-12">
                  <Loader2
                    className="w-8 h-8 animate-spin"
                    style={{ color: "#1E6B6B" }}
                  />
                </div>
              ) : submittedDocuments.length === 0 ? (
                <div className="text-center py-12 text-gray-500 font-medium">
                  Nenhum documento enviado ainda
                </div>
              ) : (
                <div className="space-y-6">
                  {submittedDocuments.slice(0, 4).map((doc) => {
                    const status = getStatusConfig(doc.processingStatus);
                    const StatusIcon = status.icon;

                    return (
                      <div
                        key={doc.id}
                        className="flex justify-between items-start border-b border-gray-200 pb-5 last:border-0 last:pb-0 group"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-gray-800 text-[15px] truncate pr-4 group-hover:text-[#0A2540] transition-colors">
                            {doc.originalName}
                          </p>

                          <div className="flex items-center gap-2 mt-2">
                            <p className="text-sm font-medium text-gray-600">
                              {format(new Date(doc.uploadedAt), "dd MMM yyyy", {
                                locale: ptBR,
                              })}
                            </p>
                            <span className="text-gray-400">•</span>
                            <p className="text-sm font-medium text-gray-600">
                              {format(new Date(doc.uploadedAt), "HH:mm", {
                                locale: ptBR,
                              })}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          {doc.ipfsHash && (
                            <a
                              href={`https://gateway.pinata.cloud/ipfs/${doc.ipfsHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[#1E6B6B] hover:text-[#134B8A] transition-colors"
                              title="Ver no IPFS"
                            >
                              <Eye className="w-5 h-5" />
                            </a>
                          )}

                          <div
                            className={`text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 font-bold ${status.color} ${status.bg}`}
                          >
                            <StatusIcon className="w-3.5 h-3.5" />
                            {status.label}
                          </div>
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

      {/* Toast de Sucesso */}
      {uploadSuccess && (
        <div className="fixed bottom-8 right-8 bg-emerald-600 text-white px-6 py-4 rounded-2xl shadow-xl flex items-center gap-3 z-50 animate-fade-up">
          <CheckCircle2 className="w-6 h-6" />
          <span className="font-semibold">
            Documento(s) enviado(s) com sucesso!
          </span>
        </div>
      )}

      {/* Mensagem de erro */}
      {errorMessage && (
        <div className="fixed bottom-8 left-8 bg-red-600 text-white px-6 py-4 rounded-2xl shadow-xl flex items-center gap-3 z-50 animate-fade-up">
          <AlertCircle className="w-6 h-6" />
          <span className="font-semibold">{errorMessage}</span>
        </div>
      )}

      {/* Animações Globais */}
      <style jsx global>{`
        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(30px);
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
            transform: translate(50px, -70px) scale(1.2);
          }
          66% {
            transform: translate(-40px, 50px) scale(0.85);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
        .animate-fade-up {
          animation: fadeUp 0.8s ease-out forwards;
        }
        .animate-blob {
          animation: blob 18s infinite ease-in-out;
        }
        .animation-delay-200 {
          animation-delay: 3s;
        }
        .animation-delay-300 {
          animation-delay: 6s;
        }

        @media (prefers-reduced-motion: reduce) {
          .animate-fade-up,
          .animate-blob {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
