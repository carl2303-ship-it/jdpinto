import { createClient } from "@supabase/supabase-js";

/** Cliente com service role — apenas no servidor. Nunca expor ao browser. */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY em falta. Adiciona-a em .env.local (Project Settings → API → service_role).",
    );
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
