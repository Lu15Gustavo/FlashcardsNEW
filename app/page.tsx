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
    <main className="page-shell py-7">
      <section className="rounded-2xl border border-brand-100 bg-white/90 p-5 shadow-lg md:p-6">
        <p className="inline-block rounded-full bg-brand-50 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-brand-700">
          HUB principal
        </p>
        <h1 className="mt-3 text-2xl font-black leading-tight text-brand-900 md:text-3xl">Bem-vindo ao seu HUB</h1>
        <p className="mt-1 text-sm text-brand-900/80">
          Acesso rápido para estudar. {userEmail ? `Conta: ${userEmail}.` : ""}
        </p>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Link href="/study" className="rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-bold text-brand-900 transition hover:bg-brand-100">
            Flashcards
          </Link>
          <Link href="/upload" className="rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-bold text-brand-900 transition hover:bg-brand-100">
            Enviar PDF
          </Link>
          <Link href="/decks" className="rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-bold text-brand-900 transition hover:bg-brand-100">
            Decks
          </Link>
          <Link href="/dashboard" className="rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-bold text-brand-900 transition hover:bg-brand-100">
            Dashboard
          </Link>
        </div>
      </section>

      <section className="mt-4 rounded-2xl border border-brand-100 bg-white/90 p-5 shadow-lg md:p-6">
        <h2 className="text-lg font-black text-brand-900">Repetição espaçada</h2>

        <article className="mt-3 rounded-xl border border-brand-200 bg-brand-50 p-3">
          {hasDelayedSpacedReview ? (
            <Link href="/study?reviewMode=due" className="inline-flex rounded-lg bg-brand-700 px-3 py-2 text-xs font-bold text-white transition hover:bg-brand-600">
              Iniciar repetição espaçada
            </Link>
          ) : (
            <button
              type="button"
              disabled
              className="inline-flex cursor-not-allowed rounded-lg bg-brand-300 px-3 py-2 text-xs font-bold text-white/80"
              title="Disponível somente quando houver cards há mais de 1 dia sem revisão"
            >
              Iniciar repetição espaçada
            </button>
          )}
          {!hasDelayedSpacedReview ? (
            <p className="mt-2 text-[11px] font-semibold text-brand-700/85">
              Ainda não há cards com 1 dia inteiro sem revisão.
            </p>
          ) : null}
        </article>
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
