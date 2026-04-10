import { NextResponse } from "next/server";
import { extractPdfText } from "@/lib/pdf";
import { buildFlashcardsFromText } from "@/lib/flashcards";
import { generateFlashcardsWithGemini } from "@/lib/gemini";
import { saveCards } from "@/lib/demo-store";
import { getRouteSupabase } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const hasSupabaseEnv =
      Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) && Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    const supabase = hasSupabaseEnv ? getRouteSupabase() : null;
    const {
      data: { user }
    } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

    if (hasSupabaseEnv && !user) {
      return NextResponse.json({ message: "Voce precisa estar logado para enviar um PDF." }, { status: 401 });
    }

    const formData = await request.formData();
    const pdfFile = formData.get("pdf");

    if (!(pdfFile instanceof File)) {
      return NextResponse.json({ message: "Arquivo PDF não encontrado." }, { status: 400 });
    }

    if (pdfFile.type !== "application/pdf") {
      return NextResponse.json({ message: "Envie um arquivo PDF válido." }, { status: 400 });
    }

    const arrayBuffer = await pdfFile.arrayBuffer();
    const text = await extractPdfText(Buffer.from(arrayBuffer));

    if (!text.trim()) {
      return NextResponse.json({ message: "Nao foi possivel extrair texto desse PDF." }, { status: 400 });
    }

    const aiCards = await generateFlashcardsWithGemini(text, 20);
    const cards = aiCards.length > 0 ? aiCards : buildFlashcardsFromText(text);

    if (supabase && user) {
      const { data: documentRow, error: documentError } = await supabase
        .from("documents")
        .insert({
          user_id: user.id,
          filename: pdfFile.name,
          extracted_text: text
        })
        .select("id")
        .single();

      if (documentError || !documentRow) {
        return NextResponse.json({ message: "Erro ao salvar o PDF no banco." }, { status: 500 });
      }

      const cardsToInsert = cards.map((card) => ({
        user_id: user.id,
        document_id: documentRow.id,
        question: card.question,
        answer: card.answer,
        notes: card.notes ?? null,
        tags: card.tags ?? [],
        repetition: card.repetition,
        interval_days: card.interval,
        ease_factor: card.easeFactor,
        due_at: card.dueAt,
        knowledge_level: card.knowledgeLevel
      }));

      const { error: cardsError } = await supabase.from("flashcards").insert(cardsToInsert);

      if (cardsError) {
        return NextResponse.json({ message: "Erro ao salvar flashcards no banco." }, { status: 500 });
      }
    } else {
      saveCards(cards);
    }

    const source = aiCards.length > 0 ? "IA Gemini" : "gerador padrao";

    return NextResponse.json({
      message: `${cards.length} flashcards gerados com sucesso via ${source}.`
    });
  } catch {
    return NextResponse.json({ message: "Erro ao processar o PDF." }, { status: 500 });
  }
}
