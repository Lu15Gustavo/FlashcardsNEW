import { NextResponse } from "next/server";
import { getRouteSupabase } from "@/lib/supabase-server";
import { removeCardFromStore } from "@/lib/demo-store";

export const dynamic = "force-dynamic";

type DeleteBody = {
  cardId?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as DeleteBody;
    const cardId = String(body.cardId ?? "").trim();

    if (!cardId) {
      return NextResponse.json({ message: "Dados invalidos." }, { status: 400 });
    }

    const hasSupabaseEnv =
      Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) && Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

    if (hasSupabaseEnv) {
      const supabase = await getRouteSupabase();
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        return NextResponse.json({ message: "Voce precisa estar logado para excluir o flashcard." }, { status: 401 });
      }

      const { error } = await supabase.from("flashcards").delete().eq("id", cardId).eq("user_id", user.id);

      if (error) {
        return NextResponse.json({ message: "Erro ao excluir flashcard." }, { status: 500 });
      }

      return NextResponse.json({ message: "Flashcard excluido com sucesso." });
    }

    removeCardFromStore(cardId);
    return NextResponse.json({ message: "Flashcard excluido com sucesso." });
  } catch {
    return NextResponse.json({ message: "Erro ao excluir flashcard." }, { status: 500 });
  }
}
