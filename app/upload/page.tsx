"use client";

import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Deck } from "@/types";

type GenerationMode = "standard" | "easy" | "medium" | "hard";

const generationOptions: Array<{
  value: GenerationMode;
  title: string;
  description: string;
}> = [
  { value: "standard", title: "Padrão", description: "5 fáceis + 5 médias + 5 difíceis" },
  { value: "easy", title: "Fáceis", description: "Cards mais diretos e simples" },
  { value: "medium", title: "Médios", description: "Cards equilibrados" },
  { value: "hard", title: "Difíceis", description: "Cards mais profundos e analíticos" }
];

export default function UploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [status, setStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generationMode, setGenerationMode] = useState<GenerationMode>("standard");
  const [fileName, setFileName] = useState("Nenhum arquivo escolhido");
  const [decks, setDecks] = useState<Deck[]>([]);
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
  const [loadingDecks, setLoadingDecks] = useState(true);
  const [errorDecks, setErrorDecks] = useState("");

  useEffect(() => {
    const loadDecks = async () => {
      try {
        const queryDeckId = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("deckId")?.trim() : null;
        const response = await fetch("/api/decks", { cache: "no-store" });
        const data = (await response.json()) as { decks?: Deck[]; message?: string };

        if (response.ok && Array.isArray(data.decks)) {
          const nextDecks = data.decks;
          setDecks(nextDecks);

          const preferredDeckExists = queryDeckId ? nextDecks.some((deck) => deck.id === queryDeckId) : false;

          if (preferredDeckExists) {
            setSelectedDeckId(queryDeckId ?? null);
          } else if (nextDecks.length > 0) {
            setSelectedDeckId(nextDecks[0].id);
          }
        } else {
          setErrorDecks("Não foi possível carregar seus baralhos.");
        }
      } catch {
        setErrorDecks("Erro ao carregar baralhos.");
      } finally {
        setLoadingDecks(false);
      }
    };

    void loadDecks();
  }, []);

  const handleUpload = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const input = form.elements.namedItem("pdf") as HTMLInputElement;

    if (!input.files?.[0]) {
      setStatus("Selecione um arquivo PDF.");
      return;
    }

    const formData = new FormData();
    formData.append("pdf", input.files[0]);
    formData.append("mode", generationMode);
    if (selectedDeckId) {
      formData.append("deckId", selectedDeckId);
    }

    setIsSubmitting(true);
    setStatus("Processando PDF...");

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData
      });

      const data = (await response.json()) as { message: string };
      setStatus(data.message);

      if (response.ok) {
        router.push("/study");
      }
    } catch {
      setStatus("Erro ao enviar PDF. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="page-shell py-8">
      <section className="card mx-auto max-w-3xl overflow-hidden p-0 shadow-2xl">
        <div className="border-b border-brand-100 bg-gradient-to-r from-brand-700 to-brand-600 px-8 py-6 text-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black tracking-tight">Enviar PDF</h1>
              <p className="mt-2 text-sm text-white/80">Escolha o modo de geração e suba seu arquivo para criar flashcards.</p>
            </div>
            <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold text-white shadow-sm">
              Padrão selecionado
            </span>
          </div>
        </div>

        <div className="px-8 py-8">
          <form className="space-y-6" onSubmit={handleUpload}>
            <div>
              <span className="mb-3 block text-sm font-bold text-brand-700">Arquivo PDF</span>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                name="pdf"
                className="sr-only"
                onChange={(event) => {
                  const selectedFile = event.target.files?.[0];
                  setFileName(selectedFile ? selectedFile.name : "Nenhum arquivo escolhido");
                }}
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={`flex w-full items-center justify-between gap-4 rounded-3xl border px-5 py-4 text-left shadow-sm transition-all hover:border-brand-500 hover:bg-brand-950/50 ${
                  fileName !== "Nenhum arquivo escolhido"
                    ? "border-brand-500 bg-brand-900/55"
                    : "border-brand-300 bg-brand-950/35"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-600 text-xl font-black text-white shadow-md">
                    {fileName !== "Nenhum arquivo escolhido" ? "✓" : "+"}
                  </span>
                  <div>
                    <p className="text-sm font-black text-white">
                      {fileName !== "Nenhum arquivo escolhido" ? "Arquivo escolhido" : "Escolher arquivo"}
                    </p>
                    <p className={`text-xs ${fileName !== "Nenhum arquivo escolhido" ? "text-emerald-200" : "text-white/70"}`}>
                      {fileName}
                    </p>
                  </div>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-bold shadow-sm ${
                  fileName !== "Nenhum arquivo escolhido"
                    ? "bg-emerald-500/20 text-emerald-100 ring-1 ring-emerald-400/30"
                    : "bg-brand-600/20 text-white ring-1 ring-brand-400/30"
                }`}>
                  {fileName !== "Nenhum arquivo escolhido" ? "Selecionado" : "Arquivo"}
                </span>
              </button>
            </div>

            <div>
              <div className="mb-3 flex items-center justify-between">
                <span className="block text-sm font-bold text-brand-700">Baralho (opcional)</span>
                <a
                  href="/decks"
                  className="text-xs font-bold text-brand-600 hover:text-brand-700 underline"
                >
                  Gerenciar baralhos
                </a>
              </div>

              {loadingDecks ? (
                <p className="text-xs text-brand-600">Carregando baralhos...</p>
              ) : errorDecks ? (
                <p className="text-xs text-rose-600">{errorDecks}</p>
              ) : decks.length === 0 ? (
                <div className="rounded-2xl border border-brand-200 bg-brand-50/50 p-4">
                  <p className="text-sm text-brand-700">
                    Você ainda não criou nenhum baralho.{" "}
                    <a href="/decks" className="font-bold underline hover:text-brand-900">
                      Criar um agora
                    </a>
                  </p>
                </div>
              ) : (
                <select
                  value={selectedDeckId || ""}
                  onChange={(e) => setSelectedDeckId(e.target.value || null)}
                  className="w-full rounded-2xl border border-brand-300 bg-brand-950/35 px-4 py-3 text-white focus:border-brand-500 focus:outline-none"
                  disabled={isSubmitting}
                >
                  <option value="">-- Sem baralho --</option>
                  {decks.map((deck) => (
                    <option key={deck.id} value={deck.id}>
                      {deck.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <span className="mb-3 block text-sm font-bold text-brand-700">Como gerar os flashcards</span>
              <div className="grid gap-3 sm:grid-cols-2">
                {generationOptions.map((option) => {
                  const isActive = generationMode === option.value;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setGenerationMode(option.value)}
                      className={`rounded-3xl border p-4 text-left transition-all duration-150 ${
                        isActive
                          ? "border-brand-500 bg-brand-600 text-white shadow-lg ring-2 ring-brand-300"
                          : "border-brand-300 bg-brand-950/35 text-white/85 shadow-sm hover:-translate-y-0.5 hover:border-brand-500 hover:bg-brand-950/50"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <strong className="text-base font-black">{option.title}</strong>
                        {isActive ? <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold text-white">Selecionado</span> : null}
                      </div>
                      <p className={`mt-2 text-sm ${isActive ? "text-white/85" : "text-white/65"}`}>{option.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              className="w-full rounded-2xl bg-gradient-to-r from-brand-600 to-brand-700 px-6 py-4 text-base font-bold text-white shadow-lg transition-all duration-150 hover:from-brand-500 hover:to-brand-600 hover:shadow-xl disabled:opacity-60"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Gerando flashcards..." : "Gerar flashcards"}
            </button>
          </form>

          {status && <p className="mt-4 text-sm font-bold text-brand-700">{status}</p>}
        </div>
      </section>
    </main>
  );
}
