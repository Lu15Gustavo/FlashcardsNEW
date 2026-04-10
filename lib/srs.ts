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

  let easeFactor = card.easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  if (easeFactor < 1.3) {
    easeFactor = 1.3;
  }

  const repetition = q < 3 ? 0 : card.repetition + 1;

  let interval = 1;
  if (repetition <= 1) {
    interval = 1;
  } else if (repetition === 2) {
    interval = 6;
  } else {
    interval = Math.round(card.interval * easeFactor);
  }

  let knowledgeLevel: Flashcard["knowledgeLevel"] = "normal";
  if (q <= 2) {
    knowledgeLevel = "difficult";
  } else if (q >= 5 && repetition >= 2) {
    knowledgeLevel = "easy";
  }

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
