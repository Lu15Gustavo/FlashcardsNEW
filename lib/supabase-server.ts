import { cookies } from "next/headers";
import { createRouteHandlerClient, createServerComponentClient } from "@supabase/auth-helpers-nextjs";

export function getServerSupabase() {
  return createServerComponentClient({ cookies });
}

export function getRouteSupabase() {
  return createRouteHandlerClient({ cookies });
}
