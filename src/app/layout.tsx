// src/app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import Image from "next/image"; // Importar Image do Next.js
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
          <div className="flex items-center gap-4 mb-2"> {/* Container para logo e título principal */}
            <Image
              src="/resolult.png" // Caminho para o seu logo na pasta public
              alt="Logo Resolult"
              width={80} // Ajuste a largura conforme necessário
              height={80} // Ajuste a altura conforme necessário
              className="rounded-full" // Exemplo de estilo, ajuste se precisar
            />
            <div>
              <h1 className="text-3xl font-bold">Resolult</h1> {/* Nome da empresa */}
              <p className="text-sm text-slate-300">Transformar desafios em resultados concretos.</p> {/* Frase da empresa */}
            </div>
          </div>

          {/* Subtítulo do Dashboard */}
          <p className="uppercase text-xs tracking-[0.3em] text-slate-400 mt-4">
            Dashboard
          </p>
          <h2 className="text-2xl font-semibold mt-1">
            Atividades e Financeiro
          </h2>

          {/* Renderiza o resumo no cabeçalho */}
          <DashboardHeaderSummary />
        </header>

        <main className="px-10 py-8 space-y-10">{children}</main>
      </body>
    </html>
  );
}