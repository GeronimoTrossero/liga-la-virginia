import { NextResponse } from "next/server";
import { checkSecret, registrarPago } from "@/lib/automation";

export async function POST(req: Request) {
  if (!checkSecret(req)) return NextResponse.json({ error: "x-webhook-secret inválido" }, { status: 401 });
  const body = (await req.json()) as { cliente_id?: string; telefono?: string; texto?: string };
  if (!body.texto || (!body.cliente_id && !body.telefono)) return NextResponse.json({ error: "cliente_id o telefono, y texto" }, { status: 400 });
  return NextResponse.json(await registrarPago({ ...body, texto: body.texto }));
}
