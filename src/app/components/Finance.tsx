// src/app/components/Finance.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

type Entry = {
  id: string;
  title: string;
  amount: number;
  dueDate: string;
  kind: "A pagar" | "A receber";
  categoryId: string;
  category: { id: string; name: string; kind: string };
  partner: string;
  notes: string;
  recurring: boolean;
  paid: boolean;
  paidAt: string | null;
};

type Category = {
  id: string;
  name: string;
  kind: string;
  partner: boolean;
  custom: boolean;
};

const ALLOWED_CATEGORIES = ["Trabalho", "Igreja", "Particular"] as const;

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export default function Finance() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Estados para o filtro de mês e ano
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1); // Mês atual (1-12)
  const [selectedYear, setSelectedYear] = useState(today.getFullYear()); // Ano atual

  const [form, setForm] = useState({
    title: "",
    amount: "",
    dueDate: "", // Será preenchido com o 1º dia do mês/ano selecionado
    kind: "A pagar" as Entry["kind"],
    categoryId: "",
    partner: "",
    notes: "",
    recurring: false,
  });

  // categoria ativa para filtrar a lista embaixo
  const [activeCategory, setActiveCategory] =
    useState<(typeof ALLOWED_CATEGORIES)[number]>("Trabalho");

  // ---------- LOAD ----------
  async function loadData() {
    try {
      setLoading(true);

      const [entRes, catRes] = await Promise.all([
        fetch("/api/finance"),
        fetch("/api/finance-cats"),
      ]);

      if (!entRes.ok) {
        const errorText = await entRes.text();
        throw new Error(
          `Erro ao carregar lançamentos financeiros (status: ${entRes.status}): ${errorText}`,
        );
      }

      if (!catRes.ok) {
        const errorText = await catRes.text();
        throw new Error(
          `Erro ao carregar categorias financeiras (status: ${catRes.status}): ${errorText}`,
        );
      }

      const [entData, catData] = await Promise.all([
        entRes.json(),
        catRes.json(),
      ]);

      setEntries(entData);
      setCats(catData);

      const firstVisibleCat = catData.find((c: Category) =>
        ALLOWED_CATEGORIES.includes(
          c.name as (typeof ALLOWED_CATEGORIES)[number],
        ),
      );

      // Define a categoria padrão do formulário
      setForm((prev) => ({
        ...prev,
        categoryId: prev.categoryId || firstVisibleCat?.id || catData[0]?.id || "",
      }));

      // Define a categoria ativa padrão para as abas
      if (firstVisibleCat) {
        setActiveCategory(
          firstVisibleCat.name as (typeof ALLOWED_CATEGORIES)[number],
        );
      }
    } catch (error) {
      console.error("Erro ao carregar financeiro:", error);
      alert(
        `Erro ao carregar dados: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // Atualiza a data de vencimento padrão do formulário quando o mês/ano muda
  useEffect(() => {
    const firstDayOfMonth = new Date(selectedYear, selectedMonth - 1, 1)
      .toISOString()
      .slice(0, 10);
    setForm((prev) => ({ ...prev, dueDate: firstDayOfMonth }));
  }, [selectedMonth, selectedYear]);

  // ---------- SUBMIT ----------
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.title.trim()) {
      alert("Informe um título.");
      return;
    }

    if (!form.amount) {
      alert("Informe um valor.");
      return;
    }

    if (!form.dueDate) {
      alert("Informe uma data.");
      return;
    }

    if (!form.categoryId) {
      alert("Selecione uma categoria.");
      return;
    }

    const payload = {
      title: form.title,
      amount: Number(form.amount),
      dueDate: form.dueDate,
      kind: form.kind,
      categoryId: form.categoryId,
      partner: form.partner,
      notes: form.notes,
      recurring: form.recurring,
    };

    try {
      let res: Response;

      if (editingId) {
        res = await fetch(`/api/finance/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/finance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(
          `Erro ao salvar lançamento (status: ${res.status}): ${errorText}`,
        );
      }

      const data = await res.json();

      if (editingId) {
        setEntries((prev) =>
          prev.map((e) => (e.id === editingId ? data : e)),
        );
      } else {
        setEntries((prev) => [data, ...prev]);
      }

      const firstVisibleCat = cats.find((c) =>
        ALLOWED_CATEGORIES.includes(
          c.name as (typeof ALLOWED_CATEGORIES)[number],
        ),
      );

      setForm({
        title: "",
        amount: "",
        dueDate: new Date(selectedYear, selectedMonth - 1, 1) // Volta para o 1º dia do mês/ano selecionado
          .toISOString()
          .slice(0, 10),
        kind: "A pagar",
        categoryId: firstVisibleCat?.id || cats[0]?.id || "",
        partner: "",
        notes: "",
        recurring: false,
      });
      setEditingId(null);
    } catch (error) {
      console.error("Erro ao salvar lançamento:", error);
      alert(
        `Erro ao salvar lançamento: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  // ---------- DELETE ----------
  async function handleDelete(id: string) {
    if (!confirm("Excluir este lançamento?")) return;

    try {
      const res = await fetch(`/api/finance/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(
          `Erro ao excluir lançamento (status: ${res.status}): ${errorText}`,
        );
      }

      setEntries((prev) => prev.filter((e) => e.id !== id));
    } catch (error) {
      console.error("Erro ao excluir lançamento:", error);
      alert(
        `Erro ao excluir lançamento: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  // ---------- TOGGLE PAID ----------
  async function togglePaid(id: string) {
    const entry = entries.find((e) => e.id === id);
    if (!entry) return;

    const payload = {
      ...entry,
      paid: !entry.paid,
      paidAt: !entry.paid ? new Date().toISOString() : null,
    };

    try {
      const res = await fetch(`/api/finance/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(
          `Erro ao marcar pago (status: ${res.status}): ${errorText}`,
        );
      }

      const updated = await res.json();

      setEntries((prev) =>
        prev.map((e) => (e.id === id ? updated : e)),
      );
    } catch (error) {
      console.error("Erro ao marcar pago:", error);
      alert(
        `Erro ao marcar pago: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  // ---------- EDIT ----------
  function startEdit(entry: Entry) {
    setEditingId(entry.id);
    setForm({
      title: entry.title,
      amount: String(entry.amount),
      dueDate: entry.dueDate.slice(0, 10),
      kind: entry.kind,
      categoryId: entry.categoryId,
      partner: entry.partner,
      notes: entry.notes,
      recurring: entry.recurring,
    });
  }

  function cancelEdit() {
    setEditingId(null);
    const firstVisibleCat = cats.find((c) =>
      ALLOWED_CATEGORIES.includes(
        c.name as (typeof ALLOWED_CATEGORIES)[number],
      ),
    );

    setForm({
      title: "",
      amount: "",
      dueDate: new Date(selectedYear, selectedMonth - 1, 1) // Volta para o 1º dia do mês/ano selecionado
        .toISOString()
        .slice(0, 10),
      kind: "A pagar",
      categoryId: firstVisibleCat?.id || cats[0]?.id || "",
      partner: "",
      notes: "",
      recurring: false,
    });
  }

  // ---------- FILTRO POR MÊS/ANO ----------
  const monthYearFilteredEntries = useMemo(() => {
    return entries.filter((e) => {
      const dueDate = new Date(e.dueDate);
      return (
        dueDate.getMonth() + 1 === selectedMonth &&
        dueDate.getFullYear() === selectedYear
      );
    });
  }, [entries, selectedMonth, selectedYear]);

  // ---------- SUMMARY (por categoria, pago/pendente) ----------
  const summaryByCategory = useMemo(() => {
    return ALLOWED_CATEGORIES.map((categoryName) => {
      // Usa os lançamentos já filtrados por mês/ano
      const items = monthYearFilteredEntries.filter(
        (entry) => entry.category?.name === categoryName,
      );

      const toPayOpen = items
        .filter((entry) => entry.kind === "A pagar" && !entry.paid)
        .reduce((sum, entry) => sum + entry.amount, 0);

      const toPayPaid = items
        .filter((entry) => entry.kind === "A pagar" && entry.paid)
        .reduce((sum, entry) => sum + entry.amount, 0);

      const toReceivePending = items
        .filter((entry) => entry.kind === "A receber" && !entry.paid)
        .reduce((sum, entry) => sum + entry.amount, 0);

      const toReceiveReceived = items
        .filter((entry) => entry.kind === "A receber" && entry.paid)
        .reduce((sum, entry) => sum + entry.amount, 0);

      return {
        categoryName,
        toPayOpen,
        toPayPaid,
        toReceivePending,
        toReceiveReceived,
      };
    });
  }, [monthYearFilteredEntries]); // Depende dos lançamentos filtrados por mês/ano

  // lançamentos filtrados pela categoria ativa (parte de baixo)
  const filteredEntries = useMemo(() => {
    // Usa os lançamentos já filtrados por mês/ano
    return monthYearFilteredEntries.filter(
      (e) => e.category?.name === activeCategory,
    );
  }, [monthYearFilteredEntries, activeCategory]); // Depende dos lançamentos filtrados por mês/ano

  // ---------- RENDER ----------
  const months = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ];

  const years = Array.from({ length: 5 }, (_, i) => today.getFullYear() - 2 + i); // Ex: 2024, 2025, 2026, 2027, 2028

  return (
    <div className="space-y-6">
      {/* Resumo por categoria */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Financeiro</h2>
          <div className="flex gap-2 text-xs">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="rounded-md border border-slate-300 bg-white px-2 py-1 text-slate-700"
            >
              {months.map((monthName, index) => (
                <option key={index + 1} value={index + 1}>
                  {monthName}
                </option>
              ))}
            </select>

            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="rounded-md border border-slate-300 bg-white px-2 py-1 text-slate-700"
            >
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {summaryByCategory.map((item) => (
            <div
              key={item.categoryName}
              className="rounded-lg bg-slate-900/90 border border-slate-700 px-4 py-3 text-xs text-slate-100"
            >
              <p className="text-[11px] font-semibold mb-2">
                {item.categoryName}
              </p>

              <div className="space-y-1">
                <p>
                  A pagar em aberto:{" "}
                  <span className="font-semibold text-amber-300">
                    {formatCurrency(item.toPayOpen)}
                  </span>
                </p>
                <p>
                  A pagar pago:{" "}
                  <span className="font-semibold text-emerald-300">
                    {formatCurrency(item.toPayPaid)}
                  </span>
                </p>
                <p>
                  A receber pendente:{" "}
                  <span className="font-semibold text-amber-300">
                    {formatCurrency(item.toReceivePending)}
                  </span>
                </p>
                <p>
                  A receber recebido:{" "}
                  <span className="font-semibold text-emerald-300">
                    {formatCurrency(item.toReceiveReceived)}
                  </span>
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Formulário */}
      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 border border-slate-200 rounded-lg p-4"
      >
        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-600">Título</label>
          <input
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm bg-white"
            value={form.title}
            onChange={(e) =>
              setForm((f) => ({ ...f, title: e.target.value }))
            }
            placeholder="Ex: Conta de luz, oferta, salário..."
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-600">Valor</label>
          <input
            type="number"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm bg-white"
            value={form.amount}
            onChange={(e) =>
              setForm((f) => ({ ...f, amount: e.target.value }))
            }
            placeholder="Ex: 150.00"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-600">Data</label>
          <input
            type="date"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm bg-white"
            value={form.dueDate}
            onChange={(e) =>
              setForm((f) => ({ ...f, dueDate: e.target.value }))
            }
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-600">Tipo</label>
          <select
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm bg-white"
            value={form.kind}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                kind: e.target.value as Entry["kind"],
              }))
            }
          >
            <option value="A pagar">A pagar</option>
            <option value="A receber">A receber</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-600">
            Categoria
          </label>
          <select
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm bg-white"
            value={form.categoryId}
            onChange={(e) =>
              setForm((f) => ({ ...f, categoryId: e.target.value }))
            }
          >
            {cats
              .filter((c) =>
                ALLOWED_CATEGORIES.includes(
                  c.name as (typeof ALLOWED_CATEGORIES)[number],
                ),
              )
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-600">
            Parceiro / pessoa
          </label>
          <input
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm bg-white"
            value={form.partner}
            onChange={(e) =>
              setForm((f) => ({ ...f, partner: e.target.value }))
            }
            placeholder="Quem paga / recebe"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <label className="text-xs font-medium text-slate-600">
            Observações
          </label>
          <textarea
            className="w-full min-h-[60px] rounded-md border border-slate-300 px-3 py-2 text-sm bg-white"
            value={form.notes}
            onChange={(e) =>
              setForm((f) => ({ ...f, notes: e.target.value }))
            }
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            id="recorrente"
            type="checkbox"
            checked={form.recurring}
            onChange={(e) =>
              setForm((f) => ({ ...f, recurring: e.target.checked }))
            }
          />
          <label htmlFor="recorrente" className="text-xs text-slate-600">
            Recorrente
          </label>
        </div>

        <div className="flex items-end gap-3 md:col-span-2">
          <button
            type="submit"
            className="rounded-md bg-slate-900 text-slate-100 text-sm px-4 py-2 font-medium hover:bg-slate-800"
          >
            {editingId ? "Salvar alterações" : "Adicionar lançamento"}
          </button>

          {editingId && (
            <button
              type="button"
              onClick={cancelEdit}
              className="rounded-md border border-slate-300 text-sm px-3 py-2 text-slate-600 hover:bg-slate-100"
            >
              Cancelar edição
            </button>
          )}
        </div>
      </form>

      {/* Abas por categoria + lista filtrada */}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2 text-xs">
          {ALLOWED_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={
                "px-3 py-1 rounded-full border text-[11px] transition " +
                (activeCategory === cat
                  ? "bg-slate-900 text-slate-100 border-slate-900"
                  : "bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200")
              }
            >
              {cat}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-sm text-slate-500">Carregando...</p>
        ) : (
          <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
            {filteredEntries.map((e) => (
              <article
                key={e.id}
                className="rounded-md bg-white border border-slate-200 px-3 py-2 shadow-sm flex justify-between gap-3 items-start"
              >
                <div>
                  <h4 className="text-sm font-medium text-slate-900">
                    {e.title}
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    {e.category?.name} •{" "}
                    {new Date(e.dueDate).toLocaleDateString("pt-BR")}
                  </p>
                  {e.partner && (
                    <p className="text-[11px] text-slate-500">
                      Parceiro: {e.partner}
                    </p>
                  )}
                  {e.notes && (
                    <p className="mt-1 text-[11px] text-slate-600">
                      {e.notes}
                    </p>
                  )}
                </div>

                <div className="text-right">
                  <p className="text-sm font-semibold">
                    {formatCurrency(e.amount)}
                  </p>
                  <p
                    className={
                      "text-[11px] " +
                      (e.kind === "A pagar"
                        ? "text-amber-600"
                        : "text-emerald-600")
                    }
                  >
                    {e.kind}
                  </p>

                  <div className="mt-2 flex gap-2 justify-end">
                    <button
                      onClick={() => togglePaid(e.id)}
                      className={
                        "text-[11px] px-2 py-[3px] rounded-md border " +
                        (e.paid
                          ? "border-emerald-500 text-emerald-600 bg-emerald-50"
                          : "border-slate-300 text-slate-600 hover:bg-slate-50")
                      }
                    >
                      {e.paid ? "Pago" : "Marcar pago"}
                    </button>
                    <button
                      onClick={() => startEdit(e)}
                      className="text-[11px] text-slate-600 hover:text-slate-900"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(e.id)}
                      className="text-[11px] text-red-500 hover:text-red-700"
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              </article>
            ))}

            {filteredEntries.length === 0 && (
              <p className="text-[11px] text-slate-400">
                Nenhum lançamento para {activeCategory} no mês/ano selecionado.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}