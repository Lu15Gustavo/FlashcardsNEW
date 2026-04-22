import { Flashcard } from "@/types";

function daysFromNow(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

function minutesFromNow(minutes: number): string {
  const date = new Date();
  date.setMinutes(date.getMinutes() + minutes);
  return date.toISOString();
}

export function scoreCardReview(card: Flashcard, quality: number): Flashcard {
  const q = Math.max(0, Math.min(5, quality));

  // SM-2 Algorithm: ajusta ease_factor baseado na qualidade
  let easeFactor = card.easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  if (easeFactor < 1.3) {
    easeFactor = 1.3;
  }

  // Mapeia para 4 níveis: Difícil(1), Médio(2), Bom(4), Fácil(5)
  // Qualidade < 3 reseta a sequência (aprendizado falhou)
  const repetition = q < 3 ? 0 : card.repetition + 1;

  let interval = 1;
  if (repetition <= 1) {
    interval = 1;
  } else if (repetition === 2) {
    interval = 6;
  } else {
    interval = Math.round(card.interval * easeFactor);
  }

  // Knowledge level refinado para 4 botões
  let knowledgeLevel: Flashcard["knowledgeLevel"] = "normal";
  if (q <= 2) {
    // Difícil(1) ou Médio(2) = não entendeu bem
    knowledgeLevel = "difficult";
  } else if (q >= 5 && repetition >= 2) {
    // Fácil(5) com repetições = dominado
    knowledgeLevel = "easy";
  } else {
    // Bom(4) = normal
    knowledgeLevel = "normal";
  }

  // Timing da próxima revisão
  // Difícil/Médio: volta em 10 minutos
  // Bom/Fácil: segue algoritmo normal
  const dueAt = q <= 2 ? minutesFromNow(10) : daysFromNow(interval);

  return {
    ...card,
    easeFactor,
    repetition,
    interval,
    dueAt,
    knowledgeLevel
  };
}
