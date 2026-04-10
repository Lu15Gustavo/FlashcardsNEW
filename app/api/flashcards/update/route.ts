import { NextResponse } from "next/server";
import { getRouteSupabase } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

type UpdateBody = {
  cardId?: string;
  notes?: string;
  tags?: string[];
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as UpdateBody;
    const cardId = body.cardId;

    if (!cardId) {
      return NextResponse.json({ message: "Dados invalidos." }, { status: 400 });
    }

    const hasSupabaseEnv =
      Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) && Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

    if (!hasSupabaseEnv) {
      return NextResponse.json({ message: "Supabase nao configurado." }, { status: 400 });
    }

    const supabase = getRouteSupabase();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ message: "Voce precisa estar logado para editar o flashcard." }, { status: 401 });
    }

    const normalizedTags = Array.isArray(body.tags)
      ? [...new Set(body.tags.map((tag) => String(tag).trim().toLowerCase()).filter(Boolean))].slice(0, 8)
      : [];

    const { error } = await supabase
      .from("flashcards")
      .update({
        notes: body.notes?.trim() ? body.notes.trim() : null,
        tags: normalizedTags
      })
      .eq("id", cardId)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json({ message: "Erro ao atualizar flashcard." }, { status: 500 });
    }

    return NextResponse.json({ message: "Flashcard atualizado com sucesso." });
  } catch {
    return NextResponse.json({ message: "Erro ao atualizar flashcard." }, { status: 500 });
  }
}