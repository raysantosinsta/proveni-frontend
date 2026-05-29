/* eslint-disable @typescript-eslint/no-explicit-any */
// src/services/api.ts
import axios from "axios";
import Cookies from "js-cookie";

// Função para verificar se está no cliente (navegador)
const isBrowser = typeof window !== "undefined";

// Configuração básica da API
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001",
  headers: { "Content-Type": "application/json" },
});

// Interceptor para adicionar token automaticamente
api.interceptors.request.use((config: any) => {
  if (isBrowser) {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Serviço de autenticação simplificado
export const authService = {
  async login(email: string, password: string) {
    try {
      const response = await api.post("/auth/login", { email, password });
      const { access_token, user } = response.data;

      if (isBrowser) {
        // Salvar no localStorage
        localStorage.setItem("access_token", access_token);
        localStorage.setItem("user", JSON.stringify(user));

        // Salvar também em cookie para o middleware (expira em 7 dias)
        Cookies.set("access_token", access_token, { expires: 7, path: "/" });
        Cookies.set("user_role", user.role, { expires: 7, path: "/" });
      }

      return { success: true, user };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || "Erro ao fazer login",
      };
    }
  },

  logout() {
    if (isBrowser) {
      localStorage.removeItem("access_token");
      localStorage.removeItem("user");

      // Remover cookies também
      Cookies.remove("access_token", { path: "/" });
      Cookies.remove("user_role", { path: "/" });
    }
  },

  getUser() {
    if (isBrowser) {
      const userStr = localStorage.getItem("user");
      return userStr ? JSON.parse(userStr) : null;
    }
    return null;
  },

  isAuthenticated() {
    if (isBrowser) {
      return !!localStorage.getItem("access_token");
    }
    return false;
  },

  getToken() {
    if (isBrowser) {
      return localStorage.getItem("access_token");
    }
    return null;
  },
};

export default api;
