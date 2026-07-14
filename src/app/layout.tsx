// src/app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import Image from "next/image";
import DashboardHeaderSummary from "./components/DashboardHeaderSummary";
import HideOnPublicReport from "@/app/components/HideOnPublicReport";

export const metadata: Metadata = {
  title: "Dashboard - Atividades e Financeiro",
  description: "Kanban de atividades e controle financeiro",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="bg-slate-200 text-slate-900 flex flex-col min-h-screen">

        {/* ── Cabeçalho (oculto no relatório público) ── */}
        <HideOnPublicReport>
          <header className="bg-slate-900 text-slate-100 px-10 py-6 rounded-b-xl shadow-lg">
            <p className="uppercase text-xs tracking-[0.3em] text-slate-400 text-center">
              Painel de controle de atividades e financeiro
            </p>

            {/* Resumo no cabeçalho */}
            <DashboardHeaderSummary />
          </header>
        </HideOnPublicReport>

        {/* ── Conteúdo principal ── */}
        <main className="flex-1 px-10 py-8 space-y-10">{children}</main>

        {/* ── Rodapé (oculto no relatório público) ── */}
        <HideOnPublicReport>
          <footer className="bg-slate-900 text-slate-100 px-10 py-6 mt-10 rounded-t-xl shadow-inner">
            <div className="flex flex-col items-center gap-3">
              <Image
                src="/resolult.png"
                alt="Logo Resolult"
                width={80}
                height={80}
                className="rounded-full object-contain"
              />
              <p className="text-sm text-slate-300 text-center">
                Transformar desafios em resultados concretos.
              </p>
              <p className="text-[11px] text-slate-500">
                © {new Date().getFullYear()} Resolult. Todos os direitos reservados.
              </p>
            </div>
          </footer>
        </HideOnPublicReport>

      </body>
    </html>
  );
}