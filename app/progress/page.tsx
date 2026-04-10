import { getServerSupabase } from "@/lib/supabase-server";

function formatDate(dateString: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(dateString));
}

function qualityLabel(quality: number) {
  if (quality <= 2) return "Difícil";
  if (quality === 3) return "Médio";
  if (quality === 4) return "Bom";
  return "Fácil";
}

function shortLabel(text: string, maxLength = 18) {
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

export default async function ProgressPage() {
  const hasSupabaseEnv = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) && Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  if (!hasSupabaseEnv) {
    return (
      <main className="page-shell py-10">
        <section className="card p-8">
          <h1 className="text-3xl font-black text-brand-900">Progresso</h1>
          <p className="mt-3 text-brand-900/80">Configure o Supabase no .env.local para liberar histórico e métricas persistentes.</p>
        </section>
      </main>
    );
  }

  const supabase = getServerSupabase();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="page-shell py-10">
        <section className="card p-8">
          <h1 className="text-3xl font-black text-brand-900">Progresso</h1>
          <p className="mt-3 text-brand-900/80">Faça login para visualizar seu histórico de revisões e progresso de estudo.</p>
        </section>
      </main>
    );
  }

  const [{ count: totalFlashcards }, { count: totalReviews }, { count: difficultFlashcards }, { count: easyFlashcards }] = await Promise.all([
    supabase.from("flashcards").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("flashcard_reviews").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("flashcards").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("knowledge_level", "difficult"),
    supabase.from("flashcards").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("knowledge_level", "easy")
  ]);

  const { data: flashcardsData } = await supabase
    .from("flashcards")
    .select("id, question, tags, knowledge_level, documents(filename)")
    .eq("user_id", user.id);

  const { data: recentReviews } = await supabase
    .from("flashcard_reviews")
    .select("id, flashcard_id, quality, response_time_ms, previous_knowledge_level, next_knowledge_level, reviewed_at, flashcards(question)")
    .eq("user_id", user.id)
    .order("reviewed_at", { ascending: false })
    .limit(8);

  const correctReviews = (recentReviews ?? []).filter((review) => Number(review.quality) >= 4).length;
  const accuracy = totalReviews ? Math.round((correctReviews / totalReviews) * 100) : 0;
  const averageResponseTime = recentReviews && recentReviews.length > 0
    ? Math.round(recentReviews.reduce((sum, review) => sum + Number(review.response_time_ms ?? 0), 0) / recentReviews.length)
    : 0;

  const reviewsByDay = new Map<string, number>();
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    const key = date.toISOString().slice(0, 10);
    reviewsByDay.set(key, 0);
    return key;
  });

  for (const review of recentReviews ?? []) {
    const key = String(review.reviewed_at).slice(0, 10);
    if (reviewsByDay.has(key)) {
      reviewsByDay.set(key, (reviewsByDay.get(key) ?? 0) + 1);
    }
  }

  const pdfCounts = new Map<string, number>();
  const tagCounts = new Map<string, number>();

  for (const card of flashcardsData ?? []) {
    const documentRelation = card.documents;
    const pdfName = Array.isArray(documentRelation)
      ? String(documentRelation[0]?.filename ?? "Sem PDF")
      : typeof documentRelation === "object" && documentRelation && "filename" in documentRelation
        ? String((documentRelation as { filename?: unknown }).filename ?? "Sem PDF")
        : "Sem PDF";

    pdfCounts.set(pdfName, (pdfCounts.get(pdfName) ?? 0) + 1);

    const tags = Array.isArray(card.tags) ? card.tags.map((tag) => String(tag).trim()).filter(Boolean) : [];
    for (const tag of tags) {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }
  }

  const topPdfs = [...pdfCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const topTags = [...tagCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  const maxDailyReviews = Math.max(...[...reviewsByDay.values()], 1);

  return (
    <main className="page-shell py-10">
      <section className="card p-8">
        <h1 className="text-3xl font-black text-brand-900">Progresso</h1>
        <p className="mt-2 text-brand-900/80">Resumo do seu estudo, revisões recentes, gráficos simples e indicadores por PDF e tag.</p>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <article className="rounded-2xl bg-brand-50 p-4">
            <p className="text-sm font-bold text-brand-700">Flashcards</p>
            <p className="mt-2 text-3xl font-black text-brand-900">{totalFlashcards ?? 0}</p>
          </article>
          <article className="rounded-2xl bg-brand-50 p-4">
            <p className="text-sm font-bold text-brand-700">Revisões</p>
            <p className="mt-2 text-3xl font-black text-brand-900">{totalReviews ?? 0}</p>
          </article>
          <article className="rounded-2xl bg-brand-50 p-4">
            <p className="text-sm font-bold text-brand-700">Dificeis</p>
            <p className="mt-2 text-3xl font-black text-brand-900">{difficultFlashcards ?? 0}</p>
          </article>
          <article className="rounded-2xl bg-brand-50 p-4">
            <p className="text-sm font-bold text-brand-700">Dominados</p>
            <p className="mt-2 text-3xl font-black text-brand-900">{easyFlashcards ?? 0}</p>
          </article>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-brand-100 p-4">
            <p className="text-sm font-bold text-brand-700">Taxa de acerto</p>
            <p className="mt-2 text-4xl font-black text-brand-900">{accuracy}%</p>
            <p className="mt-1 text-sm text-brand-900/70">Baseado nas revisões registradas no histórico.</p>
          </div>

          <div className="rounded-2xl border border-brand-100 p-4">
            <p className="text-sm font-bold text-brand-700">Tempo medio de resposta</p>
            <p className="mt-2 text-4xl font-black text-brand-900">{averageResponseTime}ms</p>
            <p className="mt-1 text-sm text-brand-900/70">Baseado nas revisões mais recentes.</p>
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <article className="card p-8">
          <h2 className="text-2xl font-black text-brand-900">Revisões recentes</h2>
          <div className="mt-5 space-y-3">
            {(recentReviews ?? []).length === 0 ? (
              <p className="text-brand-900/80">Nenhuma revisão registrada ainda.</p>
            ) : (
              recentReviews?.map((review) => (
                <article key={review.id} className="rounded-2xl border border-brand-100 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="font-black text-brand-900">{(review.flashcards as { question?: string } | null)?.question ?? "Flashcard"}</h3>
                    <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-700">{qualityLabel(Number(review.quality))}</span>
                  </div>
                  <p className="mt-2 text-sm text-brand-900/80">{String(review.previous_knowledge_level)} → {String(review.next_knowledge_level)}</p>
                  <p className="mt-1 text-xs text-brand-900/60">{formatDate(String(review.reviewed_at))} • {Number(review.response_time_ms ?? 0)}ms</p>
                </article>
              ))
            )}
          </div>
        </article>

        <article className="card p-8">
          <h2 className="text-2xl font-black text-brand-900">Resumo por dia</h2>
          <div className="mt-5 space-y-3">
            {days.map((dayKey) => {
              const count = reviewsByDay.get(dayKey) ?? 0;
              const width = Math.max((count / maxDailyReviews) * 100, count > 0 ? 12 : 4);
              return (
                <div key={dayKey}>
                  <div className="mb-1 flex items-center justify-between text-sm text-brand-900/80">
                    <span>{formatDate(`${dayKey}T12:00:00.000Z`)}</span>
                    <span>{count}</span>
                  </div>
                  <div className="h-3 rounded-full bg-brand-100">
                    <div className="h-3 rounded-full bg-brand-600" style={{ width: `${width}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </article>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <article className="card p-8">
          <h2 className="text-2xl font-black text-brand-900">Indicadores por PDF</h2>
          <div className="mt-5 space-y-3">
            {topPdfs.length === 0 ? (
              <p className="text-brand-900/80">Nenhum PDF encontrado ainda.</p>
            ) : (
              topPdfs.map(([name, count]) => (
                <div key={name} className="rounded-2xl border border-brand-100 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-bold text-brand-900">{shortLabel(name)}</span>
                    <span className="text-sm font-bold text-brand-700">{count} cards</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </article>

        <article className="card p-8">
          <h2 className="text-2xl font-black text-brand-900">Indicadores por tema</h2>
          <div className="mt-5 flex flex-wrap gap-2">
            {topTags.length === 0 ? (
              <p className="text-brand-900/80">Nenhuma tag encontrada ainda.</p>
            ) : (
              topTags.map(([tag, count]) => (
                <span key={tag} className="rounded-full bg-brand-50 px-4 py-2 text-sm font-bold text-brand-700">
                  {tag} • {count}
                </span>
              ))
            )}
          </div>
        </article>
      </section>
    </main>
  );
}
