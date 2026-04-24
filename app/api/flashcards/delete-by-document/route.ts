import { NextResponse } from "next/server";
import { getRouteSupabase } from "@/lib/supabase-server";
import { removeCardsByDocumentFromStore } from "@/lib/demo-store";

export const dynamic = "force-dynamic";

type DeleteByDocumentBody = {
  documentId?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as DeleteByDocumentBody;
    const documentId = String(body.documentId ?? "").trim();

    if (!documentId) {
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
        return NextResponse.json(
          { message: "Voce precisa estar logado para excluir os flashcards." },
          { status: 401 }
        );
      }

      const { error } = await supabase
        .from("flashcards")
        .delete()
        .eq("document_id", documentId)
        .eq("user_id", user.id);

      if (error) {
        return NextResponse.json({ message: "Erro ao excluir flashcards do PDF." }, { status: 500 });
      }

      return NextResponse.json({ message: "Flashcards do PDF excluidos com sucesso." });
    }

    removeCardsByDocumentFromStore(documentId);
    return NextResponse.json({ message: "Flashcards do PDF excluidos com sucesso." });
  } catch {
    return NextResponse.json({ message: "Erro ao excluir flashcards do PDF." }, { status: 500 });
  }
}
