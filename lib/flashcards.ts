import { Flashcard } from "@/types";

export function buildFlashcardsFromText(rawText: string): Flashcard[] {
  const lines = rawText
    .replace(/\s+/g, " ")
    .split(/[.!?]\s+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 60)
    .slice(0, 25);

  return lines.map((line, index) => {
    const snippet = line.slice(0, 130);
    const fallbackTags = index % 4 === 0 ? ["conceito"] : index % 4 === 1 ? ["definicao"] : index % 4 === 2 ? ["exemplo"] : ["processo"];
    return {
      id: crypto.randomUUID(),
      question: `Explique a ideia principal: ${snippet}...`,
      answer: line,
      notes: "Gerado automaticamente a partir do texto do PDF.",
      tags: fallbackTags,
      repetition: 0,
      interval: 1,
      easeFactor: 2.5,
      dueAt: new Date().toISOString(),
      knowledgeLevel: "normal"
    };
  });
}
