import Link from "next/link";

const reviewModeOptions = [
  {
    value: "smart",
    title: "Inteligente",
    description: "Prioriza cards vencidos. Se não houver, mostra os demais.",
    accent: "from-brand-700 to-brand-600"
  },
  {
    value: "due",
    title: "Repetição espaçada",
    description: "Mostra apenas cards que já estão no horário de revisão.",
    accent: "from-emerald-600 to-emerald-500"
  },
  {
    value: "all",
    title: "Todos os cards",
    description: "Treino livre com todos os cards do filtro atual.",
    accent: "from-orange-600 to-orange-500"
  }
] as const;

export default function StudyModePage() {
  return (
    <main className="page-shell flex min-h-screen items-center justify-center py-8">
      <section className="w-full max-w-4xl overflow-hidden rounded-3xl border border-brand-300/35 bg-brand-950/45 shadow-[0_24px_60px_rgba(15,10,31,0.32)] backdrop-blur-sm">
        <div className="border-b border-brand-300/25 bg-gradient-to-r from-brand-700 to-brand-600 px-8 py-7 text-white">
          <p className="text-xs font-black uppercase tracking-[0.28em] text-white/80">Ajuste de revisão</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">Escolha o modo de estudo</h1>
          <p className="mt-2 max-w-2xl text-sm text-white/80">
            Defina como os cards serão carregados e volte para a tela de flashcards com a configuração certa.
          </p>
        </div>

        <div className="grid gap-4 px-8 py-8 md:grid-cols-3">
          {reviewModeOptions.map((option) => (
            <article
              key={option.value}
              className="rounded-3xl border border-brand-300/35 bg-brand-950/35 p-5 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition-transform duration-200 hover:-translate-y-1"
            >
              <div className={`inline-flex rounded-full bg-gradient-to-r ${option.accent} px-3 py-1 text-xs font-black uppercase tracking-wide text-white shadow-md`}>
                {option.value}
              </div>
              <h2 className="mt-4 text-xl font-black text-white">{option.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-white/75">{option.description}</p>

              <Link
                href={`/study?reviewMode=${option.value}`}
                className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-white px-4 py-3 text-sm font-black text-brand-950 transition hover:bg-brand-100"
              >
                Abrir flashcards neste modo
              </Link>
            </article>
          ))}
        </div>

        <div className="border-t border-brand-300/20 px-8 py-6 text-center">
          <Link
            href="/study"
            className="inline-flex items-center justify-center rounded-2xl border border-brand-300/45 bg-brand-900/50 px-5 py-3 text-sm font-bold text-brand-100 transition hover:border-brand-200 hover:bg-brand-900/65"
          >
            Voltar para os flashcards
          </Link>
        </div>
      </section>
    </main>
  );
}
