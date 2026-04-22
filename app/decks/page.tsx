"use client";

import { useEffect, useState } from "react";
import { Deck, Flashcard } from "@/types";

type FormMode = "idle" | "create" | "edit";

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
  const [loadingCards, setLoadingCards] = useState(false);
  const [savingCards, setSavingCards] = useState(false);
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const [cardsFeedback, setCardsFeedback] = useState("");

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
        throw new Error(data.message ?? "Falha ao carregar baralhos.");
      }

      setDecks(Array.isArray(data.decks) ? data.decks : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar baralhos.");
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
    setFormMode("create");
    setEditingDeck(null);
    setFormData({ name: "", description: "", color: "#3b82f6" });
  };

  const startEdit = (deck: Deck) => {
    setFormMode("edit");
    setDeckForAddingCards(null);
    setCardsFeedback("");
    setSelectedCardIds([]);
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
      setError("Nome do baralho é obrigatório.");
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
        throw new Error(data.message ?? `Erro ao ${formMode === "create" ? "criar" : "atualizar"} baralho.`);
      }

      if (formMode === "create") {
        setDecks([data.deck as Deck, ...decks]);
      } else {
        setDecks(decks.map((d) => (d.id === editingDeck?.id ? (data.deck as Deck) : d)));
      }

      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao processar baralho.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (deckId: string) => {
    if (!confirm("Tem certeza que deseja deletar este baralho e todos seus flashcards?")) {
      return;
    }

    setError("");

    try {
      const response = await fetch(`/api/decks/${deckId}`, { method: "DELETE" });

      if (!response.ok) {
        const data = (await response.json()) as { message?: string };
        throw new Error(data.message ?? "Erro ao deletar baralho.");
      }

      setDecks(decks.filter((d) => d.id !== deckId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao deletar baralho.");
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
    setDeckForAddingCards(deck);
    setLoadingCards(true);
    setCardsFeedback("");
    setSelectedCardIds([]);

    try {
      const response = await fetch("/api/flashcards/list", { cache: "no-store" });
      const data = (await response.json()) as { cards?: Flashcard[]; message?: string };

      if (!response.ok) {
        throw new Error(data.message ?? "Erro ao carregar flashcards.");
      }

      const allCards = Array.isArray(data.cards) ? data.cards : [];
      setAvailableCards(allCards.filter((card) => card.deckId !== deck.id));
    } catch (err) {
      setCardsFeedback(err instanceof Error ? err.message : "Erro ao carregar flashcards.");
      setAvailableCards([]);
    } finally {
      setLoadingCards(false);
    }
  };

  const toggleCardSelection = (cardId: string) => {
    setSelectedCardIds((current) =>
      current.includes(cardId) ? current.filter((id) => id !== cardId) : [...current, cardId]
    );
  };

  const addSelectedCardsToDeck = async () => {
    if (!deckForAddingCards || selectedCardIds.length === 0) {
      return;
    }

    setSavingCards(true);
    setCardsFeedback("");

    try {
      const results = await Promise.all(
        selectedCardIds.map(async (cardId) => {
          const response = await fetch(`/api/flashcards/${cardId}/deck`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ deckId: deckForAddingCards.id })
          });

          if (!response.ok) {
            const data = (await response.json()) as { message?: string };
            throw new Error(data.message ?? "Erro ao associar flashcard ao baralho.");
          }

          return cardId;
        })
      );

      setCardsFeedback(`${results.length} flashcard(s) adicionado(s) ao baralho "${deckForAddingCards.name}".`);
      setAvailableCards((cards) => cards.filter((card) => !selectedCardIds.includes(card.id)));
      setSelectedCardIds([]);
    } catch (err) {
      setCardsFeedback(err instanceof Error ? err.message : "Erro ao adicionar flashcards ao baralho.");
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
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-brand-900">Meus Baralhos</h1>
            <p className="mt-1 text-brand-700">Organize seus flashcards por tema, disciplina ou assunto.</p>
          </div>
          <button
            type="button"
            className="rounded-2xl border border-brand-400/40 bg-brand-700/40 px-6 py-3 font-bold text-brand-100 transition hover:bg-brand-700/55"
            onClick={startCreate}
            disabled={formMode !== "idle"}
          >
            + Novo Baralho
          </button>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4">
            <p className="text-sm font-bold text-rose-800">{error}</p>
          </div>
        )}

        {formMode !== "idle" && (
          <section className="mb-8 rounded-3xl border border-brand-300 bg-brand-950/35 p-8 text-white shadow-xl">
            <h2 className="mb-6 text-xl font-bold text-white">
              {formMode === "create" ? "Criar novo baralho" : `Editar "${editingDeck?.name}"`}
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
                  placeholder="Descreva o conteúdo deste baralho..."
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
                  {submitting ? "Salvando..." : "Salvar baralho"}
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
                  Baralho selecionado: <span className="font-bold text-brand-100">{deckForAddingCards.name}</span>
                </p>
              </div>
              <button
                type="button"
                className="rounded-lg border border-brand-300 bg-brand-600/20 px-3 py-1.5 text-xs font-bold text-brand-100 transition hover:bg-brand-600/35"
                onClick={() => {
                  setDeckForAddingCards(null);
                  setAvailableCards([]);
                  setSelectedCardIds([]);
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
            ) : availableCards.length === 0 ? (
              <p className="text-sm text-white/70">Nenhum flashcard disponível para adicionar neste baralho.</p>
            ) : (
              <>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-white/70">Selecione os flashcards que deseja associar.</p>
                  <button
                    type="button"
                    className="btn btn-primary px-4 py-2 text-sm font-bold disabled:opacity-60"
                    onClick={() => void addSelectedCardsToDeck()}
                    disabled={savingCards || selectedCardIds.length === 0}
                  >
                    {savingCards ? "Adicionando..." : `Adicionar ${selectedCardIds.length} card(s)`}
                  </button>
                </div>

                <div className="grid gap-3">
                  {availableCards.map((card) => {
                    const isSelected = selectedCardIds.includes(card.id);

                    return (
                      <button
                        key={card.id}
                        type="button"
                        className={`w-full rounded-2xl border px-5 py-4 text-left transition ${
                          isSelected
                            ? "border-brand-400 bg-brand-700/30"
                            : "border-brand-300 bg-brand-900/25 hover:border-brand-500 hover:bg-brand-900/35"
                        }`}
                        onClick={() => toggleCardSelection(card.id)}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <p className="text-sm font-bold text-white">{isSelected ? "Selecionado" : "Selecionar"}</p>
                          <span className="rounded-full bg-brand-600/20 px-3 py-1 text-xs font-bold text-brand-100">
                            {card.documentName ?? "Sem PDF vinculado"}
                          </span>
                        </div>
                        <p className="mt-2 text-base font-semibold text-white">{card.question}</p>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </section>
        ) : null}

        {loading ? (
          <p className="text-center text-brand-700">Carregando baralhos...</p>
        ) : decks.length === 0 ? (
          <div className="rounded-3xl border-2 border-dashed border-brand-300 bg-brand-950/25 p-12 text-center text-white">
            <p className="text-lg font-bold text-white">Você ainda não criou nenhum baralho.</p>
            <p className="mt-2 text-white/70">Crie um baralho para começar a organizar seus estudos por tema!</p>
            <button
              type="button"
              className="btn btn-primary mt-6 px-8 font-bold"
              onClick={startCreate}
              disabled={formMode !== "idle"}
            >
              Criar primeiro baralho
            </button>
          </div>
        ) : (
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
                      disabled={formMode !== "idle"}
                    >
                      + Adicionar
                    </button>
                    <button
                      type="button"
                      onClick={() => studyDeck(deck.id)}
                      className="rounded-lg bg-emerald-600/20 px-2.5 py-1 text-[11px] font-bold text-emerald-100 hover:bg-emerald-600/35 transition-colors"
                      disabled={formMode !== "idle"}
                    >
                      Estudar Deck
                    </button>
                    <button
                      type="button"
                      onClick={() => startEdit(deck)}
                      className="h-6 w-6 rounded-md bg-brand-700/35 text-[12px] font-bold text-brand-100 transition-colors hover:bg-brand-700/55"
                      disabled={formMode !== "idle"}
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
        )}
      </section>
    </main>
  );
}
