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

function getCardBackText(card: Flashcard) {
  const answer = card.answer?.trim();
  if (answer) {
    return answer;
  }

  const notes = card.notes?.trim();
  if (notes) {
    return notes;
  }

  return "Resposta indisponível para este card.";
}

function getCardFrontText(card: Flashcard) {
  const question = card.question?.trim();
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
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [flipped, setFlipped] = useState(false);
  const [answerFx, setAnswerFx] = useState<"correct" | "wrong" | null>(null);
  const [responseStart, setResponseStart] = useState(Date.now());

  const loadCards = async (documentId?: string, deckId?: string): Promise<Flashcard[]> => {
    setLoading(true);
    setError("");

    try {
      const hasDocumentFilter = typeof documentId === "string" && documentId !== "all";
      const hasDeckFilter = typeof deckId === "string" && deckId.length > 0;
      const query = new URLSearchParams();
      if (hasDocumentFilter) {
        query.set("documentId", documentId);
      }
      if (hasDeckFilter) {
        query.set("deckId", deckId);
      }

      const params = query.toString() ? `?${query.toString()}` : "";
      const response = await fetch(`/api/flashcards/generate${params}`, { cache: "no-store" });
      const data = (await response.json()) as {
        cards?: Flashcard[];
        documents?: DocumentOption[];
        message?: string;
      };

      if (!response.ok) {
        throw new Error(data.message ?? "Não foi possível carregar os flashcards.");
      }

      const nextDocuments = Array.isArray(data.documents) ? data.documents : [];
      setDocuments(nextDocuments);

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
      return [];
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const queryDeckId = searchParams.get("deckId")?.trim() ?? "";

    if (queryDeckId) {
      void loadCards(undefined, queryDeckId).then((loadedCards) => {
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

    void loadCards();
  }, [searchParams]);

  const startWithDocument = async (documentId: string) => {
    setSelectedDocumentId(documentId);
    const loadedCards = await loadCards(documentId);
    if (loadedCards.length > 0) {
      setSessionQueue(loadedCards.slice(0, 15));
      setCurrentIndex(0);
      setFlipped(false);
      setResponseStart(Date.now());
      setStudyStarted(true);
    }
  };

  const selectedCard = sessionQueue[currentIndex] ?? null;

  const reviewCard = async (quality: number) => {
    if (!selectedCard) {
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

  const deleteCurrentCard = async () => {
    if (!selectedCard) {
      return;
    }

    const confirmed = window.confirm("Deseja excluir este flashcard? Essa ação não pode ser desfeita.");
    if (!confirmed) {
      return;
    }

    setDeleting(true);
    setError("");

    try {
      const response = await fetch("/api/flashcards/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId: selectedCard.id })
      });

      const data = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(data.message ?? "Não foi possível excluir o flashcard.");
      }

      const nextCards = cards.filter((card) => card.id !== selectedCard.id);
      const nextQueue = sessionQueue.filter((card) => card.id !== selectedCard.id);

      setCards(nextCards);
      setSessionQueue(nextQueue);
      setWrongCardIds((prev) => prev.filter((cardId) => cardId !== selectedCard.id));
      setCurrentIndex((prev) => {
        if (nextQueue.length === 0) {
          return 0;
        }
        return Math.min(prev, nextQueue.length - 1);
      });
      setFlipped(false);
      setAnswerFx(null);
      setResponseStart(Date.now());
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Não foi possível excluir o flashcard.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <main className="page-shell flex min-h-screen flex-col items-center justify-center py-4">
      {error ? (
        <section className="max-w-2xl w-full rounded-2xl border border-brand-100 bg-brand-50 p-6 text-center">
          <p className="text-sm font-bold text-brand-800">{error}</p>
          <button
            type="button"
            className="mt-4 btn btn-secondary"
            onClick={() => void loadCards(selectedDocumentId === "all" ? undefined : selectedDocumentId)}
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
              <button
                key={document.id}
                type="button"
                className="w-full rounded-2xl border border-brand-300 bg-brand-950/35 px-5 py-4 text-left text-white transition hover:border-brand-500 hover:bg-brand-950/50"
                onClick={() => void startWithDocument(document.id)}
              >
                <p className="text-base font-bold text-white">{document.name}</p>
                <p className="text-sm text-white/70">{document.totalCards} flashcard(s)</p>
              </button>
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
              <button
                key={document.id}
                type="button"
                className="w-full rounded-2xl border border-brand-300 bg-brand-950/35 px-5 py-4 text-left text-white transition hover:border-brand-500 hover:bg-brand-950/50"
                onClick={() => void startWithDocument(document.id)}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-bold text-white">{document.name}</p>
                  <span className="rounded-full bg-brand-600/20 px-3 py-1 text-xs font-bold text-brand-100">
                    {document.totalCards} card(s)
                  </span>
                </div>
                <p className="mt-2 text-sm text-white/70">Clique para estudar os flashcards deste PDF.</p>
              </button>
            ))}
          </div>
        </section>
      ) : !selectedCard ? (
        <section className="max-w-2xl w-full rounded-2xl border border-brand-100 bg-brand-50 p-6 text-center">
          <p className="text-sm font-bold text-brand-800">Nenhum flashcard encontrado.</p>
          <button
            type="button"
            className="mt-4 btn btn-secondary"
            onClick={() => void loadCards(selectedDocumentId === "all" ? undefined : selectedDocumentId)}
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
            onClick={() => void loadCards(selectedDocumentId === "all" ? undefined : selectedDocumentId)}
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

            <div className="mb-4 flex justify-end">
              <button
                type="button"
                className="rounded-lg border border-rose-300/45 bg-rose-500/10 px-3 py-1.5 text-xs font-bold text-rose-700 transition hover:bg-rose-500/20 disabled:opacity-60"
                onClick={() => void deleteCurrentCard()}
                disabled={saving || deleting}
              >
                {deleting ? "Excluindo..." : "Excluir card"}
              </button>
            </div>

            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-brand-700">
              Rodada {round}{round > 1 ? " - revisão dos cards errados" : ""}
            </p>

            <p className="text-sm font-semibold text-brand-600 mb-4 uppercase tracking-wide">{selectedCard.documentName ?? "Sem PDF vinculado"}</p>
            <div className="mb-8" style={{ perspective: "1200px" }}>
              <div
                className="relative min-h-[190px] w-full transition-transform duration-500"
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
                  <h2 className="max-h-[50vh] min-h-[190px] overflow-y-auto whitespace-pre-line break-words pr-2 text-[clamp(2rem,4vw,3.2rem)] font-black leading-tight text-brand-900">
                    {getCardFrontText(selectedCard)}
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
                  <h2 className="max-h-[50vh] min-h-[190px] overflow-y-auto whitespace-pre-line break-words pr-2 text-[clamp(2rem,4vw,3.2rem)] font-black leading-tight text-brand-900">
                    {getCardBackText(selectedCard)}
                  </h2>
                </div>
              </div>
            </div>
          </article>

          <div className="max-w-2xl w-full mt-8 grid gap-4 grid-cols-4">
            <button
              type="button"
              className="rounded-2xl border border-red-300/30 bg-gradient-to-r from-red-500/90 to-rose-500/90 px-3 py-4 text-sm font-bold text-white shadow-[0_10px_24px_rgba(220,38,38,0.22)] transition-all duration-150 hover:-translate-y-0.5 hover:from-red-500 hover:to-rose-500 active:translate-y-0 disabled:opacity-60"
              onClick={() => void reviewCard(1)}
              disabled={saving || deleting}
              title="Não conseguiu lembrar ou respondeu errado"
            >
              🔴
              <br />
              Difícil
            </button>
            <button
              type="button"
              className="rounded-2xl border border-orange-300/30 bg-gradient-to-r from-orange-500/90 to-amber-500/90 px-3 py-4 text-sm font-bold text-white shadow-[0_10px_24px_rgba(249,115,22,0.22)] transition-all duration-150 hover:-translate-y-0.5 hover:from-orange-500 hover:to-amber-500 active:translate-y-0 disabled:opacity-60"
              onClick={() => void reviewCard(2)}
              disabled={saving || deleting}
              title="Lembrou com dificuldade"
            >
              🟠
              <br />
              Médio
            </button>
            <button
              type="button"
              className="rounded-2xl border border-blue-300/30 bg-gradient-to-r from-blue-500/90 to-indigo-500/90 px-3 py-4 text-sm font-bold text-white shadow-[0_10px_24px_rgba(59,130,246,0.22)] transition-all duration-150 hover:-translate-y-0.5 hover:from-blue-500 hover:to-indigo-500 active:translate-y-0 disabled:opacity-60"
              onClick={() => void reviewCard(4)}
              disabled={saving || deleting}
              title="Acertou com hesitação"
            >
              🔵
              <br />
              Bom
            </button>
            <button
              type="button"
              className="rounded-2xl border border-emerald-300/30 bg-gradient-to-r from-emerald-500/90 to-teal-500/90 px-3 py-4 text-sm font-bold text-white shadow-[0_10px_24px_rgba(16,185,129,0.22)] transition-all duration-150 hover:-translate-y-0.5 hover:from-emerald-500 hover:to-teal-500 active:translate-y-0 disabled:opacity-60"
              onClick={() => void reviewCard(5)}
              disabled={saving || deleting}
              title="Respondeu facilmente"
            >
              🟢
              <br />
              Fácil
            </button>
          </div>
        </>
      )}
    </main>
  );
}
