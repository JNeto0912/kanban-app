"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Status =
  | "Pendente"
  | "Em andamento"
  | "Pausado"
  | "Homologado"
  | "Finalizado";

type Category = {
  id: string;
  name: string;
  requiresClient: boolean;
  custom: boolean;
};

type Card = {
  id: string;
  title: string;
  description: string;
  client: string;
  status: Status;
  categoryId: string;
  createdAt: number;
  updatedAt: number;
};

type CardFormState = {
  title: string;
  description: string;
  client: string;
  status: Status;
  categoryId: string;
};

const STATUSES: Status[] = [
  "Pendente",
  "Em andamento",
  "Pausado",
  "Homologado",
  "Finalizado",
];

const DEFAULT_CATEGORIES: Category[] = [
  { id: "particular", name: "Particular", requiresClient: false, custom: false },
  { id: "igreja", name: "Igreja", requiresClient: false, custom: false },
  { id: "trabalho", name: "Trabalho", requiresClient: true, custom: false },
];

const STORAGE_KEYS = {
  cards: "kanban.cards.v1",
  categories: "kanban.categories.v1",
};

const EMPTY_FORM: CardFormState = {
  title: "",
  description: "",
  client: "",
  status: "Pendente",
  categoryId: "particular",
};

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^[-]+|[-]+$/g, "");
}

function dedupeCategories(items: Category[]) {
  const map = new Map<string, Category>();

  for (const item of items) {
    if (item?.id && item?.name) {
      map.set(item.id, item);
    }
  }

  return Array.from(map.values());
}

function statusClass(status: Status) {
  switch (status) {
    case "Pendente":
      return "bg-slate-100 text-slate-700 ring-slate-200";
    case "Em andamento":
      return "bg-blue-100 text-blue-700 ring-blue-200";
    case "Pausado":
      return "bg-amber-100 text-amber-700 ring-amber-200";
    case "Homologado":
      return "bg-violet-100 text-violet-700 ring-violet-200";
    case "Finalizado":
      return "bg-emerald-100 text-emerald-700 ring-emerald-200";
  }
}

function categoryClass(category: Category) {
  return category.requiresClient
    ? "bg-blue-50 text-blue-700 ring-blue-200"
    : "bg-slate-100 text-slate-700 ring-slate-200";
}

export default function Page() {
  const [loaded, setLoaded] = useState(false);
  const [cards, setCards] = useState<Card[]>([]);
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterCategoryId, setFilterCategoryId] = useState<string>("all");
  const [categoryName, setCategoryName] = useState("");
  const [categoryProfessional, setCategoryProfessional] = useState(false);
  const [form, setForm] = useState<CardFormState>(EMPTY_FORM);

  useEffect(() => {
    try {
      const savedCategories = localStorage.getItem(STORAGE_KEYS.categories);
      const savedCards = localStorage.getItem(STORAGE_KEYS.cards);

      if (savedCategories) {
        const parsedCategories = JSON.parse(savedCategories);
        if (Array.isArray(parsedCategories)) {
          setCategories(dedupeCategories([...DEFAULT_CATEGORIES, ...parsedCategories]));
        }
      }

      if (savedCards) {
        const parsedCards = JSON.parse(savedCards);
        if (Array.isArray(parsedCards)) {
          setCards(parsedCards);
        }
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!loaded) return;

    localStorage.setItem(STORAGE_KEYS.cards, JSON.stringify(cards));
    localStorage.setItem(STORAGE_KEYS.categories, JSON.stringify(categories));
  }, [cards, categories, loaded]);

  const categoryMap = useMemo(() => {
    return new Map(categories.map((category) => [category.id, category]));
  }, [categories]);

  const selectedCategory = categoryMap.get(form.categoryId);
  const needsClient = selectedCategory?.requiresClient ?? false;

  const visibleCards = useMemo(() => {
    const filtered = cards.filter((card) => {
      if (filterCategoryId === "all") return true;
      return card.categoryId === filterCategoryId;
    });

    return filtered.sort((a, b) => b.updatedAt - a.updatedAt);
  }, [cards, filterCategoryId]);

  const totalVisibleCards = visibleCards.length;

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingId(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const title = form.title.trim();
    const description = form.description.trim();
    const client = form.client.trim();
    const category = categoryMap.get(form.categoryId);

    if (!title) {
      alert("Digite um título para o cartão.");
      return;
    }

    if (!category) {
      alert("Selecione uma categoria válida.");
      return;
    }

    if (category.requiresClient && !client) {
      alert("Os cartões profissionais precisam de cliente.");
      return;
    }

    const now = Date.now();

    if (editingId) {
      setCards((prev) =>
        prev.map((card) =>
          card.id === editingId
            ? {
                ...card,
                title,
                description,
                client: category.requiresClient ? client : "",
                status: form.status,
                categoryId: form.categoryId,
                updatedAt: now,
              }
            : card
        )
      );
    } else {
      setCards((prev) => [
        ...prev,
        {
          id: createId(),
          title,
          description,
          client: category.requiresClient ? client : "",
          status: form.status,
          categoryId: form.categoryId,
          createdAt: now,
          updatedAt: now,
        },
      ]);
    }

    resetForm();
  }

  function handleEdit(card: Card) {
    setEditingId(card.id);
    setForm({
      title: card.title,
      description: card.description,
      client: card.client ?? "",
      status: card.status,
      categoryId: card.categoryId,
    });
  }

  function handleDelete(id: string) {
    const confirmed = confirm("Tem certeza que deseja excluir este cartão?");
    if (!confirmed) return;

    setCards((prev) => prev.filter((card) => card.id !== id));

    if (editingId === id) {
      resetForm();
    }
  }

  function handleStatusChange(id: string, status: Status) {
    setCards((prev) =>
      prev.map((card) =>
        card.id === id
          ? {
              ...card,
              status,
              updatedAt: Date.now(),
            }
          : card
      )
    );
  }

  function handleAddCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedName = categoryName.trim();

    if (!trimmedName) {
      alert("Digite o nome da nova categoria.");
      return;
    }

    const id = slugify(trimmedName);

    const alreadyExists = categories.some(
      (category) =>
        category.id === id ||
        category.name.toLowerCase() === trimmedName.toLowerCase()
    );

    if (alreadyExists) {
      alert("Essa categoria já existe.");
      return;
    }

    const newCategory: Category = {
      id,
      name: trimmedName,
      requiresClient: categoryProfessional,
      custom: true,
    };

    setCategories((prev) => dedupeCategories([...prev, newCategory]));
    setCategoryName("");
    setCategoryProfessional(false);
    setForm((prev) => ({ ...prev, categoryId: id }));
  }

  if (!loaded) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-10 text-slate-900">
        <div className="mx-auto max-w-7xl rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm font-medium text-slate-500">Carregando...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="rounded-3xl bg-gradient-to-r from-slate-900 to-slate-700 p-6 text-white shadow-lg">
          <div className="flex flex-col gap-6">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-300">
                Projeto Kanban
              </p>
              <h1 className="mt-2 text-3xl font-bold">
                Kanban simples com categorias e clientes
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-200">
                Cartões por categoria: Particular, Igreja, Trabalho e outras
                categorias personalizadas. Os cartões profissionais mostram o
                campo Cliente.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-xs text-slate-300">Total</p>
                <p className="mt-1 text-2xl font-bold">{cards.length}</p>
              </div>

              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-xs text-slate-300">Visíveis</p>
                <p className="mt-1 text-2xl font-bold">{totalVisibleCards}</p>
              </div>

              {STATUSES.map((status) => {
                const count = visibleCards.filter(
                  (card) => card.status === status
                ).length;

                return (
                  <div key={status} className="rounded-2xl bg-white/10 p-4">
                    <p className="text-xs text-slate-300">{status}</p>
                    <p className="mt-1 text-2xl font-bold">{count}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </header>

        <section className="mt-6 grid gap-6 xl:grid-cols-3">
          <div className="space-y-6 xl:col-span-2">
            <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold">
                    {editingId ? "Editar cartão" : "Novo cartão"}
                  </h2>
                  <p className="text-sm text-slate-500">
                    Preencha o cartão e escolha a categoria e o status.
                  </p>
                </div>

                {editingId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Cancelar edição
                  </button>
                )}
              </div>

              <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Título
                  </label>
                  <input
                    value={form.title}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, title: e.target.value }))
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                    placeholder="Ex.: Organizar reunião"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Descrição
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    rows={4}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                    placeholder="Detalhes do cartão..."
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Categoria
                  </label>
                  <select
                    value={form.categoryId}
                    onChange={(e) => {
                      const nextCategoryId = e.target.value;
                      const nextCategory = categoryMap.get(nextCategoryId);

                      setForm((prev) => ({
                        ...prev,
                        categoryId: nextCategoryId,
                        client: nextCategory?.requiresClient ? prev.client : "",
                      }));
                    }}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                  >
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                        {category.requiresClient ? " (profissional)" : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Status
                  </label>
                  <select
                    value={form.status}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        status: e.target.value as Status,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                  >
                    {STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>

                {needsClient && (
                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Cliente
                    </label>
                    <input
                      value={form.client}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, client: e.target.value }))
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                      placeholder="Nome do cliente"
                    />
                  </div>
                )}

                <div className="md:col-span-2 flex flex-wrap gap-3">
                  <button
                    type="submit"
                    className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    {editingId ? "Salvar alterações" : "Adicionar cartão"}
                  </button>

                  <button
                    type="button"
                    onClick={resetForm}
                    className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Limpar
                  </button>
                </div>
              </form>
            </div>

            <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <h2 className="text-xl font-semibold">Board</h2>
                  <p className="text-sm text-slate-500">
                    Cartões agrupados por status.
                  </p>
                </div>

                <div className="w-full md:w-72">
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Filtrar por categoria
                  </label>
                  <select
                    value={filterCategoryId}
                    onChange={(e) => setFilterCategoryId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                  >
                    <option value="all">Todas</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-5 md:grid-cols-2">
                {STATUSES.map((status) => {
                  const cardsInColumn = visibleCards.filter(
                    (card) => card.status === status
                  );

                  return (
                    <div
                      key={status}
                      className="rounded-3xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <h3 className="font-semibold text-slate-800">{status}</h3>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${statusClass(status)}`}>
                          {cardsInColumn.length}
                        </span>
                      </div>

                      <div className="space-y-3">
                        {cardsInColumn.length === 0 ? (
                          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-500">
                            Nenhum cartão aqui.
                          </div>
                        ) : (
                          cardsInColumn.map((card) => {
                            const category =
                              categoryMap.get(card.categoryId) ??
                              DEFAULT_CATEGORIES[0];

                            return (
                              <div
                                key={card.id}
                                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <h4 className="font-semibold text-slate-900">
                                      {card.title}
                                    </h4>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                      <span
                                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${categoryClass(
                                          category
                                        )}`}
                                      >
                                        {category.name}
                                      </span>

                                      <span
                                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${statusClass(
                                          card.status
                                        )}`}
                                      >
                                        {card.status}
                                      </span>
                                    </div>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => handleDelete(card.id)}
                                    className="rounded-lg px-2 py-1 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
                                  >
                                    Excluir
                                  </button>
                                </div>

                                {card.client && (
                                  <p className="mt-3 text-sm text-slate-600">
                                    <span className="font-semibold text-slate-800">
                                      Cliente:
                                    </span>{" "}
                                    {card.client}
                                  </p>
                                )}

                                {card.description && (
                                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                                    {card.description}
                                  </p>
                                )}

                                <div className="mt-4 space-y-3">
                                  <label className="block text-xs font-medium text-slate-500">
                                    Mudar status
                                  </label>
                                  <select
                                    value={card.status}
                                    onChange={(e) =>
                                      handleStatusChange(
                                        card.id,
                                        e.target.value as Status
                                      )
                                    }
                                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                                  >
                                    {STATUSES.map((statusOption) => (
                                      <option key={statusOption} value={statusOption}>
                                        {statusOption}
                                      </option>
                                    ))}
                                  </select>

                                  <div className="flex gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleEdit(card)}
                                      className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                                    >
                                      Editar
                                    </button>
                                  </div>

                                  <p className="text-[11px] text-slate-400">
                                    Atualizado em{" "}
                                    {new Date(card.updatedAt).toLocaleString("pt-BR")}
                                  </p>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <aside className="space-y-6">
            <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <h2 className="text-xl font-semibold">Nova categoria</h2>
              <p className="mt-1 text-sm text-slate-500">
                Crie categorias extras e marque se são profissionais.
              </p>

              <form onSubmit={handleAddCategory} className="mt-5 space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Nome da categoria
                  </label>
                  <input
                    value={categoryName}
                    onChange={(e) => setCategoryName(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                    placeholder="Ex.: Freelance, Escola, Família..."
                  />
                </div>

                <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={categoryProfessional}
                    onChange={(e) => setCategoryProfessional(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-slate-900"
                  />
                  <span className="text-sm text-slate-700">
                    Categoria profissional
                  </span>
                </label>

                <button
                  type="submit"
                  className="w-full rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Adicionar categoria
                </button>
              </form>
            </div>

            <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <h2 className="text-xl font-semibold">Categorias</h2>
              <p className="mt-1 text-sm text-slate-500">
                As categorias padrão já vêm prontas no sistema.
              </p>

              <div className="mt-5 space-y-3">
                {categories.map((category) => (
                  <div
                    key={category.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  >
                    <div>
                      <p className="font-medium text-slate-800">{category.name}</p>
                      <p className="text-xs text-slate-500">
                        {category.custom ? "Personalizada" : "Padrão"} •{" "}
                        {category.requiresClient ? "Exige cliente" : "Sem cliente"}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${categoryClass(
                        category
                      )}`}
                    >
                      {category.requiresClient ? "Profissional" : "Geral"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <h2 className="text-xl font-semibold">Observação</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Os dados ficam salvos no navegador usando <strong>LocalStorage</strong>.
                Depois, se quiser, esse projeto pode evoluir para banco de dados,
                login e compartilhamento entre usuários.
              </p>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}