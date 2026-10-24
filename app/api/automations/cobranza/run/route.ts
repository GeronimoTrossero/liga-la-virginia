import { NextResponse } from "next/server";
import { checkSecret, runCobranza } from "@/lib/automation";

export async function POST(req: Request) {
  if (!checkSecret(req)) return NextResponse.json({ error: "x-webhook-secret inválido" }, { status: 401 });
  const { vendedor_id } = (await req.json()) as { vendedor_id?: string };
  if (!vendedor_id) return NextResponse.json({ error: "vendedor_id obligatorio" }, { status: 400 });
  return NextResponse.json({ modo: "simulado", ...(await runCobranza(vendedor_id)) });
}
