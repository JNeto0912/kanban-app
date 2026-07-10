// src/app/components/Finance.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// ---------- tipos ----------
type Entry = {
  id: string;
  title: string;
  amount: number;
  dueDate: string;
  kind: "A pagar" | "A receber";
  categoryId: string;
  category: { id: string; name: string; kind: string };
  financeTypeId: string | null;
  financeType: { id: string; name: string; kind: string } | null;
  partner: string;
  notes: string;
  recurring: boolean;
  confirmed: boolean;
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

type FinanceType = {
  id: string;
  name: string;
  kind: string;
  categoryId: string;
  active: boolean;
  category?: Category;
};

type SummaryItem = {
  cat: string;
  toPayOpen: number;
  toPayPaid: number;
  toReceivePending: number;
  toReceiveReceived: number;
  balance: number;
};

type ChartPoint = {
  name: string;
  value: number;
  fill: string;
  drillable?: boolean;
  drillKind?: Entry["kind"];
  drillPaid?: boolean;
  items?: Entry[];
};

type DrilldownState = {
  label: string;
  data: ChartPoint[];
};

type SubtypeDetail = {
  label: string;
  items: Entry[];
} | null;

const ALLOWED_CATEGORIES = ["Igreja", "Particular"] as const;
const CHURCH_CATEGORY = "Igreja";

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

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril",
  "Maio", "Junho", "Julho", "Agosto",
  "Setembro", "Outubro", "Novembro", "Dezembro",
];

const MAIN_COLORS = ["#f59e0b", "#10b981", "#6366f1"];
const DRILLDOWN_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#14b8a6",
  "#f59e0b", "#22c55e", "#06b6d4", "#ef4444",
];

// ---------- modal do gráfico ----------
function ChartModal({
  item,
  entries,
  onClose,
}: {
  item: SummaryItem;
  entries: Entry[];
  onClose: () => void;
}) {
  const [drilldown, setDrilldown]         = useState<DrilldownState | null>(null);
  const [subtypeDetail, setSubtypeDetail] = useState<SubtypeDetail>(null);

  const mainData: ChartPoint[] = [
    {
      name:      "A pagar (aberto)",
      value:     item.toPayOpen,
      fill:      MAIN_COLORS[0],
      drillable: false,
    },
    {
      name:      "A pagar (pago)",
      value:     item.toPayPaid,
      fill:      MAIN_COLORS[1],
      drillable: item.cat === CHURCH_CATEGORY,
      drillKind: "A pagar" as Entry["kind"],
      drillPaid: true,
    },
    {
      name:      "Entradas confirmadas",
      value:     item.toReceiveReceived,
      fill:      MAIN_COLORS[2],
      drillable: item.cat === CHURCH_CATEGORY,
      drillKind: "A receber" as Entry["kind"],
      drillPaid: true,
    },
  ].filter((d) => d.value > 0);

  function openDrilldown(point: ChartPoint) {
    if (
      item.cat !== CHURCH_CATEGORY ||
      !point.drillable ||
      !point.drillKind ||
      point.drillPaid === undefined
    ) return;

    const filtered = entries.filter(
      (e) =>
        e.category?.name === item.cat &&
        e.kind            === point.drillKind &&
        e.paid            === point.drillPaid,
    );

    const grouped = filtered.reduce<
      Record<string, { value: number; items: Entry[] }>
    >((acc, entry) => {
      const key = entry.financeType?.name ?? "Sem subtipo";
      if (!acc[key]) acc[key] = { value: 0, items: [] };
      acc[key].value += entry.amount;
      acc[key].items.push(entry);
      return acc;
    }, {});

    const drillData: ChartPoint[] = Object.entries(grouped)
      .sort((a, b) => b[1].value - a[1].value)
      .map(([name, group], index) => ({
        name,
        value: group.value,
        fill:  DRILLDOWN_COLORS[index % DRILLDOWN_COLORS.length],
        items: group.items,
      }));

    if (drillData.length === 0) return;

    setDrilldown({ label: point.name, data: drillData });
    setSubtypeDetail(null);
  }

  function openSubtypeDetail(point: ChartPoint) {
    if (!point.items?.length) return;
    setSubtypeDetail({ label: point.name, items: point.items });
  }

  function handleBack() {
    if (subtypeDetail) { setSubtypeDetail(null); return; }
    if (drilldown)     { setDrilldown(null);      return; }
  }

  const currentData = drilldown ? drilldown.data : mainData;
  const subtotal    = subtypeDetail
    ? subtypeDetail.items.reduce((sum, e) => sum + e.amount, 0)
    : 0;

  const showBack      = !!(drilldown || subtypeDetail);
  const showTotals    = !drilldown && !subtypeDetail;
  const showSaldo     = !drilldown && !subtypeDetail;
  const showDrillList = !!drilldown && !subtypeDetail;
  const showItems     = !!subtypeDetail;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* cabeçalho */}
        <div className="flex items-center justify-between mb-4">
          <div>
            {showBack && (
              <button
                onClick={handleBack}
                className="text-[10px] text-slate-400 hover:text-slate-700 mb-1 flex items-center gap-1"
              >
                ← Voltar
              </button>
            )}
            <h3 className="text-base font-semibold text-slate-900">
              {item.cat}
              {drilldown     && ` — ${drilldown.label}`}
              {subtypeDetail && ` — ${subtypeDetail.label}`}
            </h3>
            <p className="text-[11px] text-slate-400">
              {subtypeDetail
                ? "Itens que compõem este subtipo"
                : drilldown
                  ? "Clique em um subtipo para ver os itens"
                  : item.cat === CHURCH_CATEGORY
                    ? "Clique nas barras de pago ou confirmadas para ver por subtipo"
                    : "Distribuição financeira do mês"}
            </p>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-xl leading-none"
          >
            ✕
          </button>
        </div>

        {/* gráfico — oculta quando está no detalhe de itens */}
        {!showItems && (
          currentData.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-10">
              Sem lançamentos neste mês.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={currentData}
                margin={{ top: 10, right: 10, left: 10, bottom: 40 }}
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
                  tickFormatter={formatCompactNumber}
                />
                <Tooltip
                  formatter={(value) => formatCurrency(Number(value ?? 0))}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {currentData.map((entry, index) => {
                    const clickable =
                      (!drilldown && entry.drillable) || !!drilldown;

                    return (
                      <Cell
                        key={`${entry.name}-${index}`}
                        fill={entry.fill}
                        style={{ cursor: clickable ? "pointer" : "default" }}
                        onClick={
                          clickable
                            ? () =>
                                drilldown
                                  ? openSubtypeDetail(entry)
                                  : openDrilldown(entry)
                            : undefined
                        }
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )
        )}

        {/* totais — gráfico principal */}
        {showTotals && (
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg bg-amber-50 border border-amber-100 px-3 py-2">
              <p className="text-amber-600 font-medium">A pagar (aberto)</p>
              <p className="text-slate-800 font-semibold">
                {formatCurrency(item.toPayOpen)}
              </p>
            </div>

            <div className="rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2">
              <p className="text-emerald-600 font-medium">A pagar (pago)</p>
              <p className="text-slate-800 font-semibold">
                {formatCurrency(item.toPayPaid)}
              </p>
            </div>

            <div className="rounded-lg bg-indigo-50 border border-indigo-100 px-3 py-2 col-span-2">
              <p className="text-indigo-600 font-medium">Entradas confirmadas</p>
              <p className="text-slate-800 font-semibold">
                {formatCurrency(item.toReceiveReceived)}
              </p>
            </div>
          </div>
        )}

        {/* lista de subtipos no drilldown */}
        {showDrillList && (
          <div className="mt-4 space-y-2">
            {drilldown.data.map((d, i) => (
              <button
                key={`${d.name}-${i}`}
                type="button"
                onClick={() => openSubtypeDetail(d)}
                className="w-full flex justify-between items-center rounded-lg px-3 py-2 text-xs border text-left hover:opacity-80 transition-opacity"
                style={{
                  borderColor:     `${d.fill}55`,
                  backgroundColor: `${d.fill}12`,
                }}
              >
                <span className="font-medium text-slate-700">{d.name}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-semibold text-slate-900">
                    {formatCurrency(d.value)}
                  </span>
                  <span className="text-slate-400 text-[10px]">
                    {d.items?.length ?? 0} item(ns) →
                  </span>
                </div>
              </button>
            ))}

            <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 flex justify-between items-center text-xs font-semibold">
              <span>Total</span>
              <span>
                {formatCurrency(
                  drilldown.data.reduce((s, d) => s + d.value, 0),
                )}
              </span>
            </div>
          </div>
        )}

        {/* detalhe dos itens do subtipo */}
        {showItems && subtypeDetail && (
          <div className="mt-2 space-y-2">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-slate-500">
                {subtypeDetail.items.length} item(ns)
              </p>
              <p className="text-xs font-semibold text-slate-800">
                Total: {formatCurrency(subtotal)}
              </p>
            </div>

            <div className="space-y-2 max-h-[52vh] overflow-auto pr-1">
              {[...subtypeDetail.items]
                .sort(
                  (a, b) =>
                    new Date(a.dueDate).getTime() -
                    new Date(b.dueDate).getTime(),
                )
                .map((entry) => (
                  <div
                    key={entry.id}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900">
                          {entry.title}
                        </p>

                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {new Date(entry.dueDate).toLocaleDateString("pt-BR")}
                          {entry.partner ? ` • ${entry.partner}` : ""}
                        </p>

                        {entry.notes && (
                          <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                            {entry.notes}
                          </p>
                        )}
                      </div>

                      <div className="text-right shrink-0 space-y-1">
                        <p className="text-sm font-semibold text-slate-900">
                          {formatCurrency(entry.amount)}
                        </p>

                        <span
                          className={`inline-block text-[9px] font-medium px-1.5 py-0.5 rounded-full border ${
                            entry.confirmed
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-slate-100 text-slate-500 border-slate-200"
                          }`}
                        >
                          {entry.confirmed ? "✓ Confirmado" : "Estimado"}
                        </span>

                        {entry.recurring && (
                          <span className="inline-block ml-1 text-[9px] font-medium px-1.5 py-0.5 rounded-full border bg-violet-50 text-violet-700 border-violet-200">
                            Recorrente
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* saldo */}
        {showSaldo && (
          <div
            className={`mt-3 rounded-lg px-4 py-2 flex justify-between items-center text-sm font-semibold ${
              item.balance >= 0
                ? "bg-emerald-50 text-emerald-700"
                : "bg-red-50 text-red-600"
            }`}
          >
            <span>Saldo do mês</span>
            <span>{formatCurrency(item.balance)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- modal novo tipo ----------
function NewTypeModal({
  categoryId,
  kind,
  onClose,
  onCreated,
}: {
  categoryId: string;
  kind: Entry["kind"];
  onClose: () => void;
  onCreated: (type: FinanceType) => void;
}) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim()) { alert("Informe um nome."); return; }

    try {
      setSaving(true);
      const res = await fetch("/api/finance-types", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ name: name.trim(), kind, categoryId }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Erro ao criar tipo");
      }

      const created = await res.json();
      onCreated(created);
      onClose();
    } catch (error) {
      alert(`Erro: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-900">
            Novo tipo — {kind}
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-xl"
          >
            ✕
          </button>
        </div>

        <input
          autoFocus
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm bg-white mb-4"
          placeholder="Ex: Administrativo, Dízimos..."
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") void handleSave(); }}
        />

        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="rounded-md border border-slate-300 text-sm px-3 py-2 text-slate-600 hover:bg-slate-100"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-md bg-slate-900 text-slate-100 text-sm px-4 py-2 hover:bg-slate-800 disabled:opacity-50"
          >
            {saving ? "Salvando..." : "Criar tipo"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- share button ----------
function ShareButton({ categoryId }: { categoryId: string }) {
  const [link, setLink]       = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied]   = useState(false);

  // carrega link ativo ao montar
  useEffect(() => {
    async function loadExisting() {
      try {
        const res = await fetch(
          `/api/finance-share?categoryId=${categoryId}`,
        );
        if (!res.ok) return;
        const data = await res.json();
        if (data?.token) {
          setLink(`${window.location.origin}/relatorio/${data.token}`);
        }
      } catch {
        // silencioso
      }
    }
    void loadExisting();
  }, [categoryId]);

  async function generateLink() {
    try {
      setLoading(true);
      const res = await fetch("/api/finance-share", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ categoryId }),
      });
      if (!res.ok) throw new Error("Erro ao gerar link");
      const data = await res.json();
      setLink(`${window.location.origin}/relatorio/${data.token}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao gerar link");
    } finally {
      setLoading(false);
    }
  }

  async function revokeLink() {
    if (
      !confirm(
        "Revogar o link? Quem tiver o link não conseguirá mais acessar.",
      )
    ) return;
    try {
      await fetch(`/api/finance-share?categoryId=${categoryId}`, {
        method: "DELETE",
      });
      setLink(null);
    } catch {
      alert("Erro ao revogar link");
    }
  }

  async function copyLink() {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {!link ? (
        <button
          type="button"
          onClick={generateLink}
          disabled={loading}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 disabled:opacity-50 flex items-center gap-1"
        >
          🔗 {loading ? "Gerando..." : "Compartilhar relatório da Igreja"}
        </button>
      ) : (
        <div className="flex flex-wrap items-center gap-2 w-full">
          <input
            readOnly
            value={link}
            className="flex-1 min-w-0 rounded-md border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs text-slate-700"
          />
          <button
            type="button"
            onClick={copyLink}
            className="rounded-md bg-slate-900 text-slate-100 text-xs px-3 py-1.5 hover:bg-slate-800"
          >
            {copied ? "✓ Copiado" : "Copiar"}
          </button>
          <button
            type="button"
            onClick={revokeLink}
            className="rounded-md border border-red-200 text-red-500 text-xs px-3 py-1.5 hover:bg-red-50"
          >
            Revogar
          </button>
        </div>
      )}
    </div>
  );
}

// ---------- componente principal ----------
export default function Finance() {
  const [entries, setEntries]           = useState<Entry[]>([]);
  const [cats, setCats]                 = useState<Category[]>([]);
  const [financeTypes, setFinanceTypes] = useState<FinanceType[]>([]);
  const [loading, setLoading]           = useState(true);
  const [editingId, setEditingId]       = useState<string | null>(null);
  const [dragId, setDragId]             = useState<string | null>(null);
  const [chartItem, setChartItem]       = useState<SummaryItem | null>(null);
  const [showNewType, setShowNewType]   = useState(false);

  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1);
  const [selectedYear, setSelectedYear]   = useState(today.getFullYear());

  const [activeCategory, setActiveCategory] =
    useState<(typeof ALLOWED_CATEGORIES)[number]>("Igreja");

  const [form, setForm] = useState({
    title:         "",
    amount:        "",
    dueDate:       "",
    kind:          "A pagar" as Entry["kind"],
    categoryId:    "",
    financeTypeId: "",
    partner:       "",
    notes:         "",
    recurring:     false,
    confirmed:     false,
  });

  const selectedCategory = useMemo(
    () => cats.find((c) => c.id === form.categoryId),
    [cats, form.categoryId],
  );

  const isChurchForm = selectedCategory?.name === CHURCH_CATEGORY;

  const churchCat = useMemo(
    () => cats.find((c) => c.name === CHURCH_CATEGORY),
    [cats],
  );

  const availableTypes = useMemo(() => {
    if (!isChurchForm || !selectedCategory) return [];
    return financeTypes.filter(
      (t) =>
        t.categoryId === selectedCategory.id &&
        t.kind       === form.kind &&
        t.active,
    );
  }, [financeTypes, isChurchForm, selectedCategory, form.kind]);

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
        ALLOWED_CATEGORIES.includes(
          c.name as (typeof ALLOWED_CATEGORIES)[number],
        ),
      );

      setForm((prev) => ({
        ...prev,
        categoryId: prev.categoryId || firstCat?.id || catData[0]?.id || "",
      }));

      if (firstCat) {
        setActiveCategory(
          firstCat.name as (typeof ALLOWED_CATEGORIES)[number],
        );
      }

      const churchCategory = catData.find(
        (c: Category) => c.name === CHURCH_CATEGORY,
      );

      if (churchCategory) {
        const typesRes = await fetch(
          `/api/finance-types?categoryId=${churchCategory.id}`,
        );
        if (typesRes.ok) setFinanceTypes(await typesRes.json());
      }
    } catch (error) {
      console.error(error);
      alert(
        `Erro ao carregar dados: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadData(); }, []);

  useEffect(() => {
    setForm((f) => {
      const cat = cats.find((c) => c.id === f.categoryId);
      if (cat?.name !== CHURCH_CATEGORY && f.financeTypeId) {
        return { ...f, financeTypeId: "" };
      }
      return f;
    });
  }, [form.categoryId, form.kind, cats]);

  // ---------- filtros ----------
  const monthFiltered = useMemo(() => {
    return entries.filter((e) => {
      const d = new Date(e.dueDate);
      return (
        d.getMonth() + 1 === selectedMonth &&
        d.getFullYear()  === selectedYear
      );
    });
  }, [entries, selectedMonth, selectedYear]);

  const filteredEntries = useMemo(
    () => monthFiltered.filter((e) => e.category?.name === activeCategory),
    [monthFiltered, activeCategory],
  );

  // ---------- resumo ----------
  const summaryByCategory = useMemo<SummaryItem[]>(() => {
    return ALLOWED_CATEGORIES.map((cat) => {
      const items = monthFiltered.filter((e) => e.category?.name === cat);

      const toPayOpen         = items.filter((e) => e.kind === "A pagar"  && !e.paid).reduce((s, e) => s + e.amount, 0);
      const toPayPaid         = items.filter((e) => e.kind === "A pagar"  &&  e.paid).reduce((s, e) => s + e.amount, 0);
      const toReceivePending  = items.filter((e) => e.kind === "A receber" && !e.paid).reduce((s, e) => s + e.amount, 0);
      const toReceiveReceived = items.filter((e) => e.kind === "A receber" &&  e.paid).reduce((s, e) => s + e.amount, 0);
      const balance           = toReceiveReceived + toReceivePending - toPayPaid - toPayOpen;

      return { cat, toPayOpen, toPayPaid, toReceivePending, toReceiveReceived, balance };
    });
  }, [monthFiltered]);

  // ---------- submit ----------
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.title.trim())  { alert("Informe um título.");       return; }
    if (!form.amount)        { alert("Informe um valor.");        return; }
    if (!form.dueDate)       { alert("Informe uma data.");        return; }
    if (!form.categoryId)    { alert("Selecione uma categoria."); return; }
    if (isChurchForm && !form.financeTypeId) {
      alert("Selecione um subtipo da Igreja.");
      return;
    }

    const payload = {
      title:         form.title,
      amount:        Number(form.amount),
      dueDate:       form.dueDate,
      kind:          form.kind,
      categoryId:    form.categoryId,
      financeTypeId: form.financeTypeId || null,
      partner:       form.partner,
      notes:         form.notes,
      recurring:     form.recurring,
      confirmed:     form.confirmed,
    };

    try {
      let res: Response;

      if (editingId) {
        res = await fetch(`/api/finance/${editingId}`, {
          method:  "PUT",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/finance", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify(payload),
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
        ALLOWED_CATEGORIES.includes(
          c.name as (typeof ALLOWED_CATEGORIES)[number],
        ),
      );

      setForm({
        title: "", amount: "", dueDate: "", kind: "A pagar",
        categoryId:    firstCat?.id || cats[0]?.id || "",
        financeTypeId: "",
        partner: "", notes: "", recurring: false, confirmed: false,
      });

      setEditingId(null);
    } catch (error) {
      console.error(error);
      alert(
        `Erro ao salvar: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
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
      alert(
        `Erro ao excluir: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  // ---------- edit ----------
  function startEdit(entry: Entry) {
    setEditingId(entry.id);
    setForm({
      title:         entry.title,
      amount:        String(entry.amount),
      dueDate:       entry.dueDate.slice(0, 10),
      kind:          entry.kind,
      categoryId:    entry.categoryId,
      financeTypeId: entry.financeTypeId ?? "",
      partner:       entry.partner,
      notes:         entry.notes,
      recurring:     entry.recurring,
      confirmed:     entry.confirmed,
    });
  }

  function cancelEdit() {
    setEditingId(null);
    const firstCat = cats.find((c) =>
      ALLOWED_CATEGORIES.includes(
        c.name as (typeof ALLOWED_CATEGORIES)[number],
      ),
    );
    setForm({
      title: "", amount: "", dueDate: "", kind: "A pagar",
      categoryId:    firstCat?.id || cats[0]?.id || "",
      financeTypeId: "",
      partner: "", notes: "", recurring: false, confirmed: false,
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

    if (entry.kind === col.kind && entry.paid === col.paid) {
      setDragId(null);
      return;
    }

    const payload = {
      ...entry,
      kind:   col.kind,
      paid:   col.paid,
      paidAt: col.paid ? new Date().toISOString() : null,
    };

    try {
      const res = await fetch(`/api/finance/${dragId}`, {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Erro ao mover card");

      const updated = await res.json();
      setEntries((prev) =>
        prev.map((en) => (en.id === dragId ? updated : en)),
      );
    } catch (error) {
      console.error(error);
      alert(
        `Erro ao mover card: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    } finally {
      setDragId(null);
    }
  }

  // ---------- render ----------
  return (
    <div className="space-y-6">
      {/* modais */}
      {chartItem && (
        <ChartModal
          item={chartItem}
          entries={monthFiltered}
          onClose={() => setChartItem(null)}
        />
      )}

      {showNewType && churchCat && (
        <NewTypeModal
          categoryId={churchCat.id}
          kind={form.kind}
          onClose={() => setShowNewType(false)}
          onCreated={(t) => {
            setFinanceTypes((prev) => [...prev, t]);
            setForm((f) => ({ ...f, financeTypeId: t.id }));
          }}
        />
      )}

      {/* cabeçalho + filtro mês/ano */}
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

      {/* resumo por categoria */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {summaryByCategory.map((item) => (
          <button
            key={item.cat}
            type="button"
            onClick={() => setChartItem(item)}
            className="text-left rounded-lg bg-slate-900 border border-slate-700 px-4 py-3 text-xs text-slate-100 space-y-1 hover:bg-slate-800 transition-colors group cursor-pointer"
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-semibold text-slate-300">
                {item.cat}
              </p>
              <span className="text-[10px] text-slate-500 group-hover:text-slate-300 transition-colors">
                Ver gráfico →
              </span>
            </div>

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
          </button>
        ))}
      </div>

      {/* formulário */}
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
            placeholder="Ex: Conta de luz, dízimo..."
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
            onChange={(e) =>
              setForm((f) => ({ ...f, kind: e.target.value as Entry["kind"] }))
            }
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
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
          </select>
        </div>

        {/* subtipo da Igreja */}
        {isChurchForm && (
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-600">
              Subtipo {form.kind === "A pagar" ? "(despesa)" : "(receita)"}
            </label>
            <div className="flex gap-2">
              <select
                className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm bg-white"
                value={form.financeTypeId}
                onChange={(e) =>
                  setForm((f) => ({ ...f, financeTypeId: e.target.value }))
                }
              >
                <option value="">— Selecione —</option>
                {availableTypes.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowNewType(true)}
                className="shrink-0 rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
                title="Criar novo subtipo"
              >
                + Novo
              </button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-600">Parceiro</label>
          <input
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm bg-white"
            value={form.partner}
            onChange={(e) =>
              setForm((f) => ({ ...f, partner: e.target.value }))
            }
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

        <div className="flex flex-col gap-2 lg:col-span-1">
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
              Recorrente (gera próximo mês automaticamente)
            </label>
          </div>

          <div className="flex items-center gap-2">
            <input
              id="confirmed"
              type="checkbox"
              checked={form.confirmed}
              onChange={(e) =>
                setForm((f) => ({ ...f, confirmed: e.target.checked }))
              }
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

      {/* abas por categoria */}
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

      {/* compartilhamento — só na Igreja */}
      {activeCategory === CHURCH_CATEGORY && churchCat && (
        <ShareButton categoryId={churchCat.id} />
      )}

      {/* kanban */}
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
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-slate-800">
                    {col.label}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {colEntries.length}
                  </span>
                </div>

                <p className="text-[10px] text-slate-400 mb-3">
                  {formatCurrency(total)}
                </p>

                <div className="space-y-2 flex-1">
                  {colEntries.map((e) => (
                    <article
                      key={e.id}
                      draggable
                      onDragStart={(ev) => handleDragStart(ev, e.id)}
                      className="rounded-md bg-white border border-slate-200 px-2 py-2 shadow-sm cursor-grab active:cursor-grabbing space-y-1"
                    >
                      <div className="flex items-start justify-between gap-1 flex-wrap">
                        <h4 className="text-xs font-medium text-slate-900 leading-snug">
                          {e.title}
                        </h4>

                        <div className="flex gap-1 flex-wrap justify-end">
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

                      {e.financeType?.name && (
                        <span className="inline-block text-[9px] font-medium px-1.5 py-0.5 rounded-full border bg-violet-50 text-violet-700 border-violet-200">
                          {e.financeType.name}
                        </span>
                      )}

                      <p className="text-[10px] text-slate-400">
                        {new Date(e.dueDate).toLocaleDateString("pt-BR")}
                      </p>

                      {e.partner && (
                        <p className="text-[10px] text-slate-500 truncate">
                          {e.partner}
                        </p>
                      )}

                      {e.notes && (
                        <p className="text-[10px] text-slate-500 line-clamp-2">
                          {e.notes}
                        </p>
                      )}

                      <p className={`text-xs font-semibold ${e.confirmed ? "text-slate-900" : "text-slate-400"}`}>
                        {formatCurrency(e.amount)}
                        {!e.confirmed && (
                          <span className="ml-1 text-[9px] font-normal">
                            (estimado)
                          </span>
                        )}
                      </p>

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