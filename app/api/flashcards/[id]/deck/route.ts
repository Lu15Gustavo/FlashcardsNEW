import { NextResponse } from "next/server";
import { getRouteSupabase } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/flashcards/[id]/deck
 * Associa ou desassocia um flashcard a um Decks
 */
async function handlePATCH(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id: cardId } = await props.params;
    const body = (await request.json()) as {
      deckId?: string | null;
    };

    const supabase = await getRouteSupabase();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { message: "Você precisa estar logado." },
        { status: 401 }
      );
    }

    // Verifica se o card pertence ao usuário
    const { data: existingCard } = await supabase
      .from("flashcards")
      .select("id")
      .eq("id", cardId)
      .eq("user_id", user.id)
      .single();

    if (!existingCard) {
      return NextResponse.json(
        { message: "Flashcard não encontrado." },
        { status: 404 }
      );
    }

    // Se deckId foi fornecido, valida se o deck pertence ao usuário
    if (body.deckId) {
      const { data: deck } = await supabase
        .from("decks")
        .select("id")
        .eq("id", body.deckId)
        .eq("user_id", user.id)
        .single();

      if (!deck) {
        return NextResponse.json(
          { message: "Decks não encontrado." },
          { status: 404 }
        );
      }
    }

    // Atualiza o flashcard com o novo deck_id (pode ser null para desassociar)
    const { data: updatedCard, error } = await supabase
      .from("flashcards")
      .update({ deck_id: body.deckId || null })
      .eq("id", cardId)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { message: "Erro ao atualizar flashcard." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: body.deckId
        ? "Flashcard associado ao Decks com sucesso."
        : "Flashcard desassociado do Decks.",
      cardId: updatedCard.id,
      deckId: updatedCard.deck_id || null
    });
  } catch (error) {
    return NextResponse.json(
      { message: "Erro ao processar requisição." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  return handlePATCH(request, props);
}
