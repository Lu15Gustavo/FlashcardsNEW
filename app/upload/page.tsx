"use client";

import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Deck } from "@/types";
import { MAX_PDF_SIZE_BYTES, formatFileSizeMB } from "@/lib/upload-limits";

type GenerationMode = "standard" | "easy" | "medium" | "hard";

const generationOptions: Array<{
  value: GenerationMode;
  title: string;
  description: string;
}> = [
  { value: "standard", title: "Padrão", description: "5 Básicos + 5 Regulares + 5 Complexos" },
  { value: "easy", title: "Básico", description: "Conceitos diretos para base teórica" },
  { value: "medium", title: "Regular", description: "Exercita entendimento em cenários práticos" },
  { value: "hard", title: "Complexo", description: "Exige raciocínio crítico e maior profundidade" }
];

export default function UploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [status, setStatus] = useState("");
  const [statusType, setStatusType] = useState<"info" | "success" | "error">("info");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationMode, setGenerationMode] = useState<GenerationMode>("standard");
  const [fileName, setFileName] = useState("Nenhum arquivo escolhido");
  const [decks, setDecks] = useState<Deck[]>([]);
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
  const [loadingDecks, setLoadingDecks] = useState(true);
  const [errorDecks, setErrorDecks] = useState("");
  const selectedDeck = selectedDeckId ? decks.find((deck) => deck.id === selectedDeckId) ?? null : null;
  const maxPdfSizeLabel = formatFileSizeMB(MAX_PDF_SIZE_BYTES);

  useEffect(() => {
    if (!isSubmitting) {
      return;
    }

    setGenerationProgress(8);

    const timer = window.setInterval(() => {
      setGenerationProgress((current) => {
        if (current >= 94) {
          return 94;
        }

        const nextStep = current < 30 ? 6 : current < 60 ? 4 : current < 85 ? 2 : 1;
        return Math.min(current + nextStep, 94);
      });
    }, 280);

    return () => window.clearInterval(timer);
  }, [isSubmitting]);

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
          } else {
            setSelectedDeckId(null);
          }
        } else {
          setErrorDecks("Não foi possível carregar seus Decks.");
        }
      } catch {
        setErrorDecks("Erro ao carregar Decks.");
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
      setStatusType("error");
      return;
    }

    if (input.files[0].size > MAX_PDF_SIZE_BYTES) {
      setStatus(`O PDF excede o tamanho máximo permitido de ${maxPdfSizeLabel}.`);
      setStatusType("error");
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
    setStatusType("info");
    setGenerationProgress(8);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData
      });

      const data = (await response.json()) as { message: string };
      setStatus(data.message);
      setStatusType(response.ok ? "success" : "error");
      setGenerationProgress(response.ok ? 100 : 0);

      if (response.ok) {
        router.push("/study");
      }
    } catch {
      setStatus("Erro ao enviar PDF. Tente novamente.");
      setStatusType("error");
      setGenerationProgress(0);
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

                  if (selectedFile && selectedFile.size > MAX_PDF_SIZE_BYTES) {
                    setFileName("Nenhum arquivo escolhido");
                    setStatus(`O PDF excede o tamanho máximo permitido de ${maxPdfSizeLabel}.`);
                    setStatusType("error");
                    event.currentTarget.value = "";
                    return;
                  }

                  setFileName(selectedFile ? selectedFile.name : "Nenhum arquivo escolhido");
                }}
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isSubmitting}
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
              <p className="mt-2 text-xs text-brand-700/85">
                Dica: tamanho máximo {maxPdfSizeLabel}. PDFs com pouco texto ou só imagens podem não ter conteúdo suficiente para gerar bons flashcards.
              </p>
            </div>

            <div>
              <div className="mb-3 flex items-center justify-between">
                <span className="block text-sm font-bold text-brand-700">Deck (opcional)</span>
                <a
                  href="/decks"
                  className="text-xs font-bold text-brand-600 hover:text-brand-700 underline"
                >
                  Gerenciar Decks
                </a>
              </div>

              {loadingDecks ? (
                <p className="text-xs text-brand-600">Carregando Decks...</p>
              ) : errorDecks ? (
                <p className="text-xs text-rose-600">{errorDecks}</p>
              ) : decks.length === 0 ? (
                <div className="rounded-2xl border border-brand-200 bg-brand-50/50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm text-brand-700">Você ainda não criou nenhum Deck.</p>
                    <a
                      href="/decks"
                      className="inline-flex items-center rounded-xl bg-gradient-to-r from-brand-600 to-brand-700 px-4 py-2 text-sm font-black text-white shadow-lg shadow-brand-950/25 transition-all duration-200 hover:-translate-y-0.5 hover:from-brand-500 hover:to-brand-600"
                    >
                      Criar um agora
                    </a>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => setSelectedDeckId(null)}
                    disabled={isSubmitting}
                    className={`group relative flex w-full items-center justify-between overflow-hidden rounded-3xl border p-4 text-left transition-all duration-200 ${
                      selectedDeckId === null
                        ? "border-emerald-300/50 bg-gradient-to-br from-brand-700/85 via-brand-900/80 to-emerald-950/60 shadow-[0_0_0_1px_rgba(16,185,129,0.20),0_18px_40px_rgba(15,23,42,0.42)] ring-2 ring-emerald-300/30"
                        : "border-brand-300 bg-brand-950/40 hover:-translate-y-0.5 hover:border-brand-500 hover:bg-brand-950/55 hover:shadow-lg"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`flex h-10 w-10 items-center justify-center rounded-2xl border text-sm font-black ${
                          selectedDeckId === null
                            ? "border-emerald-300/70 bg-emerald-400/20 text-emerald-100"
                            : "border-brand-400/60 bg-brand-600/10 text-brand-100"
                        }`}
                      >
                        {selectedDeckId === null ? "✓" : "∅"}
                      </span>
                      <div>
                        <p className={`text-sm font-black ${selectedDeckId === null ? "text-brand-50" : "text-white"}`}>
                          Sem Deck
                        </p>
                        <p className={`text-xs ${selectedDeckId === null ? "text-brand-100/90" : "text-white/65"}`}>
                          Enviar o PDF sem associar a nenhum Deck.
                        </p>
                      </div>
                    </div>
                    {selectedDeckId === null ? (
                      <span className="rounded-full bg-emerald-400/20 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-100 ring-1 ring-emerald-300/35">
                        Selecionado
                      </span>
                    ) : null}
                  </button>

                  <div className="grid gap-3">
                    {decks.map((deck) => {
                      const isSelected = selectedDeckId === deck.id;

                      return (
                        <button
                          key={deck.id}
                          type="button"
                          onClick={() => setSelectedDeckId(deck.id)}
                          disabled={isSubmitting}
                          className={`group relative flex w-full items-center justify-between overflow-hidden rounded-3xl border p-4 text-left transition-all duration-200 ${
                            isSelected
                              ? "border-emerald-300/50 bg-gradient-to-br from-brand-700/85 via-brand-900/80 to-emerald-950/60 shadow-[0_0_0_1px_rgba(16,185,129,0.20),0_18px_40px_rgba(15,23,42,0.42)] ring-2 ring-emerald-300/30"
                              : "border-brand-300 bg-brand-950/40 hover:-translate-y-0.5 hover:border-brand-500 hover:bg-brand-950/55 hover:shadow-lg"
                          }`}
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <span
                              className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl border text-sm font-black ${
                                isSelected
                                  ? "border-emerald-300/70 bg-emerald-400/20 text-emerald-100"
                                  : "border-brand-400/60 bg-brand-600/10 text-brand-100"
                              }`}
                              style={!isSelected ? { backgroundColor: `${deck.color}22` } : undefined}
                            >
                              {isSelected ? "✓" : "●"}
                            </span>
                            <div className="min-w-0">
                              <p className={`truncate text-sm font-black ${isSelected ? "text-brand-50" : "text-white"}`}>
                                {deck.name}
                              </p>
                              <p className={`truncate text-xs ${isSelected ? "text-brand-100/90" : "text-white/65"}`}>
                                {deck.description || "Deck pronto para receber o PDF."}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <span
                              className="h-3 w-14 rounded-full shadow-sm"
                              style={{ backgroundColor: deck.color }}
                            />
                            {isSelected ? (
                              <span className="rounded-full bg-emerald-400/20 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-100 ring-1 ring-emerald-300/35">
                                Selecionado
                              </span>
                            ) : null}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {selectedDeck ? (
                    <div className="rounded-2xl border border-brand-200/40 bg-brand-900/35 px-4 py-3 text-sm text-white shadow-sm">
                      <span className="font-black text-brand-100">Deck selecionado:</span>{" "}
                      <span className="font-bold text-white">{selectedDeck.name}</span>
                    </div>
                  ) : null}
                </div>
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

            {isSubmitting ? (
              <div className="rounded-2xl border border-brand-300 bg-brand-950/35 p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-white">Gerando flashcards</p>
                    <p className="text-xs text-white/70">Estamos lendo o PDF e montando os cards. Aguarde só um instante.</p>
                  </div>
                  <span className="rounded-full bg-brand-600/20 px-3 py-1 text-xs font-bold text-brand-100">
                    {generationProgress}%
                  </span>
                </div>

                <div className="h-3 w-full overflow-hidden rounded-full bg-brand-950/70 ring-1 ring-brand-300/20">
                    <div className="relative h-full w-full overflow-hidden rounded-full">
                      <div
                        className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-emerald-400 via-brand-500 to-cyan-300 transition-[width] duration-700 ease-out"
                        style={{ width: `${generationProgress}%` }}
                        role="progressbar"
                        aria-valuenow={generationProgress}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label="Progresso de geração dos flashcards"
                      />

                      {isSubmitting ? (
                        <div className="pointer-events-none absolute inset-y-0 left-0 w-1/3 animate-upload-shimmer rounded-full bg-gradient-to-r from-transparent via-white/35 to-transparent" />
                      ) : null}
                    </div>
                </div>

                <div className="mt-3 flex items-center gap-2 text-xs text-white/65">
                    <span className="inline-flex h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-400" />
                    <span>Processando PDF e montando os flashcards...</span>
                </div>
              </div>
            ) : null}
          </form>

          {status ? (
            <p
              className={`mt-4 text-sm font-bold ${
                statusType === "error"
                  ? "text-rose-600"
                  : statusType === "success"
                    ? "text-emerald-700"
                    : "text-brand-700"
              }`}
            >
              {status}
            </p>
          ) : null}
        </div>
      </section>
    </main>
  );
}
