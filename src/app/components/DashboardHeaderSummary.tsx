// src/app/components/DashboardHeaderSummary.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

// --- Tipos para Atividades ---
type Activity = {
  id: string;
  title: string;
  status: string;
};

type ActivitySummaryItem = {
  status: string;
  count: number;
  color: string; // Adicionado para cores dos badges
};

const STATUS_COLORS: Record<string, string> = {
  Pendente: "bg-amber-500",
  "Em andamento": "bg-sky-500",
  "Aguardando Cliente": "bg-purple-500",
  Pausado: "bg-gray-500",
  Concluído: "bg-emerald-500",
};

// --- Tipos para Financeiro ---
type FinanceEntry = {
  id: string;
  amount: number;
  kind: "A pagar" | "A receber";
  category?: { name: string };
  paid: boolean;
};

const ALLOWED_CATEGORIES = ["Trabalho", "Igreja", "Particular"] as const;

// --- Função auxiliar para formatar moeda ---
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

export default function DashboardHeaderSummary() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [financeEntries, setFinanceEntries] = useState<FinanceEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSummaryData() {
      setLoading(true);
      try {
        const [activitiesRes, financeRes] = await Promise.all([
          fetch("/api/activities"),
          fetch("/api/finance"),
        ]);

        const activitiesData: Activity[] = activitiesRes.ok
          ? await activitiesRes.json()
          : [];
        const financeData: FinanceEntry[] = financeRes.ok
          ? await financeRes.json()
          : [];

        setActivities(activitiesData);
        setFinanceEntries(financeData);
      } catch (error) {
        console.error("Erro ao carregar dados do resumo:", error);
      } finally {
        setLoading(false);
      }
    }
    loadSummaryData();
  }, []);

  // --- Resumo de Atividades ---
  const activitiesSummary = useMemo(() => {
    const byStatus: Record<string, number> = {};
    for (const a of activities) {
      byStatus[a.status] = (byStatus[a.status] || 0) + 1;
    }

    const summaryItems: ActivitySummaryItem[] = Object.entries(byStatus).map(
      ([status, count]) => ({
        status,
        count,
        color: STATUS_COLORS[status] || "bg-slate-500", // Cor padrão se não encontrar
      }),
    );

    // Ordenar para ter uma ordem consistente
    const orderedStatuses = [
      "Pendente",
      "Em andamento",
      "Aguardando Cliente",
      "Pausado",
      "Concluído",
    ];
    summaryItems.sort(
      (a, b) => orderedStatuses.indexOf(a.status) - orderedStatuses.indexOf(b.status),
    );

    return {
      total: activities.length,
      items: summaryItems,
    };
  }, [activities]);

  // --- Resumo Financeiro por Categoria ---
  const financeSummaryByCategory = useMemo(() => {
    return ALLOWED_CATEGORIES.map((categoryName) => {
      const items = financeEntries.filter(
        (entry) => entry.category?.name === categoryName,
      );

      const toPay = items
        .filter((entry) => entry.kind === "A pagar")
        .reduce((sum, entry) => sum + entry.amount, 0);

      const toReceive = items
        .filter((entry) => entry.kind === "A receber")
        .reduce((sum, entry) => sum + entry.amount, 0);

      return {
        categoryName,
        toPay,
        toReceive,
      };
    });
  }, [financeEntries]);

  if (loading) {
    return (
      <div className="mt-4 text-sm text-slate-400">Carregando resumo...</div>
    );
  }

  return (
    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Resumo de Atividades */}
      <div className="bg-slate-800 p-4 rounded-lg shadow-inner">
        <h3 className="text-sm font-semibold text-slate-300 mb-2">Atividades</h3>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="bg-slate-600 text-slate-100 px-2 py-1 rounded-full">
            Total: {activitiesSummary.total}
          </span>
          {activitiesSummary.items.map((item) => (
            <span
              key={item.status}
              className={`${item.color} text-slate-900 px-2 py-1 rounded-full`}
            >
              {item.status}: {item.count}
            </span>
          ))}
        </div>
      </div>

      {/* Resumo Financeiro */}
      <div className="bg-slate-800 p-4 rounded-lg shadow-inner">
        <h3 className="text-sm font-semibold text-slate-300 mb-2">Financeiro</h3>
        <div className="grid grid-cols-3 gap-2 text-xs">
          {financeSummaryByCategory.map((item) => (
            <div key={item.categoryName} className="bg-slate-700 p-2 rounded-md">
              <p className="font-medium text-slate-200">{item.categoryName}</p>
              <p className="text-amber-300">A pagar: {formatCurrency(item.toPay)}</p>
              <p className="text-emerald-300">A receber: {formatCurrency(item.toReceive)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}