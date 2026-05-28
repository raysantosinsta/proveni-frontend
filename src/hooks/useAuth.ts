/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
// src/hooks/useAuth.ts
"use client";

import { useState, useEffect } from "react";
import { authService } from "@/src/services/api";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";

export function useAuth() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [user, setUser] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const router = useRouter();

  // Carregar dados do usuário apenas no cliente
  useEffect(() => {
    console.log("🔍 useAuth: Carregando dados do usuário...");
    const userData = authService.getUser();
    const authStatus = authService.isAuthenticated();

    console.log("📦 userData:", userData);
    console.log("✅ authStatus:", authStatus);

    setUser(userData);
    setIsAuthenticated(authStatus);
    setInitialized(true);
  }, []);

  const login = async (email: string, password: string) => {
    console.log("🔐 Tentando login com:", email);
    setLoading(true);
    setError("");

    const result = await authService.login(email, password);
    console.log("📡 Resultado do login:", result);

    if (result.success) {
      console.log("✅ Login bem-sucedido! Usuário:", result.user);
      setUser(result.user);
      setIsAuthenticated(true);

      // Forçar cookie no cliente também
      const token = authService.getToken();
      if (token) {
        console.log("🍪 Salvando cookie com token:", token.substring(0, 20) + "...");
        Cookies.set("access_token", token, { expires: 7, path: "/" });
        Cookies.set("user_role", result.user.role, { expires: 7, path: "/" });
      }

      // Redireciona baseado no tipo de usuário
      const role = result.user.role;
      console.log("🔄 Redirecionando baseado na role:", role);

      if (role === "SPECIALIST") {
        console.log("➡️ Redirecionando especialista para: /");
        router.push("/");
      } else if (role === "ADMIN" || role === "MANAGER") {
        console.log("➡️ Redirecionando admin/manager para: /");
        router.push("/");
      } else if (role === "OPERATOR") {
        console.log("➡️ Redirecionando operador para: /operator/documents");
        router.push("/operator/documents");
      } else if (role === "SUPPLIER") {
        console.log("➡️ Redirecionando fornecedor para: /supplier/documents");
        router.push("/supplier/documents");
      } else {
        console.log("➡️ Redirecionando padrão para: /");
        router.push("/");
      }
    } else {
      console.error("❌ Erro no login:", result.error);
      setError(result.error);
    }

    setLoading(false);
    return result;
  };

  const logout = () => {
    console.log("🚪 Fazendo logout...");
    authService.logout();
    Cookies.remove("access_token", { path: "/" });
    Cookies.remove("user_role", { path: "/" });
    setUser(null);
    setIsAuthenticated(false);
    router.push("/login");
  };

  return {
    login,
    logout,
    loading,
    error,
    user,
    isAuthenticated,
    initialized,
  };
}
