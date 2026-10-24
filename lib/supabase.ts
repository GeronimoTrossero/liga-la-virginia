import { createClient } from "@supabase/supabase-js";

/** Acepta también la URL del dashboard (supabase.com/dashboard/project/<ref>/...) y la normaliza. */
export function supabaseUrl() {
  const raw = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  const m = raw.match(/dashboard\/project\/([a-z0-9]+)/);
  return m ? `https://${m[1]}.supabase.co` : raw.replace(/\/+$/, "");
}

export function supabasePublic() {
  return createClient(supabaseUrl(), (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim(), { auth: { persistSession: false } });
}

/** Solo en el servidor (API routes). */
export function supabaseAdmin() {
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
  if (!key) throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY");
  return createClient(supabaseUrl(), key, { auth: { persistSession: false } });
}
