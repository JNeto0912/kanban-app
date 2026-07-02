// src/app/components/Finance.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

// ---------- tipos ----------
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
  confirmed: boolean; // ← novo
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

// ---------- colunas do kanban ----------
type KanbanColumn = {
  id: string;
  label: string;
  kind: Entry["kind"];
  paid: boolean;
  borderColor: string;
  badgeClass: string;
};

const KANBAN_COLUMNS: KanbanColumn[] = [
  {
    id: "a-pagar-aberto",
    label: "A Pagar",
    kind: "A pagar",
    paid: false,
    borderColor: "border-t-amber-400",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
  },
  {
    id: "a-pagar-pago",
    label: "Pago",
    kind: "A pagar",
    paid: true,
    borderColor: "border-t-emerald-400",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  {
    id: "a-receber-pendente",
    label: "A Receber",
    kind: "A receber",
    paid: false,
    borderColor: "border-t-sky-400",
    badgeClass: "bg-sky-50 text-sky-700 border-sky-200",
  },
  {
    id: "a-receber-recebido",
    label: "Recebido",
    kind: "A receber",
    paid: true,
    borderColor: "border-t-emerald-400",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
];

// ---------- helpers ----------
function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril",
  "Maio", "Junho", "Julho", "Agosto",
  "Setembro", "Outubro", "Novembro", "Dezembro",
];

// ---------- componente ----------
export default function Finance() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [cats, setCats]       = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dragId, setDragId]   = useState<string | null>(null);

  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1);
  const [selectedYear, setSelectedYear]   = useState(today.getFullYear());

  const [activeCategory, setActiveCategory] =
    useState<(typeof ALLOWED_CATEGORIES)[number]>("Trabalho");

  const [form, setForm] = useState({
    title:      "",
    amount:     "",
    dueDate:    "",
    kind:       "A pagar" as Entry["kind"],
    categoryId: "",
    partner:    "",
    notes:      "",
    recurring:  false,
    confirmed:  false, // ← novo
  });

  // ---------- load ----------
  async function loadData() {
    try {
      setLoading(true);
      const [entRes, catRes] = await Promise.all([
        fetch("/api/finance"),
        fetch("/api/finance-cats"),
      ]);
      if (!entRes.ok || !catRes.ok) throw new Error("Erro ao carregar dados");
      const [entData, catData] = await Promise.all([
        entRes.json(),
        catRes.json(),
      ]);
      setEntries(entData);
      setCats(catData);
      const firstCat = catData.find((c: Category) =>
        ALLOWED_CATEGORIES.includes(c.name as (typeof ALLOWED_CATEGORIES)[number]),
      );
      setForm((prev) => ({
        ...prev,
        categoryId: prev.categoryId || firstCat?.id || catData[0]?.id || "",
      }));
      if (firstCat)
        setActiveCategory(firstCat.name as (typeof ALLOWED_CATEGORIES)[number]);
    } catch (error) {
      console.error(error);
      alert(`Erro ao carregar dados: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  // ---------- filtros ----------
  const monthFiltered = useMemo(() => {
    return entries.filter((e) => {
      const d = new Date(e.dueDate);
      return d.getMonth() + 1 === selectedMonth && d.getFullYear() === selectedYear;
    });
  }, [entries, selectedMonth, selectedYear]);

  const filteredEntries = useMemo(() => {
    return monthFiltered.filter((e) => e.category?.name === activeCategory);
  }, [monthFiltered, activeCategory]);

  // ---------- resumo por categoria ----------
  const summaryByCategory = useMemo(() => {
    return ALLOWED_CATEGORIES.map((cat) => {
      const items = monthFiltered.filter((e) => e.category?.name === cat);
      const toPayOpen        = items.filter((e) => e.kind === "A pagar"  && !e.paid).reduce((s, e) => s + e.amount, 0);
      const toPayPaid        = items.filter((e) => e.kind === "A pagar"  &&  e.paid).reduce((s, e) => s + e.amount, 0);
      const toReceivePending = items.filter((e) => e.kind === "A receber" && !e.paid).reduce((s, e) => s + e.amount, 0);
      const toReceiveReceived= items.filter((e) => e.kind === "A receber" &&  e.paid).reduce((s, e) => s + e.amount, 0);
      const balance = toReceiveReceived + toReceivePending - toPayPaid - toPayOpen;
      return { cat, toPayOpen, toPayPaid, toReceivePending, toReceiveReceived, balance };
    });
  }, [monthFiltered]);

  // ---------- submit ----------
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) { alert("Informe um título."); return; }
    if (!form.amount)       { alert("Informe um valor.");  return; }
    if (!form.dueDate)      { alert("Informe uma data.");  return; }
    if (!form.categoryId)   { alert("Selecione uma categoria."); return; }

    const payload = {
      title:      form.title,
      amount:     Number(form.amount),
      dueDate:    form.dueDate,
      kind:       form.kind,
      categoryId: form.categoryId,
      partner:    form.partner,
      notes:      form.notes,
      recurring:  form.recurring,
      confirmed:  form.confirmed, // ← novo
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
      if (!res.ok) throw new Error("Erro ao salvar lançamento");
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
        title: "", amount: "", dueDate: "", kind: "A pagar",
        categoryId: firstCat?.id || cats[0]?.id || "",
        partner: "", notes: "", recurring: false, confirmed: false, // ← novo
      });
      setEditingId(null);
    } catch (error) {
      console.error(error);
      alert(`Erro ao salvar: ${error instanceof Error ? error.message : String(error)}`);
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
      alert(`Erro ao excluir: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // ---------- edit ----------
  function startEdit(entry: Entry) {
    setEditingId(entry.id);
    setForm({
      title:      entry.title,
      amount:     String(entry.amount),
      dueDate:    entry.dueDate.slice(0, 10),
      kind:       entry.kind,
      categoryId: entry.categoryId,
      partner:    entry.partner,
      notes:      entry.notes,
      recurring:  entry.recurring,
      confirmed:  entry.confirmed, // ← novo
    });
  }

  function cancelEdit() {
    setEditingId(null);
    const firstCat = cats.find((c) =>
      ALLOWED_CATEGORIES.includes(c.name as (typeof ALLOWED_CATEGORIES)[number]),
    );
    setForm({
      title: "", amount: "", dueDate: "", kind: "A pagar",
      categoryId: firstCat?.id || cats[0]?.id || "",
      partner: "", notes: "", recurring: false, confirmed: false, // ← novo
    });
  }

  // ---------- drag & drop ----------
  function handleDragStart(e: React.DragEvent, id: string) {
    setDragId(id);
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }

  async function handleDrop(e: React.DragEvent, col: KanbanColumn) {
    e.preventDefault();
    if (!dragId) return;
    const entry = filteredEntries.find((en) => en.id === dragId);
    if (!entry) { setDragId(null); return; }
    if (entry.kind === col.kind && entry.paid === col.paid) { setDragId(null); return; }

    const payload = {
      ...entry,
      kind:  col.kind,
      paid:  col.paid,
      paidAt: col.paid ? new Date().toISOString() : null,
    };

    try {
      const res = await fetch(`/api/finance/${dragId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Erro ao mover card");
      const updated = await res.json();
      setEntries((prev) => prev.map((en) => (en.id === dragId ? updated : en)));
    } catch (error) {
      console.error(error);
      alert(`Erro ao mover card: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setDragId(null);
    }
  }

  // ---------- render ----------
  return (
    <div className="space-y-6">

      {/* ── Cabeçalho + filtro mês/ano ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900">Financeiro</h2>
        <div className="flex gap-2">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs"
          >
            {MONTHS.map((m, i) => (
              <option key={m} value={i + 1}>{m}</option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs"
          >
            {[2024, 2025, 2026, 2027].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Resumo por categoria ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {summaryByCategory.map((item) => (
          <div
            key={item.cat}
            className="rounded-lg bg-slate-900 border border-slate-700 px-4 py-3 text-xs text-slate-100 space-y-1"
          >
            <p className="text-[11px] font-semibold text-slate-300 mb-2">{item.cat}</p>
            <p>A pagar (aberto): <span className="font-semibold text-amber-300">{formatCurrency(item.toPayOpen)}</span></p>
            <p>A pagar (pago): <span className="font-semibold text-emerald-300">{formatCurrency(item.toPayPaid)}</span></p>
            <p>A receber (pendente): <span className="font-semibold text-amber-300">{formatCurrency(item.toReceivePending)}</span></p>
            <p>A receber (recebido): <span className="font-semibold text-emerald-300">{formatCurrency(item.toReceiveReceived)}</span></p>
            <div className="pt-1 mt-1 border-t border-slate-700 flex justify-between">
              <span className="text-slate-400">Saldo:</span>
              <span className={`font-semibold ${item.balance >= 0 ? "text-emerald-300" : "text-red-400"}`}>
                {formatCurrency(item.balance)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Formulário ── */}
      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 bg-slate-50 border border-slate-200 rounded-lg p-4"
      >
        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-600">Título</label>
          <input
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm bg-white"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="Ex: Internet, salário..."
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
            placeholder="Ex: 150.00"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-600">Vencimento</label>
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
              .filter((c) =>
                ALLOWED_CATEGORIES.includes(c.name as (typeof ALLOWED_CATEGORIES)[number]),
              )
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
            placeholder="Quem paga / recebe"
          />
        </div>

        <div className="space-y-2 md:col-span-2 lg:col-span-3">
          <label className="text-xs font-medium text-slate-600">Observações</label>
          <textarea
            className="w-full min-h-[60px] rounded-md border border-slate-300 px-3 py-2 text-sm bg-white"
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          />
        </div>

        {/* checkboxes */}
        <div className="flex flex-col gap-2 lg:col-span-1">
          <div className="flex items-center gap-2">
            <input
              id="recorrente"
              type="checkbox"
              checked={form.recurring}
              onChange={(e) => setForm((f) => ({ ...f, recurring: e.target.checked }))}
            />
            <label htmlFor="recorrente" className="text-xs text-slate-600">
              Recorrente (gera próximo mês automaticamente)
            </label>
          </div>

          {/* ← novo checkbox */}
          <div className="flex items-center gap-2">
            <input
              id="confirmed"
              type="checkbox"
              checked={form.confirmed}
              onChange={(e) => setForm((f) => ({ ...f, confirmed: e.target.checked }))}
            />
            <label htmlFor="confirmed" className="text-xs text-slate-600">
              Valor confirmado (tenho certeza do valor)
            </label>
          </div>
        </div>

        <div className="flex items-end gap-3 md:col-span-2 lg:col-span-2">
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

      {/* ── Abas por categoria ── */}
      <div className="flex flex-wrap gap-2">
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

      {/* ── Kanban ── */}
      {loading ? (
        <p className="text-sm text-slate-500">Carregando...</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {KANBAN_COLUMNS.map((col) => {
            const colEntries = filteredEntries.filter(
              (e) => e.kind === col.kind && e.paid === col.paid,
            );
            const total = colEntries.reduce((s, e) => s + e.amount, 0);

            return (
              <div
                key={col.id}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, col)}
                className={`rounded-lg bg-slate-50 border border-slate-200 border-t-4 ${col.borderColor} p-3 min-h-[180px] flex flex-col`}
              >
                {/* cabeçalho da coluna */}
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-slate-800">{col.label}</span>
                  <span className="text-[10px] text-slate-400">{colEntries.length}</span>
                </div>
                <p className="text-[10px] text-slate-400 mb-3">{formatCurrency(total)}</p>

                {/* cards */}
                <div className="space-y-2 flex-1">
                  {colEntries.map((e) => (
                    <article
                      key={e.id}
                      draggable
                      onDragStart={(ev) => handleDragStart(ev, e.id)}
                      className="rounded-md bg-white border border-slate-200 px-2 py-2 shadow-sm cursor-grab active:cursor-grabbing space-y-1"
                    >
                      {/* título + selos */}
                      <div className="flex items-start justify-between gap-1 flex-wrap">
                        <h4 className="text-xs font-medium text-slate-900 leading-snug">
                          {e.title}
                        </h4>
                        <div className="flex gap-1 flex-wrap justify-end">
                          {/* ← selo confirmado / estimado */}
                          {e.confirmed ? (
                            <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">
                              ✓ Confirmado
                            </span>
                          ) : (
                            <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full border bg-slate-100 text-slate-500 border-slate-200">
                              Estimado
                            </span>
                          )}
                          {e.recurring && (
                            <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full border ${col.badgeClass}`}>
                              Recorrente
                            </span>
                          )}
                        </div>
                      </div>

                      {/* data */}
                      <p className="text-[10px] text-slate-400">
                        {new Date(e.dueDate).toLocaleDateString("pt-BR")}
                      </p>

                      {/* parceiro */}
                      {e.partner && (
                        <p className="text-[10px] text-slate-500 truncate">{e.partner}</p>
                      )}

                      {/* observações */}
                      {e.notes && (
                        <p className="text-[10px] text-slate-500 line-clamp-2">{e.notes}</p>
                      )}

                      {/* valor — cor muda se confirmado */}
                      <p className={`text-xs font-semibold ${e.confirmed ? "text-slate-900" : "text-slate-400"}`}>
                        {formatCurrency(e.amount)}
                        {!e.confirmed && (
                          <span className="ml-1 text-[9px] font-normal">(estimado)</span>
                        )}
                      </p>

                      {/* ações */}
                      <footer className="flex gap-2 pt-1 border-t border-slate-100">
                        <button
                          onClick={() => startEdit(e)}
                          className="text-[10px] text-slate-500 hover:text-slate-800"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(e.id)}
                          className="text-[10px] text-red-400 hover:text-red-600"
                        >
                          Excluir
                        </button>
                      </footer>
                    </article>
                  ))}

                  {colEntries.length === 0 && (
                    <p className="text-[10px] text-slate-400 text-center mt-6">
                      Solte aqui
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}