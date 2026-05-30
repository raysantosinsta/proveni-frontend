// app/manager/batches/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import api from "@/services/api";
import {
  Package,
  Building2,
  Leaf,
  QrCode,
  Eye,
  Plus,
  Loader2,
  CheckCircle,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
    supplier: { name: string };
    co2Emitted: number;
  }>;
}

export default function ManagerBatchesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBatches = async () => {
      try {
        const response = await api.get("/batches");
        // Filtrar apenas lotes da empresa do Manager (CLIENT)
        const clientBatches = response.data.filter(
          (batch: any) => batch.company?.companyType === "CLIENT",
        );
        setBatches(clientBatches);
      } catch (error) {
        console.error("Erro:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchBatches();
  }, []);

  const getVerificationLink = (batchId: string) => {
    return `${window.location.origin}/blockchain/verify/${batchId}`;
  };

  const copyToClipboard = (batchId: string) => {
    const link = getVerificationLink(batchId);
    navigator.clipboard.writeText(link);
    alert("✅ Link copiado! Compartilhe com a alfândega.");
  };

  const getStatusIcon = (status: string) => {
    if (status === "COMPLETED" || status === "ON_CHAIN") {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
    return <Clock className="w-4 h-4 text-yellow-500" />;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#1E6B6B]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Meus Lotes</h1>
            <p className="text-gray-500 mt-1">
              Gerencie seus lotes de produtos finais
            </p>
          </div>
          <Button
            onClick={() => router.push("/manager/batches/create")}
            className="gap-2 bg-gradient-to-r from-[#0A2540] to-[#1E6B6B]"
          >
            <Plus className="w-4 h-4" />
            Novo Lote
          </Button>
        </div>

        {/* Lista de Lotes */}
        <div className="grid grid-cols-1 gap-6">
          {batches.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border-2 border-gray-200">
              <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                Nenhum lote encontrado
              </h3>
              <p className="text-gray-400">
                Clique em "Novo Lote" para começar
              </p>
            </div>
          ) : (
            batches.map((batch) => (
              <Card
                key={batch.id}
                className="border-2 border-gray-200 hover:shadow-lg transition-all"
              >
                <CardContent className="p-6">
                  <div className="flex flex-wrap justify-between items-start gap-4">
                    {/* Informações */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h2 className="text-xl font-bold text-gray-900">
                          {batch.batchId}
                        </h2>
                        <Badge
                          className={
                            batch.isCompliant
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }
                        >
                          {batch.isCompliant
                            ? "✅ Conforme"
                            : "❌ Não Conforme"}
                        </Badge>
                        {batch.blockchainTxHash && (
                          <Badge className="bg-purple-100 text-purple-700">
                            🔗 Na Blockchain
                          </Badge>
                        )}
                        <span className="flex items-center gap-1 text-sm text-gray-500">
                          {getStatusIcon(batch.status)}
                          {batch.status}
                        </span>
                      </div>

                      <p className="text-gray-700 font-medium mb-3">
                        {batch.productName}
                      </p>

                      <div className="flex flex-wrap gap-4 text-sm">
                        <span className="flex items-center gap-1 text-[#1E6B6B] font-semibold">
                          <Leaf className="w-4 h-4" />
                          CO₂ Total: {batch.co2Emitted} kg
                        </span>
                        <span className="flex items-center gap-1 text-gray-500">
                          <Building2 className="w-4 h-4" />
                          Fornecedores: {batch.batchSuppliers?.length || 0}
                        </span>
                      </div>

                      {/* Fornecedores */}
                      {batch.batchSuppliers &&
                        batch.batchSuppliers.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <p className="text-xs font-semibold text-gray-400 uppercase mb-2">
                              Fornecedores vinculados:
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {batch.batchSuppliers.map((bs, idx) => (
                                <span
                                  key={idx}
                                  className="text-xs px-2 py-1 bg-gray-100 rounded-full text-gray-600"
                                >
                                  {bs.supplier.name} ({bs.co2Emitted}kg CO₂)
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                    </div>

                    {/* Ações */}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() =>
                          router.push(`/blockchain/verify/${batch.batchId}`)
                        }
                        className="gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        Verificar
                      </Button>
                      <Button
                        onClick={() => copyToClipboard(batch.batchId)}
                        className="gap-2 bg-[#7C3AED] hover:bg-[#3B0764]"
                      >
                        <QrCode className="w-4 h-4" />
                        Copiar Link
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Explicação */}
        <div className="mt-8 p-4 bg-blue-50 rounded-xl border border-blue-200">
          <h4 className="font-semibold text-blue-800 mb-2">
            🔄 Como funciona?
          </h4>
          <p className="text-sm text-blue-700">
            1. Fornecedores enviam seus documentos (NF, certificados)
            <br />
            2. Operador valida os documentos e extrai os dados
            <br />
            3. Manager cria o lote final e seleciona os fornecedores
            <br />
            4. Especialista registra na blockchain
            <br />
            5. Alfândega escaneia o QR Code e vê TODOS os fornecedores!
          </p>
        </div>
      </div>
    </div>
  );
}
