"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Kind   = "A pagar" | "A receber";
type PState = "Vence em breve" | "Em aberto" | "Atrasado" | "Pago";
type Cat    = { id: string; name: string; kind: Kind; partner: boolean; custom: boolean };
type Entry  = {
  id: string; title: string; amount: number; dueDate: string;
  kind: Kind; catId: string; partner: string; notes: string;
  recurring: boolean; paid: boolean; paidAt: number | null;
  createdAt: number; updatedAt: number;
};

const KINDS:   Kind[]   = ["A pagar","A receber"];
const PSTATES: PState[] = ["Vence em breve","Em aberto","Atrasado","Pago"];

const DEF_CATS: Cat[] = [
  { id:"particular",  name:"Particular",  kind:"A pagar",   partner:false, custom:false },
  { id:"igreja",      name:"Igreja",      kind:"A pagar",   partner:false, custom:false },
  { id:"trabalho",    name:"Trabalho",    kind:"A receber", partner:true,  custom:false },
  { id:"recebimento", name:"Recebimento", kind:"A receber", partner:true,  custom:false },
];

const PST: Record<PState,{b:string;ac:string;su:string;dt:string}> = {
  "Vence em breve": {b:"bg-amber-100 text-amber-700 ring-amber-200",     ac:"bg-amber-500",   su:"bg-amber-50",   dt:"bg-amber-500"},
  "Em aberto":      {b:"bg-slate-100 text-slate-700 ring-slate-200",     ac:"bg-slate-400",   su:"bg-slate-50",   dt:"bg-slate-400"},
  "Atrasado":       {b:"bg-rose-100 text-rose-700 ring-rose-200",        ac:"bg-rose-500",    su:"bg-rose-50",    dt:"bg-rose-500"},
  "Pago":           {b:"bg-emerald-100 text-emerald-700 ring-emerald-200",ac:"bg-emerald-500",su:"bg-emerald-50", dt:"bg-emerald-500"},
};

function uid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
function uniq<T extends { id: string }>(a: T[]): T[] {
  return Array.from(new Map(a.map((i) => [i.id, i])).values());
}
function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^[-]+|[-]+$/g, "");
}
function pad(n: number) { return String(n).padStart(2, "0"); }
function todayVal() {
  const n = new Date();
  return `${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())}`;
}
function curMonth() {
  const n = new Date();
  return `${n.getFullYear()}-${pad(n.getMonth() + 1)}`;
}
function toDate(v: string) { return new Date(`${v}T12:00:00`); }
function sod(d: Date) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
function diffDays(v: string) {
  return Math.round((sod(toDate(v)).getTime() - sod(new Date()).getTime()) / 86400000);
}
function fmtCur(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}
function fmtMoney(v: number) { return v.toFixed(2).replace(".", ","); }
function parseMoney(v: string) {
  const c = v.trim().replace(/[^\d,.-]/g, "");
  if (!c) return NaN;
  return c.includes(",") ? Number(c.replace(/\./g, "").replace(",", ".")) : Number(c);
}
function fmtDT(ts: number) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(ts));
}
function fmtSD(v: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(toDate(v));
}
function fmtMonth(v: string) {
  const [y, m] = v.split("-").map(Number);
  const t = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date(y, m - 1, 1));
  return t[0].toUpperCase() + t.slice(1);
}
function sumAmt(a: Entry[]) { return a.reduce((s, i) => s + i.amount, 0); }
function sortFin(a: Entry[]) {
  return [...a].sort((x, y) => {
    const d = x.dueDate.localeCompare(y.dueDate);
    return d !== 0 ? d : y.updatedAt - x.updatedAt;
  });
}
function pstate(e: Entry): PState {
  if (e.paid) return "Pago";
  const d = diffDays(e.dueDate);
  if (d < 0) return "Atrasado";
  if (d <= 3) return "Vence em breve";
  return "Em aberto";
}
function dueLabel(e: Entry) {
  if (e.paid) return e.paidAt ? `Pago em ${fmtDT(e.paidAt)}` : "Pago";
  const d = diffDays(e.dueDate);
  if (d < 0)   return `Atrasado há ${Math.abs(d)} dia${Math.abs(d) > 1 ? "s" : ""}`;
  if (d === 0) return "Vence hoje";
  if (d <= 3)  return `Vence em ${d} dia${d > 1 ? "s" : ""}`;
  return `Vence ${fmtSD(e.dueDate)}`;
}
function normCat(c: any): Cat | null {
  if (!c?.id || !c?.name) return null;
  return { id: String(c.id), name: String(c.name), kind: c.kind === "A receber" ? "A receber" : "A pagar", partner: Boolean(c.partner), custom: Boolean(c.custom) };
}
function normEntry(e: any): Entry | null {
  if (!e?.id || !e?.title || !e?.dueDate) return null;
  return {
    id: String(e.id), title: String(e.title), amount: Number(e.amount) || 0,
    dueDate: String(e.dueDate), kind: e.kind === "A receber" ? "A receber" : "A pagar",
    catId: String(e.catId ?? "particular"), partner: String(e.partner ?? ""),
    notes: String(e.notes ?? ""), recurring: Boolean(e.recurring),
    paid: Boolean(e.paid), paidAt: typeof e.paidAt === "number" ? e.paidAt : null,
    createdAt: Number(e.createdAt) || Date.now(), updatedAt: Number(e.updatedAt) || Date.now(),
  };
}

export default function Finance() {
  const [loaded,  setLoaded]  = useState(false);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [cats,    setCats]    = useState<Cat[]>(DEF_CATS);
  const [editId,  setEditId]  = useState<string | null>(null);
  const [selId,   setSelId]   = useState<string | null>(null);
  const [month,   setMonth]   = useState(() => curMonth());
  const [fKind,   setFKind]   = useState<"all" | Kind>("all");
  const [fCat,    setFCat]    = useState("all");
  const [catName, setCatName] = useState("");
  const [catKind, setCatKind] = useState<Kind>("A pagar");
  const [catPart, setCatPart] = useState(false);
  const [form, setForm] = useState({
    title: "", amount: "", dueDate: todayVal(),
    kind: "A pagar" as Kind, catId: "particular",
    partner: "", notes: "", recurring: false,
  });

  useEffect(() => {
    try {
      const re = localStorage.getItem("f.entries.v1");
      if (re) { const p = JSON.parse(re); if (Array.isArray(p)) setEntries(sortFin(p.map(normEntry).filter(Boolean) as Entry[])); }
      const rc = localStorage.getItem("f.cats.v1");
      if (rc) { const p = JSON.parse(rc); if (Array.isArray(p)) setCats(uniq([...DEF_CATS, ...(p.map(normCat).filter(Boolean) as Cat[])])); }
    } catch (e) { console.error(e); } finally { setLoaded(true); }
  }, []);

  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem("f.entries.v1", JSON.stringify(entries));
    localStorage.setItem("f.cats.v1", JSON.stringify(cats));
  }, [entries, cats, loaded]);

  useEffect(() => {
    if (!selId) return;
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") setSelId(null); };
    window.addEventListener("keydown", fn);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", fn); document.body.style.overflow = ""; };
  }, [selId]);

  const catMap  = useMemo(() => new Map(cats.map((c) => [c.id, c])), [cats]);
  const selFin  = useMemo(() => entries.find((e) => e.id === selId) ?? null, [entries, selId]);
  const selCat  = catMap.get(form.catId);
  const needsPt = Boolean(selCat?.partner) || form.kind === "A receber";

  const visible = useMemo(() => sortFin(entries.filter((e) => {
    const inMonth = e.dueDate.slice(0, 7) === month;
    const overdue = !e.paid && pstate(e) === "Atrasado";
    if (!(inMonth || overdue)) return false;
    if (fKind !== "all" && e.kind !== fKind) return false;
    if (fCat !== "all" && e.catId !== fCat) return false;
    return true;
  })), [entries, month, fKind, fCat]);

  const groups = useMemo(() => {
    const g: Record<PState, Entry[]> = { "Vence em breve": [], "Em aberto": [], "Atrasado": [], "Pago": [] };
    for (const e of visible) g[pstate(e)].push(e);
    return g;
  }, [visible]);

  const alerts = useMemo(() =>
    entries.filter((e) => { if (e.paid) return false; const d = diffDays(e.dueDate); return d >= 0 && d <= 3; }).slice(0, 8),
    [entries]
  );

  const summary = useMemo(() => {
    const pay = visible.filter((e) => !e.paid && e.kind === "A pagar");
    const rec = visible.filter((e) => !e.paid && e.kind === "A receber");
    const tp = sumAmt(pay), tr = sumAmt(rec);
    return {
      total: visible.length,
      paid: visible.filter((e) => e.paid).length,
      payCount: pay.length, recCount: rec.length,
      tp, tr, balance: tr - tp,
      urgCount: visible.filter((e) => !e.paid && diffDays(e.dueDate) >= 0 && diffDays(e.dueDate) <= 3).length,
      ovdCount: visible.filter((e) => !e.paid && diffDays(e.dueDate) < 0).length,
    };
  }, [visible]);

  const resetForm = () => {
    setForm({ title: "", amount: "", dueDate: todayVal(), kind: "A pagar", catId: "particular", partner: "", notes: "", recurring: false });
    setEditId(null);
  };

  const submit = (ev: FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    const title = form.title.trim(); if (!title) { alert("Título obrigatório."); return; }
    const amount = parseMoney(form.amount); if (!Number.isFinite(amount) || amount <= 0) { alert("Valor inválido."); return; }
    const cat = catMap.get(form.catId); if (!cat) { alert("Categoria inválida."); return; }
    const mustPt = Boolean(cat.partner) || form.kind === "A receber";
    const partner = form.partner.trim(); if (mustPt && !partner) { alert("Informe cliente/fornecedor."); return; }
    const now = Date.now();
    const existing = editId ? entries.find((e) => e.id === editId) : null;
    const entry: Entry = {
      id: editId ?? uid(), title, amount, dueDate: form.dueDate, kind: form.kind,
      catId: form.catId, partner: mustPt ? partner : "", notes: form.notes.trim(),
      recurring: form.recurring, paid: existing?.paid ?? false, paidAt: existing?.paidAt ?? null,
      createdAt: existing?.createdAt ?? now, updatedAt: now,
    };
    setEntries((p) => sortFin(editId ? p.map((e) => e.id === editId ? entry : e) : [...p, entry]));
    resetForm();
  };

  const submitCat = (ev: FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    const name = catName.trim(); if (!name) { alert("Nome obrigatório."); return; }
    const id = slugify(name);
    if (cats.some((c) => c.id === id || c.name.toLowerCase() === name.toLowerCase())) { alert("Já existe."); return; }
    setCats((p) => uniq([...p, { id, name, kind: catKind, partner: catPart, custom: true }]));
    setCatName(""); setCatKind("A pagar"); setCatPart(false);
    setForm((p) => ({ ...p, catId: id, kind: catKind, partner: "" }));
  };

  const togglePaid = (id: string) => {
    setEntries((p) => sortFin(p.map((e) => {
      if (e.id !== id) return e;
      const paid = !e.paid;
      return { ...e, paid, paidAt: paid ? Date.now() : null, updatedAt: Date.now() };
    })));
  };

  const startEdit = (e: Entry) => {
    setEditId(e.id);
    setForm({ title: e.title, amount: fmtMoney(e.amount), dueDate: e.dueDate, kind: e.kind, catId: e.catId, partner: e.partner, notes: e.notes, recurring: e.recurring });
    setSelId(null);
  };

  const del = (id: string) => {
    if (!confirm("Excluir este lançamento?")) return;
    setEntries((p) => p.filter((e) => e.id !== id));
    if (editId === id) resetForm();
    if (selId === id) setSelId(null);
  };

  if (!loaded) return <div className="rounded-3xl bg-white p-8 text-sm text-slate-500">Carregando financeiro...</div>;

  const modalCat = selFin ? catMap.get(selFin.catId) ?? DEF_CATS[0] : null;
  const modalSt  = selFin ? pstate(selFin) : null;
  const modalSty = modalSt ? PST[modalSt] : null;

  const tiles = [
    { l: "Lançamentos",    v: String(summary.total),      h: `${summary.paid} pagos`,       tone: "slate" },
    { l: "A pagar",        v: fmtCur(summary.tp),         h: `${summary.payCount} abertos`,  tone: "rose"    },
    { l: "A receber",      v: fmtCur(summary.tr),         h: `${summary.recCount} abertos`,  tone: "emerald" },
    { l: "Saldo previsto", v: fmtCur(summary.balance),    h: summary.balance >= 0 ? "positivo" : "negativo", tone: summary.balance >= 0 ? "emerald" : "rose" },
    { l: "Urgentes",       v: String(summary.urgCount),   h: "vencem em 3 dias",             tone: "amber"   },
    { l: "Atrasados",      v: String(summary.ovdCount),   h: "em atraso",                    tone: "rose"    },
  ];

  const tileColor: Record<string, string> = {
    slate:   "border-white/10 bg-white/10",
    rose:    "border-rose-400/30 bg-rose-500/20",
    emerald: "border-emerald-400/30 bg-emerald-500/20",
    amber:   "border-amber-400/30 bg-amber-500/20",
  };

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      {/* cabeçalho */}
      <div className="bg-emerald-950 px-6 py-6 text-white lg:px-8">
        <p className="text-xs uppercase tracking-widest text-emerald-400">Card Financeiro</p>
        <h2 className="mt-1 text-2xl font-bold">Contas a pagar e a receber</h2>
        <p className="mt-1 text-sm text-emerald-300">{fmtMonth(month)}</p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {tiles.map((t) => (
            <div key={t.l} className={`rounded-2xl border p-3 ${tileColor[t.tone]}`}>
              <p className="text-xs text-emerald-200">{t.l}</p>
              <p className="mt-1 text-lg font-bold leading-tight">{t.v}</p>
              <p className="text-[10px] text-emerald-300">{t.h}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-6 p-6 lg:grid-cols-[1fr_300px] lg:p-8">
        {/* coluna principal */}
        <div className="space-y-6">
          {/* formulário */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">{editId ? "Editar lançamento" : "Novo lançamento"}</h3>
              {editId && (
                <button type="button" onClick={resetForm} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50">
                  Cancelar
                </button>
              )}
            </div>
            <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700">Título</label>
                <input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-200"
                  placeholder="Ex.: Conta de Luz, Recebimento cliente..." />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Valor (R$)</label>
                <input type="text" inputMode="decimal" value={form.amount} onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-200"
                  placeholder="0,00" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Vencimento</label>
                <input type="date" value={form.dueDate} onChange={(e) => setForm((p) => ({ ...p, dueDate: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-200" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Tipo</label>
                <select value={form.kind} onChange={(e) => setForm((p) => ({ ...p, kind: e.target.value as Kind }))}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-200">
                  {KINDS.map((k) => <option key={k}>{k}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Categoria</label>
                <select value={form.catId}
                  onChange={(e) => {
                    const cat = catMap.get(e.target.value);
                    setForm((p) => ({ ...p, catId: e.target.value, kind: cat?.kind ?? p.kind, partner: "" }));
                  }}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-200">
                  {cats.map((c) => <option key={c.id} value={c.id}>{c.name}{c.partner ? " (profissional)" : ""}</option>)}
                </select>
              </div>
              {needsPt && (
                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-slate-700">Cliente / Fornecedor</label>
                  <input value={form.partner} onChange={(e) => setForm((p) => ({ ...p, partner: e.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-200"
                    placeholder="Nome da pessoa ou empresa" />
                </div>
              )}
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700">Observação (opcional)</label>
                <textarea rows={2} value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-200"
                  placeholder="Detalhes adicionais..." />
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" checked={form.recurring} onChange={(e) => setForm((p) => ({ ...p, recurring: e.target.checked }))} className="h-4 w-4 rounded border-slate-300" />
                <span className="text-sm text-slate-700">Recorrente mensal</span>
              </div>
              <div className="flex items-center gap-3">
                <button type="submit" className="rounded-xl bg-emerald-800 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700">
                  {editId ? "Salvar" : "Adicionar"}
                </button>
                <button type="button" onClick={resetForm} className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                  Limpar
                </button>
              </div>
            </form>
          </div>

          {/* board */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-lg font-semibold">Board</h3>
              <div className="flex flex-wrap gap-2">
                <input type="month" value={month} onChange={(e) => setMonth(e.target.value)}
                  className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-200" />
                <select value={fKind} onChange={(e) => setFKind(e.target.value as "all" | Kind)}
                  className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-200">
                  <option value="all">Todos os tipos</option>
                  {KINDS.map((k) => <option key={k}>{k}</option>)}
                </select>
                <select value={fCat} onChange={(e) => setFCat(e.target.value)}
                  className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-200">
                  <option value="all">Todas as categorias</option>
                  {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {PSTATES.map((state) => {
                const col = groups[state];
                const sty = PST[state];
                return (
                  <div key={state} className={`min-h-40 rounded-2xl border border-slate-200 p-3 ${sty.su}`}>
                    <div className={`mb-2 h-1 rounded-full ${sty.ac}`} />
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className={`h-2 w-2 rounded-full ${sty.dt}`} />
                        <span className="text-xs font-semibold text-slate-800">{state}</span>
                      </div>
                      <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ring-1 ${sty.b}`}>{col.length}</span>
                    </div>
                    <div className="max-h-80 space-y-2 overflow-y-auto">
                      {col.length === 0
                        ? <div className="rounded-xl border border-dashed border-slate-300 bg-white/60 p-2 text-center text-[11px] text-slate-400">Nenhum</div>
                        : col.map((e) => {
                            const cat = catMap.get(e.catId) ?? DEF_CATS[0];
                            return (
                              <button key={e.id} type="button" onClick={() => setSelId(e.id)}
                                className="relative w-full overflow-hidden rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                                <div className={`absolute inset-x-0 top-0 h-0.5 ${sty.ac}`} />
                                <div className="flex items-start justify-between gap-1 pt-0.5">
                                  <p className="truncate text-sm font-semibold text-slate-900">{e.title}</p>
                                  <p className="shrink-0 text-sm font-bold text-slate-900">{fmtCur(e.amount)}</p>
                                </div>
                                {e.partner && <p className="truncate text-xs text-slate-500">{e.partner}</p>}
                                <div className="mt-1.5 flex flex-wrap gap-1">
                                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ring-1 ${e.kind === "A pagar" ? "bg-rose-50 text-rose-700 ring-rose-200" : "bg-emerald-50 text-emerald-700 ring-emerald-200"}`}>{e.kind}</span>
                                  <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 ring-1 ring-slate-200">{cat.name}</span>
                                </div>
                                <p className={`mt-1 text-[10px] font-medium ${state === "Atrasado" ? "text-rose-600" : state === "Vence em breve" ? "text-amber-600" : "text-slate-400"}`}>{dueLabel(e)}</p>
                              </button>
                            );
                          })
                      }
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* sidebar */}
        <aside className="space-y-4">
          {alerts.length > 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <h3 className="mb-1 font-semibold text-amber-900">Alertas</h3>
              <p className="mb-3 text-xs text-amber-700">Vencem nos próximos 3 dias</p>
              <div className="space-y-2">
                {alerts.map((e) => {
                  const d = diffDays(e.dueDate);
                  return (
                    <button key={e.id} type="button" onClick={() => setSelId(e.id)}
                      className="w-full rounded-xl border border-amber-200 bg-white p-3 text-left transition hover:shadow-md">
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate text-sm font-semibold">{e.title}</p>
                        <p className="shrink-0 text-sm font-bold text-rose-700">{fmtCur(e.amount)}</p>
                      </div>
                      <p className="mt-0.5 text-xs text-amber-700">{d === 0 ? "Vence hoje!" : `Em ${d} dia${d > 1 ? "s" : ""}`}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <h3 className="mb-3 font-semibold">Nova categoria</h3>
            <form onSubmit={submitCat} className="space-y-3">
              <input value={catName} onChange={(e) => setCatName(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-200"
                placeholder="Ex.: Aluguel, Salário..." />
              <select value={catKind} onChange={(e) => setCatKind(e.target.value as Kind)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-200">
                {KINDS.map((k) => <option key={k}>{k}</option>)}
              </select>
              <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm">
                <input type="checkbox" checked={catPart} onChange={(e) => setCatPart(e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
                Exige cliente/fornecedor
              </label>
              <button type="submit" className="w-full rounded-xl bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">
                Adicionar categoria
              </button>
            </form>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <h3 className="mb-3 font-semibold">Categorias</h3>
            <div className="space-y-2">
              {cats.map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">{c.name}</p>
                    <p className="text-xs text-slate-500">{c.custom ? "Personalizada" : "Padrão"}{c.partner ? " · parceiro" : ""}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${c.kind === "A pagar" ? "bg-rose-50 text-rose-700 ring-rose-200" : "bg-emerald-50 text-emerald-700 ring-emerald-200"}`}>
                    {c.kind === "A pagar" ? "Pagar" : "Receber"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {/* modal */}
      {selFin && modalCat && modalSt && modalSty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm"
          onClick={() => setSelId(null)}>
          <div className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}>
            <div className={`h-1.5 ${modalSty.ac}`} />
            <div className="p-6">
              <div className="mb-3 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-widest text-slate-400">Lançamento financeiro</p>
                  <h3 className="mt-1 text-xl font-bold text-slate-900">{selFin.title}</h3>
                  <p className="mt-1 text-2xl font-bold">{fmtCur(selFin.amount)}</p>
                </div>
                <button type="button" onClick={() => setSelId(null)}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold hover:bg-slate-50">
                  Fechar
                </button>
              </div>
              <div className="mb-4 flex flex-wrap gap-2">
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${modalSty.b}`}>{modalSt}</span>
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${selFin.kind === "A pagar" ? "bg-rose-50 text-rose-700 ring-rose-200" : "bg-emerald-50 text-emerald-700 ring-emerald-200"}`}>{selFin.kind}</span>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200">{modalCat.name}</span>
                {selFin.recurring && <span className="rounded-full bg-violet-100 px-2.5 py-1 text-[11px] font-semibold text-violet-700 ring-1 ring-violet-200">Mensal</span>}
              </div>
              <div className="mb-4 grid grid-cols-2 gap-3">
                {[
                  { l: "Vencimento", v: fmtSD(selFin.dueDate) },
                  { l: "Situação",   v: dueLabel(selFin) },
                  ...(selFin.partner ? [{ l: "Cliente/Fornecedor", v: selFin.partner }] : []),
                  ...(selFin.paidAt  ? [{ l: "Pago em", v: fmtDT(selFin.paidAt) }]    : []),
                  { l: "Criado em",  v: fmtDT(selFin.createdAt) },
                ].map((row) => (
                  <div key={row.l} className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{row.l}</p>
                    <p className="mt-1 text-sm font-medium text-slate-900">{row.v}</p>
                  </div>
                ))}
              </div>
              {selFin.notes && (
                <div className="mb-4 rounded-xl bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Observação</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{selFin.notes}</p>
                </div>
              )}
              <div className="flex flex-col gap-2">
                <button type="button" onClick={() => togglePaid(selFin.id)}
                  className={`w-full rounded-xl px-4 py-3 text-sm font-semibold transition ${selFin.paid ? "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100" : "bg-emerald-600 text-white hover:bg-emerald-700"}`}>
                  {selFin.paid ? "Desmarcar pagamento" : "Marcar como pago"}
                </button>
                <button type="button" onClick={() => startEdit(selFin)}
                  className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800">
                  Editar lançamento
                </button>
                <button type="button" onClick={() => del(selFin.id)}
                  className="w-full rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 hover:bg-rose-100">
                  Excluir lançamento
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}