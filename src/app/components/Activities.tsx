// src/app/components/Activities.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

// ---------- tipos ----------
type Activity = {
  id: string;
  title: string;
  description: string;
  client: string;
  status: "Pendente" | "Em andamento" | "Aguardando Cliente" | "Pausado" | "Concluído";
  categoryId: string;
  category: { id: string; name: string };
  createdAt: string;
  updatedAt: string;
};

type ActivityLog = {
  id: string;
  activityId: string;
  note: string;
  createdAt: string;
};

type Category = {
  id: string;
  name: string;
  custom: boolean;
};

const ALLOWED_CATEGORIES = ["Trabalho", "Igreja", "Particular"] as const;

const STATUS_COLUMNS: {
  id: Activity["status"];
  title: string;
  color: string;
}[] = [
  { id: "Pendente",           title: "Pendente",           color: "border-amber-400"   },
  { id: "Em andamento",       title: "Em andamento",       color: "border-sky-400"     },
  { id: "Aguardando Cliente", title: "Aguardando Cliente", color: "border-purple-400"  },
  { id: "Pausado",            title: "Pausado",            color: "border-gray-400"    },
  { id: "Concluído",          title: "Concluído",          color: "border-emerald-400" },
];

// ---------- helper ----------
function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", {
    day:    "2-digit",
    month:  "2-digit",
    year:   "numeric",
    hour:   "2-digit",
    minute: "2-digit",
  });
}

// ---------- componente de logs ----------
function ActivityLogs({ activityId }: { activityId: string }) {
  const [logs, setLogs]       = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [note, setNote]       = useState("");
  const [saving, setSaving]   = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchLogs() {
      try {
        setLoading(true);
        const res = await fetch(`/api/activities/${activityId}/logs`);
        if (!res.ok) throw new Error("Erro ao buscar movimentações");
        const data = await res.json();
        if (!cancelled) setLogs(data);
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchLogs();
    return () => { cancelled = true; };
  }, [activityId]);

  async function handleAddLog() {
    if (!note.trim()) return;
    try {
      setSaving(true);
      const res = await fetch(`/api/activities/${activityId}/logs`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ note: note.trim() }),
      });
      if (!res.ok) throw new Error("Erro ao registrar movimentação");
      const created: ActivityLog = await res.json();
      setLogs((prev) => [created, ...prev]);
      setNote("");
    } catch (err) {
      console.error(err);
      alert("Erro ao registrar movimentação.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteLog(logId: string) {
    if (!confirm("Excluir esta movimentação?")) return;
    try {
      const res = await fetch(
        `/api/activities/${activityId}/logs/${logId}`,
        { method: "DELETE" },
      );
      if (!res.ok) throw new Error("Erro ao excluir");
      setLogs((prev) => prev.filter((l) => l.id !== logId));
    } catch (err) {
      console.error(err);
      alert("Erro ao excluir movimentação.");
    }
  }

  return (
    <div className="mt-3 border-t border-slate-100 pt-3 space-y-3">
      {/* campo para nova movimentação */}
      <div className="flex gap-1.5">
        <input
          className="flex-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] placeholder:text-slate-400"
          placeholder="Nova observação..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAddLog();
            }
          }}
        />
        <button
          onClick={handleAddLog}
          disabled={saving || !note.trim()}
          className="rounded-md bg-slate-800 text-white text-[10px] px-2 py-1 hover:bg-slate-700 disabled:opacity-40"
        >
          {saving ? "..." : "Registrar"}
        </button>
      </div>

      {/* lista de logs */}
      {loading ? (
        <p className="text-[10px] text-slate-400">Carregando...</p>
      ) : logs.length === 0 ? (
        <p className="text-[10px] text-slate-400">Nenhuma movimentação ainda.</p>
      ) : (
        <ul className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
          {logs.map((log) => (
            <li
              key={log.id}
              className="rounded-md bg-slate-50 border border-slate-100 px-2 py-1.5"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-[11px] text-slate-700 leading-snug flex-1">
                  {log.note}
                </p>
                <button
                  onClick={() => handleDeleteLog(log.id)}
                  className="text-[9px] text-red-400 hover:text-red-600 shrink-0 mt-0.5"
                >
                  ✕
                </button>
              </div>
              <p className="text-[9px] text-slate-400 mt-0.5">
                {formatDateTime(log.createdAt)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------- componente principal ----------
export default function Activities() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [cats, setCats]             = useState<Category[]>([]);
  const [loading, setLoading]       = useState(true);
  const [dragId, setDragId]         = useState<string | null>(null);
  const [editingId, setEditingId]   = useState<string | null>(null);

  // id do card com painel de logs aberto
  const [openLogId, setOpenLogId]   = useState<string | null>(null);

  const [activeCategory, setActiveCategory] =
    useState<(typeof ALLOWED_CATEGORIES)[number]>("Trabalho");

  const [form, setForm] = useState({
    title:       "",
    description: "",
    client:      "",
    status:      "Pendente" as Activity["status"],
    categoryId:  "",
  });

  const visibleCats = useMemo(
    () => cats.filter((c) =>
      ALLOWED_CATEGORIES.includes(c.name as (typeof ALLOWED_CATEGORIES)[number]),
    ),
    [cats],
  );

  const filteredActivities = useMemo(() => {
    const activeCatId = visibleCats.find((c) => c.name === activeCategory)?.id;
    if (!activeCatId) return [];
    return activities.filter((a) => a.categoryId === activeCatId);
  }, [activities, activeCategory, visibleCats]);

  // ---------- load ----------
  async function loadData() {
    try {
      setLoading(true);
      const [actRes, catRes] = await Promise.all([
        fetch("/api/activities"),
        fetch("/api/activity-cats"),
      ]);
      if (!actRes.ok || !catRes.ok) throw new Error("Erro ao carregar dados");
      const [actData, catData] = await Promise.all([actRes.json(), catRes.json()]);
      setActivities(actData);
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
      alert(`Erro ao carregar dados: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  // ---------- submit ----------
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim())   { alert("Informe um título.");     return; }
    if (!form.categoryId)     { alert("Selecione uma categoria."); return; }

    const payload = {
      title:       form.title,
      description: form.description,
      client:      form.client,
      status:      form.status,
      categoryId:  form.categoryId,
    };

    try {
      let res: Response;
      if (editingId) {
        res = await fetch(`/api/activities/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/activities", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      if (!res.ok) throw new Error("Erro ao salvar atividade");
      const data = await res.json();
      if (editingId) {
        setActivities((prev) => prev.map((a) => (a.id === editingId ? data : a)));
      } else {
        setActivities((prev) => [data, ...prev]);
      }
      const firstCat = cats.find((c) =>
        ALLOWED_CATEGORIES.includes(c.name as (typeof ALLOWED_CATEGORIES)[number]),
      );
      setForm({ title: "", description: "", client: "", status: "Pendente", categoryId: firstCat?.id || cats[0]?.id || "" });
      setEditingId(null);
    } catch (error) {
      console.error(error);
      alert(`Erro ao salvar atividade: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // ---------- delete ----------
  async function handleDelete(id: string) {
    if (!confirm("Excluir esta atividade?")) return;
    try {
      const res = await fetch(`/api/activities/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao excluir");
      setActivities((prev) => prev.filter((a) => a.id !== id));
      if (openLogId === id) setOpenLogId(null);
    } catch (error) {
      console.error(error);
      alert(`Erro ao excluir: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // ---------- drag & drop ----------
  function handleDragStart(e: React.DragEvent, id: string) {
    setDragId(id);
  }

  async function handleDrop(e: React.DragEvent, newStatus: Activity["status"]) {
    e.preventDefault();
    if (!dragId) return;
    const dragged = activities.find((a) => a.id === dragId);
    if (!dragged || dragged.status === newStatus) { setDragId(null); return; }
    try {
      const res = await fetch(`/api/activities/${dragId}`, {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ ...dragged, status: newStatus }),
      });
      if (!res.ok) throw new Error("Erro ao mover card");
      const updated = await res.json();
      setActivities((prev) => prev.map((a) => (a.id === dragId ? updated : a)));
    } catch (error) {
      console.error(error);
      alert(`Erro ao mover card: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setDragId(null);
    }
  }

  function handleDragOver(e: React.DragEvent) { e.preventDefault(); }

  // ---------- edit ----------
  function startEdit(activity: Activity) {
    setEditingId(activity.id);
    setForm({
      title:       activity.title,
      description: activity.description || "",
      client:      activity.client || "",
      status:      activity.status,
      categoryId:  activity.categoryId,
    });
  }

  function cancelEdit() {
    setEditingId(null);
    const firstCat = cats.find((c) =>
      ALLOWED_CATEGORIES.includes(c.name as (typeof ALLOWED_CATEGORIES)[number]),
    );
    setForm({ title: "", description: "", client: "", status: "Pendente", categoryId: firstCat?.id || cats[0]?.id || "" });
  }

  // ---------- summary ----------
  const summaryByCategory = useMemo(() => {
    return ALLOWED_CATEGORIES.map((categoryName) => {
      const categoryId = cats.find((c) => c.name === categoryName)?.id;
      const count = activities.filter((a) => a.categoryId === categoryId).length;
      return { categoryName, count };
    });
  }, [activities, cats]);

  // ---------- render ----------
  return (
    <div className="space-y-6">
      {/* header */}
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Atividades</h2>
        <div className="flex gap-4 text-xs text-slate-600">
          {summaryByCategory.map((item) => (
            <span key={item.categoryName}>
              {item.categoryName}:{" "}
              <strong className="text-slate-900">{item.count}</strong>
            </span>
          ))}
        </div>
      </div>

      {/* abas de categoria */}
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

      {/* formulário */}
      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 border border-slate-200 rounded-lg p-4"
      >
        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-600">Título</label>
          <input
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm bg-white"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="Ex: Criar landing page, reunião com cliente..."
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-600">Descrição (opcional)</label>
          <textarea
            className="w-full min-h-[60px] rounded-md border border-slate-300 px-3 py-2 text-sm bg-white"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Detalhes da atividade..."
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-600">Cliente (opcional)</label>
          <input
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm bg-white"
            value={form.client}
            onChange={(e) => setForm((f) => ({ ...f, client: e.target.value }))}
            placeholder="Nome do cliente"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-600">Status</label>
          <select
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm bg-white"
            value={form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as Activity["status"] }))}
          >
            {STATUS_COLUMNS.map((col) => (
              <option key={col.id} value={col.id}>{col.title}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-600">Categoria</label>
          <select
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm bg-white"
            value={form.categoryId}
            onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
          >
            {visibleCats.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
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

      {/* kanban */}
      {loading ? (
        <p className="text-sm text-slate-500">Carregando atividades...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {STATUS_COLUMNS.map((col) => (
            <div
              key={col.id}
              onDrop={(e) => handleDrop(e, col.id)}
              onDragOver={handleDragOver}
              className={`rounded-lg bg-slate-50 border-t-4 ${col.color} p-4 shadow-sm`}
            >
              <h3 className="text-sm font-semibold text-slate-900 mb-3">
                {col.title} ({filteredActivities.filter((a) => a.status === col.id).length})
              </h3>

              <div className="space-y-3 min-h-[100px]">
                {filteredActivities
                  .filter((a) => a.status === col.id)
                  .map((a) => (
                    <article
                      key={a.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, a.id)}
                      className="rounded-md bg-white border border-slate-200 px-3 py-2 shadow-sm cursor-grab active:cursor-grabbing"
                    >
                      {/* cabeçalho do card */}
                      <header className="flex justify-between gap-2 mb-1">
                        <h4 className="text-sm font-medium text-slate-900 leading-snug">
                          {a.title}
                        </h4>
                        <span className="text-[11px] text-slate-400 shrink-0">
                          {a.category?.name}
                        </span>
                      </header>

                      {a.client && (
                        <p className="text-[11px] text-slate-500">{a.client}</p>
                      )}

                      {a.description && (
                        <p className="mt-1 text-[11px] text-slate-600">{a.description}</p>
                      )}

                      {/* footer do card */}
                      <footer className="mt-2 flex justify-between items-center gap-2">
                        {/* botão movimentações */}
                        <button
                          type="button"
                          onClick={() =>
                            setOpenLogId((prev) => (prev === a.id ? null : a.id))
                          }
                          className={
                            "text-[10px] px-2 py-0.5 rounded-full border transition " +
                            (openLogId === a.id
                              ? "bg-slate-800 text-white border-slate-800"
                              : "border-slate-300 text-slate-500 hover:bg-slate-100")
                          }
                        >
                          {openLogId === a.id ? "Fechar" : "Movimentações"}
                        </button>

                        <div className="flex gap-2">
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
                        </div>
                      </footer>

                      {/* painel de movimentações */}
                      {openLogId === a.id && <ActivityLogs activityId={a.id} />}
                    </article>
                  ))}

                {filteredActivities.filter((a) => a.status === col.id).length === 0 && (
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