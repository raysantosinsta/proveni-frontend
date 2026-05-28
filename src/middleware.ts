// src/middleware.ts - VERSÃO SIMPLIFICADA (sem verificação de token)
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Não faz nenhuma verificação de token
  // Apenas permite todas as rotas
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
