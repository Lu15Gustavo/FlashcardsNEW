import { NextResponse } from "next/server";
import { readCards } from "@/lib/demo-store";
import { getRouteSupabase } from "@/lib/supabase-server";
import { Flashcard } from "@/types";

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

    const nowIso = new Date().toISOString();

    const { data: dueCards, error: dueError } = await supabase
      .from("flashcards")
      .select("id, document_id, question, answer, notes, tags, repetition, interval_days, ease_factor, due_at, knowledge_level, documents(filename)")
      .eq("user_id", user.id)
      .lte("due_at", nowIso)
      .order("due_at", { ascending: true })
      .order("created_at", { ascending: true });

    if (!dueError && dueCards && dueCards.length > 0) {
      return NextResponse.json({ cards: dueCards.map(mapDbCard) });
    }

    const { data, error } = await supabase
      .from("flashcards")
      .select("id, document_id, question, answer, notes, tags, repetition, interval_days, ease_factor, due_at, knowledge_level, documents(filename)")
      .eq("user_id", user.id)
      .order("due_at", { ascending: true })
      .order("created_at", { ascending: true });

    if (!error && data) {
      return NextResponse.json({ cards: data.map(mapDbCard), dueOnly: false });
    }
  }

  const cards = readCards();
  return NextResponse.json({ cards });
}
