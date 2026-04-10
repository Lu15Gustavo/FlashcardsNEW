import Link from "next/link";
import { getServerSupabase } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  let userEmail: string | null = null;
  const hasSupabaseEnv =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) && Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  if (hasSupabaseEnv) {
    const supabase = getServerSupabase();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    userEmail = user?.email ?? null;
  }

  return (
    <main className="page-shell py-10">
      <section className="card p-8">
        <h1 className="text-3xl font-black text-brand-900">Dashboard</h1>
        <p className="mt-2 text-brand-900/80">
          {userEmail
            ? `Olá, ${userEmail}.`
            : "Configure o Supabase no .env.local para autenticar usuários e liberar sessão."}
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/upload" className="btn btn-primary">
            Enviar PDF
          </Link>
          <Link href="/study" className="btn btn-secondary">
            Estudar flashcards
          </Link>
          <Link href="/progress" className="btn btn-secondary">
            Ver progresso
          </Link>
          <span className="btn btn-secondary">Checkout em breve</span>
        </div>
      </section>
    </main>
  );
}
