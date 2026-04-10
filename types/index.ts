export type Flashcard = {
  id: string;
  documentId?: string;
  documentName?: string;
  question: string;
  answer: string;
  notes?: string;
  tags: string[];
  repetition: number;
  interval: number;
  easeFactor: number;
  dueAt: string;
  knowledgeLevel: "difficult" | "normal" | "easy";
};
