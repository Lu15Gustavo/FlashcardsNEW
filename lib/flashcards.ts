import { Flashcard } from "@/types";

export function buildFlashcardsFromText(rawText: string): Flashcard[] {
  // Split em frases completas e significativas
  const sentences = rawText
    .replace(/\s+/g, " ")
    .trim()
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 40 && s.length < 300) // Frases com tamanho reasonable
    .slice(0, 25);

  if (sentences.length === 0) {
    return [];
  }

  return sentences.map((sentence, index) => {
    const words = sentence.split(" ");
    
    // Extrai termos-chave da frase (primeiras palavras importantes)
    const subject = words.slice(0, Math.min(3, words.length)).join(" ");
    
    // Cria pergunta inteligente baseada no contexto
    let question = `Qual é a informação principal sobre ${subject}?`;
    
    // Heurísticas para perguntas melhores
    if (sentence.toLowerCase().includes(" é ") || sentence.toLowerCase().includes(" são ")) {
      const parts = sentence.split(/\s(é|são|sao)\s/i);
      if (parts.length >= 2) {
        question = `O que ${parts[0].trim()} ${parts[1]}?`;
      }
    } else if (sentence.toLowerCase().includes(" causa ")) {
      question = `O que causa ${subject}?`;
    } else if (sentence.toLowerCase().includes(" para ") || sentence.toLowerCase().includes(" em ")) {
      question = `Para que serve ou qual é o propósito de ${subject}?`;
    }

    // Resposta é a frase completa (melhor do que nada)
    const answer = sentence;

    // Seleciona uma tag baseada no índice
    const tagOptions = ["conceito", "definição", "processo", "exemplo", "informação"];
    const tag = tagOptions[index % tagOptions.length] ?? "conceito";

    return {
      id: crypto.randomUUID(),
      question,
      answer,
      notes: "Gerado automaticamente (modo fallback). A resposta contém o contexto completo.",
      tags: [tag],
      repetition: 0,
      interval: 1,
      easeFactor: 2.5,
      dueAt: new Date().toISOString(),
      knowledgeLevel: "normal"
    };
  });
}
