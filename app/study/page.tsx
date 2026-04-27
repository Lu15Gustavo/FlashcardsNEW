"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Flashcard } from "@/types";

type ReviewPayload = {
  cardId: string;
  quality: number;
  responseTimeMs: number;
};

type DocumentOption = {
  id: string;
  name: string;
  totalCards: number;
};

type ReviewMode = "smart" | "due" | "all";

type StudyResponse = {
  cards?: Flashcard[];
  documents?: DocumentOption[];
  dueOnly?: boolean;
  dueCount?: number;
  totalCount?: number;
  message?: string;
};

const reviewModeLabels: Record<ReviewMode, { title: string; description: string }> = {
  smart: {
    title: "Inteligente",
    description: "Prioriza cards vencidos. Se não houver, mostra os demais."
  },
  due: {
    title: "Repetição espaçada",
    description: "Mostra apenas cards que já estão no horário de revisão."
  },
  all: {
    title: "Todos os cards",
    description: "Treino livre com todos os cards do filtro atual."
  }
};

function sanitizeCardText(rawText?: string | null) {
  const base = String(rawText ?? "")
    .replace(/\\n/g, "\n")
    .replace(/\r\n?/g, "\n")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/^\s*[-*]\s+/gm, "• ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return base;
}

function getCardBackText(card: Flashcard) {
  const answer = sanitizeCardText(card.answer);
  if (answer) {
    return answer;
  }

  const notes = sanitizeCardText(card.notes);
  if (notes) {
    return notes;
  }

  return "Resposta indisponível para este card.";
}

function getCardFrontText(card: Flashcard) {
  const question = sanitizeCardText(card.question);
  if (!question) {
    return "Qual é a ideia principal deste flashcard?";
  }

  return question;
}

function statusLabel(card: Flashcard) {
  if (card.knowledgeLevel === "difficult") return "Difícil";
  if (card.knowledgeLevel === "easy") return "Fácil";
  return "Normal";
}

function getCardTextSizeClass(text: string) {
  const normalized = text.replace(/\s+/g, " ").trim();
  const length = normalized.length;

  if (length > 1400) {
    return "text-[clamp(0.62rem,0.95vw,0.78rem)] leading-[1.2]";
  }
  if (length > 1100) {
    return "text-[clamp(0.68rem,1.02vw,0.86rem)] leading-[1.22]";
  }
  if (length > 850) {
    return "text-[clamp(0.76rem,1.08vw,0.94rem)] leading-[1.24]";
  }
  if (length > 650) {
    return "text-[clamp(0.84rem,1.22vw,1.05rem)] leading-[1.26]";
  }
  if (length > 500) {
    return "text-[clamp(0.92rem,1.35vw,1.15rem)] leading-[1.28]";
  }
  if (length > 360) {
    return "text-[clamp(1rem,1.55vw,1.28rem)] leading-[1.3]";
  }
  if (length > 240) {
    return "text-[clamp(1.08rem,1.9vw,1.48rem)] leading-tight";
  }
  if (length > 120) {
    return "text-[clamp(1.22rem,2.3vw,1.9rem)] leading-tight";
  }

  return "text-[clamp(1.32rem,2.7vw,2.2rem)] leading-tight";
}

export default function StudyPage() {
  const searchParams = useSearchParams();
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [documents, setDocuments] = useState<DocumentOption[]>([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string>("all");
  const [mustChooseDocument, setMustChooseDocument] = useState(false);
  const [sessionQueue, setSessionQueue] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [wrongCardIds, setWrongCardIds] = useState<string[]>([]);
  const [round, setRound] = useState(1);
  const [completed, setCompleted] = useState(false);
  const [studyStarted, setStudyStarted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingDocumentId, setDeletingDocumentId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [flipped, setFlipped] = useState(false);
  const [answerFx, setAnswerFx] = useState<"correct" | "wrong" | null>(null);
  const [responseStart, setResponseStart] = useState(Date.now());
  const [activeDeckId, setActiveDeckId] = useState<string | null>(null);
  const [reviewMode, setReviewMode] = useState<ReviewMode>("smart");
  const [dueCount, setDueCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [dueOnly, setDueOnly] = useState(false);

  const loadCards = async (documentId?: string, deckId?: string, mode: ReviewMode = reviewMode): Promise<Flashcard[]> => {
    setLoading(true);
    setError("");

    try {
      const hasDocumentFilter = typeof documentId === "string" && documentId !== "all";
      const hasDeckFilter = typeof deckId === "string" && deckId.length > 0;
      const query = new URLSearchParams();
      query.set("reviewMode", mode);
      if (hasDocumentFilter) {
        query.set("documentId", documentId);
      }
      if (hasDeckFilter) {
        query.set("deckId", deckId);
      }

      const params = query.toString() ? `?${query.toString()}` : "";
      const response = await fetch(`/api/flashcards/generate${params}`, { cache: "no-store" });
      const data = (await response.json()) as StudyResponse;

      if (!response.ok) {
        throw new Error(data.message ?? "Não foi possível carregar os flashcards.");
      }

      const nextDocuments = Array.isArray(data.documents) ? data.documents : [];
      setDocuments(nextDocuments);
      setDueCount(Number(data.dueCount ?? 0));
      setTotalCount(Number(data.totalCount ?? 0));
      setDueOnly(Boolean(data.dueOnly));
      setReviewMode(mode);

      if (!hasDocumentFilter && !hasDeckFilter && nextDocuments.length > 1) {
        setMustChooseDocument(true);
        setStudyStarted(false);
        setCards([]);
        setSessionQueue([]);
        setCurrentIndex(0);
        setWrongCardIds([]);
        setRound(1);
        setCompleted(false);
        setFlipped(false);
        setAnswerFx(null);
        setResponseStart(Date.now());
        return [];
      }

      setMustChooseDocument(false);
      setSelectedDocumentId(documentId ?? "all");
      setActiveDeckId(deckId ?? null);
      setStudyStarted(false);

      const nextCards = Array.isArray(data.cards) ? data.cards : [];
      setCards(nextCards);

      const initialQueue = hasDeckFilter ? nextCards : nextCards.slice(0, 15);
      setSessionQueue(initialQueue);
      setCurrentIndex(0);
      setWrongCardIds([]);
      setRound(1);
      setCompleted(false);
      setFlipped(false);
      setAnswerFx(null);
      setResponseStart(Date.now());
      return nextCards;
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Falha ao carregar os flashcards.");
      setCards([]);
      setStudyStarted(false);
      setSessionQueue([]);
      setCurrentIndex(0);
      setWrongCardIds([]);
      setCompleted(false);
      setAnswerFx(null);
      setDueCount(0);
      setTotalCount(0);
      setDueOnly(false);
      return [];
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const queryDeckId = searchParams.get("deckId")?.trim() ?? "";

    if (queryDeckId) {
      void loadCards(undefined, queryDeckId, reviewMode).then((loadedCards) => {
        if (loadedCards.length > 0) {
          setSessionQueue(loadedCards);
          setCurrentIndex(0);
          setFlipped(false);
          setResponseStart(Date.now());
          setStudyStarted(true);
          setMustChooseDocument(false);
        }
      });
      return;
    }

    void loadCards(undefined, undefined, reviewMode);
  }, [searchParams]);

  const startWithDocument = async (documentId: string) => {
    setSelectedDocumentId(documentId);
    const loadedCards = await loadCards(documentId, undefined, reviewMode);
    if (loadedCards.length > 0) {
      setSessionQueue(loadedCards.slice(0, 15));
      setCurrentIndex(0);
      setFlipped(false);
      setResponseStart(Date.now());
      setStudyStarted(true);
    }
  };

  const changeReviewMode = async (nextMode: ReviewMode) => {
    if (nextMode === reviewMode) {
      return;
    }

    const docFilter = selectedDocumentId === "all" ? undefined : selectedDocumentId;
    const loadedCards = await loadCards(docFilter, activeDeckId ?? undefined, nextMode);

    if (loadedCards.length > 0) {
      const initialQueue = activeDeckId ? loadedCards : loadedCards.slice(0, 15);
      setSessionQueue(initialQueue);
      setCurrentIndex(0);
      setWrongCardIds([]);
      setRound(1);
      setCompleted(false);
      setFlipped(false);
      setAnswerFx(null);
      setResponseStart(Date.now());
      setStudyStarted(true);
      return;
    }

    setStudyStarted(false);
    setCompleted(false);
  };

  const selectedCard = sessionQueue[currentIndex] ?? null;
  const frontText = selectedCard ? getCardFrontText(selectedCard) : "";
  const backText = selectedCard ? getCardBackText(selectedCard) : "";
  const frontTextClass = getCardTextSizeClass(frontText);
  const backTextClass = getCardTextSizeClass(backText);

  const reviewCard = async (quality: number) => {
    if (!selectedCard) {
      return;
    }

    if (!flipped) {
      return;
    }

    setSaving(true);
    setError("");

    try {
      const payload: ReviewPayload = {
        cardId: selectedCard.id,
        quality,
        responseTimeMs: Date.now() - responseStart
      };

      const response = await fetch("/api/flashcards/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(data.message ?? "Não foi possível registrar a revisão.");
      }

      const isWrong = quality <= 2;
      setAnswerFx(isWrong ? "wrong" : "correct");
      await new Promise((resolve) => setTimeout(resolve, 220));
      setAnswerFx(null);

      const updatedWrongIds = isWrong
        ? wrongCardIds.includes(selectedCard.id)
          ? wrongCardIds
          : [...wrongCardIds, selectedCard.id]
        : wrongCardIds;

      if (currentIndex < sessionQueue.length - 1) {
        setWrongCardIds(updatedWrongIds);
        setCurrentIndex((value) => value + 1);
        setFlipped(false);
        setResponseStart(Date.now());
        return;
      }

      if (updatedWrongIds.length > 0) {
        const nextRoundQueue = updatedWrongIds
          .map((cardId) => cards.find((card) => card.id === cardId) ?? null)
          .filter((card): card is Flashcard => card !== null);

        if (nextRoundQueue.length > 0) {
          setSessionQueue(nextRoundQueue);
          setCurrentIndex(0);
          setWrongCardIds([]);
          setRound((value) => value + 1);
          setFlipped(false);
          setAnswerFx(null);
          setResponseStart(Date.now());
          return;
        }
      }

      setWrongCardIds([]);
      setCompleted(true);
      setFlipped(false);
      setAnswerFx(null);
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : "Não foi possível registrar a revisão.");
    } finally {
      setSaving(false);
    }
  };

  const deleteDocumentCards = async (document: DocumentOption) => {
    const confirmed = window.confirm(
      `Deseja excluir todos os ${document.totalCards} flashcards do PDF \"${document.name}\"? Essa ação não pode ser desfeita.`
    );
    if (!confirmed) {
      return;
    }

    setDeletingDocumentId(document.id);
    setError("");

    try {
      const response = await fetch("/api/flashcards/delete-by-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: document.id })
      });

      const data = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(data.message ?? "Não foi possível excluir os flashcards deste PDF.");
      }

      await loadCards();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Não foi possível excluir os flashcards deste PDF.");
    } finally {
      setDeletingDocumentId(null);
    }
  };

  return (
    <main className="page-shell flex min-h-screen flex-col items-center justify-center py-4">
      {!loading && !error ? (
        <section className="mb-5 w-full max-w-3xl rounded-2xl border border-brand-200 bg-brand-50/80 p-4">
          <p className="text-xs font-black uppercase tracking-wide text-brand-700">Modo de estudo</p>
          <div className="mt-3 grid gap-2 md:grid-cols-3">
            {(["smart", "due", "all"] as ReviewMode[]).map((mode) => {
              const active = reviewMode === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => void changeReviewMode(mode)}
                  className={`rounded-2xl border px-4 py-3 text-left transition-all duration-150 ${
                    active
                      ? "border-brand-500 bg-brand-700 text-white shadow-lg"
                      : "border-brand-300 bg-brand-950/35 text-white/90 hover:border-brand-500 hover:bg-brand-950/50"
                  }`}
                >
                  <p className="text-sm font-black">{reviewModeLabels[mode].title}</p>
                  <p className={`mt-1 text-xs ${active ? "text-white/85" : "text-white/70"}`}>{reviewModeLabels[mode].description}</p>
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold text-brand-700">
            <span className="rounded-full border border-brand-300 bg-white/70 px-3 py-1">
              Vencidos: {dueCount}
            </span>
            <span className="rounded-full border border-brand-300 bg-white/70 px-3 py-1">
              Total no filtro: {totalCount}
            </span>
            {dueOnly ? (
              <span className="rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-emerald-700">
                Sessão usando apenas cards vencidos
              </span>
            ) : null}
          </div>
        </section>
      ) : null}

      {error ? (
        <section className="max-w-2xl w-full rounded-2xl border border-brand-100 bg-brand-50 p-6 text-center">
          <p className="text-sm font-bold text-brand-800">{error}</p>
          <button
            type="button"
            className="mt-4 btn btn-secondary"
            onClick={() => void loadCards(selectedDocumentId === "all" ? undefined : selectedDocumentId, activeDeckId ?? undefined, reviewMode)}
          >
            Tentar novamente
          </button>
        </section>
      ) : loading ? (
        <p className="text-brand-900/80">Carregando flashcards...</p>
      ) : mustChooseDocument ? (
        <section className="max-w-3xl w-full rounded-3xl border border-brand-100 bg-brand-50 p-8">
          <p className="text-center text-xl font-bold text-brand-900">Selecione de qual deseja estudar agora.</p>

          <div className="mt-6 grid gap-3">
            {documents.map((document) => (
              <div key={document.id} className="w-full rounded-2xl border border-brand-300 bg-brand-950/35 px-5 py-4 text-white">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-base font-bold text-white">{document.name}</p>
                    <p className="text-sm text-white/70">{document.totalCards} flashcard(s)</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="rounded-xl border border-brand-400/50 bg-brand-700/50 px-3 py-2 text-xs font-bold text-white transition hover:bg-brand-700"
                      onClick={() => void startWithDocument(document.id)}
                      disabled={deletingDocumentId === document.id}
                    >
                      Estudar
                    </button>
                    <button
                      type="button"
                      className="rounded-xl border border-rose-300/45 bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-100 transition hover:bg-rose-500/20 disabled:opacity-60"
                      onClick={() => void deleteDocumentCards(document)}
                      disabled={deletingDocumentId !== null}
                    >
                      {deletingDocumentId === document.id ? "Excluindo..." : "Excluir flashcards"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : !completed && !studyStarted ? (
        <section className="max-w-3xl w-full rounded-3xl border border-brand-100 bg-brand-50 p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-black text-brand-900">PDFs disponíveis para estudo</h1>
              <p className="mt-1 text-sm text-brand-700">Selecione um PDF para iniciar a revisão dos cards dele.</p>
            </div>
            <span className="rounded-full border border-brand-400/40 bg-brand-700/35 px-4 py-2 text-xs font-bold text-brand-100">
              {documents.length} PDF(s)
            </span>
          </div>

          <div className="mt-6 grid gap-3">
            {documents.map((document) => (
              <div key={document.id} className="w-full rounded-2xl border border-brand-300 bg-brand-950/35 px-5 py-4 text-white">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-white">{document.name}</p>
                    <span className="mt-2 inline-flex rounded-full bg-brand-600/20 px-3 py-1 text-xs font-bold text-brand-100">
                      {document.totalCards} card(s)
                    </span>
                    <p className="mt-2 text-sm text-white/70">Clique em Estudar para revisar os flashcards deste PDF.</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="rounded-xl border border-brand-400/50 bg-brand-700/50 px-3 py-2 text-xs font-bold text-white transition hover:bg-brand-700"
                      onClick={() => void startWithDocument(document.id)}
                      disabled={deletingDocumentId === document.id}
                    >
                      Estudar
                    </button>
                    <button
                      type="button"
                      className="rounded-xl border border-rose-300/45 bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-100 transition hover:bg-rose-500/20 disabled:opacity-60"
                      onClick={() => void deleteDocumentCards(document)}
                      disabled={deletingDocumentId !== null}
                    >
                      {deletingDocumentId === document.id ? "Excluindo..." : "Excluir flashcards"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : !selectedCard ? (
        <section className="max-w-2xl w-full rounded-2xl border border-brand-100 bg-brand-50 p-6 text-center">
          <p className="text-sm font-bold text-brand-800">
            {reviewMode === "due" && totalCount > 0
              ? "Nenhum card vencido agora. Você está em dia na repetição espaçada."
              : "Nenhum flashcard encontrado."}
          </p>
          {reviewMode === "due" && totalCount > 0 ? (
            <button
              type="button"
              className="mt-4 btn btn-primary"
              onClick={() => void changeReviewMode("all")}
            >
              Estudar todos os cards agora
            </button>
          ) : null}
          <button
            type="button"
            className="mt-4 btn btn-secondary"
            onClick={() => void loadCards(selectedDocumentId === "all" ? undefined : selectedDocumentId, activeDeckId ?? undefined, reviewMode)}
          >
            Recarregar
          </button>
        </section>
      ) : completed ? (
        <section className="max-w-2xl w-full rounded-3xl border border-brand-100 bg-brand-50 p-8 text-center">
          <p className="text-3xl font-black text-brand-900">Parabéns! Você concluiu todos os flashcards.</p>
          <p className="mt-3 text-brand-800">Você revisou tudo e corrigiu os cards que tinha errado.</p>
          <button
            type="button"
            className="mt-6 inline-flex items-center justify-center rounded-2xl border border-brand-400/40 bg-brand-700 px-8 py-3 text-lg font-bold text-white shadow-lg transition hover:bg-brand-600"
            onClick={() => void loadCards(selectedDocumentId === "all" ? undefined : selectedDocumentId, activeDeckId ?? undefined, reviewMode)}
          >
            Estudar novamente
          </button>
        </section>
      ) : (
        <>
          <article
            className={`max-w-2xl w-full rounded-3xl border border-brand-100 bg-brand-50 p-8 transition-all duration-200 ${
              answerFx === "correct"
                ? "scale-[1.01] ring-2 ring-emerald-300"
                : answerFx === "wrong"
                  ? "ring-2 ring-rose-300"
                  : ""
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
              <div className="flex flex-wrap gap-2">
                {selectedCard.knowledgeLevel === "difficult" ? (
                  <span className="inline-flex items-center gap-2 rounded-full border border-rose-400 bg-rose-600 px-4 py-2 text-sm font-bold text-white shadow-sm">
                    🔥 {statusLabel(selectedCard)}
                  </span>
                ) : selectedCard.knowledgeLevel === "easy" ? (
                  <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400 bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-sm">
                    ✅ {statusLabel(selectedCard)}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2 rounded-full border border-brand-500 bg-brand-700 px-4 py-2 text-sm font-bold text-white shadow-sm">
                    🧠 {statusLabel(selectedCard)}
                  </span>
                )}
                <span className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-brand-600 to-brand-700 px-4 py-2 text-sm font-bold text-white shadow-md">
                  {currentIndex + 1}/{sessionQueue.length}
                </span>
              </div>
              <button type="button" className="btn btn-secondary px-6 py-2 font-semibold shadow-md hover:shadow-lg transition-all" onClick={() => setFlipped((value) => !value)}>
                {flipped ? "👁️ Ver frente" : "👁️ Ver verso"}
              </button>
            </div>

            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-brand-700">
              Rodada {round}{round > 1 ? " - revisão dos cards errados" : ""}
            </p>

            <p className="text-sm font-semibold text-brand-600 mb-4 uppercase tracking-wide">{selectedCard.documentName ?? "Sem PDF vinculado"}</p>
            <div className="mb-8" style={{ perspective: "1200px" }}>
              <div
                className="relative h-[320px] w-full md:h-[360px] transition-transform duration-500"
                style={{
                  transformStyle: "preserve-3d",
                  transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)"
                }}
              >
                <div
                  className="absolute inset-0"
                  style={{
                    backfaceVisibility: "hidden",
                    WebkitBackfaceVisibility: "hidden"
                  }}
                >
                  <h2 className={`flex h-full w-full items-center justify-center overflow-y-auto px-2 text-center font-extrabold text-brand-900 whitespace-pre-wrap break-words [overflow-wrap:anywhere] ${frontTextClass}`}>
                    {frontText}
                  </h2>
                </div>

                <div
                  className="absolute inset-0"
                  style={{
                    transform: "rotateY(180deg)",
                    backfaceVisibility: "hidden",
                    WebkitBackfaceVisibility: "hidden"
                  }}
                >
                  <h2 className={`flex h-full w-full items-center justify-center overflow-y-auto px-2 text-center font-extrabold text-brand-900 whitespace-pre-wrap break-words [overflow-wrap:anywhere] ${backTextClass}`}>
                    {backText}
                  </h2>
                </div>
              </div>
            </div>
          </article>

          {!flipped ? (
            <p className="max-w-2xl w-full mt-5 text-center text-sm font-bold text-brand-700">
              Vire o card para o verso antes de responder.
            </p>
          ) : null}

          <div className="max-w-2xl w-full mt-8 grid gap-4 grid-cols-4">
            <button
              type="button"
              className="rounded-2xl border border-red-300/35 bg-red-500/15 px-3 py-3 text-sm font-semibold text-red-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-sm transition-all duration-150 hover:bg-red-500/24 hover:border-red-200/45 active:scale-[0.99] disabled:opacity-60"
              onClick={() => void reviewCard(1)}
              disabled={saving || !flipped}
              title="Não conseguiu lembrar ou respondeu errado"
            >
              <span className="mx-auto mb-2 block h-2 w-2 rounded-full bg-red-400/85" />
              <span className="block">Difícil</span>
            </button>
            <button
              type="button"
              className="rounded-2xl border border-orange-300/35 bg-orange-500/15 px-3 py-3 text-sm font-semibold text-orange-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-sm transition-all duration-150 hover:bg-orange-500/24 hover:border-orange-200/45 active:scale-[0.99] disabled:opacity-60"
              onClick={() => void reviewCard(2)}
              disabled={saving || !flipped}
              title="Lembrou com dificuldade"
            >
              <span className="mx-auto mb-2 block h-2 w-2 rounded-full bg-orange-400/85" />
              <span className="block">Médio</span>
            </button>
            <button
              type="button"
              className="rounded-2xl border border-blue-300/35 bg-blue-500/15 px-3 py-3 text-sm font-semibold text-blue-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-sm transition-all duration-150 hover:bg-blue-500/24 hover:border-blue-200/45 active:scale-[0.99] disabled:opacity-60"
              onClick={() => void reviewCard(4)}
              disabled={saving || !flipped}
              title="Acertou com hesitação"
            >
              <span className="mx-auto mb-2 block h-2 w-2 rounded-full bg-blue-400/85" />
              <span className="block">Bom</span>
            </button>
            <button
              type="button"
              className="rounded-2xl border border-emerald-300/35 bg-emerald-500/15 px-3 py-3 text-sm font-semibold text-emerald-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-sm transition-all duration-150 hover:bg-emerald-500/24 hover:border-emerald-200/45 active:scale-[0.99] disabled:opacity-60"
              onClick={() => void reviewCard(5)}
              disabled={saving || !flipped}
              title="Respondeu facilmente"
            >
              <span className="mx-auto mb-2 block h-2 w-2 rounded-full bg-emerald-400/85" />
              <span className="block">Fácil</span>
            </button>
          </div>
        </>
      )}
    </main>
  );
}
