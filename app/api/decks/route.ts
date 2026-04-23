import { NextResponse } from "next/server";
import { getRouteSupabase } from "@/lib/supabase-server";
import { Deck } from "@/types";

export const dynamic = "force-dynamic";

/**
 * GET /api/decks
 * Lista todos os Decks do usuário autenticado
 */
async function handleGET() {
  try {
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

    const { data: decks, error } = await supabase
      .from("decks")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { message: "Erro ao carregar Decks." },
        { status: 500 }
      );
    }

    const mappedDecks: Deck[] = (decks || []).map((deck: Record<string, unknown>) => ({
      id: String(deck.id),
      userId: String(deck.user_id),
      name: String(deck.name ?? ""),
      description: deck.description ? String(deck.description) : undefined,
      color: String(deck.color ?? "#3b82f6"),
      createdAt: String(deck.created_at ?? new Date().toISOString())
    }));

    return NextResponse.json({ decks: mappedDecks });
  } catch (error) {
    return NextResponse.json(
      { message: "Erro ao processar requisição." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/decks
 * Cria um novo Decks
 */
async function handlePOST(request: Request) {
  try {
    const body = (await request.json()) as {
      name?: string;
      description?: string;
      color?: string;
    };

    const name = body.name?.trim();

    if (!name) {
      return NextResponse.json(
        { message: "Nome do Decks é obrigatório." },
        { status: 400 }
      );
    }

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

    const { data: newDeck, error } = await supabase
      .from("decks")
      .insert({
        user_id: user.id,
        name,
        description: body.description?.trim() || null,
        color: body.color || "#3b82f6"
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { message: "Erro ao criar Decks." },
        { status: 500 }
      );
    }

    const deck: Deck = {
      id: String(newDeck.id),
      userId: String(newDeck.user_id),
      name: String(newDeck.name),
      description: newDeck.description ? String(newDeck.description) : undefined,
      color: String(newDeck.color),
      createdAt: String(newDeck.created_at)
    };

    return NextResponse.json({ deck }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: "Erro ao processar requisição." },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  return handleGET();
}

export async function POST(request: Request) {
  return handlePOST(request);
}
