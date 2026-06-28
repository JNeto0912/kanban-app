// src/app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import DashboardHeaderSummary from "./components/DashboardHeaderSummary"; // Importe o novo componente

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
      <body className="bg-slate-200 text-slate-900">
        <header className="bg-slate-900 text-slate-100 px-10 py-6 rounded-b-xl shadow-lg">
          <p className="uppercase text-xs tracking-[0.3em] text-slate-400">
            Dashboard
          </p>
          <h1 className="text-2xl font-semibold mt-1">
            Atividades e Financeiro
          </h1>
          {/* Renderiza o resumo no cabeçalho */}
          <DashboardHeaderSummary />
        </header>

        <main className="px-10 py-8 space-y-10">{children}</main>
      </body>
    </html>
  );
}