"use client";
import Activities from "./components/Activities";
import Finance from "./components/Finance";

export default function Page() {
  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-8 space-y-8">
        <header className="rounded-3xl bg-slate-950 p-8 text-white">
          <p className="text-xs uppercase tracking-widest text-slate-400">Dashboard</p>
          <h1 className="mt-2 text-3xl font-bold">Atividades e Financeiro</h1>
        </header>
        <Activities />
        <Finance />
      </div>
    </main>
  );
}