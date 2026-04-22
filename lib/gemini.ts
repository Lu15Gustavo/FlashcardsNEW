import { Flashcard } from "@/types";

type GeminiCandidate = {
  content?: {
    parts?: Array<{ text?: string }>;
  };
};

type GeminiResponse = {
  candidates?: GeminiCandidate[];
};

type GeminiGenerationResult = {
  cards: GeneratedCard[];
  stopAiFallback: boolean;
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

function extractTopLevelObjectStrings(raw: string): string[] {
  const startIndex = raw.indexOf("[");
  const source = startIndex >= 0 ? raw.slice(startIndex) : raw;

  const objects: string[] = [];
  let depth = 0;
  let inString = false;
  let escaped = false;
  let objectStart = -1;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === "\\") {
        escaped = true;
        continue;
      }
      if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === "{") {
      if (depth === 0) {
        objectStart = index;
      }
      depth += 1;
      continue;
    }

    if (char === "}") {
      if (depth > 0) {
        depth -= 1;
        if (depth === 0 && objectStart >= 0) {
          objects.push(source.slice(objectStart, index + 1));
          objectStart = -1;
        }
      }
    }
  }

  return objects;
}

function recoverCardsFromBrokenJson(raw: string, maxCards: number): GeneratedCard[] {
  const objectStrings = extractTopLevelObjectStrings(raw);
  if (objectStrings.length === 0) {
    return [];
  }

  const recoveredObjects: unknown[] = [];
  for (const objectString of objectStrings) {
    try {
      recoveredObjects.push(JSON.parse(objectString));
    } catch {
      // Ignore malformed fragments and keep only valid objects.
    }
  }

  if (recoveredObjects.length === 0) {
    return [];
  }

  return normalizeCards(recoveredObjects, maxCards);
}

function normalizeTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) {
    return [];
  }

  return [...new Set(tags.map((tag) => String(tag).trim().toLowerCase()).filter(Boolean))].slice(0, 5);
}

function normalizeCards(payload: unknown, maxCards: number): GeneratedCard[] {
  let cardsArray: unknown[] = [];

  if (Array.isArray(payload)) {
    // Direct array: [{question, answer, ...}]
    cardsArray = payload;
  } else if (payload && typeof payload === "object") {
    // Object with cards property: {cards: [{...}]}
    const obj = payload as Record<string, unknown>;
    if (Array.isArray(obj.cards)) {
      cardsArray = obj.cards;
    }
  }

  if (!Array.isArray(cardsArray) || cardsArray.length === 0) {
    return [];
  }

  return cardsArray
    .map((item): GeneratedCard | null => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const obj = item as Record<string, unknown>;
      const question = String(obj.question ?? "").trim();
      const answer = String(obj.answer ?? "").trim();
      const notes = String(obj.notes ?? "").trim();
      const tags = normalizeTags(obj.tags);

      if (!question || !answer) {
        return null;
      }

      return { question, answer, notes: notes || undefined, tags };
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

async function generateCardsFromChunk(
  chunk: string,
  maxCards: number,
  model: string,
  apiKey: string,
  difficultyPrompt = "Crie flashcards bem equilibrados para estudo."
): Promise<GeminiGenerationResult> {
  const prompt = `Você é um professor experiente criando perguntas para alunos revisarem para prova.

Objetivo:
- Transformar o trecho em flashcards de alta qualidade.
- Gerar EXATAMENTE ${maxCards} cards em português do Brasil.
- Cada card deve ter pergunta clara e resposta objetiva.

Direção pedagógica:
- ${difficultyPrompt}

Regras pedagógicas:
- A pergunta deve ser natural e específica, sem frases genéricas como "o que o texto destaca".
- A resposta deve ter no máximo 2 frases curtas.
- Se o trecho trouxer listas longas, quebre em perguntas menores e diretas.
- Prefira perguntas que avaliem entendimento (causa, função, diferença, definição).
- Não copie o trecho inteiro na resposta.

Formato obrigatório de saída:
- Retorne SOMENTE JSON válido.
- Sem markdown, sem explicações extras.
- Aceito: array direto ou objeto com chave cards.

Exemplo de formato:
[{"question":"Qual é a função do HTTP/2?","answer":"Melhorar desempenho com multiplexação e compressão de cabeçalhos","notes":"Foco em eficiência","tags":["conceito","rede"]}]

Trecho base:
"${chunk}"`;

  try {
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.2,
          maxOutputTokens: 4000,
          topP: 0.9,
          topK: 30
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Gemini] API Error no modelo ${model} (${response.status}): ${errorText.substring(0, 240)}`);
      return { cards: [], stopAiFallback: response.status === 404 || response.status === 429 || response.status === 503 };
    }

    const data = (await response.json()) as GeminiResponse;
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      console.error("[Gemini] Resposta vazia da API");
      return { cards: [], stopAiFallback: false };
    }

    try {
      const payload = extractJsonPayload(text);
      const cards = normalizeCards(payload, maxCards);
      console.log(`[Gemini] ✅ ${cards.length}/${maxCards} cards gerados com sucesso`);
      return { cards, stopAiFallback: false };
    } catch (parseError) {
      console.error("[Gemini] Erro ao parsear JSON:", (parseError as Error).message);
      const recoveredCards = recoverCardsFromBrokenJson(text, maxCards);
      if (recoveredCards.length > 0) {
        console.warn(`[Gemini] JSON parcial recuperado: ${recoveredCards.length}/${maxCards} cards aproveitados`);
        return { cards: recoveredCards, stopAiFallback: false };
      }
      console.log("[Gemini] Raw (primeiros 500 chars):", text.substring(0, 500));
      return { cards: [], stopAiFallback: false };
    }
  } catch (error) {
    console.error("[Gemini] Erro geral:", error);
    return { cards: [], stopAiFallback: false };
  }
}

export async function generateFlashcardsWithGemini(
  rawText: string,
  maxCards = 20,
  difficultyPrompt?: string
): Promise<Flashcard[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  const preferredModel = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

  if (!apiKey) {
    return [];
  }

  const chunks = chunkText(rawText);
  if (chunks.length === 0) {
    return [];
  }

  const modelCandidates = [preferredModel];

  const collected: GeneratedCard[] = [];
  for (const chunk of chunks) {
    if (collected.length >= maxCards) {
      break;
    }

    const remaining = maxCards - collected.length;
    let chunkCards: GeneratedCard[] = [];
    let stopAiFallback = false;

    for (const model of modelCandidates) {
      const result = await generateCardsFromChunk(chunk, remaining, model, apiKey, difficultyPrompt);
      chunkCards = result.cards;
      stopAiFallback = result.stopAiFallback;
      if (chunkCards.length > 0) {
        break;
      }

      if (stopAiFallback) {
        break;
      }
    }

    collected.push(...chunkCards);

    if (stopAiFallback) {
      break;
    }
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
