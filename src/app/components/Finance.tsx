// src/app/components/Finance.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

// ---------- tipos ----------
type PaymentType = "PIX" | "Débito em Conta" | "Boleto" | "Cartão de Crédito" | "";

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
  paymentType?: PaymentType;
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

// ---------- colunas do kanban ----------
type KanbanColumn = {
  id: string;
  label: string;
  kind: Entry["kind"];
  paid: boolean;
  color: string;
  bg: string;
};

const KANBAN_COLUMNS: KanbanColumn[] = [
  {
    id: "a-pagar-aberto",
    label: "A Pagar",
    kind: "A pagar",
    paid: false,
    color: "text-amber-700",
    bg: "bg-amber-50/60",
  },
  {
    id: "a-pagar-pago",
    label: "Pago",
    kind: "A pagar",
    paid: true,
    color: "text-emerald-700",
    bg: "bg-emerald-50/60",
  },
  {
    id: "a-receber-pendente",
    label: "A Receber",
    kind: "A receber",
    paid: false,
    color: "text-blue-700",
    bg: "bg-blue-50/60",
  },
  {
    id: "a-receber-recebido",
    label: "Recebido",
    kind: "A receber",
    paid: true,
    color: "text-emerald-700",
    bg: "bg-emerald-50/60",
  },
];

// ---------- componente ----------
export default function Finance() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);

  // filtro de mês/ano
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());

  const [form, setForm] = useState({
    title: "",
    amount: "",
    dueDate: "",
    kind: "A pagar" as Entry["kind"],
    categoryId: "",
    partner: "",
    notes: "",
    recurring: false,
    paymentType: "" as PaymentType,
  });

  const [activeCategory, setActiveCategory] =
    useState<(typeof ALLOWED_CATEGORIES)[number]>("Trabalho");

  // ---------- load ----------
  async function loadData() {
    try {
      setLoading(true);
      const [entRes, catRes] = await Promise.all([
        fetch("/api/finance"),
        fetch("/api/finance-cats"),
      ]);
      if (!entRes.ok || !catRes.ok) throw new Error("Erro ao carregar dados");
      const [entData, catData] = await Promise.all([entRes.json(), catRes.json()]);
      setEntries(entData);
      setCats(catData);
      const firstVisibleCat = catData.find((c: Category) =>
        ALLOWED_CATEGORIES.includes(c.name as (typeof ALLOWED_CATEGORIES)[number]),
      );
      setForm((prev) => ({
        ...prev,
        categoryId: prev.categoryId || firstVisibleCat?.id || catData[0]?.id || "",
      }));
      if (firstVisibleCat)
        setActiveCategory(firstVisibleCat.name as (typeof ALLOWED_CATEGORIES)[number]);
    } catch (error) {
      console.error(error);
      alert("Erro ao carregar dados financeiros.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      dueDate: new Date(selectedYear, selectedMonth - 1, 1).toISOString().slice(0, 10),
    }));
  }, [selectedMonth, selectedYear]);

  // ---------- filtros ----------
  const monthYearFiltered = useMemo(() => {
    return entries.filter((e) => {
      const d = new Date(e.dueDate);
      return d.getMonth() + 1 === selectedMonth && d.getFullYear() === selectedYear;
    });
  }, [entries, selectedMonth, selectedYear]);

  const filteredEntries = useMemo(() => {
    return monthYearFiltered.filter((e) => e.category?.name === activeCategory);
  }, [monthYearFiltered, activeCategory]);

  // resumo por categoria (topo)
  const summaryByCategory = useMemo(() => {
    return ALLOWED_CATEGORIES.map((cat) => {
      const catEntries = monthYearFiltered.filter((e) => e.category?.name === cat);
      const toPayOpen = catEntries
        .filter((e) => e.kind === "A pagar" && !e.paid)
        .reduce((s, e) => s + e.amount, 0);
      const toPayPaid = catEntries
        .filter((e) => e.kind === "A pagar" && e.paid)
        .reduce((s, e) => s + e.amount, 0);
      const toReceivePending = catEntries
        .filter((e) => e.kind === "A receber" && !e.paid)
        .reduce((s, e) => s + e.amount, 0);
      const toReceiveReceived = catEntries
        .filter((e) => e.kind === "A receber" && e.paid)
        .reduce((s, e) => s + e.amount, 0);
      return {
        name: cat,
        toPayOpen,
        toPayPaid,
        toReceivePending,
        toReceiveReceived,
        balance: toReceiveReceived + toReceivePending - toPayPaid - toPayOpen,
      };
    });
  }, [monthYearFiltered]);

  // ---------- submit ----------
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.amount || !form.dueDate || !form.categoryId) {
      alert("Preencha todos os campos obrigatórios.");
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
      paymentType: form.paymentType,
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
      if (!res.ok) throw new Error("Erro ao salvar");
      const data = await res.json();
      if (editingId) {
        setEntries((prev) => prev.map((e) => (e.id === editingId ? data : e)));
      } else {
        setEntries((prev) => [data, ...prev]);
      }
      const firstCat = cats.find((c) =>
        ALLOWED_CATEGORIES.includes(c.name as (typeof ALLOWED_CATEGORIES)[number]),
      );
      setForm({
        title: "",
        amount: "",
        dueDate: new Date(selectedYear, selectedMonth - 1, 1).toISOString().slice(0, 10),
        kind: "A pagar",
        categoryId: firstCat?.id || cats[0]?.id || "",
        partner: "",
        notes: "",
        recurring: false,
        paymentType: "",
      });
      setEditingId(null);
    } catch (error) {
      console.error(error);
      alert("Erro ao salvar lançamento.");
    }
  }

  // ---------- delete ----------
  async function handleDelete(id: string) {
    if (!confirm("Excluir este lançamento?")) return;
    try {
      const res = await fetch(`/api/finance/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao excluir");
      setEntries((prev) => prev.filter((e) => e.id !== id));
    } catch (error) {
      console.error(error);
      alert("Erro ao excluir lançamento.");
    }
  }

  // ---------- edit ----------
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
      paymentType: entry.paymentType || "",
    });
  }

  function cancelEdit() {
    setEditingId(null);
    const firstCat = cats.find((c) =>
      ALLOWED_CATEGORIES.includes(c.name as (typeof ALLOWED_CATEGORIES)[number]),
    );
    setForm({
      title: "",
      amount: "",
      dueDate: new Date(selectedYear, selectedMonth - 1, 1).toISOString().slice(0, 10),
      kind: "A pagar",
      categoryId: firstCat?.id || cats[0]?.id || "",
      partner: "",
      notes: "",
      recurring: false,
      paymentType: "",
    });
  }

  // ---------- kanban drag & drop ----------
  function handleDragStart(e: React.DragEvent, entryId: string) {
    e.dataTransfer.setData("text/plain", entryId);
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }

  async function handleDrop(e: React.DragEvent, target: KanbanColumn) {
    e.preventDefault();
    const entryId = e.dataTransfer.getData("text/plain");
    const entry = filteredEntries.find((en) => en.id === entryId);
    if (!entry) return;
    if (entry.kind === target.kind && entry.paid === target.paid) return;

    const payload = { ...entry, kind: target.kind, paid: target.paid, paidAt: target.paid ? new Date().toISOString() : null };

    try {
      const res = await fetch(`/api/finance/${entryId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Erro ao mover");
      const updated = await res.json();
      setEntries((prev) => prev.map((e) => (e.id === entryId ? updated : e)));
    } catch (error) {
      console.error(error);
      alert("Erro ao mover lançamento.");
    }
  }

  // ---------- render ----------
  return (
    <div className="space-y-6">
      {/* resumo em cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {summaryByCategory.map((item) => (
          <div
            key={item.name}
            className="rounded-md bg-white border border-slate-200 p-4 shadow-sm space-y-2"
          >
            <h3 className="text-sm font-semibold text-slate-800">{item.name}</h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
              <span className="text-slate-500">A pagar (aberto):</span>
              <span className="text-amber-600 font-medium text-right">{formatCurrency(item.toPayOpen)}</span>
              <span className="text-slate-500">A pagar (pago):</span>
              <span className="text-emerald-600 font-medium text-right">{formatCurrency(item.toPayPaid)}</span>
              <span className="text-slate-500">A receber (pendente):</span>
              <span className="text-blue-600 font-medium text-right">{formatCurrency(item.toReceivePending)}</span>
              <span className="text-slate-500">A receber (recebido):</span>
              <span className="text-emerald-600 font-medium text-right">{formatCurrency(item.toReceiveReceived)}</span>
            </div>
            <div className="pt-1 border-t border-slate-100 flex justify-between text-[11px]">
              <span className="text-slate-500">Saldo:</span>
              <span className={`font-semibold ${item.balance >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                {formatCurrency(item.balance)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* filtro mês/ano */}
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold text-slate-800">Financeiro</h2>
        <div className="flex gap-2 text-xs">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="rounded-md border border-slate-300 bg-white px-2 py-1"
          >
            {["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"].map((m, i) => (
              <option key={m} value={i + 1}>{m}</option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="rounded-md border border-slate-300 bg-white px-2 py-1"
          >
            <option value={2025}>2025</option>
            <option value={2026}>2026</option>
            <option value={2027}>2027</option>
          </select>
        </div>
      </div>

      {/* formulário */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-600">Título</label>
          <input
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm bg-white"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="Ex: Internet"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-600">Valor</label>
          <input
            type="number"
            step="0.01"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm bg-white"
            value={form.amount}
            onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
            placeholder="Ex: 1500.00"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-600">Data Vencimento</label>
          <input
            type="date"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm bg-white"
            value={form.dueDate}
            onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-600">Tipo</label>
          <select
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm bg-white"
            value={form.kind}
            onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value as Entry["kind"] }))}
          >
            <option value="A pagar">A pagar</option>
            <option value="A receber">A receber</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-600">Categoria</label>
          <select
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm bg-white"
            value={form.categoryId}
            onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
          >
            {cats
              .filter((c) => ALLOWED_CATEGORIES.includes(c.name as (typeof ALLOWED_CATEGORIES)[number]))
              .map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-600">Parceiro</label>
          <input
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm bg-white"
            value={form.partner}
            onChange={(e) => setForm((f) => ({ ...f, partner: e.target.value }))}
            placeholder="Quem paga/recebe"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-600">Tipo de Pagamento</label>
          <select
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm bg-white"
            value={form.paymentType}
            onChange={(e) => setForm((f) => ({ ...f, paymentType: e.target.value as PaymentType }))}
          >
            <option value="">Selecione</option>
            <option value="PIX">PIX</option>
            <option value="Débito em Conta">Débito em Conta</option>
            <option value="Boleto">Boleto</option>
            <option value="Cartão de Crédito">Cartão de Crédito</option>
          </select>
        </div>

        <div className="space-y-2 md:col-span-2">
          <label className="text-xs font-medium text-slate-600">Observações</label>
          <textarea
            className="w-full min-h-[60px] rounded-md border border-slate-300 px-3 py-2 text-sm bg-white"
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            id="recorrente"
            type="checkbox"
            checked={form.recurring}
            onChange={(e) => setForm((f) => ({ ...f, recurring: e.target.checked }))}
          />
          <label htmlFor="recorrente" className="text-xs text-slate-600">Recorrente</label>
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

      {/* abas de categoria + kanban */}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2 text-xs">
          {ALLOWED_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1 rounded-full border text-[11px] transition ${
                activeCategory === cat
                  ? "bg-slate-900 text-slate-100 border-slate-900"
                  : "bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-sm text-slate-500">Carregando...</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {KANBAN_COLUMNS.map((col) => {
              const colEntries = filteredEntries.filter(
                (e) => e.kind === col.kind && e.paid === col.paid,
              );
              const total = colEntries.reduce((s, e) => s + e.amount, 0);

              return (
                <div
                  key={col.id}
                  className={`rounded-xl border border-slate-200 ${col.bg} p-3 min-h-[200px] flex flex-col`}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, col)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs font-semibold ${col.color}`}>{col.label}</span>
                    <span className="text-[11px] text-slate-500">{colEntries.length}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mb-3">{formatCurrency(total)}</p>

                  <div className="space-y-2 flex-1">
                    {colEntries.map((e) => (
                      <article
                        key={e.id}
                        draggable
                        onDragStart={(ev) => handleDragStart(ev, e.id)}
                        className="rounded-md bg-white border border-slate-200 px-2 py-1.5 shadow-sm cursor-grab active:cursor-grabbing"
                      >
                        <h4 className="text-xs font-medium text-slate-900 truncate">{e.title}</h4>
                        <p className="text-[10px] text-slate-500">
                          {new Date(e.dueDate).toLocaleDateString("pt-BR")}
                        </p>
                        {e.partner && (
                          <p className="text-[10px] text-slate-500 truncate">{e.partner}</p>
                        )}
                        {e.paymentType && (
                          <p className="text-[10px] text-slate-400">{e.paymentType}</p>
                        )}
                        <p className="text-xs font-semibold text-slate-800 mt-0.5">
                          {formatCurrency(e.amount)}
                        </p>
                        <div className="mt-1 flex gap-1">
                          <button
                            onClick={() => startEdit(e)}
                            className="text-[9px] text-slate-500 hover:text-slate-700"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleDelete(e.id)}
                            className="text-[9px] text-red-400 hover:text-red-600"
                          >
                            Excluir
                          </button>
                        </div>
                      </article>
                    ))}

                    {colEntries.length === 0 && (
                      <p className="text-[10px] text-slate-400 text-center mt-4">Vazio</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}