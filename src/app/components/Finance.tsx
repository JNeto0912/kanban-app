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

export default function Finance() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: "",
    amount: "",
    dueDate: "",
    kind: "A pagar" as Entry["kind"],
    categoryId: "",
    partner: "",
    notes: "",
    recurring: false,
  });

  // ---------- LOAD ----------
  async function loadData() {
    try {
      setLoading(true);

      const [entRes, catRes] = await Promise.all([
        fetch("/api/finance"),
        fetch("/api/finance-cats"),
      ]);

      const [entData, catData] = await Promise.all([
        entRes.json(),
        catRes.json(),
      ]);

      setEntries(entData);
      setCats(catData);

      setForm((prev) => ({
        ...prev,
        categoryId: prev.categoryId || catData[0]?.id || "",
      }));
    } catch (error) {
      console.error("Erro ao carregar financeiro:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

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
      if (editingId) {
        const res = await fetch(`/api/finance/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const updated = await res.json();

        setEntries((prev) =>
          prev.map((e) => (e.id === editingId ? updated : e)),
        );
      } else {
        const res = await fetch("/api/finance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const created = await res.json();
        setEntries((prev) => [created, ...prev]);
      }

      setForm({
        title: "",
        amount: "",
        dueDate: "",
        kind: "A pagar",
        categoryId: cats[0]?.id || "",
        partner: "",
        notes: "",
        recurring: false,
      });
      setEditingId(null);
    } catch (error) {
      console.error("Erro ao salvar lançamento:", error);
      alert("Erro ao salvar lançamento.");
    }
  }

  // ---------- DELETE ----------
  async function handleDelete(id: string) {
    if (!confirm("Excluir este lançamento?")) return;

    try {
      await fetch(`/api/finance/${id}`, {
        method: "DELETE",
      });

      setEntries((prev) => prev.filter((e) => e.id !== id));
    } catch (error) {
      console.error("Erro ao excluir lançamento:", error);
      alert("Erro ao excluir lançamento.");
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

      const updated = await res.json();

      setEntries((prev) =>
        prev.map((e) => (e.id === id ? updated : e)),
      );
    } catch (error) {
      console.error("Erro ao marcar pago:", error);
      alert("Erro ao marcar pago.");
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
    setForm({
      title: "",
      amount: "",
      dueDate: "",
      kind: "A pagar",
      categoryId: cats[0]?.id || "",
      partner: "",
      notes: "",
      recurring: false,
    });
  }

  // ---------- SUMMARY ----------
  const summary = useMemo(() => {
    let toPay = 0;
    let toReceive = 0;

    for (const e of entries) {
      if (!e.paid && e.kind === "A pagar") toPay += e.amount;
      if (!e.paid && e.kind === "A receber") toReceive += e.amount;
    }

    return { toPay, toReceive };
  }, [entries]);

  // ---------- RENDER ----------
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold text-slate-900">
          Financeiro
        </h2>
        <div className="flex gap-4 text-xs text-slate-600">
          <span>
            A pagar:{" "}
            <strong className="text-amber-600">
              R$ {summary.toPay.toFixed(2)}
            </strong>
          </span>
          <span>
            A receber:{" "}
            <strong className="text-emerald-600">
              R$ {summary.toReceive.toFixed(2)}
            </strong>
          </span>
        </div>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 border border-slate-200 rounded-lg p-4"
      >
        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-600">
            Título
          </label>
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
          <label className="text-xs font-medium text-slate-600">
            Valor
          </label>
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
          <label className="text-xs font-medium text-slate-600">
            Data
          </label>
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
          <label className="text-xs font-medium text-slate-600">
            Tipo
          </label>
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
            {cats.map((c) => (
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
          <label
            htmlFor="recorrente"
            className="text-xs text-slate-600"
          >
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

      {/* Lista */}
      {loading ? (
        <p className="text-sm text-slate-500">Carregando...</p>
      ) : (
        <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
          {entries.map((e) => (
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
                  R$ {e.amount.toFixed(2)}
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

          {entries.length === 0 && (
            <p className="text-[11px] text-slate-400">
              Nenhum lançamento cadastrado.
            </p>
          )}
        </div>
      )}
    </div>
  );
}