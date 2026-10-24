import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getVendedores, liveVersion } from "@/lib/data";

// Polling SWR (cada 2 s): devuelve una firma de cambios solo de lo que la sesión puede ver.
export async function GET() {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Sin sesión" }, { status: 401 });
  let ids: string[] | null = null;
  if (s.rol === "VENDEDOR") ids = [s.ref];
  else if (s.rol === "SUPERVISOR") ids = (await getVendedores()).filter((v) => v.supervisor === s.ref).map((v) => v.id);
  return NextResponse.json({ v: await liveVersion(ids) }, { headers: { "cache-control": "no-store" } });
}
