import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

type Body = {
  email?: string;
};

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ message: "Configuração do Supabase ausente." }, { status: 500 });
    }

    const body = (await request.json()) as Body;
    const email = String(body.email ?? "").trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ message: "E-mail inválido." }, { status: 400 });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { data, error } = await adminClient
      .from("profiles")
      .select("id")
      .eq("email", email)
      .limit(1)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ message: "Erro ao verificar conta." }, { status: 500 });
    }

    return NextResponse.json({ exists: Boolean(data?.id) });
  } catch {
    return NextResponse.json({ message: "Erro ao verificar conta." }, { status: 500 });
  }
}
