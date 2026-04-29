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
      return <HomeHub userEmail={user.email ?? ""} />;
    }
  } catch {
    // Se o Supabase falhar, mantemos a home pública em vez de quebrar com 5xx.
  }

  return <HomeContent />;
}

function HomeHub({ userEmail }: { userEmail: string }) {
  const modeOptions = [
    {
      href: "/study?reviewMode=smart",
      title: "Modo inteligente",
      description: "Prioriza cards vencidos e mantém o ritmo ideal de revisão."
    },
    {
      href: "/study?reviewMode=due",
      title: "Repetição espaçada",
      description: "Mostra só os cards no horário certo para revisar."
    },
    {
      href: "/study?reviewMode=all",
      title: "Todos os cards",
      description: "Treino livre para revisar todo o conteúdo do filtro."
    }
  ] as const;

  return (
    <main className="page-shell py-10">
      <section className="rounded-3xl border border-brand-100 bg-white/90 p-8 shadow-xl md:p-10">
        <p className="inline-block rounded-full bg-brand-50 px-4 py-1 text-xs font-black uppercase tracking-wide text-brand-700">
          HUB principal
        </p>
        <h1 className="mt-4 text-4xl font-black leading-tight text-brand-900 md:text-5xl">Central de estudo e flashcards</h1>
        <p className="mt-3 max-w-3xl text-brand-900/80">
          Acesse tudo por aqui: envio de PDF, organização de decks, seleção de modo de revisão e início dos flashcards.
          {userEmail ? ` Conta conectada: ${userEmail}.` : ""}
        </p>

        <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Link href="/study" className="rounded-2xl border border-brand-200 bg-brand-50 px-5 py-4 text-brand-900 transition hover:bg-brand-100">
            <p className="text-sm font-black uppercase tracking-wide text-brand-700">Flashcards</p>
            <p className="mt-1 text-lg font-black">Abrir estudo agora</p>
          </Link>
          <Link href="/upload" className="rounded-2xl border border-brand-200 bg-brand-50 px-5 py-4 text-brand-900 transition hover:bg-brand-100">
            <p className="text-sm font-black uppercase tracking-wide text-brand-700">Upload</p>
            <p className="mt-1 text-lg font-black">Enviar PDF</p>
          </Link>
          <Link href="/decks" className="rounded-2xl border border-brand-200 bg-brand-50 px-5 py-4 text-brand-900 transition hover:bg-brand-100">
            <p className="text-sm font-black uppercase tracking-wide text-brand-700">Organização</p>
            <p className="mt-1 text-lg font-black">Gerenciar decks</p>
          </Link>
          <Link href="/progress" className="rounded-2xl border border-brand-200 bg-brand-50 px-5 py-4 text-brand-900 transition hover:bg-brand-100">
            <p className="text-sm font-black uppercase tracking-wide text-brand-700">Desempenho</p>
            <p className="mt-1 text-lg font-black">Ver progresso</p>
          </Link>
          <Link href="/dashboard" className="rounded-2xl border border-brand-200 bg-brand-50 px-5 py-4 text-brand-900 transition hover:bg-brand-100">
            <p className="text-sm font-black uppercase tracking-wide text-brand-700">Visão geral</p>
            <p className="mt-1 text-lg font-black">Abrir dashboard</p>
          </Link>
          <Link href="/profile" className="rounded-2xl border border-brand-200 bg-brand-50 px-5 py-4 text-brand-900 transition hover:bg-brand-100">
            <p className="text-sm font-black uppercase tracking-wide text-brand-700">Conta</p>
            <p className="mt-1 text-lg font-black">Editar perfil</p>
          </Link>
        </div>
      </section>

      <section className="mt-8 rounded-3xl border border-brand-100 bg-white/90 p-8 shadow-xl md:p-10">
        <h2 className="text-2xl font-black text-brand-900">Modo de estudo</h2>
        <p className="mt-2 text-brand-900/80">Escolha seu modo de revisão e já inicie a sessão de flashcards.</p>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {modeOptions.map((mode) => (
            <article key={mode.href} className="rounded-2xl border border-brand-200 bg-brand-50 p-5">
              <h3 className="text-lg font-black text-brand-900">{mode.title}</h3>
              <p className="mt-2 text-sm text-brand-900/80">{mode.description}</p>
              <Link href={mode.href} className="mt-5 inline-flex rounded-xl bg-brand-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-brand-600">
                Iniciar nesse modo
              </Link>
            </article>
          ))}
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
