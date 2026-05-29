// app/blockchain/verify/[batchId]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Shield,
  CheckCircle,
  XCircle,
  Loader2,
  ArrowLeft,
  Copy,
  ExternalLink,
  Calendar,
  Building2,
  Package,
  Leaf,
  Hash,
  User,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import api from "@/services/api";
import { cn } from "@/lib/utils";

interface BlockchainBatchData {
  productName: string;
  co2Emitted: number;
  companyName: string;
  isCompliant: boolean;
  ipfsDocumentHash: string;
  registeredAt: string;
  registeredBy: string;
}

export default function BlockchainVerifyPage() {
  const params = useParams();
  const router = useRouter();
  const batchId = decodeURIComponent(params.batchId as string);

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<BlockchainBatchData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchBlockchainData = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await api.get(`/blockchain/batch/${encodeURIComponent(batchId)}`);

        if (response.data.success && response.data.data) {
          setData(response.data.data);
        } else {
          setError("Lote não encontrado na blockchain");
        }
      } catch (err: any) {
        console.error("Erro ao consultar blockchain:", err);
        setError(err.response?.data?.message || "Erro ao consultar dados na blockchain");
      } finally {
        setLoading(false);
      }
    };

    if (batchId) {
      fetchBlockchainData();
    }
  }, [batchId]);

  const handleCopyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatAddress = (address: string) => {
    if (!address) return "—";
    return `${address.substring(0, 8)}...${address.substring(address.length - 6)}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin mx-auto mb-4" style={{ color: "#7C3AED" }} />
          <p className="text-gray-600 font-medium">Consultando blockchain...</p>
          <p className="text-sm text-gray-400 mt-1">Lote: {batchId}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="max-w-4xl mx-auto px-6 py-12">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-6 gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>

          <Card className="border-2 border-red-200">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-8 h-8 text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">
                Erro na Consulta
              </h2>
              <p className="text-gray-600 mb-4">{error}</p>
              <p className="text-sm text-gray-500 mb-6">
                Lote solicitado: <code className="font-mono">{batchId}</code>
              </p>
              <Button
                onClick={() => router.push("/")}
                className="bg-gradient-to-r from-[#0A2540] to-[#1E6B6B] text-white"
              >
                Voltar ao Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="p-2 rounded-lg"
                style={{ background: "linear-gradient(135deg, #7C3AED, #1E6B6B)" }}
              >
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  Verificação Blockchain
                </h1>
                <p className="text-xs text-gray-500">
                  Dados imutáveis registrados na rede
                </p>
              </div>
            </div>
            <Badge
              className="px-3 py-1"
              style={{
                backgroundColor: "#7C3AED10",
                color: "#7C3AED",
              }}
            >
              <Hash className="w-3 h-3 mr-1" />
              Registro On-Chain
            </Badge>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-6 gap-2 hover:bg-gray-100"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Button>

        {/* Card Principal */}
        <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-xl overflow-hidden">
          {/* Header do Lote */}
          <div
            className="px-6 py-5 border-b border-gray-200"
            style={{ backgroundColor: "#F8FAFC" }}
          >
            <div className="flex flex-wrap justify-between items-center gap-4">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  ID do Lote
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <code className="text-xl font-mono font-bold text-gray-900">
                    {batchId}
                  </code>
                  <button
                    onClick={() => handleCopyHash(batchId)}
                    className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors"
                    title="Copiar"
                  >
                    <Copy className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold",
                    data?.isCompliant
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-red-100 text-red-700"
                  )}
                >
                  {data?.isCompliant ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <XCircle className="w-4 h-4" />
                  )}
                  {data?.isCompliant ? "Conforme" : "Não Conforme"}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Calendar className="w-4 h-4" />
                  {data?.registeredAt && format(new Date(data.registeredAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                </div>
              </div>
            </div>
          </div>

          {/* Conteúdo */}
          <div className="p-6 space-y-6">
            {/* Informações do Produto */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border border-gray-200 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    Produto
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-lg font-bold text-gray-900">
                    {data?.productName || "—"}
                  </p>
                </CardContent>
              </Card>

              <Card className="border border-gray-200 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2">
                    <Leaf className="w-4 h-4" />
                    Emissão de CO₂
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-lg font-bold" style={{ color: "#1E6B6B" }}>
                    {data?.co2Emitted?.toFixed(2) || 0} kg CO₂
                  </p>
                </CardContent>
              </Card>

              <Card className="border border-gray-200 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    Empresa / Fornecedor
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-semibold text-gray-800">
                    {data?.companyName || "—"}
                  </p>
                </CardContent>
              </Card>

              <Card className="border border-gray-200 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Registrado por
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <code className="text-sm font-mono text-gray-600">
                    {formatAddress(data?.registeredBy || "")}
                  </code>
                </CardContent>
              </Card>
            </div>

            {/* IPFS Document Hash */}
            {data?.ipfsDocumentHash && (
              <Card className="border border-gray-200 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2">
                    <Hash className="w-4 h-4" />
                    Documento no IPFS
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 flex-wrap">
                    <code className="text-sm font-mono bg-gray-100 px-3 py-2 rounded-lg flex-1 break-all">
                      {data.ipfsDocumentHash}
                    </code>
                    <button
                      onClick={() => handleCopyHash(data.ipfsDocumentHash)}
                      className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                      title="Copiar"
                    >
                      <Copy className="w-4 h-4 text-gray-400" />
                    </button>
                    <a
                      href={`https://gateway.pinata.cloud/ipfs/${data.ipfsDocumentHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                      title="Ver no IPFS"
                    >
                      <ExternalLink className="w-4 h-4 text-gray-400" />
                    </a>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Selo de Verificação Blockchain */}
            <div className="mt-6 p-4 rounded-xl text-center" style={{ backgroundColor: "#7C3AED10" }}>
              <div className="flex items-center justify-center gap-2">
                <Shield className="w-5 h-5" style={{ color: "#7C3AED" }} />
                <span className="text-sm font-semibold" style={{ color: "#7C3AED" }}>
                  Dados verificados na Blockchain
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Este registro é imutável e auditável publicamente
              </p>
            </div>
          </div>
        </div>

        {/* Botão de ação */}
        <div className="mt-6 flex justify-center">
          <Button
            onClick={() => router.push("/")}
            className="bg-gradient-to-r from-[#0A2540] to-[#1E6B6B] text-white px-6"
          >
            Voltar ao Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
