import { Flashcard } from "@/types";

type Store = {
  cards: Flashcard[];
};

const globalAny = global as unknown as { __flashcardsStore?: Store };

if (!globalAny.__flashcardsStore) {
  globalAny.__flashcardsStore = { cards: [] };
}

export function saveCards(cards: Flashcard[]) {
  globalAny.__flashcardsStore!.cards = cards;
}

export function readCards(): Flashcard[] {
  return globalAny.__flashcardsStore!.cards;
}

export function updateCardInStore(cardId: string, updatedCard: Flashcard): Flashcard[] {
  const nextCards = globalAny.__flashcardsStore!.cards.map((card) => (card.id === cardId ? updatedCard : card));
  globalAny.__flashcardsStore!.cards = nextCards;
  return nextCards;
}
