// app/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import {
  Leaf, ShieldCheck, Boxes, TrendingUp,
  FileCheck, Globe, CheckCircle, ArrowRight, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const roleRoutes: Record<string, string> = {
  SUPPLIER: "/supplier/documents",
  OPERATOR: "/operator/documents",
  SPECIALIST: "/specialist/documents",
  MANAGER: "/dashboard",
  ADMIN: "/admin/dashboard",
};

const roleNames: Record<string, string> = {
  SUPPLIER: "Fornecedor",
  OPERATOR: "Operador",
  SPECIALIST: "Especialista ESG",
  MANAGER: "Gestor ESG",
  ADMIN: "Administrador",
};

function cn(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export default function HomePage() {
  const { user, logout, isAuthenticated, initialized } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (initialized && !isAuthenticated) router.push("/login");
  }, [initialized, isAuthenticated, router]);

  if (!initialized || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#134B8A" }} />
      </div>
    );
  }

  const handleGoToModule = () => {
    router.push(user?.role && roleRoutes[user.role] ? roleRoutes[user.role] : "/");
  };

  return (
    <>
      <style jsx global>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes blob {
          0%   { transform: translate(0px, 0px) scale(1); }
          33%  { transform: translate(30px, -50px) scale(1.1); }
          66%  { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-fade-up  { animation: fadeUp 0.6s ease-out forwards; opacity: 0; }
        .animate-blob     { animation: blob 7s infinite; }
        .animation-delay-100  { animation-delay: 100ms; }
        .animation-delay-200  { animation-delay: 220ms; }
        .animation-delay-300  { animation-delay: 340ms; }
        .animation-delay-2000 { animation-delay: 2000ms; }
        .animation-delay-4000 { animation-delay: 4000ms; }
        @media (prefers-reduced-motion: reduce) {
          .animate-fade-up, .animate-blob { animation: none; opacity: 1; }
        }
      `}</style>

      <div className="min-h-screen bg-slate-50 relative overflow-x-hidden">

        {/* ── Orbs decorativos ── */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute -top-40 -right-40 w-80 h-80 rounded-full animate-blob"
            style={{ backgroundColor: "#0A2540", mixBlendMode: "multiply", filter: "blur(60px)", opacity: 0.15 }}
          />
          <div
            className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full animate-blob animation-delay-2000"
            style={{ backgroundColor: "#1E6B6B", mixBlendMode: "multiply", filter: "blur(60px)", opacity: 0.15 }}
          />
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full animate-blob animation-delay-4000"
            style={{ backgroundColor: "#7C3AED", mixBlendMode: "multiply", filter: "blur(60px)", opacity: 0.12 }}
          />
        </div>

        {/* ── Header glassmorphism ── */}
        <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl shadow-md" style={{ background: "linear-gradient(135deg, #0A2540, #1E6B6B)" }}>
                <Leaf className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-base font-semibold text-slate-800">CarbonChain ESG</p>
                <p className="text-xs text-slate-500">Rastreabilidade de Carbono com Blockchain</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-medium text-slate-700">{user.name}</p>
                <p className="text-xs text-slate-500">{roleNames[user.role] || user.role}</p>
              </div>
              <Avatar className="h-9 w-9">
                <AvatarFallback style={{ background: "linear-gradient(135deg, #0A2540, #1E6B6B)" }} className="text-white text-xs font-medium">
                  {user.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <button
                onClick={logout}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-200 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2"
                style={{ color: "#DC2626" }}
                aria-label="Sair do sistema"
              >
                Sair
              </button>
            </div>
          </div>
        </header>

        {/* ── Conteúdo principal ── */}
        <main className="max-w-7xl mx-auto px-6 py-12 relative z-10">

          {/* Hero */}
          <section className="text-center mb-16 animate-fade-up" aria-label="Apresentação">
            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-6"
              style={{ backgroundColor: "#EDE9FE", color: "#7C3AED" }}
            >
              <Leaf className="w-4 h-4" aria-hidden="true" />
              Blockchain para Sustentabilidade
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-5 leading-tight">
              Gestão de Carbono com{" "}
              <span style={{ background: "linear-gradient(135deg, #0A2540, #1E6B6B)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                Rastreabilidade Imutável
              </span>
            </h1>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto mb-8 leading-relaxed">
              O CarbonChain ESG conecta empresas, fornecedores e especialistas para garantir
              transparência das emissões de carbono em toda a cadeia produtiva.
            </p>
            <Button
              onClick={handleGoToModule}
              className="relative overflow-hidden group text-white text-base px-8 py-6 rounded-xl shadow-lg
                         transition-all duration-300 hover:shadow-xl hover:scale-[1.02]
                         focus:ring-2 focus:ring-offset-2 focus:outline-none"
              style={{ background: "linear-gradient(135deg, #0A2540, #1E6B6B)" }}
            >
              <span className="relative z-10 flex items-center">
                Acessar Meu Módulo
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </span>
              <span className="absolute inset-0 -translate-x-full group-hover:translate-x-0 transition-transform duration-500 bg-gradient-to-r from-white/20 to-transparent" aria-hidden="true" />
            </Button>
          </section>

          {/* Features */}
          <section className="grid md:grid-cols-3 gap-8 mb-16" aria-label="Funcionalidades">
            {[
              { icon: <Boxes className="w-8 h-8" style={{ color: "#1E6B6B" }} />, bg: "#D4EAEA", title: "Rastreabilidade Total", desc: "Cada lote é registrado na blockchain, garantindo imutabilidade e transparência das emissões de CO₂.", delay: "animation-delay-100" },
              { icon: <FileCheck className="w-8 h-8" style={{ color: "#134B8A" }} />, bg: "#DBEAFE", title: "Documentação Validada", desc: "Especialistas ESG validam documentos e certificados, assegurando conformidade ambiental.", delay: "animation-delay-200" },
              { icon: <ShieldCheck className="w-8 h-8" style={{ color: "#7C3AED" }} />, bg: "#EDE9FE", title: "Pontuação ESG", desc: "Avaliação contínua da performance ambiental com métricas claras e comparáveis.", delay: "animation-delay-300" },
            ].map((f) => (
              <div
                key={f.title}
                className={cn("bg-white rounded-2xl p-8 text-center border border-slate-100 shadow-md transition-all duration-300 hover:shadow-xl hover:-translate-y-1 animate-fade-up", f.delay)}
              >
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ backgroundColor: f.bg }}>
                  {f.icon}
                </div>
                <h3 className="text-lg font-semibold text-slate-800 mb-3">{f.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </section>

          {/* Como funciona */}
          <section
            className="rounded-2xl p-8 mb-16 border border-slate-100 shadow-md animate-fade-up animation-delay-100 transition-all duration-300 hover:shadow-xl"
            style={{ background: "rgba(255,255,255,0.70)", backdropFilter: "blur(8px)" }}
            aria-label="Como funciona"
          >
            <h2 className="text-2xl font-bold text-slate-800 text-center mb-10">Como funciona o sistema</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { n: 1, title: "Fornecedor", desc: "Cadastra documentos e lotes", bg: "#D4EAEA", color: "#0D3B4C" },
                { n: 2, title: "Validação",  desc: "Especialistas revisam",       bg: "#DBEAFE", color: "#0C447C" },
                { n: 3, title: "Blockchain", desc: "Registro imutável",           bg: "#EDE9FE", color: "#3C3489" },
                { n: 4, title: "Dashboard",  desc: "Métricas e relatórios",       bg: "#D4EAEA", color: "#0D3B4C" },
              ].map((s) => (
                <div key={s.n} className="text-center group">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 font-bold text-lg transition-transform duration-300 group-hover:scale-110"
                    style={{ backgroundColor: s.bg, color: s.color }}
                  >
                    {s.n}
                  </div>
                  <p className="font-medium text-slate-800 text-sm">{s.title}</p>
                  <p className="text-xs text-slate-500 mt-1">{s.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Cards por Perfil */}
          <section aria-label="Perfis de acesso">
            <h2 className="text-2xl font-bold text-slate-800 text-center mb-8 animate-fade-up">
              Para cada perfil, uma experiência personalizada
            </h2>
            <div className="grid md:grid-cols-3 gap-6 mb-8">

              {/* Fornecedor */}
              <div className={cn(
                "rounded-xl p-6 border transition-all duration-300 hover:shadow-xl hover:-translate-y-1 animate-fade-up animation-delay-100",
                "bg-gradient-to-br from-white to-[#F0FAF8]",
                user.role === "SUPPLIER" ? "border-[#134B8A] ring-2 ring-[#134B8A] shadow-lg" : "border-[#D4EAEA]"
              )}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg" style={{ backgroundColor: "#D4EAEA" }}>
                    <Boxes className="w-5 h-5" style={{ color: "#1E6B6B" }} aria-hidden="true" />
                  </div>
                  <h3 className="font-semibold text-slate-800">Fornecedor</h3>
                  {user.role === "SUPPLIER" && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: "#134B8A" }}>Seu perfil</span>
                  )}
                </div>
                <p className="text-sm text-slate-600 mb-3 leading-relaxed">Cadastre seus documentos e lotes de produção. Acompanhe o status das validações.</p>
                <ul className="space-y-2 text-sm text-slate-500">
                  {["Envio de documentos", "Registro de lotes", "Acompanhamento ESG"].map((t) => (
                    <li key={t} className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: "#059669" }} aria-hidden="true" />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Operador / Especialista */}
              <div className={cn(
                "rounded-xl p-6 border transition-all duration-300 hover:shadow-xl hover:-translate-y-1 animate-fade-up animation-delay-200",
                "bg-gradient-to-br from-white to-[#EFF6FF]",
                (user.role === "OPERATOR" || user.role === "SPECIALIST") ? "border-[#134B8A] ring-2 ring-[#134B8A] shadow-lg" : "border-[#BFDBFE]"
              )}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg" style={{ backgroundColor: "#DBEAFE" }}>
                    <FileCheck className="w-5 h-5" style={{ color: "#134B8A" }} aria-hidden="true" />
                  </div>
                  <h3 className="font-semibold text-slate-800">Operador / Especialista</h3>
                  {(user.role === "OPERATOR" || user.role === "SPECIALIST") && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: "#134B8A" }}>Seu perfil</span>
                  )}
                </div>
                <p className="text-sm text-slate-600 mb-3 leading-relaxed">Valide documentos, analise conformidade ESG e gerencie a rastreabilidade.</p>
                <ul className="space-y-2 text-sm text-slate-500">
                  {["Análise de documentos", "Validação ESG", "Aprovação de lotes"].map((t) => (
                    <li key={t} className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: "#134B8A" }} aria-hidden="true" />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Gestor / Admin */}
              <div className={cn(
                "rounded-xl p-6 border transition-all duration-300 hover:shadow-xl hover:-translate-y-1 animate-fade-up animation-delay-300",
                "bg-gradient-to-br from-white to-[#F5F3FF]",
                (user.role === "MANAGER" || user.role === "ADMIN") ? "border-[#134B8A] ring-2 ring-[#134B8A] shadow-lg" : "border-[#DDD6FE]"
              )}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg" style={{ backgroundColor: "#EDE9FE" }}>
                    <TrendingUp className="w-5 h-5" style={{ color: "#7C3AED" }} aria-hidden="true" />
                  </div>
                  <h3 className="font-semibold text-slate-800">Gestor / Administrador</h3>
                  {(user.role === "MANAGER" || user.role === "ADMIN") && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: "#134B8A" }}>Seu perfil</span>
                  )}
                </div>
                <p className="text-sm text-slate-600 mb-3 leading-relaxed">Acompanhe métricas consolidadas, relatórios e performance geral da operação.</p>
                <ul className="space-y-2 text-sm text-slate-500">
                  {["Dashboards executivos", "Relatórios de carbono", "Gestão de usuários"].map((t) => (
                    <li key={t} className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: "#7C3AED" }} aria-hidden="true" />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          {/* Footer */}
          <footer className="border-t border-slate-200 mt-12 pt-8 text-center animate-fade-up animation-delay-300">
            <p className="flex items-center justify-center gap-2 text-slate-400 text-sm">
              <Globe className="w-4 h-4" aria-hidden="true" />
              CarbonChain ESG — Rastreabilidade de Carbono com Blockchain
            </p>
            <p className="text-xs text-slate-400 mt-2">© {new Date().getFullYear()} — Todos os direitos reservados</p>
          </footer>
        </main>
      </div>
    </>
  );
}
