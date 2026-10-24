// Sesión firmada (JWT HS256 en cookie httpOnly). Edge-safe: lo usa el middleware.
import { SignJWT, jwtVerify } from "jose";

export type Rol = "VENDEDOR" | "SUPERVISOR" | "GERENCIA";
export type Session = { uid: string; rol: Rol; ref: string; nombre: string };

export const COOKIE = "liga_session";

function secret() {
  // AUTH_SECRET si existe; si no, derivamos de la service role (nunca sale del servidor).
  const s = (process.env.AUTH_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  if (!s) throw new Error("Falta AUTH_SECRET");
  return new TextEncoder().encode(`liga-la-virginia:${s}`);
}

export async function firmar(s: Session) {
  return new SignJWT({ ...s }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("12h").sign(secret());
}

export async function verificar(token?: string | null): Promise<Session | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    const { uid, rol, ref, nombre } = payload as unknown as Session;
    return uid && rol && ref ? { uid, rol, ref, nombre } : null;
  } catch {
    return null;
  }
}

/** Ruta de inicio de cada rol. */
export function homeDe(s: Pick<Session, "rol" | "ref">) {
  if (s.rol === "VENDEDOR") return `/vendedor/${s.ref}`;
  if (s.rol === "SUPERVISOR") return `/supervisor/${encodeURIComponent(s.ref)}`;
  return "/liga";
}

export function supId(nombre: string, todos: string[]) {
  const norm = (x: string) => x.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const [ap, ...rest] = nombre.split(" ");
  const repetido = todos.filter((t) => t.split(" ")[0] === ap).length > 1;
  return `sup-${norm(ap)}${repetido ? `-${norm(rest.join(" "))}` : ""}`;
}
