import { NextResponse } from "next/server";
import { extractPdfText } from "@/lib/pdf";
import { buildFlashcardsFromText } from "@/lib/flashcards";
import { generateFlashcardsWithGemini } from "@/lib/gemini";
import { saveCards } from "@/lib/demo-store";
import { getRouteSupabase } from "@/lib/supabase-server";
import type { Flashcard } from "@/types";

export const dynamic = "force-dynamic";
const MAX_FLASHCARDS = 15;
const MIN_FLASHCARDS = 3;

type GenerationMode = "standard" | "easy" | "medium" | "hard";

function getGenerationConfig(mode: GenerationMode) {
  switch (mode) {
    case "easy":
      return { totalCards: 5, knowledgeLevel: "easy" as const, prompt: "Crie flashcards fáceis, diretos e didáticos." };
    case "medium":
      return { totalCards: 5, knowledgeLevel: "normal" as const, prompt: "Crie flashcards médios, equilibrando definição e compreensão." };
    case "hard":
      return { totalCards: 5, knowledgeLevel: "difficult" as const, prompt: "Crie flashcards difíceis, mais analíticos e exigentes." };
    case "standard":
    default:
      return {
        totalCards: MAX_FLASHCARDS,
        knowledgeLevel: "normal" as const,
        prompt: "Crie uma mistura de 5 flashcards fáceis, 5 médios e 5 difíceis."
      };
  }
}

export async function POST(request: Request) {
  try {
    console.log("[Upload] Iniciando processamento do PDF");

    const hasSupabaseEnv =
      Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) && Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    const supabase = hasSupabaseEnv ? await getRouteSupabase() : null;
    const {
      data: { user }
    } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

    if (hasSupabaseEnv && !user) {
      return NextResponse.json({ message: "Voce precisa estar logado para enviar um PDF." }, { status: 401 });
    }

    const formData = await request.formData();
    const pdfFile = formData.get("pdf");
    const modeRaw = String(formData.get("mode") ?? "standard").toLowerCase();
    const deckIdRaw = formData.get("deckId");
    const deckId = deckIdRaw ? String(deckIdRaw) : null;
    
    const generationMode: GenerationMode =
      modeRaw === "easy" || modeRaw === "medium" || modeRaw === "hard" ? modeRaw : "standard";
    const generationConfig = getGenerationConfig(generationMode);

    if (!(pdfFile instanceof File)) {
      return NextResponse.json({ message: "Arquivo PDF não encontrado." }, { status: 400 });
    }

    if (pdfFile.type !== "application/pdf") {
      return NextResponse.json({ message: "Envie um arquivo PDF válido." }, { status: 400 });
    }

    // Se um deck foi especificado, valida se pertence ao usuário
    if (deckId && supabase && user) {
      const { data: deck } = await supabase
        .from("decks")
        .select("id")
        .eq("id", deckId)
        .eq("user_id", user.id)
        .single();

      if (!deck) {
        return NextResponse.json(
          { message: "Decks não encontrado ou não pertence a você." },
          { status: 404 }
        );
      }
    }

    const arrayBuffer = await pdfFile.arrayBuffer();

    let text = "";
    try {
      text = await extractPdfText(Buffer.from(arrayBuffer));
      console.log(`[Upload] Texto extraído com ${text.length} caracteres`);
    } catch (extractError) {
      console.error("[Upload] Falha ao extrair texto do PDF:", extractError);
      return NextResponse.json({ message: "Erro ao ler o PDF enviado." }, { status: 500 });
    }

    if (!text.trim()) {
      return NextResponse.json({ message: "Nao foi possivel extrair texto desse PDF." }, { status: 400 });
    }

    let aiCards: Flashcard[] = [];
    try {
      aiCards = await generateFlashcardsWithGemini(text, generationConfig.totalCards, generationConfig.prompt);
      console.log(`[Upload] IA Gemini retornou ${aiCards.length} cards`);
    } catch (geminiError) {
      console.error("[Upload] Falha ao gerar cards com Gemini:", geminiError);
    }

    const sourceCards = aiCards.length > 0 ? aiCards : buildFlashcardsFromText(text);
    const cards: Flashcard[] = sourceCards.slice(0, generationConfig.totalCards).map((card, index): Flashcard => {
      if (generationMode === "standard") {
        const difficulty: Flashcard["knowledgeLevel"] = index < 5 ? "easy" : index < 10 ? "normal" : "difficult";
        return { ...card, knowledgeLevel: difficulty };
      }

      return { ...card, knowledgeLevel: generationConfig.knowledgeLevel };
    });
    console.log(`[Upload] Total de ${cards.length} cards após fallback (fonte: ${aiCards.length > 0 ? "IA" : "Fallback"})`);

    if (cards.length < MIN_FLASHCARDS) {
      return NextResponse.json(
        {
          message:
            "Conteúdo insuficiente no PDF para gerar flashcards úteis. Envie um PDF com mais texto corrido (conceitos, explicações e exemplos)."
        },
        { status: 422 }
      );
    }

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
        console.error("[Upload] Erro ao salvar documento:", documentError);
        saveCards(cards);
        return NextResponse.json({
          message: `${cards.length} flashcards gerados com sucesso, mas não foi possível salvar no banco. Eles foram mantidos localmente.`
        });
      }

      const cardsToInsert = cards.map((card) => ({
        user_id: user.id,
        document_id: documentRow.id,
        deck_id: deckId || null,
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
        console.error("[Upload] Erro ao salvar flashcards:", cardsError);
        saveCards(cards);
        return NextResponse.json({
          message: `${cards.length} flashcards gerados com sucesso, mas houve falha ao salvar no banco. Eles foram mantidos localmente.`
        });
      }
    } else {
      saveCards(cards);
    }

    const source = aiCards.length > 0 ? "IA Gemini" : "gerador padrao";

    return NextResponse.json({
      message: `${cards.length} flashcards gerados com sucesso via ${source}.`
    });
  } catch (error) {
    console.error("[Upload] Erro não tratado:", error);
    return NextResponse.json({ message: "Erro ao processar o PDF." }, { status: 500 });
  }
}
