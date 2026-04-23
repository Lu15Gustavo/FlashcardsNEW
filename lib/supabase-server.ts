import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase environment variables");
}

async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl as string, supabaseKey as string, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // setAll pode ser chamado em contextos somente leitura; ignoramos com segurança.
        }
      }
    }
  });
}

export async function getServerSupabase() {
  return createSupabaseServerClient();
}

export async function getRouteSupabase() {
  return createSupabaseServerClient();
}
