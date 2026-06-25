"use client";

import { useEffect, useState } from "react";

type Activity = {
  id: string;
  title: string;
  description: string;
  client: string;
  status: "Pendente" | "Em andamento" | "Concluído";
  categoryId: string;
  category: { id: string; name: string };
  createdAt: string;
  updatedAt: string;
};

type Category = {
  id: string;
  name: string;
  custom: boolean;
};

const STATUS_COLUMNS: {
  id: Activity["status"];
  title: string;
  color: string;
}[] = [
  { id: "Pendente", title: "Pendente", color: "border-amber-400" },
  { id: "Em andamento", title: "Em andamento", color: "border-sky-400" },
  { id: "Concluído", title: "Concluído", color: "border-emerald-400" },
];

export default function Activities() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragId, setDragId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: "",
    description: "",
    client: "",
    status: "Pendente" as Activity["status"],
    categoryId: "",
  });

  async function loadData() {
    try {
      setLoading(true);

      const [actRes, catRes] = await Promise.all([
        fetch("/api/activities"),
        fetch("/api/activity-cats"),
      ]);

      const [actData, catData] = await Promise.all([
        actRes.json(),
        catRes.json(),
      ]);

      setActivities(actData);
      setCats(catData);

      setForm((prev) => ({
        ...prev,
        categoryId: prev.categoryId || catData[0]?.id || "",
      }));
    } catch (error) {
      console.error("Erro ao carregar atividades:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.title.trim()) {
      alert("Informe um título.");
      return;
    }

    if (!form.categoryId) {
      alert("Selecione uma categoria.");
      return;
    }

    const payload = {
      title: form.title,
      description: form.description,
      client: form.client,
      status: form.status,
      categoryId: form.categoryId,
    };

    try {
      if (editingId) {
        const res = await fetch(`/api/activities/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const updated = await res.json();

        setActivities((prev) =>
          prev.map((a) => (a.id === editingId ? updated : a)),
        );
      } else {
        const res = await fetch("/api/activities", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const created = await res.json();
        setActivities((prev) => [created, ...prev]);
      }

      setForm({
        title: "",
        description: "",
        client: "",
        status: "Pendente",
        categoryId: cats[0]?.id || "",
      });
      setEditingId(null);
    } catch (error) {
      console.error("Erro ao salvar atividade:", error);
      alert("Erro ao salvar atividade.");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir esta atividade?")) return;

    try {
      await fetch(`/api/activities/${id}`, {
        method: "DELETE",
      });

      setActivities((prev) => prev.filter((a) => a.id !== id));
    } catch (error) {
      console.error("Erro ao excluir atividade:", error);
      alert("Erro ao excluir atividade.");
    }
  }

  function startEdit(activity: Activity) {
    setEditingId(activity.id);
    setForm({
      title: activity.title,
      description: activity.description,
      client: activity.client,
      status: activity.status,
      categoryId: activity.categoryId,
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm({
      title: "",
      description: "",
      client: "",
      status: "Pendente",
      categoryId: cats[0]?.id || "",
    });
  }

  function onDragStart(id: string) {
    setDragId(id);
  }

  function onDragEnd() {
    setDragId(null);
  }

  async function onDrop(status: Activity["status"]) {
    if (!dragId) return;

    const activity = activities.find((a) => a.id === dragId);
    if (!activity || activity.status === status) {
      setDragId(null);
      return;
    }

    const previous = activities;

    // Atualização otimista
    setActivities((prev) =>
      prev.map((a) => (a.id === dragId ? { ...a, status } : a)),
    );

    try {
      const res = await fetch(`/api/activities/${dragId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: activity.title,
          description: activity.description,
          client: activity.client,
          status,
          categoryId: activity.categoryId,
        }),
      });

      if (!res.ok) {
        setActivities(previous);
        alert("Não foi possível mover o card.");
      } else {
        const updated = await res.json();
        setActivities((prev) =>
          prev.map((a) => (a.id === dragId ? updated : a)),
        );
      }
    } catch (error) {
      console.error("Erro ao mover atividade:", error);
      setActivities(previous);
      alert("Erro ao mover a atividade.");
    } finally {
      setDragId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Atividades</h2>
        <p className="text-xs text-slate-500">
          Total: <span className="font-semibold">{activities.length}</span>
        </p>
      </div>

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
            placeholder="Ex: Estudar Next.js"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-600">
            Cliente / Contexto
          </label>
          <input
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm bg-white"
            value={form.client}
            onChange={(e) =>
              setForm((f) => ({ ...f, client: e.target.value }))
            }
            placeholder="Ex: Projeto X, Ministério Y..."
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <label className="text-xs font-medium text-slate-600">
            Descrição
          </label>
          <textarea
            className="w-full min-h-[60px] rounded-md border border-slate-300 px-3 py-2 text-sm bg-white"
            value={form.description}
            onChange={(e) =>
              setForm((f) => ({ ...f, description: e.target.value }))
            }
            placeholder="Detalhes da atividade..."
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-600">Status</label>
          <select
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm bg-white"
            value={form.status}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                status: e.target.value as Activity["status"],
              }))
            }
          >
            <option value="Pendente">Pendente</option>
            <option value="Em andamento">Em andamento</option>
            <option value="Concluído">Concluído</option>
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
                {c.custom ? " (custom)" : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-end gap-3 md:col-span-2">
          <button
            type="submit"
            className="rounded-md bg-slate-900 text-slate-100 text-sm px-4 py-2 font-medium hover:bg-slate-800"
          >
            {editingId ? "Salvar alterações" : "Adicionar atividade"}
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

      {loading ? (
        <p className="text-sm text-slate-500">Carregando...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {STATUS_COLUMNS.map((col) => (
            <div
              key={col.id}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(col.id)}
              className={`rounded-lg border-2 bg-slate-50 p-3 min-h-[250px] transition-colors ${col.color}`}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-700">
                  {col.title}
                </h3>
                <span className="text-[11px] text-slate-500">
                  {activities.filter((a) => a.status === col.id).length} itens
                </span>
              </div>

              <div className="space-y-2">
                {activities
                  .filter((a) => a.status === col.id)
                  .map((a) => (
                    <article
                      key={a.id}
                      draggable
                      onDragStart={() => onDragStart(a.id)}
                      onDragEnd={onDragEnd}
                      className={`rounded-md bg-white border border-slate-200 px-3 py-2 shadow-sm cursor-grab active:cursor-grabbing transition-opacity ${
                        dragId === a.id ? "opacity-40" : "opacity-100"
                      }`}
                    >
                      <header className="flex justify-between gap-2 mb-1">
                        <h4 className="text-sm font-medium text-slate-900">
                          {a.title}
                        </h4>
                        <span className="text-[11px] text-slate-400">
                          {a.category?.name}
                        </span>
                      </header>

                      {a.client && (
                        <p className="text-[11px] text-slate-500">{a.client}</p>
                      )}

                      {a.description && (
                        <p className="mt-1 text-[11px] text-slate-600">
                          {a.description}
                        </p>
                      )}

                      <footer className="mt-2 flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => startEdit(a)}
                          className="text-[11px] text-slate-600 hover:text-slate-900"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(a.id)}
                          className="text-[11px] text-red-500 hover:text-red-700"
                        >
                          Excluir
                        </button>
                      </footer>
                    </article>
                  ))}

                {activities.filter((a) => a.status === col.id).length === 0 && (
                  <p className="text-[11px] text-slate-400 text-center mt-4">
                    Solte aqui
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}