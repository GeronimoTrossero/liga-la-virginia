import { createClient } from "@supabase/supabase-js";

/** Acepta también la URL del dashboard (supabase.com/dashboard/project/<ref>/...) y la normaliza. */
export function supabaseUrl() {
  const raw = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "").trim();
  const m = raw.match(/dashboard\/project\/([a-z0-9]+)/);
  return m ? `https://${m[1]}.supabase.co` : raw.replace(/\/+$/, "");
}

export function supabaseAnonKey() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    ""
  ).trim();
}

/** Service role (legacy) o secret key (nuevo formato de Supabase). Nunca exponer al cliente. */
export function supabaseServiceKey() {
  return (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || "").trim();
}

export class SupabaseConfigError extends Error {}

export function supabasePublic() {
  return createClient(supabaseUrl(), supabaseAnonKey(), { auth: { persistSession: false } });
}

/** Solo en el servidor (API routes). */
export function supabaseAdmin() {
  const key = supabaseServiceKey();
  if (!key || !supabaseUrl()) {
    throw new SupabaseConfigError("Falta configurar Supabase (SUPABASE_SERVICE_ROLE_KEY / SUPABASE_SECRET_KEY y NEXT_PUBLIC_SUPABASE_URL)");
  }
  return createClient(supabaseUrl(), key, { auth: { persistSession: false } });
}
