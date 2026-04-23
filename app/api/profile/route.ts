import { NextResponse } from "next/server";
import { getRouteSupabase } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

type Body = {
  name?: string;
  email?: string;
};

export async function POST(request: Request) {
  try {
    const hasSupabaseEnv =
      Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) && Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

    if (!hasSupabaseEnv) {
      return NextResponse.json({ message: "Supabase não configurado." }, { status: 400 });
    }

    const supabase = await getRouteSupabase();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ message: "Você precisa estar logado." }, { status: 401 });
    }

    const body = (await request.json()) as Body;
    const name = String(body.name ?? "").trim().slice(0, 120);
    const email = String(body.email ?? user.email ?? "").trim().toLowerCase().slice(0, 320);

    const { error } = await supabase.from("profiles").upsert(
      {
        id: user.id,
        email,
        name,
        plan: "basic"
      },
      { onConflict: "id" }
    );

    if (error) {
      return NextResponse.json({ message: "Erro ao atualizar perfil." }, { status: 500 });
    }

    return NextResponse.json({ message: "Perfil atualizado com sucesso." });
  } catch {
    return NextResponse.json({ message: "Erro ao atualizar perfil." }, { status: 500 });
  }
}
