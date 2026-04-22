import { NextResponse } from "next/server";
import { readCards } from "@/lib/demo-store";
import { getRouteSupabase } from "@/lib/supabase-server";
import { Flashcard } from "@/types";

export const dynamic = "force-dynamic";

type DocumentOption = {
  id: string;
  name: string;
  totalCards: number;
};

function mapDbCard(card: Record<string, unknown>): Flashcard {
  const documentRelation = card.documents;
  const documentName = Array.isArray(documentRelation)
    ? String(documentRelation[0]?.filename ?? "")
    : typeof documentRelation === "object" && documentRelation && "filename" in documentRelation
      ? String((documentRelation as { filename?: unknown }).filename ?? "")
      : undefined;

  return {
    id: String(card.id),
    documentId: String(card.document_id ?? ""),
    documentName,
    deckId: card.deck_id ? String(card.deck_id) : undefined,
    question: String(card.question ?? ""),
    answer: String(card.answer ?? ""),
    notes: String(card.notes ?? "").trim() || undefined,
    tags: Array.isArray(card.tags) ? card.tags.map((tag) => String(tag).trim()).filter(Boolean) : [],
    repetition: Number(card.repetition ?? 0),
    interval: Number(card.interval_days ?? 1),
    easeFactor: Number(card.ease_factor ?? 2.5),
    dueAt: String(card.due_at ?? new Date().toISOString()),
    knowledgeLevel: (card.knowledge_level === "difficult" || card.knowledge_level === "easy"
      ? card.knowledge_level
      : "normal") as Flashcard["knowledgeLevel"]
  };
}

function shuffleCards(cards: Flashcard[]): Flashcard[] {
  const shuffled = [...cards];

  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const randomIndex = Math.floor(Math.random() * (i + 1));
    const current = shuffled[i];
    shuffled[i] = shuffled[randomIndex];
    shuffled[randomIndex] = current;
  }

  return shuffled;
}

function getDocumentOptions(cards: Flashcard[]): DocumentOption[] {
  const grouped = new Map<string, DocumentOption>();

  for (const card of cards) {
    const documentId = card.documentId?.trim();
    if (!documentId) {
      continue;
    }

    const current = grouped.get(documentId);
    if (current) {
      current.totalCards += 1;
      continue;
    }

    grouped.set(documentId, {
      id: documentId,
      name: card.documentName?.trim() || "PDF sem nome",
      totalCards: 1
    });
  }

  return Array.from(grouped.values()).sort((a, b) => a.name.localeCompare(b.name));
}

function isDue(card: Flashcard, nowTime: number): boolean {
  const dueTime = Date.parse(card.dueAt);
  if (Number.isNaN(dueTime)) {
    return true;
  }
  return dueTime <= nowTime;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const selectedDocumentId = searchParams.get("documentId")?.trim();
  const selectedDeckId = searchParams.get("deckId")?.trim();

  const hasSupabaseEnv =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) && Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  if (hasSupabaseEnv) {
    const supabase = getRouteSupabase();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ cards: [] });
    }

    const { data, error } = await supabase
      .from("flashcards")
      .select("id, document_id, deck_id, question, answer, notes, tags, repetition, interval_days, ease_factor, due_at, knowledge_level, documents(filename)")
      .eq("user_id", user.id)
      .order("due_at", { ascending: true })
      .order("created_at", { ascending: true });

    if (!error && data) {
      const allCards = data.map(mapDbCard);
      const documentOptions = getDocumentOptions(allCards);
      const cardsBySelection = selectedDeckId
        ? allCards.filter((card) => card.deckId === selectedDeckId)
        : selectedDocumentId
          ? allCards.filter((card) => card.documentId === selectedDocumentId)
          : allCards;

      if (selectedDeckId) {
        const shuffledDeckCards = shuffleCards(cardsBySelection);

        return NextResponse.json({
          cards: shuffledDeckCards,
          dueOnly: false,
          documents: documentOptions
        });
      }

      const nowTime = Date.now();
      const dueCards = cardsBySelection.filter((card) => isDue(card, nowTime));
      const cardsToReturn = dueCards.length > 0 ? dueCards : cardsBySelection;

      return NextResponse.json({
        cards: cardsToReturn,
        dueOnly: dueCards.length > 0,
        documents: documentOptions
      });
    }
  }

  const allCards = readCards();
  const documentOptions = getDocumentOptions(allCards);
  const cardsBySelection = selectedDeckId
    ? allCards.filter((card) => card.deckId === selectedDeckId)
    : selectedDocumentId
      ? allCards.filter((card) => card.documentId === selectedDocumentId)
      : allCards;

  if (selectedDeckId) {
    const shuffledDeckCards = shuffleCards(cardsBySelection);

    return NextResponse.json({
      cards: shuffledDeckCards,
      dueOnly: false,
      documents: documentOptions
    });
  }

  const nowTime = Date.now();
  const dueCards = cardsBySelection.filter((card) => isDue(card, nowTime));
  const cardsToReturn = dueCards.length > 0 ? dueCards : cardsBySelection;

  return NextResponse.json({
    cards: cardsToReturn,
    dueOnly: dueCards.length > 0,
    documents: documentOptions
  });
}
