import Link from "next/link";
import { getServerSupabase } from "@/lib/supabase-server";

const plans = [
  {
    name: "Básico",
    price: "R$ 29/mês",
    features: ["Até 5 PDFs por mês", "Revisão limitada", "Progresso básico"]
  },
  {
    name: "Premium",
    price: "R$ 79/mês",
    features: ["PDFs ilimitados", "SRS completo", "Relatórios avançados"]
  }
];

export default function HomePage() {
  const hasSupabaseEnv =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) && Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  if (hasSupabaseEnv) {
    return <HomeWithSessionRedirect />;
  }

  return <HomeContent />;
}

async function HomeWithSessionRedirect() {
  try {
    const supabase = await getServerSupabase();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (user) {
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count: delayedReviewCount } = await supabase
        .from("flashcards")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .not("due_at", "is", null)
        .lte("due_at", cutoff);

      return <HomeHub userEmail={user.email ?? ""} hasDelayedSpacedReview={Number(delayedReviewCount ?? 0) > 0} />;
    }
  } catch {
    // Se o Supabase falhar, mantemos a home pública em vez de quebrar com 5xx.
  }

  return <HomeContent />;
}

function HomeHub({ userEmail, hasDelayedSpacedReview }: { userEmail: string; hasDelayedSpacedReview: boolean }) {

  return (
    <main className="page-shell py-8">
      <section className="relative overflow-hidden rounded-3xl border border-brand-100/60 bg-gradient-to-br from-white/95 via-white/80 to-white/70 p-6 shadow-[0_18px_50px_rgba(15,10,31,0.2)] md:p-8">
        <div className="pointer-events-none absolute -right-16 top-8 h-40 w-40 rounded-full bg-gradient-to-br from-brand-200/50 via-cyan-200/40 to-transparent blur-2xl" />
        <div className="pointer-events-none absolute -left-10 bottom-0 h-32 w-32 rounded-full bg-gradient-to-br from-emerald-200/40 via-brand-200/30 to-transparent blur-2xl" />

        <p className="inline-flex items-center gap-2 rounded-full border border-brand-200/70 bg-white/80 px-3 py-1 text-[10px] font-black uppercase tracking-[0.25em] text-brand-700">
          HUB
          <span className="h-1 w-1 rounded-full bg-brand-500" />
          Estudo
        </p>
        <h1 className="mt-3 text-2xl font-black text-brand-900 md:text-3xl">Bem-vindo ao seu HUB</h1>
        <p className="mt-1 text-xs font-semibold text-brand-900/70">
          {userEmail ? `Conta: ${userEmail}.` : "Acesso rapido para estudar."}
        </p>

        <div className="mt-5 grid w-full max-w-xl grid-cols-2 gap-3">
          <Link href="/study" className="group rounded-2xl border border-brand-200/80 bg-white/90 px-4 py-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:bg-white">
            <p className="text-[11px] font-black uppercase tracking-wide text-brand-500">Flashcards</p>
            <p className="mt-1 text-sm font-black text-brand-900">Estudar</p>
            <span className="mt-2 inline-flex text-[11px] font-semibold text-brand-700/75 group-hover:text-brand-900">Comece uma sessao de revisao.</span>
          </Link>
          <Link href="/upload" className="group rounded-2xl border border-brand-200/80 bg-white/90 px-4 py-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:bg-white">
            <p className="text-[11px] font-black uppercase tracking-wide text-brand-500">Upload</p>
            <p className="mt-1 text-sm font-black text-brand-900">Enviar PDF</p>
            <span className="mt-2 inline-flex text-[11px] font-semibold text-brand-700/75 group-hover:text-brand-900">Gere flashcards a partir do PDF.</span>
          </Link>
          <Link href="/decks" className="group rounded-2xl border border-brand-200/80 bg-white/90 px-4 py-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:bg-white">
            <p className="text-[11px] font-black uppercase tracking-wide text-brand-500">Decks</p>
            <p className="mt-1 text-sm font-black text-brand-900">Organizar</p>
            <span className="mt-2 inline-flex text-[11px] font-semibold text-brand-700/75 group-hover:text-brand-900">Agrupe e gerencie seus decks.</span>
          </Link>
          <Link href="/dashboard" className="group rounded-2xl border border-brand-200/80 bg-white/90 px-4 py-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:bg-white">
            <p className="text-[11px] font-black uppercase tracking-wide text-brand-500">Dashboard</p>
            <p className="mt-1 text-sm font-black text-brand-900">Visao geral</p>
            <span className="mt-2 inline-flex text-[11px] font-semibold text-brand-700/75 group-hover:text-brand-900">Resumo das suas atividades.</span>
          </Link>
        </div>
      </section>

      <section className="mt-4 rounded-2xl border border-brand-100/70 bg-white/90 px-4 py-3 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-wide text-brand-600">Repeticao espacada</p>
            {!hasDelayedSpacedReview ? (
              <p className="mt-1 text-[10px] font-semibold text-brand-700/75">Sem cards vencidos ha 1 dia.</p>
            ) : null}
          </div>
          {hasDelayedSpacedReview ? (
            <Link
              href="/study?reviewMode=due"
              className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-200/70 px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-amber-900 shadow-sm"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              Disponivel
            </Link>
          ) : (
            <button
              type="button"
              disabled
              className="inline-flex cursor-not-allowed rounded-full bg-brand-300 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-white/80"
              title="Disponivel somente quando houver cards ha mais de 1 dia sem revisao"
            >
              Indisponivel
            </button>
          )}
        </div>
      </section>
    </main>
  );
}

function HomeContent() {
  return (
    <main className="page-shell py-14">
      <section className="grid gap-8 rounded-3xl border border-brand-100 bg-white/90 p-8 shadow-xl md:grid-cols-2 md:p-12">
        <div className="space-y-5">
          <p className="inline-block rounded-full bg-brand-50 px-4 py-1 text-sm font-bold text-brand-700">
            Aprendizado inteligente com IA
          </p>
          <h1 className="text-4xl font-black leading-tight text-brand-900 md:text-5xl">
            Transforme PDFs em flashcards e estude com repetição espaçada.
          </h1>
          <p className="text-lg text-brand-900/80">
            Faça upload do conteúdo, gere cartões automaticamente e revise no momento certo para memorizar de verdade.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/auth" className="btn btn-primary">
              Começar agora
            </Link>
            <span className="btn btn-secondary">Checkout em breve</span>
          </div>
        </div>

        <div className="card p-6">
          <h2 className="text-xl font-black text-brand-800">Fluxo rápido</h2>
          <ol className="mt-4 space-y-3 text-brand-900/90">
            <li>1. Crie sua conta e confirme por e-mail.</li>
            <li>2. Faça upload do PDF na área logada.</li>
            <li>3. Gere os flashcards automaticamente.</li>
            <li>4. Estude com repetição espaçada e acompanhe seu progresso.</li>
          </ol>
        </div>
      </section>

      <section className="mt-12 grid gap-5 md:grid-cols-2">
        {plans.map((plan) => (
          <article key={plan.name} className="card p-7">
            <h3 className="text-2xl font-black text-brand-800">{plan.name}</h3>
            <p className="mt-1 text-3xl font-black text-brand-700">{plan.price}</p>
            <ul className="mt-4 space-y-2 text-brand-900/85">
              {plan.features.map((feature) => (
                <li key={feature}>• {feature}</li>
              ))}
            </ul>
            <span className="btn btn-secondary mt-6 inline-block">Disponível em breve</span>
          </article>
        ))}
      </section>
    </main>
  );
}
