import { NextResponse } from "next/server";
import { mensajeParaCliente } from "@/lib/automation";
import { waLink } from "@/lib/dibu";
import { getSession, puedeVerVendedor } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: Request) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Sin sesión" }, { status: 401 });
  const { cliente_id, tipo } = (await req.json()) as { cliente_id?: string; tipo?: "cobranza" | "lanzamiento" | "aviso_entrega" };
  if (!cliente_id || !tipo) return NextResponse.json({ error: "cliente_id y tipo son obligatorios" }, { status: 400 });
  const { data: v } = await supabaseAdmin().from("vendedor").select("id,supervisor").eq("id", cliente_id.split("-")[0]).single<{ id: string; supervisor: string }>();
  if (!v || !puedeVerVendedor(s, v)) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  try {
    const r = await mensajeParaCliente(cliente_id, tipo);
    return NextResponse.json({ mensaje: r.mensaje, fuente: r.fuente, url: waLink(r.cliente.telefono_demo, r.mensaje) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 404 });
  }
}
