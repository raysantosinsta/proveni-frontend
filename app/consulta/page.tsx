// src/app/consulta/page.tsx
"use client";

import { useState, useEffect, Suspense, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Search,
  Package,
  Building2,
  Leaf,
  CheckCircle,
  XCircle,
  Clock,
  User,
  FileText,
  ExternalLink,
  Loader2,
  Shield,
  QrCode,
  Scan,
  Calendar,
  Hash,
  TrendingDown,
  Globe,
  Lock,
  AlertTriangle,
  Copy,
  Check,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface BatchData {
  batchId: string;
  productName: string;
  co2Emitted: number;
  companyName: string;
  isCompliant: boolean;
  ipfsDocumentHash: string;
  registeredAt: Date;
  registeredBy: string;
}

function ConsultaContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [batchId, setBatchId] = useState("");
  const [loading, setLoading] = useState(false);
  const [batch, setBatch] = useState<BatchData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [scanning, setScanning] = useState(false);
  const hasInitialized = useRef(false);

  // Função de busca
  const handleSearch = useCallback(async (searchBatchId: string) => {
    if (!searchBatchId.trim()) return;

    setLoading(true);
    setError(null);
    setBatch(null);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/blockchain/batch/${searchBatchId}`,
      );
      const data = await response.json();

      if (data.success) {
        setBatch(data.data);
        // Remove a atualização da URL - apenas mostra o resultado
      } else {
        setError("Lote não encontrado na blockchain");
      }
    } catch (err) {
      setError("Erro ao consultar blockchain. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }, []);

  // useEffect para ler o batchId da URL
  useEffect(() => {
    const urlBatchId = searchParams.get("batch");

    // Evita executar múltiplas vezes
    if (!hasInitialized.current && urlBatchId && !batch) {
      hasInitialized.current = true;
      const upperBatchId = urlBatchId.toUpperCase();
      setBatchId(upperBatchId);
      // Chama a busca diretamente com o ID da URL
      handleSearch(upperBatchId);
    }
  }, [searchParams, batch, handleSearch]);

  const handleManualSearch = () => {
    if (batchId.trim()) {
      handleSearch(batchId);
    }
  };

  const handleCopyBatchId = () => {
    if (batch) {
      navigator.clipboard.writeText(batch.batchId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleScanQR = () => {
    setScanning(true);
    // Simula escaneamento de QR Code
    setTimeout(() => {
      setScanning(false);
      // Em produção, isso abriria a câmera
      alert(
        "📱 Em produção, isso abriria a câmera para escanear o QR Code.\n\n" +
          "Para teste, digite o código do lote manualmente.",
      );
    }, 500);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleManualSearch();
    }
  };

  const handleNewSearch = () => {
    setBatch(null);
    setBatchId("");
    setError(null);
    hasInitialized.current = false;
    // Limpa o parâmetro da URL sem recarregar a página
    router.push("/consulta", { scroll: false });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-md border-b border-white/20">
        <div className="max-w-4xl mx-auto px-4 py-8 md:py-12">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/20 rounded-full mb-4">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-medium text-emerald-300">
                Blockchain Verifiable
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
              Verificação de Procedência
            </h1>
            <p className="text-white/60 max-w-md mx-auto">
              Escaneie o QR Code do produto ou digite o código do lote para
              verificar sua autenticidade na blockchain
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Área de Busca */}
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
              <input
                type="text"
                value={batchId}
                onChange={(e) => setBatchId(e.target.value.toUpperCase())}
                onKeyPress={handleKeyPress}
                placeholder="Digite o código do lote (ex: LOTE-2025-001)"
                className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                disabled={loading}
              />
            </div>
            <button
              onClick={handleManualSearch}
              disabled={loading || !batchId.trim()}
              className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl font-semibold flex items-center gap-2 justify-center disabled:opacity-50 transition-all"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Search className="w-5 h-5" />
              )}
              Verificar
            </button>
            <button
              onClick={handleScanQR}
              disabled={scanning}
              className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl font-semibold flex items-center gap-2 justify-center transition-all disabled:opacity-50"
            >
              {scanning ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Scan className="w-5 h-5" />
              )}
              Escanear QR
            </button>
          </div>

          {/* Dica de exemplo */}
          <div className="mt-4 text-center">
            <p className="text-white/30 text-xs">
              💡 Exemplo: LOTE-2025-001 ou o código que está no QR Code do
              produto
            </p>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="bg-white/5 rounded-2xl p-12 text-center">
            <Loader2 className="w-12 h-12 animate-spin text-emerald-500 mx-auto mb-4" />
            <p className="text-white/60">Consultando blockchain...</p>
            <p className="text-white/40 text-sm mt-2">
              Isso pode levar alguns segundos
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 text-center">
            <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-3" />
            <p className="text-red-300 font-medium">{error}</p>
            <p className="text-white/40 text-sm mt-2">
              Verifique se o código do lote está correto e tente novamente
            </p>
            <button
              onClick={handleNewSearch}
              className="mt-4 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm transition-colors"
            >
              Nova consulta
            </button>
          </div>
        )}

        {/* Resultado */}
        {batch && (
          <div className="space-y-6 animate-in fade-in zoom-in duration-300">
            {/* Status Banner */}
            <div
              className={cn(
                "rounded-2xl p-6 border-2",
                batch.isCompliant
                  ? "bg-emerald-500/10 border-emerald-500/50"
                  : "bg-red-500/10 border-red-500/50",
              )}
            >
              <div className="flex items-center gap-4">
                <div
                  className={cn(
                    "p-3 rounded-full",
                    batch.isCompliant ? "bg-emerald-500/20" : "bg-red-500/20",
                  )}
                >
                  {batch.isCompliant ? (
                    <CheckCircle className="w-8 h-8 text-emerald-400" />
                  ) : (
                    <XCircle className="w-8 h-8 text-red-400" />
                  )}
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-white">
                    {batch.isCompliant
                      ? "✓ Produto Verificado"
                      : "✗ Produto Não Conforme"}
                  </h2>
                  <p className="text-white/60 text-sm">
                    {batch.isCompliant
                      ? "Este produto foi registrado na blockchain e está em conformidade com os requisitos de sustentabilidade"
                      : "Este produto não atende aos critérios de conformidade estabelecidos"}
                  </p>
                </div>
                {/* Selo Blockchain */}
                <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full">
                  <Lock className="w-3 h-3 text-emerald-400" />
                  <span className="text-xs text-white/60">Blockchain</span>
                </div>
              </div>
            </div>

            {/* Dados do Lote */}
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden">
              <div className="p-6 border-b border-white/10 bg-white/5">
                <div className="flex items-center gap-3">
                  <Package className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-lg font-semibold text-white">
                    Informações do Produto
                  </h3>
                </div>
              </div>

              <div className="p-6 space-y-5">
                {/* Grid de informações */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Código do Lote */}
                  <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-white/40 text-xs uppercase tracking-wide">
                        Código do Lote
                      </p>
                      <button
                        onClick={handleCopyBatchId}
                        className="p-1 hover:bg-white/10 rounded transition-colors"
                        title="Copiar código"
                      >
                        {copied ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3 text-white/40" />
                        )}
                      </button>
                    </div>
                    <p className="text-white font-mono text-sm break-all">
                      {batch.batchId}
                    </p>
                  </div>

                  {/* Produto */}
                  <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <p className="text-white/40 text-xs uppercase tracking-wide mb-2">
                      Produto
                    </p>
                    <p className="text-white font-medium">
                      {batch.productName}
                    </p>
                  </div>

                  {/* Empresa */}
                  <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <p className="text-white/40 text-xs uppercase tracking-wide mb-2">
                      Empresa / Fornecedor
                    </p>
                    <p className="text-white flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-white/40" />
                      {batch.companyName}
                    </p>
                  </div>

                  {/* Pegada de Carbono */}
                  <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <p className="text-white/40 text-xs uppercase tracking-wide mb-2">
                      Pegada de Carbono
                    </p>
                    <p className="text-emerald-400 font-semibold flex items-center gap-2">
                      <Leaf className="w-4 h-4" />
                      {batch.co2Emitted.toLocaleString()} kg CO₂
                    </p>
                    <p className="text-white/30 text-xs mt-1">
                      Equivalente a {(batch.co2Emitted / 4.5).toFixed(1)}{" "}
                      árvores plantadas
                    </p>
                  </div>

                  {/* Data do Registro */}
                  <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <p className="text-white/40 text-xs uppercase tracking-wide mb-2">
                      Registrado na Blockchain
                    </p>
                    <p className="text-white flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-white/40" />
                      {format(
                        new Date(batch.registeredAt),
                        "dd 'de' MMMM 'de' yyyy 'às' HH:mm",
                        { locale: ptBR },
                      )}
                    </p>
                  </div>

                  {/* Registrado Por */}
                  <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <p className="text-white/40 text-xs uppercase tracking-wide mb-2">
                      Registrado Por
                    </p>
                    <p className="text-white flex items-center gap-2 font-mono text-sm">
                      <User className="w-4 h-4 text-white/40" />
                      {batch.registeredBy.slice(0, 6)}...
                      {batch.registeredBy.slice(-4)}
                    </p>
                  </div>
                </div>

                {/* Documento Original */}
                {batch.ipfsDocumentHash && (
                  <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <p className="text-white/40 text-xs uppercase tracking-wide mb-3">
                      Documento Original
                    </p>
                    <a
                      href={`https://gateway.pinata.cloud/ipfs/${batch.ipfsDocumentHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm transition-all"
                    >
                      <FileText className="w-4 h-4" />
                      Visualizar Documento no IPFS
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <p className="text-white/30 text-xs mt-2">
                      Hash: {batch.ipfsDocumentHash.slice(0, 20)}...
                    </p>
                  </div>
                )}

                {/* Informações Adicionais */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2 text-white/40 text-xs">
                    <Globe className="w-3 h-3" />
                    <span>Registro imutável na blockchain Ethereum</span>
                  </div>
                  <div className="flex items-center gap-2 text-white/40 text-xs justify-end">
                    <TrendingDown className="w-3 h-3" />
                    <span>Rastreabilidade garantida pela PROVENI</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Selo de Autenticidade */}
            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span className="text-xs text-white/60">
                  Verificado na blockchain em{" "}
                  {format(new Date(batch.registeredAt), "dd/MM/yyyy", {
                    locale: ptBR,
                  })}
                </span>
              </div>
            </div>

            {/* Botão para nova consulta */}
            <div className="text-center pt-4">
              <button
                onClick={handleNewSearch}
                className="text-white/40 hover:text-white/60 text-sm transition-colors"
              >
                ← Nova consulta
              </button>
            </div>
          </div>
        )}

        {/* QR Code Simulado para teste */}
        {!batch && !loading && !error && (
          <div className="mt-8 text-center">
            <div className="inline-flex flex-col items-center p-6 bg-white/5 rounded-2xl border border-white/10">
              <div className="w-32 h-32 bg-white rounded-xl flex items-center justify-center mb-3">
                <QrCode className="w-20 h-20 text-gray-800" />
              </div>
              <p className="text-white/40 text-sm">
                Escaneie o QR Code do produto
              </p>
              <p className="text-white/30 text-xs mt-1">
                ou digite o código manualmente acima
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Componente principal com Suspense
export default function ConsultaPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        </div>
      }
    >
      <ConsultaContent />
    </Suspense>
  );
}
