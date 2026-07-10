// src/app/relatorio/[token]/ReportView.tsx
"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type Summary = {
  toPayOpen: number;
  toPayPaid: number;
  toReceivePending: number;
  toReceiveReceived: number;
  balance: number;
};

type ReportData = {
  category: string;
  month: number;
  year: number;
  summary: Summary;
  paidByType: Record<string, number>;
  receivedByType: Record<string, number>;
  items: {
    id: string;
    title: string;
    dueDate: string;
    amount: number;
    kind: "A pagar" | "A receber";
    paid: boolean;
    financeTypeName: string;
    confirmed: boolean;
  }[];
};

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril",
  "Maio", "Junho", "Julho", "Agosto",
  "Setembro", "Outubro", "Novembro", "Dezembro",
];

const COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#14b8a6",
  "#f59e0b", "#22c55e", "#06b6d4", "#ef4444",
];

function formatCurrency(v: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(v);
}

function formatCompact(v: number) {
  return new Intl.NumberFormat("pt-BR", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(v);
}

export default function ReportView({ token }: { token: string }) {
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear]   = useState(today.getFullYear());

  const [data, setData]   = useState<ReportData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(
        `/api/relatorio/${token}?month=${month}&year=${year}`,
      );

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Erro ao carregar relatório");
      }

      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  // carrega ao montar e quando mudar mês/ano
  useEffect(() => { void load(); }, [month, year, token]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="text-center space-y-2">
          <p className="text-2xl">🔒</p>
          <p className="text-slate-700 font-medium">{error}</p>
          <p className="text-slate-400 text-sm">
            Peça ao responsável financeiro um novo link.
          </p>
        </div>
      </div>
    );
  }

  if (loading || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-600">Carregando relatório...</p>
      </div>
    );
  }

  // ---------- preparação dos gráficos ----------
  const paidChart = Object.entries(data.paidByType)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value], i) => ({
      name,
      value,
      fill: COLORS[i % COLORS.length],
    }));

  const receivedChart = Object.entries(data.receivedByType)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value], i) => ({
      name,
      value,
      fill: COLORS[i % COLORS.length],
    }));

  // ---------- render ----------
  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      {/* header */}
      <header className="bg-slate-900 text-white px-6 py-5">
        <h1 className="text-xl font-bold">{data.category}</h1>
        <p className="text-slate-300 text-sm">
          Relatório público – somente leitura
        </p>
      </header>

      {/* filtros */}
      <section className="max-w-2xl mx-auto px-4 py-4 flex gap-2 justify-end">
        <select
          value={month}
          onChange={(e) => setMonth(Number(e.target.value))}
          className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs"
        >
          {MONTHS.map((m, i) => (
            <option key={m} value={i + 1}>{m}</option>
          ))}
        </select>

        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs"
        >
          {[2024, 2025, 2026, 2027].map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </section>

      {/* resumo */}
      <section className="max-w-2xl mx-auto bg-white rounded-lg shadow-sm p-4 space-y-4">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg bg-amber-50 border border-amber-100 p-3">
            <p className="text-amber-600 font-medium">A pagar (aberto)</p>
            <p className="font-semibold text-slate-800 mt-1">
              {formatCurrency(data.summary.toPayOpen)}
            </p>
          </div>

          <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-3">
            <p className="text-emerald-600 font-medium">A pagar (pago)</p>
            <p className="font-semibold text-slate-800 mt-1">
              {formatCurrency(data.summary.toPayPaid)}
            </p>
          </div>

          <div className="rounded-lg bg-sky-50 border border-sky-100 p-3">
            <p className="text-sky-600 font-medium">A receber (pendente)</p>
            <p className="font-semibold text-slate-800 mt-1">
              {formatCurrency(data.summary.toReceivePending)}
            </p>
          </div>

          <div className="rounded-lg bg-indigo-50 border border-indigo-100 p-3">
            <p className="text-indigo-600 font-medium">A receber (recebido)</p>
            <p className="font-semibold text-slate-800 mt-1">
              {formatCurrency(data.summary.toReceiveReceived)}
            </p>
          </div>

          <div
            className={`col-span-2 rounded-lg px-4 py-2 flex justify-between items-center text-sm font-semibold ${
              data.summary.balance >= 0
                ? "bg-emerald-50 text-emerald-700"
                : "bg-red-50 text-red-600"
            }`}
          >
            <span>Saldo do mês</span>
            <span>{formatCurrency(data.summary.balance)}</span>
          </div>
        </div>
      </section>

      {/* gráficos por subtipo */}
      {paidChart.length > 0 && (
        <section className="max-w-2xl mx-auto mt-6 bg-white rounded-lg shadow-sm p-4">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">
            Despesas pagas por subtipo
          </h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={paidChart}
              margin={{ top: 5, right: 10, left: 10, bottom: 40 }}
            >
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10, fill: "#64748b" }}
                angle={-15}
                textAnchor="end"
                interval={0}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#64748b" }}
                tickFormatter={formatCompact}
              />
              <Tooltip
                formatter={(v) => formatCurrency(Number(v ?? 0))}
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {paidChart.map((d, i) => (
                  <Cell key={i} fill={d.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </section>
      )}

      {receivedChart.length > 0 && (
        <section className="max-w-2xl mx-auto mt-6 bg-white rounded-lg shadow-sm p-4">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">
            Receitas recebidas por subtipo
          </h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={receivedChart}
              margin={{ top: 5, right: 10, left: 10, bottom: 40 }}
            >
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10, fill: "#64748b" }}
                angle={-15}
                textAnchor="end"
                interval={0}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#64748b" }}
                tickFormatter={formatCompact}
              />
              <Tooltip
                formatter={(v) => formatCurrency(Number(v ?? 0))}
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {receivedChart.map((d, i) => (
                  <Cell key={i} fill={d.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </section>
      )}

      {/* ---------- itens discriminados ---------- */}
      <section className="max-w-2xl mx-auto mt-8 bg-white rounded-lg shadow-sm p-4">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">
          Itens discriminados ({data.items.length})
        </h2>

        {data.items.length === 0 ? (
          <p className="text-slate-500 text-center py-4">
            Nenhum lançamento encontrado para este período.
          </p>
        ) : (
          <ul className="space-y-3">
            {data.items.map((it) => (
              <li
                key={it.id}
                className="border border-slate-200 rounded-md p-3 hover:bg-slate-50 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900">{it.title}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(it.dueDate).toLocaleDateString("pt-BR")} •{" "}
                      {it.financeTypeName}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="font-semibold text-slate-900">
                      {formatCurrency(it.amount)}
                    </p>

                    <span
                      className={`inline-block text-[9px] font-medium px-1.5 py-0.5 rounded-full border ${
                        it.paid
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-slate-100 text-slate-500 border-slate-200"
                      }`}
                    >
                      {it.paid ? "Pago/Recebido" : "Aberto"}
                    </span>

                    {it.confirmed && (
                      <span className="ml-1 inline-block text-[9px] font-medium px-1.5 py-0.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">
                        ✓ Confirmado
                      </span>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* rodapé simples */}
      <footer className="mt-12 text-center text-xs text-slate-400">
        Relatório gerado em {new Date().toLocaleDateString("pt-BR")} •
        acesso público somente leitura
      </footer>
    </div>
  );
}