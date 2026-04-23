import { NextResponse } from "next/server";
import { getRouteSupabase } from "@/lib/supabase-server";
import { Flashcard } from "@/types";

export const dynamic = "force-dynamic";

function mapDbCard(card: Record<string, unknown>): Flashcard {
  const documentRelation = card.documents;
  const documentName = Array.isArray(documentRelation)
    ? String(documentRelation[0]?.filename ?? "")
    : typeof documentRelation === "object" && documentRelation && "filename" in documentRelation
      ? String((documentRelation as { filename?: unknown }).filename ?? "")
      : undefined;

  return {
    id: String(card.id),
    documentId: card.document_id ? String(card.document_id) : undefined,
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

export async function GET() {
  const supabase = await getRouteSupabase();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ message: "Você precisa estar logado." }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("flashcards")
    .select("id, document_id, deck_id, question, answer, notes, tags, repetition, interval_days, ease_factor, due_at, knowledge_level, documents(filename)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ message: "Erro ao carregar flashcards." }, { status: 500 });
  }

  const cards = (data ?? []).map((row) => mapDbCard(row as Record<string, unknown>));
  return NextResponse.json({ cards });
}
