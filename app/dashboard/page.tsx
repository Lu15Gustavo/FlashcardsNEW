import { getServerSupabase } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

type DashboardRange = "day" | "week" | "month";

type DashboardSearchParams = {
  range?: string;
  documentId?: string;
};

type FlashcardRow = {
  id: string;
  document_id: string | null;
  knowledge_level: string | null;
  documents?: { filename?: unknown } | Array<{ filename?: unknown }> | null;
};

type ReviewRow = {
  id: string;
  quality: number | null;
  response_time_ms: number | null;
  reviewed_at: string | null;
  flashcards?: {
    document_id?: string | null;
    documents?: { filename?: unknown } | Array<{ filename?: unknown }> | null;
  } | null;
};

type DocumentSummary = {
  id: string;
  name: string;
  totalCards: number;
  reviewsInRange: number;
  correctReviews: number;
  wrongReviews: number;
  averageResponseTime: number;
};

function normalizeDocumentId(documentId?: string | null) {
  const trimmed = documentId?.trim();
  return trimmed ? trimmed : "all";
}

function getRangeConfig(range: DashboardRange) {
  if (range === "day") {
    return { label: "Diário", days: 1 };
  }

  if (range === "week") {
    return { label: "Semanal", days: 7 };
  }

  return { label: "Mensal", days: 30 };
}

function parseRange(value?: string): DashboardRange {
  if (value === "day" || value === "week" || value === "month") {
    return value;
  }

  return "month";
}

function getDocumentNameFromRelation(documentRelation: FlashcardRow["documents"] | ReviewRow["flashcards"] extends infer R ? R : never) {
  if (Array.isArray(documentRelation)) {
    return String(documentRelation[0]?.filename ?? "Sem PDF");
  }

  if (typeof documentRelation === "object" && documentRelation && "filename" in documentRelation) {
    return String((documentRelation as { filename?: unknown }).filename ?? "Sem PDF");
  }

  return "Sem PDF";
}

function buildDashboardUrl(range: DashboardRange, documentId: string) {
  const params = new URLSearchParams();
  params.set("range", range);
  if (documentId !== "all") {
    params.set("documentId", documentId);
  }
  return `/dashboard${params.toString() ? `?${params.toString()}` : ""}`;
}

function formatMinutes(milliseconds: number) {
  if (milliseconds < 1000) {
    return `${Math.max(milliseconds, 0)} ms`;
  }

  if (milliseconds < 60000) {
    return `${(milliseconds / 1000).toFixed(1).replace(".", ",")} s`;
  }

  const minutes = Math.floor(milliseconds / 60000);
  const seconds = Math.round((milliseconds % 60000) / 1000);
  return `${minutes} min${seconds > 0 ? ` ${seconds}s` : ""}`;
}

function buildPieStyle(entries: Array<{ value: number; color: string }>) {
  const total = entries.reduce((sum, entry) => sum + entry.value, 0);

  if (total <= 0) {
    return "conic-gradient(#4c1d95 0 100%)";
  }

  let currentAngle = 0;
  const slices = entries.map((entry) => {
    const sliceSize = (entry.value / total) * 100;
    const start = currentAngle;
    const end = currentAngle + sliceSize;
    currentAngle = end;
    return `${entry.color} ${start}% ${end}%`;
  });

  return `conic-gradient(${slices.join(", ")})`;
}

export default async function DashboardPage({ searchParams }: { searchParams?: DashboardSearchParams }) {
  const hasSupabaseEnv =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) && Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const selectedRange = parseRange(searchParams?.range);
  const selectedDocumentId = normalizeDocumentId(searchParams?.documentId);

  if (!hasSupabaseEnv) {
    return (
      <main className="page-shell py-10">
        <section className="card p-8">
          <h1 className="text-3xl font-black text-brand-900">Dashboard</h1>
          <p className="mt-3 text-brand-900/80">Configure o Supabase no .env.local para visualizar métricas e gráficos.</p>
        </section>
      </main>
    );
  }

  const supabase = await getServerSupabase();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="page-shell py-10">
        <section className="card p-8">
          <h1 className="text-3xl font-black text-brand-900">Dashboard</h1>
          <p className="mt-3 text-brand-900/80">Faça login para visualizar seus gráficos e estatísticas de estudo.</p>
        </section>
      </main>
    );
  }

  const [{ data: flashcardsData }, { data: reviewsData }] = await Promise.all([
    supabase
      .from("flashcards")
      .select("id, document_id, knowledge_level, documents(filename)")
      .eq("user_id", user.id),
    supabase
      .from("flashcard_reviews")
      .select("id, quality, response_time_ms, reviewed_at, flashcards(document_id, documents(filename))")
      .eq("user_id", user.id)
      .order("reviewed_at", { ascending: false })
  ]);

  const allFlashcards = (flashcardsData ?? []) as FlashcardRow[];
  const allReviews = (reviewsData ?? []) as ReviewRow[];
  const rangeConfig = getRangeConfig(selectedRange);
  const rangeStart = new Date();
  rangeStart.setDate(rangeStart.getDate() - (rangeConfig.days - 1));
  rangeStart.setHours(0, 0, 0, 0);

  const selectedFlashcards =
    selectedDocumentId === "all"
      ? allFlashcards
      : allFlashcards.filter((card) => normalizeDocumentId(card.document_id) === selectedDocumentId);

  const selectedReviewsInRange = allReviews.filter((review) => {
    const reviewedAt = review.reviewed_at ? new Date(review.reviewed_at) : null;
    if (!reviewedAt || Number.isNaN(reviewedAt.getTime())) {
      return false;
    }

    if (reviewedAt < rangeStart) {
      return false;
    }

    if (selectedDocumentId === "all") {
      return true;
    }

    const reviewDocumentId = normalizeDocumentId(review.flashcards?.document_id);
    return reviewDocumentId === selectedDocumentId;
  });

  const safeTotalFlashcards = selectedFlashcards.length;
  const safeTotalReviews = selectedReviewsInRange.length;
  const safeCorrectCount = selectedReviewsInRange.filter((review) => Number(review.quality ?? 0) >= 4).length;
  const safeWrongCount = selectedReviewsInRange.filter((review) => Number(review.quality ?? 0) <= 2).length;
  const safeDifficultCards = selectedFlashcards.filter((card) => card.knowledge_level === "difficult").length;
  const safeEasyCards = selectedFlashcards.filter((card) => card.knowledge_level === "easy").length;
  const mediumCards = Math.max(safeTotalFlashcards - safeEasyCards - safeDifficultCards, 0);

  const accuracy = safeTotalReviews > 0 ? Math.round((safeCorrectCount / safeTotalReviews) * 100) : 0;
  const averageResponseTime =
    selectedReviewsInRange.length > 0
      ? Math.round(
          selectedReviewsInRange.reduce((sum, review) => sum + Number(review.response_time_ms ?? 0), 0) /
            selectedReviewsInRange.length
        )
      : 0;

  const levelChartData = [
    { label: "Fáceis", value: safeEasyCards, color: "#22c55e" },
    { label: "Médios", value: mediumCards, color: "#f59e0b" },
    { label: "Difíceis", value: safeDifficultCards, color: "#ef4444" }
  ];

  const reviewPieData = [
    { label: "Acertos", value: safeCorrectCount, color: "#8b5cf6" },
    { label: "Erros", value: safeWrongCount, color: "#fb7185" }
  ];

  const documentSummariesMap = new Map<string, DocumentSummary>();

  for (const card of allFlashcards) {
    const documentId = normalizeDocumentId(card.document_id);
    const current = documentSummariesMap.get(documentId);
    const documentName = getDocumentNameFromRelation(card.documents);

    if (current) {
      current.totalCards += 1;
      continue;
    }

    documentSummariesMap.set(documentId, {
      id: documentId,
      name: documentName,
      totalCards: 1,
      reviewsInRange: 0,
      correctReviews: 0,
      wrongReviews: 0,
      averageResponseTime: 0
    });
  }

  for (const review of selectedReviewsInRange) {
    const documentId = normalizeDocumentId(review.flashcards?.document_id);
    const summary = documentSummariesMap.get(documentId);
    if (!summary) {
      continue;
    }

    summary.reviewsInRange += 1;
    if (Number(review.quality ?? 0) >= 4) {
      summary.correctReviews += 1;
    }
    if (Number(review.quality ?? 0) <= 2) {
      summary.wrongReviews += 1;
    }
    summary.averageResponseTime += Number(review.response_time_ms ?? 0);
  }

  const documentSummaries = Array.from(documentSummariesMap.values())
    .map((summary) => ({
      ...summary,
      averageResponseTime: summary.reviewsInRange > 0 ? Math.round(summary.averageResponseTime / summary.reviewsInRange) : 0
    }))
    .sort((a, b) => b.totalCards - a.totalCards || a.name.localeCompare(b.name, "pt-BR"));

  const activeDocumentName =
    selectedDocumentId === "all"
      ? "Todos os PDFs"
      : documentSummaries.find((summary) => summary.id === selectedDocumentId)?.name ?? "PDF selecionado";

  const levelMax = Math.max(...levelChartData.map((item) => item.value), 1);
  const pieStyle = buildPieStyle(reviewPieData);

  return (
    <main className="page-shell py-10">
      <section className="card p-8">
        <h1 className="text-3xl font-black text-brand-900">Dashboard</h1>
        <p className="mt-2 text-brand-900/80">Visão geral de desempenho, tempo médio e distribuição dos estudos.</p>

        <form className="mt-6 grid gap-4 rounded-3xl border border-brand-100 bg-brand-50/70 p-4 md:grid-cols-[1fr_1fr_auto]" method="get">
          <label className="grid gap-2 text-sm font-bold text-brand-800">
            Período
            <select
              name="range"
              defaultValue={selectedRange}
              className="rounded-2xl border border-brand-200 bg-white px-4 py-3 text-brand-900 shadow-sm outline-none transition focus:border-brand-500"
            >
              <option value="day">Diário</option>
              <option value="week">Semanal</option>
              <option value="month">Mensal</option>
            </select>
          </label>

          <label className="grid gap-2 text-sm font-bold text-brand-800">
            Arquivo
            <select
              name="documentId"
              defaultValue={selectedDocumentId}
              className="rounded-2xl border border-brand-200 bg-white px-4 py-3 text-brand-900 shadow-sm outline-none transition focus:border-brand-500"
            >
              <option value="all">Todos os PDFs</option>
              {documentSummaries.map((document) => (
                <option key={document.id} value={document.id}>
                  {document.name}
                </option>
              ))}
            </select>
          </label>

          <button
            type="submit"
            className="self-end rounded-2xl bg-gradient-to-r from-brand-600 to-brand-700 px-6 py-3 font-black text-white shadow-lg transition hover:from-brand-500 hover:to-brand-600"
          >
            Aplicar filtro
          </button>
        </form>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-brand-200 bg-brand-50 px-4 py-2 text-sm font-bold text-brand-800">
            {rangeConfig.label}
          </span>
          <span className="rounded-full border border-brand-200 bg-brand-50 px-4 py-2 text-sm font-bold text-brand-800">
            {activeDocumentName}
          </span>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <article className="rounded-2xl bg-brand-50 p-4">
            <p className="text-sm font-bold text-brand-700">Flashcards no filtro</p>
            <p className="mt-2 text-3xl font-black text-brand-900">{safeTotalFlashcards}</p>
          </article>
          <article className="rounded-2xl bg-brand-50 p-4">
            <p className="text-sm font-bold text-brand-700">Acertos no período</p>
            <p className="mt-2 text-3xl font-black text-brand-900">{safeCorrectCount}</p>
          </article>
          <article className="rounded-2xl bg-brand-50 p-4">
            <p className="text-sm font-bold text-brand-700">Erros no período</p>
            <p className="mt-2 text-3xl font-black text-brand-900">{safeWrongCount}</p>
          </article>
          <article className="rounded-2xl border border-brand-100 p-4">
            <p className="text-sm font-bold text-brand-700">Tempo médio</p>
            <p className="mt-2 text-3xl font-black text-brand-900">{formatMinutes(averageResponseTime)}</p>
          </article>
          <article className="rounded-2xl border border-brand-100 p-4">
            <p className="text-sm font-bold text-brand-700">Revisões no período</p>
            <p className="mt-2 text-3xl font-black text-brand-900">{safeTotalReviews}</p>
          </article>
        </div>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <article className="card p-8">
          <h2 className="text-2xl font-black text-brand-900">Gráfico de colunas</h2>
          <p className="mt-1 text-sm text-brand-900/70">Distribuição dos flashcards por nível de dificuldade.</p>

          <div className="mt-6 relative grid h-72 grid-cols-3 gap-4 overflow-hidden rounded-3xl border border-brand-300/20 bg-[radial-gradient(circle_at_top,_rgba(168,85,247,0.18),_transparent_42%),linear-gradient(180deg,_rgba(28,14,49,0.96),_rgba(20,9,35,0.98))] px-5 pb-5 pt-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_20px_60px_rgba(8,4,20,0.35)]">
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,transparent_0,transparent_calc(25%-1px),rgba(168,85,247,0.12)_calc(25%-1px),rgba(168,85,247,0.12)_25%,transparent_25%,transparent_calc(50%-1px),rgba(168,85,247,0.12)_calc(50%-1px),rgba(168,85,247,0.12)_50%,transparent_50%,transparent_calc(75%-1px),rgba(168,85,247,0.12)_calc(75%-1px),rgba(168,85,247,0.12)_75%,transparent_75%)] bg-[length:100%_100%] opacity-45" />
            {levelChartData.map((item) => {
              const height = Math.max((item.value / levelMax) * 100, item.value > 0 ? 12 : 4);

              return (
                <div key={item.label} className="relative z-10 flex h-full flex-col items-center justify-end gap-3">
                  <div className="flex h-full w-full items-end justify-center pb-1">
                    <div
                      className="w-full max-w-24 rounded-t-3xl border border-white/10 shadow-[0_16px_36px_rgba(0,0,0,0.28)]"
                      style={{
                        height: `${height}%`,
                        minHeight: item.value > 0 ? 28 : 12,
                        background: `linear-gradient(180deg, ${item.color} 0%, rgba(255,255,255,0.12) 100%)`
                      }}
                    />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-white">{item.label}</p>
                    <p className="text-xs text-white/70">{item.value} cards</p>
                  </div>
                </div>
              );
            })}
          </div>
        </article>

        <article className="card p-8">
          <h2 className="text-2xl font-black text-brand-900">Gráfico de pizza</h2>
          <p className="mt-1 text-sm text-brand-900/70">Proporção entre acertos e erros nas revisões.</p>

          <div className="mt-6 flex flex-col items-center gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative flex h-60 w-60 items-center justify-center rounded-full" style={{ background: pieStyle }}>
              <div className="flex h-32 w-32 flex-col items-center justify-center rounded-full border border-white/60 bg-brand-950 text-center text-white shadow-2xl">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-white/70">Taxa</span>
                <span className="mt-2 text-3xl font-black">{accuracy}%</span>
              </div>
            </div>

            <div className="space-y-3">
              {reviewPieData.map((item) => {
                const total = safeCorrectCount + safeWrongCount;
                const share = total > 0 ? Math.round((item.value / total) * 100) : 0;

                return (
                  <div key={item.label} className="flex items-center gap-3 rounded-2xl border border-brand-100 px-4 py-3">
                    <span className="h-4 w-4 rounded-full" style={{ backgroundColor: item.color }} />
                    <div>
                      <p className="font-bold text-brand-900">{item.label}</p>
                      <p className="text-sm text-brand-900/70">{item.value} revisões • {share}%</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </article>
      </section>

      <section className="mt-8 card p-8">
        <h2 className="text-2xl font-black text-brand-900">Relatório por arquivo</h2>
        <p className="mt-1 text-sm text-brand-900/70">Clique em um PDF para filtrar o relatório por arquivo.</p>

        <div className="mt-5 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {documentSummaries.length === 0 ? (
            <p className="text-brand-900/80">Nenhum arquivo encontrado ainda.</p>
          ) : (
            documentSummaries.map((document) => {
              const isActive = document.id === selectedDocumentId;
              const totalPeriodReviews = document.reviewsInRange;
              const accuracyByDocument = totalPeriodReviews > 0 ? Math.round((document.correctReviews / totalPeriodReviews) * 100) : 0;

              return (
                <a
                  key={document.id}
                  href={buildDashboardUrl(selectedRange, document.id)}
                  className={`rounded-2xl border p-4 transition hover:-translate-y-0.5 ${
                    isActive ? "border-brand-500 bg-brand-50 shadow-lg" : "border-brand-100 bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-black text-brand-900">{document.name}</p>
                      <p className="mt-1 text-sm text-brand-900/70">{document.totalCards} flashcards</p>
                    </div>
                    <span className="rounded-full bg-brand-700 px-3 py-1 text-xs font-bold text-white">
                      {isActive ? "Ativo" : "Abrir"}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-xl bg-brand-50 p-3">
                      <p className="text-brand-700 font-bold">Revisões</p>
                      <p className="mt-1 text-xl font-black text-brand-900">{totalPeriodReviews}</p>
                    </div>
                    <div className="rounded-xl bg-brand-50 p-3">
                      <p className="text-brand-700 font-bold">Aproveitamento</p>
                      <p className="mt-1 text-xl font-black text-brand-900">{accuracyByDocument}%</p>
                    </div>
                  </div>
                </a>
              );
            })
          )}
        </div>
      </section>
    </main>
  );
}
