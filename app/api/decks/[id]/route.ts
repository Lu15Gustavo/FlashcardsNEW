import { NextResponse } from "next/server";
import { getRouteSupabase } from "@/lib/supabase-server";
import { Deck } from "@/types";

export const dynamic = "force-dynamic";

/**
 * PUT /api/decks/[id]
 * Atualiza um Decks existente
 */
async function handlePUT(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await props.params;
    const body = (await request.json()) as {
      name?: string;
      description?: string;
      color?: string;
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

    // Verifica se o deck pertence ao usuário
    const { data: existingDeck } = await supabase
      .from("decks")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (!existingDeck) {
      return NextResponse.json(
        { message: "Decks não encontrado." },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (body.name) updateData.name = body.name.trim();
    if (body.description !== undefined) updateData.description = body.description?.trim() || null;
    if (body.color) updateData.color = body.color;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { message: "Nenhum campo para atualizar." },
        { status: 400 }
      );
    }

    const { data: updatedDeck, error } = await supabase
      .from("decks")
      .update(updateData)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { message: "Erro ao atualizar Decks." },
        { status: 500 }
      );
    }

    const deck: Deck = {
      id: String(updatedDeck.id),
      userId: String(updatedDeck.user_id),
      name: String(updatedDeck.name),
      description: updatedDeck.description ? String(updatedDeck.description) : undefined,
      color: String(updatedDeck.color),
      createdAt: String(updatedDeck.created_at)
    };

    return NextResponse.json({ deck });
  } catch (error) {
    return NextResponse.json(
      { message: "Erro ao processar requisição." },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/decks/[id]
 * Deleta um Decks e todos seus flashcards
 */
async function handleDELETE(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await props.params;

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

    // Verifica se o deck pertence ao usuário
    const { data: existingDeck } = await supabase
      .from("decks")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (!existingDeck) {
      return NextResponse.json(
        { message: "Decks não encontrado." },
        { status: 404 }
      );
    }

    // Deleta o deck (cascata remove flashcards via FK)
    const { error } = await supabase
      .from("decks")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json(
        { message: "Erro ao deletar Decks." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "Decks deletado com sucesso." },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Erro ao processar requisição." },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
  return handlePUT(request, props);
}

export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
  return handleDELETE(request, props);
}
