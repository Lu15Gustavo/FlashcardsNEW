import { NextResponse } from "next/server";
import { getRouteSupabase } from "@/lib/supabase-server";
import { scoreCardReview } from "@/lib/srs";
import { readCards, updateCardInStore } from "@/lib/demo-store";
import { Flashcard } from "@/types";

export const dynamic = "force-dynamic";

/**
 * POST /api/flashcards/review
 * 
 * Registra uma revisão de flashcard com qualidade da resposta (4 níveis):
 * - Quality 1 = Difícil (errou, volta em 10 min, diminui ease)
 * - Quality 2 = Médio (errou mas conseguiu lembrar, volta em 10 min)
 * - Quality 4 = Bom (acertou com hesitação, intervalo normal)
 * - Quality 5 = Fácil (acertou facilmente, intervalo aumentado)
 */
type ReviewBody = {
  cardId?: string;
  quality?: number;
  responseTimeMs?: number;
};

function mapDbCard(card: Record<string, unknown>): Flashcard {
  return {
    id: String(card.id),
    documentId: String(card.document_id ?? ""),
    documentName:
      typeof card.documents === "object" && card.documents && "filename" in card.documents
        ? String((card.documents as { filename?: unknown }).filename ?? "")
        : undefined,
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

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ReviewBody;
    const cardId = body.cardId;
    const quality = Number(body.quality);
    const responseTimeMs = Number(body.responseTimeMs ?? 0);

    if (!cardId || Number.isNaN(quality) || Number.isNaN(responseTimeMs)) {
      return NextResponse.json({ message: "Dados de revisao invalidos." }, { status: 400 });
    }

    const hasSupabaseEnv =
      Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) && Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

    if (hasSupabaseEnv) {
      const supabase = await getRouteSupabase();
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        return NextResponse.json({ message: "Voce precisa estar logado para revisar flashcards." }, { status: 401 });
      }

      const { data: currentCard, error: fetchError } = await supabase
        .from("flashcards")
        .select("id, document_id, question, answer, notes, tags, repetition, interval_days, ease_factor, due_at, knowledge_level, documents(filename)")
        .eq("id", cardId)
        .eq("user_id", user.id)
        .single();

      if (fetchError || !currentCard) {
        return NextResponse.json({ message: "Flashcard nao encontrado." }, { status: 404 });
      }

      const updatedCard = scoreCardReview(mapDbCard(currentCard), quality);

      const { error: updateError } = await supabase
        .from("flashcards")
        .update({
          repetition: updatedCard.repetition,
          interval_days: updatedCard.interval,
          ease_factor: updatedCard.easeFactor,
          due_at: updatedCard.dueAt,
          knowledge_level: updatedCard.knowledgeLevel
        })
        .eq("id", cardId)
        .eq("user_id", user.id);

      if (updateError) {
        return NextResponse.json({ message: "Erro ao atualizar flashcard." }, { status: 500 });
      }

      const { error: historyError } = await supabase.from("flashcard_reviews").insert({
        user_id: user.id,
        flashcard_id: cardId,
        quality,
        response_time_ms: Math.max(0, Math.round(responseTimeMs)),
        previous_repetition: currentCard.repetition,
        next_repetition: updatedCard.repetition,
        previous_interval_days: currentCard.interval_days,
        next_interval_days: updatedCard.interval,
        previous_knowledge_level: currentCard.knowledge_level,
        next_knowledge_level: updatedCard.knowledgeLevel,
        reviewed_at: new Date().toISOString()
      });

      if (historyError) {
        return NextResponse.json({ message: "Erro ao registrar historico de revisao." }, { status: 500 });
      }

      return NextResponse.json({ card: updatedCard });
    }

    const currentCard = readCards().find((card) => card.id === cardId);
    if (!currentCard) {
      return NextResponse.json({ message: "Flashcard nao encontrado." }, { status: 404 });
    }

    const updatedCard = scoreCardReview(currentCard, quality);
    updateCardInStore(cardId, updatedCard);

    return NextResponse.json({ card: updatedCard });
  } catch {
    return NextResponse.json({ message: "Erro ao processar revisao." }, { status: 500 });
  }
}