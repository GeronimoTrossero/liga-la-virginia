import { NextResponse } from "next/server";
import { mensajeParaCliente } from "@/lib/automation";
import { waLink } from "@/lib/dibu";

export async function POST(req: Request) {
  const { cliente_id, tipo } = (await req.json()) as { cliente_id?: string; tipo?: "cobranza" | "lanzamiento" | "aviso_entrega" };
  if (!cliente_id || !tipo) return NextResponse.json({ error: "cliente_id y tipo son obligatorios" }, { status: 400 });
  try {
    const r = await mensajeParaCliente(cliente_id, tipo);
    return NextResponse.json({ mensaje: r.mensaje, fuente: r.fuente, url: waLink(r.cliente.telefono_demo, r.mensaje) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 404 });
  }
}
