import { getServerSupabase } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

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

export default async function DashboardPage() {
  const hasSupabaseEnv =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) && Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

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

  const [
    { count: totalFlashcards },
    { count: difficultCards },
    { count: easyCards },
    { count: totalReviews },
    { count: correctCount },
    { count: wrongCount },
    { data: responseTimesData }
  ] = await Promise.all([
    supabase.from("flashcards").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("flashcards").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("knowledge_level", "difficult"),
    supabase.from("flashcards").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("knowledge_level", "easy"),
    supabase
      .from("flashcard_reviews")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("flashcard_reviews")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("quality", 4),
    supabase
      .from("flashcard_reviews")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .lte("quality", 2),
    supabase
      .from("flashcard_reviews")
      .select("response_time_ms")
      .eq("user_id", user.id)
  ]);

  const safeTotalReviews = totalReviews ?? 0;
  const safeCorrectCount = correctCount ?? 0;
  const safeWrongCount = wrongCount ?? 0;
  const safeTotalFlashcards = totalFlashcards ?? 0;
  const safeDifficultCards = difficultCards ?? 0;
  const safeEasyCards = easyCards ?? 0;
  const mediumCards = Math.max(safeTotalFlashcards - safeEasyCards - safeDifficultCards, 0);

  const accuracy = safeTotalReviews > 0 ? Math.round((safeCorrectCount / safeTotalReviews) * 100) : 0;
  const averageResponseTime =
    responseTimesData && responseTimesData.length > 0
      ? Math.round(
          responseTimesData.reduce((sum, review) => sum + Number(review.response_time_ms ?? 0), 0) / responseTimesData.length
        )
      : 0;
  const averageResponseMinutes = averageResponseTime / 60000;

  const levelChartData = [
    { label: "Fáceis", value: safeEasyCards, color: "#22c55e" },
    { label: "Médios", value: mediumCards, color: "#f59e0b" },
    { label: "Difíceis", value: safeDifficultCards, color: "#ef4444" }
  ];

  const reviewPieData = [
    { label: "Acertos", value: safeCorrectCount, color: "#8b5cf6" },
    { label: "Erros", value: safeWrongCount, color: "#fb7185" }
  ];

  const levelMax = Math.max(...levelChartData.map((item) => item.value), 1);
  const pieStyle = buildPieStyle(reviewPieData);

  return (
    <main className="page-shell py-10">
      <section className="card p-8">
        <h1 className="text-3xl font-black text-brand-900">Dashboard</h1>
        <p className="mt-2 text-brand-900/80">Visão geral de desempenho, tempo médio e distribuição dos estudos.</p>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <article className="rounded-2xl bg-brand-50 p-4">
            <p className="text-sm font-bold text-brand-700">Flashcards</p>
            <p className="mt-2 text-3xl font-black text-brand-900">{safeTotalFlashcards}</p>
          </article>
          <article className="rounded-2xl bg-brand-50 p-4">
            <p className="text-sm font-bold text-brand-700">Acertos</p>
            <p className="mt-2 text-3xl font-black text-brand-900">{safeCorrectCount}</p>
          </article>
          <article className="rounded-2xl bg-brand-50 p-4">
            <p className="text-sm font-bold text-brand-700">Erros</p>
            <p className="mt-2 text-3xl font-black text-brand-900">{safeWrongCount}</p>
          </article>
          <article className="rounded-2xl border border-brand-100 p-4">
            <p className="text-sm font-bold text-brand-700">Tempo médio</p>
            <p className="mt-2 text-3xl font-black text-brand-900">{formatMinutes(averageResponseTime)}</p>
          </article>
          <article className="rounded-2xl border border-brand-100 p-4">
            <p className="text-sm font-bold text-brand-700">Revisões totais</p>
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
    </main>
  );
}
