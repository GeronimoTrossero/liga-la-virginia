import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE, firmar, verificar, type Session } from "./session";
import { supabaseAdmin } from "./supabase";
export { hashPin, pinOk } from "./auth-pin";

export type Usuario = { id: string; rol: Session["rol"]; ref: string; nombre: string; pin_hash: string };

export async function buscarUsuario(id: string): Promise<Usuario | null> {
  const { data } = await supabaseAdmin().from("usuario").select("*").eq("id", id.trim()).maybeSingle<Usuario>();
  return data ?? null;
}

export async function iniciarSesion(u: Usuario) {
  const token = await firmar({ uid: u.id, rol: u.rol, ref: u.ref, nombre: u.nombre });
  (await cookies()).set(COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 12 });
}

export async function getSession(): Promise<Session | null> {
  return verificar((await cookies()).get(COOKIE)?.value);
}

export async function requireSession(): Promise<Session> {
  const s = await getSession();
  if (!s) redirect("/login");
  return s;
}

/** ¿Puede esta sesión ver el detalle de este vendedor? */
export function puedeVerVendedor(s: Session, v: { id: string; supervisor: string }) {
  return s.rol === "GERENCIA" || (s.rol === "VENDEDOR" && s.ref === v.id) || (s.rol === "SUPERVISOR" && s.ref === v.supervisor);
}

export const MODO_PRESENTADOR = process.env.MODO_PRESENTADOR !== "off";
