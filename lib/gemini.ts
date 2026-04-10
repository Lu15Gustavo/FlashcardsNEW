import { Flashcard } from "@/types";

type GeminiCandidate = {
  content?: {
    parts?: Array<{ text?: string }>;
  };
};

type GeminiResponse = {
  candidates?: GeminiCandidate[];
};

type GeneratedCard = {
  question: string;
  answer: string;
  notes?: string;
  tags?: string[];
};

function extractJsonPayload(raw: string): unknown {
  const trimmed = raw.trim();

  if (trimmed.startsWith("```")) {
    const match = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (match?.[1]) {
      return JSON.parse(match[1]);
    }
  }

  return JSON.parse(trimmed);
}

function normalizeTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) {
    return [];
  }

  return [...new Set(tags.map((tag) => String(tag).trim().toLowerCase()).filter(Boolean))].slice(0, 5);
}

function normalizeCards(payload: unknown, maxCards: number): GeneratedCard[] {
  if (!payload || typeof payload !== "object") {
    return [];
  }

  const cardsArray = Array.isArray(payload)
    ? payload
    : Array.isArray((payload as { cards?: unknown }).cards)
      ? ((payload as { cards: unknown[] }).cards ?? [])
      : [];

  return cardsArray
    .map((item): GeneratedCard | null => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const question = String((item as { question?: unknown }).question ?? "").trim();
      const answer = String((item as { answer?: unknown }).answer ?? "").trim();
      const notes = String((item as { notes?: unknown }).notes ?? "").trim();
      const tags = normalizeTags((item as { tags?: unknown }).tags);

      if (!question || !answer) {
        return null;
      }

      return { question, answer, notes, tags };
    })
    .filter((item): item is GeneratedCard => item !== null)
    .slice(0, maxCards);
}

function chunkText(rawText: string, chunkSize = 3200, overlap = 240): string[] {
  const normalized = rawText.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return [];
  }

  const chunks: string[] = [];
  let start = 0;

  while (start < normalized.length) {
    const end = Math.min(start + chunkSize, normalized.length);
    let chunk = normalized.slice(start, end);

    if (end < normalized.length) {
      const cutPoints = [chunk.lastIndexOf("."), chunk.lastIndexOf("?"), chunk.lastIndexOf("!")];
      const cutPoint = Math.max(...cutPoints);
      if (cutPoint > chunkSize * 0.55) {
        chunk = chunk.slice(0, cutPoint + 1);
      }
    }

    if (chunk.trim().length > 160) {
      chunks.push(chunk.trim());
    }

    if (end >= normalized.length) {
      break;
    }

    start = Math.max(0, end - overlap);
  }

  return chunks;
}

async function generateCardsFromChunk(chunk: string, maxCards: number, model: string, apiKey: string): Promise<GeneratedCard[]> {
  const prompt = [
    "Voce e um gerador de flashcards para estudo ativo.",
    `Gere no maximo ${maxCards} flashcards em portugues do Brasil com base no trecho enviado.`,
    "Crie perguntas curtas, respostas objetivas e, se fizer sentido, inclua uma nota curta com contexto importante para o verso do card.",
    "Sugira de 1 a 3 tags por card, com termos curtos como definicao, formula, conceito, exemplo, processo, data, passo a passo.",
    "Retorne SOMENTE JSON valido no formato:",
    "{\"cards\":[{\"question\":\"...\",\"answer\":\"...\",\"notes\":\"...\",\"tags\":[\"conceito\",\"definicao\"]}]}",
    "Nao inclua markdown, comentarios ou texto extra.",
    "Trecho base:",
    chunk
  ].join("\n\n");

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.3
        }
      })
    }
  );

  if (!response.ok) {
    return [];
  }

  const data = (await response.json()) as GeminiResponse;
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    return [];
  }

  try {
    return normalizeCards(extractJsonPayload(text), maxCards);
  } catch {
    return [];
  }
}

export async function generateFlashcardsWithGemini(rawText: string, maxCards = 20): Promise<Flashcard[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL ?? "gemini-1.5-flash";

  if (!apiKey) {
    return [];
  }

  const chunks = chunkText(rawText);
  if (chunks.length === 0) {
    return [];
  }

  const collected: GeneratedCard[] = [];
  for (const chunk of chunks) {
    if (collected.length >= maxCards) {
      break;
    }

    const remaining = maxCards - collected.length;
    const chunkCards = await generateCardsFromChunk(chunk, remaining, model, apiKey);
    collected.push(...chunkCards);
  }

  return collected.slice(0, maxCards).map((card) => ({
    id: crypto.randomUUID(),
    question: card.question,
    answer: card.answer,
    notes: card.notes,
    tags: card.tags ?? [],
    repetition: 0,
    interval: 1,
    easeFactor: 2.5,
    dueAt: new Date().toISOString(),
    knowledgeLevel: "normal"
  }));
}
