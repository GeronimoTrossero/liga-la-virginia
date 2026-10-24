"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { agenteGondola } from "@/lib/automation";
import { buscarUsuario, getSession, iniciarSesion, pinOk, puedeVerVendedor, MODO_PRESENTADOR } from "@/lib/auth";
import { COOKIE, homeDe } from "@/lib/session";
import { supabaseAdmin, SupabaseConfigError } from "@/lib/supabase";
import { MES_ACTUAL } from "@/lib/config";
import { MISIONES_EQUIPO } from "@/lib/game";

// ---------- Sesión ----------
export async function login(_: unknown, form: FormData): Promise<{ error?: string }> {
  const id = String(form.get("usuario") ?? "").trim();
  const pin = String(form.get("pin") ?? "").trim();
  let u: Awaited<ReturnType<typeof buscarUsuario>> = null;
  try {
    u = id ? await buscarUsuario(id) : null;
  } catch (e) {
    if (e instanceof SupabaseConfigError) {
      console.error("[login]", e.message);
      return { error: "El servidor no tiene configurada la base de datos. Revisá las variables de entorno de Supabase." };
    }
    throw e;
  }
  if (!u || !pinOk(pin, u.pin_hash)) return { error: "Usuario o PIN incorrecto" };
  await iniciarSesion(u);
  const next = String(form.get("next") ?? "");
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : homeDe(u));
}

export async function logout() {
  (await cookies()).delete(COOKIE);
  redirect("/");
}

/** Modo presentador: cambia de rol sin desloguear (solo con sesión activa y si no está apagado por env). */
export async function cambiarRol(usuarioId: string) {
  const s = await getSession();
  if (!s || !MODO_PRESENTADOR) throw new Error("No autorizado");
  const u = await buscarUsuario(usuarioId);
  if (!u) throw new Error("Usuario inexistente");
  await iniciarSesion(u);
  redirect(homeDe(u));
}

async function vendedorAutorizado(vendedorId: string) {
  const s = await getSession();
  if (!s) throw new Error("Sin sesión");
  const { data: v } = await supabaseAdmin().from("vendedor").select("id,supervisor").eq("id", vendedorId).single<{ id: string; supervisor: string }>();
  if (!v || !puedeVerVendedor(s, v)) throw new Error("No autorizado");
  return s;
}

export async function subirFotoGondola(vendedorId: string) {
  await vendedorAutorizado(vendedorId);
  return agenteGondola(vendedorId);
}

// ---------- Gerente de equipo (rol SUPERVISOR) ----------
export async function reconocer(vendedorId: string, mensaje: string) {
  const s = await vendedorAutorizado(vendedorId);
  if (s.rol === "VENDEDOR") throw new Error("Solo gerentes");
  const { error } = await supabaseAdmin().from("reconocimiento").insert({ de: s.nombre, para: vendedorId, mensaje: mensaje.slice(0, 140) });
  if (error) throw error;
  return { ok: true };
}

export async function elegirMisionEquipo(key: string) {
  const s = await getSession();
  if (!s || s.rol !== "SUPERVISOR") throw new Error("Solo gerentes");
  if (!MISIONES_EQUIPO.some((m) => m.key === key)) throw new Error("Misión inválida");
  const { error } = await supabaseAdmin().from("mision_equipo").upsert({ supervisor: s.ref, mes: MES_ACTUAL, mision_key: key, updated_at: new Date().toISOString() });
  if (error) throw error;
  revalidatePath(`/supervisor/${encodeURIComponent(s.ref)}`);
  return { ok: true };
}
