import "./env";
import { randomBytes } from "crypto";
import { createClient } from "@supabase/supabase-js";
import { supabaseUrl } from "../lib/supabase";
import { hashPin } from "../lib/auth-pin";
import { supId } from "../lib/session";

// Usuarios demo: vendedores (id = ID_Vendedor), supervisores (sup-<apellido>) y gerencia. PIN demo: 1234.
export async function seedUsuarios() {
  const db = createClient(supabaseUrl(), process.env.SUPABASE_SERVICE_ROLE_KEY!.trim(), { auth: { persistSession: false } });
  const { data: vends, error } = await db.from("vendedor").select("id,nombre,supervisor");
  if (error) throw error;
  const sups = [...new Set((vends ?? []).map((v) => v.supervisor as string))].sort();
  const pin = (process.env.DEMO_PIN ?? "1234").trim();
  const h = () => hashPin(pin, randomBytes(8).toString("hex"));
  const rows = [
    ...(vends ?? []).map((v) => ({ id: v.id, rol: "VENDEDOR", ref: v.id, nombre: v.nombre, pin_hash: h() })),
    ...sups.map((s) => ({ id: supId(s, sups), rol: "SUPERVISOR", ref: s, nombre: s, pin_hash: h() })),
    { id: "gerencia", rol: "GERENCIA", ref: "gerencia", nombre: "Gerencia Comercial", pin_hash: h() },
  ];
  await db.from("usuario").delete().not("id", "is", null);
  const { error: e2 } = await db.from("usuario").insert(rows);
  if (e2) throw e2;
  console.log(`  usuario: ${rows.length} (PIN demo ${pin})`);
  return rows;
}

if (process.argv[1]?.includes("seed-usuarios")) {
  seedUsuarios().catch((e) => { console.error(e); process.exit(1); });
}
