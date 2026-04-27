"use client";

import { useEffect, useMemo, useState } from "react";
import { Deck, Flashcard } from "@/types";

type FormMode = "idle" | "create" | "edit";

type CardGroup = {
  key: string;
  name: string;
  cards: Flashcard[];
  totalCards: number;
};

function getCardGroupKey(card: Flashcard): string {
  if (card.documentId) {
    return `document:${card.documentId}`;
  }

  const normalizedName = (card.documentName ?? "sem-pdf").trim().toLowerCase();
  return `name:${normalizedName}`;
}

function groupCardsByDocument(cards: Flashcard[]): CardGroup[] {
  const groupsMap = new Map<string, CardGroup>();

  cards.forEach((card) => {
    const key = getCardGroupKey(card);
    const name = card.documentName?.trim() || "Sem PDF vinculado";
    const existingGroup = groupsMap.get(key);

    if (existingGroup) {
      existingGroup.cards.push(card);
      existingGroup.totalCards += 1;
      return;
    }

    groupsMap.set(key, {
      key,
      name,
      cards: [card],
      totalCards: 1
    });
  });

  return Array.from(groupsMap.values()).sort((a, b) => b.totalCards - a.totalCards || a.name.localeCompare(b.name, "pt-BR"));
}

export default function DecksPage() {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formMode, setFormMode] = useState<FormMode>("idle");
  const [editingDeck, setEditingDeck] = useState<Deck | null>(null);
  const [formData, setFormData] = useState({ name: "", description: "", color: "#3b82f6" });
  const [submitting, setSubmitting] = useState(false);
  const [deckForAddingCards, setDeckForAddingCards] = useState<Deck | null>(null);
  const [availableCards, setAvailableCards] = useState<Flashcard[]>([]);
  const [deckCards, setDeckCards] = useState<Flashcard[]>([]);
  const [loadingCards, setLoadingCards] = useState(false);
  const [savingCards, setSavingCards] = useState(false);
  const [selectedGroupKeys, setSelectedGroupKeys] = useState<string[]>([]);
  const [cardsFeedback, setCardsFeedback] = useState("");

  const deckCardGroups = useMemo(() => groupCardsByDocument(deckCards), [deckCards]);
  const availableCardGroups = useMemo(() => groupCardsByDocument(availableCards), [availableCards]);
  const selectedGroups = availableCardGroups.filter((group) => selectedGroupKeys.includes(group.key));
  const selectedCardsCount = selectedGroups.reduce((total, group) => total + group.totalCards, 0);

  const colors = [
    "#ef4444", // red
    "#f97316", // orange
    "#eab308", // yellow
    "#22c55e", // green
    "#3b82f6", // blue
    "#8b5cf6", // purple
    "#ec4899"  // pink
  ];

  const loadDecks = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/decks", { cache: "no-store" });
      const data = (await response.json()) as { decks?: Deck[]; message?: string };

      if (!response.ok) {
        throw new Error(data.message ?? "Falha ao carregar Decks.");
      }

      setDecks(Array.isArray(data.decks) ? data.decks : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar Decks.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDecks();
  }, []);

  const resetForm = () => {
    setFormMode("idle");
    setEditingDeck(null);
    setFormData({ name: "", description: "", color: "#3b82f6" });
  };

  const startCreate = () => {
    setDeckForAddingCards(null);
    setAvailableCards([]);
    setDeckCards([]);
    setSelectedGroupKeys([]);
    setCardsFeedback("");
    setFormMode("create");
    setEditingDeck(null);
    setFormData({ name: "", description: "", color: "#3b82f6" });

    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const startEdit = (deck: Deck) => {
    setFormMode("edit");
    setDeckForAddingCards(null);
    setCardsFeedback("");
    setSelectedGroupKeys([]);
    setEditingDeck(deck);
    setFormData({
      name: deck.name,
      description: deck.description ?? "",
      color: deck.color
    });

    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    if (!formData.name.trim()) {
      setError("Nome do Deck é obrigatório.");
      setSubmitting(false);
      return;
    }

    try {
      const url = formMode === "create" ? "/api/decks" : `/api/decks/${editingDeck?.id}`;
      const method = formMode === "create" ? "POST" : "PUT";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          color: formData.color
        })
      });

      const data = (await response.json()) as { deck?: Deck; message?: string };

      if (!response.ok) {
        throw new Error(data.message ?? `Erro ao ${formMode === "create" ? "criar" : "atualizar"} Deck.`);
      }

      if (formMode === "create") {
        setDecks([data.deck as Deck, ...decks]);
      } else {
        setDecks(decks.map((d) => (d.id === editingDeck?.id ? (data.deck as Deck) : d)));
      }

      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao processar Deck.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (deckId: string) => {
    if (!confirm("Tem certeza que deseja deletar este Deck e todos seus flashcards?")) {
      return;
    }

    setError("");

    try {
      const response = await fetch(`/api/decks/${deckId}`, { method: "DELETE" });

      if (!response.ok) {
        const data = (await response.json()) as { message?: string };
        throw new Error(data.message ?? "Erro ao deletar Deck.");
      }

      setDecks(decks.filter((d) => d.id !== deckId));
      if (editingDeck?.id === deckId) {
        resetForm();
      }
      if (deckForAddingCards?.id === deckId) {
        setDeckForAddingCards(null);
        setAvailableCards([]);
        setDeckCards([]);
        setSelectedGroupKeys([]);
        setCardsFeedback("");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao deletar Deck.");
    }
  };

  const colorName = (hex: string): string => {
    const map: Record<string, string> = {
      "#ef4444": "Vermelho",
      "#f97316": "Laranja",
      "#eab308": "Amarelo",
      "#22c55e": "Verde",
      "#3b82f6": "Azul",
      "#8b5cf6": "Roxo",
      "#ec4899": "Rosa"
    };
    return map[hex] || "Azul";
  };

  const loadCardsForDeck = async (deck: Deck) => {
    resetForm();
    setDeckForAddingCards(deck);
    setLoadingCards(true);
    setCardsFeedback("");
    setSelectedGroupKeys([]);

    try {
      const response = await fetch("/api/flashcards/list", { cache: "no-store" });
      const data = (await response.json()) as { cards?: Flashcard[]; message?: string };

      if (!response.ok) {
        throw new Error(data.message ?? "Erro ao carregar flashcards.");
      }

      const allCards = Array.isArray(data.cards) ? data.cards : [];
      setDeckCards(allCards.filter((card) => card.deckId === deck.id));
      setAvailableCards(allCards.filter((card) => card.deckId !== deck.id));
    } catch (err) {
      setCardsFeedback(err instanceof Error ? err.message : "Erro ao carregar flashcards.");
      setAvailableCards([]);
      setDeckCards([]);
    } finally {
      setLoadingCards(false);
    }
  };

  const toggleGroupSelection = (groupKey: string) => {
    setSelectedGroupKeys((current) =>
      current.includes(groupKey) ? current.filter((key) => key !== groupKey) : [...current, groupKey]
    );
  };

  const addSelectedGroupsToDeck = async () => {
    if (!deckForAddingCards || selectedGroupKeys.length === 0) {
      return;
    }

    setSavingCards(true);
    setCardsFeedback("");

    try {
      const cardsToAdd = availableCards.filter((card) => selectedGroupKeys.includes(getCardGroupKey(card)));

      const results = await Promise.all(
        cardsToAdd.map(async (card) => {
          const response = await fetch(`/api/flashcards/${card.id}/deck`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ deckId: deckForAddingCards.id })
          });

          if (!response.ok) {
            const data = (await response.json()) as { message?: string };
            throw new Error(data.message ?? "Erro ao associar flashcard ao Deck.");
          }

          return card.id;
        })
      );

      setCardsFeedback(`${results.length} flashcard(s) adicionado(s) ao Deck "${deckForAddingCards.name}".`);
      const movedCards = availableCards.filter((card) => selectedGroupKeys.includes(getCardGroupKey(card)));
      setDeckCards((cards) => [...movedCards, ...cards]);
      setAvailableCards((cards) => cards.filter((card) => !selectedGroupKeys.includes(getCardGroupKey(card))));
      setSelectedGroupKeys([]);
    } catch (err) {
      setCardsFeedback(err instanceof Error ? err.message : "Erro ao adicionar flashcards ao Deck.");
    } finally {
      setSavingCards(false);
    }
  };

  const removeGroupFromDeck = async (groupKey: string) => {
    if (!deckForAddingCards) {
      return;
    }

    setSavingCards(true);
    setCardsFeedback("");

    try {
      const cardsToRemove = deckCards.filter((card) => getCardGroupKey(card) === groupKey);

      await Promise.all(
        cardsToRemove.map(async (card) => {
          const response = await fetch(`/api/flashcards/${card.id}/deck`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ deckId: null })
          });

          if (!response.ok) {
            const data = (await response.json()) as { message?: string };
            throw new Error(data.message ?? "Erro ao remover flashcard do Deck.");
          }
        })
      );

      setAvailableCards((cards) => [...cardsToRemove.map((card) => ({ ...card, deckId: undefined })), ...cards]);
      setDeckCards((cards) => cards.filter((card) => getCardGroupKey(card) !== groupKey));
      setCardsFeedback(`${cardsToRemove.length} flashcard(s) removido(s) do Deck com sucesso.`);
    } catch (err) {
      setCardsFeedback(err instanceof Error ? err.message : "Erro ao remover flashcard do Deck.");
    } finally {
      setSavingCards(false);
    }
  };

  const studyDeck = (deckId: string) => {
    window.location.assign(`/study?deckId=${encodeURIComponent(deckId)}`);
  };

  return (
    <main className="page-shell py-8">
      <section className="mx-auto max-w-4xl">
        <div className="mb-8 rounded-3xl border border-brand-300 bg-gradient-to-br from-brand-950/75 via-brand-900/45 to-brand-800/20 p-6 shadow-xl shadow-brand-950/20">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="mb-2 inline-flex rounded-full bg-brand-100/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-brand-200 ring-1 ring-brand-200/20">
                Organização visual
              </span>
              <h1 className="text-3xl font-black text-brand-50">Meus Decks</h1>
              <p className="mt-2 max-w-2xl text-brand-100/80">Organize seus flashcards por tema, disciplina ou assunto.</p>
            </div>
          <button
            type="button"
            className="rounded-2xl border border-brand-400/40 bg-gradient-to-r from-brand-600 to-brand-700 px-6 py-3 font-black text-white shadow-lg shadow-brand-950/30 transition hover:-translate-y-0.5 hover:from-brand-500 hover:to-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={startCreate}
            disabled={submitting || savingCards}
          >
            + Novo Deck
          </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4">
            <p className="text-sm font-bold text-rose-800">{error}</p>
          </div>
        )}

        {formMode !== "idle" && !deckForAddingCards && (
          <section className="mb-8 rounded-3xl border border-brand-300 bg-brand-950/35 p-8 text-white shadow-xl">
            <h2 className="mb-6 text-xl font-bold text-white">
              {formMode === "create" ? "Criar novo Deck" : `Editar "${editingDeck?.name}"`}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="mb-2 block text-sm font-bold text-white/80">Nome *</label>
                <input
                  type="text"
                  placeholder="Ex: Biologia, Python Avançado, ENEM..."
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-2xl border border-brand-300 bg-brand-900/35 px-4 py-3 text-white placeholder-brand-300 focus:border-brand-500 focus:outline-none"
                  disabled={submitting}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-white/80">Descrição (opcional)</label>
                <textarea
                  placeholder="Descreva o conteúdo deste Deck..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full rounded-2xl border border-brand-300 bg-brand-900/35 px-4 py-3 text-white placeholder-brand-300 focus:border-brand-500 focus:outline-none"
                  rows={3}
                  disabled={submitting}
                />
              </div>

              <div>
                <label className="mb-3 block text-sm font-bold text-white/80">Cor</label>
                <div className="flex flex-wrap gap-3">
                  {colors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData({ ...formData, color })}
                      className={`h-10 w-10 rounded-full transition-all ${
                        formData.color === color ? "ring-2 ring-offset-2 ring-brand-700" : "hover:scale-110"
                      }`}
                      style={{ backgroundColor: color }}
                      title={colorName(color)}
                      disabled={submitting}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="btn btn-primary flex-1 font-bold"
                  disabled={submitting}
                >
                  {submitting ? "Salvando..." : "Salvar Deck"}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary flex-1 font-bold"
                  onClick={resetForm}
                  disabled={submitting}
                >
                  Cancelar
                </button>
              </div>

              {formMode === "edit" && editingDeck ? (
                <div className="pt-2">
                  <button
                    type="button"
                    className="w-full rounded-2xl border border-rose-400/30 bg-rose-600/20 px-4 py-3 text-sm font-bold text-rose-100 transition hover:bg-rose-600/35"
                    onClick={() => void handleDelete(editingDeck.id)}
                    disabled={submitting}
                  >
                    Excluir deck
                  </button>
                </div>
              ) : null}
            </form>
          </section>
        )}

        {deckForAddingCards ? (
          <section className="mb-8 rounded-3xl border border-brand-300 bg-brand-950/35 p-8 text-white shadow-xl">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black text-white">Adicionar cards</h2>
                <p className="mt-1 text-sm text-white/70">
                  Deck selecionado: <span className="font-bold text-brand-100">{deckForAddingCards.name}</span>
                </p>
              </div>
              <button
                type="button"
                className="rounded-lg border border-brand-300 bg-brand-600/20 px-3 py-1.5 text-xs font-bold text-brand-100 transition hover:bg-brand-600/35"
                onClick={() => {
                  setDeckForAddingCards(null);
                  setAvailableCards([]);
                  setDeckCards([]);
                  setSelectedGroupKeys([]);
                  setCardsFeedback("");
                }}
              >
                Fechar
              </button>
            </div>

            {cardsFeedback ? (
              <p className="mb-4 rounded-xl border border-brand-300 bg-brand-900/35 px-3 py-2 text-sm font-semibold text-brand-100">
                {cardsFeedback}
              </p>
            ) : null}

            {loadingCards ? (
              <p className="text-sm text-white/70">Carregando flashcards...</p>
            ) : (
              <>
                <div className="mb-6 rounded-2xl border border-brand-300 bg-brand-900/20 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 className="text-sm font-black text-white">Flashcards neste Deck</h3>
                    <span className="rounded-full bg-brand-600/20 px-3 py-1 text-xs font-bold text-brand-100">
                      {deckCards.length} card(s)
                    </span>
                  </div>

                  {deckCards.length === 0 ? (
                    <p className="text-sm text-white/70">Este Deck ainda não possui flashcards.</p>
                  ) : (
                    <div className="grid gap-3">
                      {deckCardGroups.map((group) => (
                        <div
                          key={group.key}
                          className="w-full rounded-2xl border border-brand-300 bg-brand-900/25 px-5 py-4"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <span className="rounded-full bg-brand-600/20 px-3 py-1 text-xs font-bold text-brand-100">
                              {group.name}
                            </span>
                            <button
                              type="button"
                              className="rounded-lg border border-rose-400/30 bg-rose-600/20 px-2.5 py-1 text-[11px] font-bold text-rose-100 transition-colors hover:bg-rose-600/35 disabled:opacity-60"
                              onClick={() => void removeGroupFromDeck(group.key)}
                              disabled={savingCards}
                            >
                              Remover
                            </button>
                          </div>
                          <p className="mt-2 text-sm text-white/75">{group.totalCards} card(s) neste grupo</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {availableCardGroups.length === 0 ? (
                  <p className="text-sm text-white/70">Nenhum flashcard disponível para adicionar neste Deck.</p>
                ) : (
                  <>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-white/70">Selecione os grupos (PDFs) que deseja associar.</p>
                  <button
                    type="button"
                    className={`rounded-2xl border px-4 py-3 text-sm font-black shadow-[0_12px_30px_rgba(15,23,42,0.45)] transition disabled:cursor-not-allowed disabled:opacity-50 ${
                      selectedGroupKeys.length > 0
                        ? "border-emerald-300/40 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:-translate-y-0.5 hover:from-emerald-400 hover:to-emerald-500"
                        : "border-brand-200/20 bg-brand-950 text-brand-50 hover:-translate-y-0.5 hover:border-brand-100/40 hover:bg-brand-900"
                    }`}
                    onClick={() => void addSelectedGroupsToDeck()}
                    disabled={savingCards || selectedGroupKeys.length === 0}
                  >
                    {savingCards ? "Adicionando..." : `+ Adicionar ${selectedCardsCount} card(s)`}
                  </button>
                </div>

                <div className="grid gap-3">
                  {availableCardGroups.map((group) => {
                    const isSelected = selectedGroupKeys.includes(group.key);

                    return (
                      <button
                        key={group.key}
                        type="button"
                        className={`relative overflow-hidden w-full rounded-2xl border px-5 py-4 text-left transition-all duration-200 ${
                          isSelected
                            ? "border-emerald-300/45 bg-gradient-to-br from-brand-700/60 via-brand-900/55 to-emerald-950/45 shadow-[0_14px_30px_rgba(17,24,39,0.35)] ring-2 ring-emerald-300/25"
                            : "border-brand-300 bg-brand-900/25 hover:-translate-y-0.5 hover:border-brand-500 hover:bg-brand-900/35 hover:shadow-lg"
                        }`}
                        onClick={() => toggleGroupSelection(group.key)}
                      >
                        {isSelected ? (
                          <span className="pointer-events-none absolute inset-y-0 left-0 w-1.5 rounded-r-full bg-emerald-300" />
                        ) : null}
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <span
                              className={`flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-black transition-colors ${
                                isSelected
                                  ? "border-emerald-300/70 bg-emerald-400/20 text-emerald-100"
                                  : "border-brand-400/60 bg-brand-600/10 text-brand-100"
                              }`}
                            >
                              {isSelected ? "✓" : ""}
                            </span>
                            <p className={`text-sm font-bold ${isSelected ? "text-brand-50" : "text-white"}`}>
                              {isSelected ? "Selecionado" : "Selecionar"}
                            </p>
                          </div>
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold transition-colors ${
                              isSelected
                                ? "bg-emerald-400/20 text-emerald-100 ring-1 ring-emerald-300/35"
                                : "bg-brand-600/20 text-brand-100"
                            }`}
                          >
                            {group.totalCards} card(s)
                          </span>
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          {isSelected ? (
                            <span className="rounded-full bg-emerald-400/20 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-100 ring-1 ring-emerald-300/35">
                              Selecionado
                            </span>
                          ) : null}
                        </div>
                        <p className={`mt-2 text-base font-semibold ${isSelected ? "text-white" : "text-white"}`}>
                          {group.name}
                        </p>
                        <p className={`mt-1 text-sm ${isSelected ? "text-brand-100/90" : "text-white/70"}`}>
                          Clique para adicionar todos os cards deste grupo.
                        </p>
                      </button>
                    );
                  })}
                </div>
                  </>
                )}
              </>
            )}
          </section>
        ) : null}

        {(formMode !== "idle" || deckForAddingCards) ? (
          <div className="mb-8 flex justify-center">
            <button
              type="button"
              className="rounded-xl border border-brand-300 bg-brand-950/35 px-4 py-2 text-sm font-bold text-brand-100 transition hover:bg-brand-900/55"
              onClick={() => {
                resetForm();
                setDeckForAddingCards(null);
                setAvailableCards([]);
                setDeckCards([]);
                setSelectedGroupKeys([]);
                setCardsFeedback("");
              }}
            >
              Voltar para a lista
            </button>
          </div>
        ) : null}

        {formMode === "idle" && !deckForAddingCards && loading ? (
          <p className="text-center text-brand-700">Carregando Decks...</p>
        ) : formMode === "idle" && !deckForAddingCards && decks.length === 0 ? (
          <div className="rounded-3xl border-2 border-dashed border-brand-300 bg-brand-950/25 p-12 text-center text-white">
            <p className="text-lg font-bold text-white">Você ainda não criou nenhum Deck.</p>
            <p className="mt-2 text-white/70">Crie um Deck para começar a organizar seus estudos por tema!</p>
            <button
              type="button"
              className="btn btn-primary mt-6 px-8 font-bold"
              onClick={startCreate}
              disabled={formMode !== "idle"}
            >
              Criar primeiro Deck
            </button>
          </div>
        ) : formMode === "idle" && !deckForAddingCards ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {decks.map((deck) => (
              <div
                key={deck.id}
                className="group rounded-2xl border border-brand-300 bg-brand-950/35 p-5 text-white shadow-sm transition-all hover:border-brand-500 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div
                    className="h-8 w-8 rounded-lg flex-shrink-0"
                    style={{ backgroundColor: deck.color }}
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => void loadCardsForDeck(deck)}
                      className="rounded-lg bg-brand-600/20 px-2.5 py-1 text-[11px] font-bold text-brand-100 hover:bg-brand-600/35 transition-colors"
                      disabled={submitting || savingCards}
                    >
                      + Adicionar
                    </button>
                    <button
                      type="button"
                      onClick={() => studyDeck(deck.id)}
                      className="rounded-lg bg-emerald-600/20 px-2.5 py-1 text-[11px] font-bold text-emerald-100 hover:bg-emerald-600/35 transition-colors"
                      disabled={submitting || savingCards}
                    >
                      Estudar Deck
                    </button>
                    <button
                      type="button"
                      onClick={() => startEdit(deck)}
                      className="h-6 w-6 rounded-md bg-brand-700/35 text-[12px] font-bold text-brand-100 transition-colors hover:bg-brand-700/55"
                      disabled={submitting || savingCards}
                      title="Editar deck"
                    >
                      ⚙
                    </button>
                  </div>
                </div>

                <h3 className="font-bold text-white text-base">{deck.name}</h3>
                {deck.description && (
                  <p className="mt-2 text-xs text-white/70 line-clamp-2">{deck.description}</p>
                )}
                <p className="mt-3 text-xs text-white/60">
                  Criado em {new Date(deck.createdAt).toLocaleDateString("pt-BR")}
                </p>
              </div>
            ))}
          </div>
        ) : null}
      </section>
    </main>
  );
}
