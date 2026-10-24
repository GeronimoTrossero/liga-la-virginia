import "server-only";
import { supabaseAdmin } from "./supabase";
import { DEMO_TODAY, MES_ACTUAL } from "./config";
import { plantillaDibu, type DibuInput, type DibuTipo } from "./dibu";

/** Redacta el mensaje. Si hay ANTHROPIC_API_KEY intenta con IA (solo reescribe el texto); si no, plantilla. */
export async function redactar(input: DibuInput): Promise<{ mensaje: string; fuente: "ia" | "plantilla" }> {
  const base = plantillaDibu(input);
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  if (!key) return { mensaje: base, fuente: "plantilla" };
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: "claude-haiku-5-5",
        max_tokens: 300,
        system:
          "Redactás WhatsApps breves para un vendedor de La Virginia, en español rioplatense, cordiales y firmes. No inventes cifras, fechas, descuentos ni condiciones: usá exactamente los datos del borrador. Devolvé solo el mensaje final, firmado por el vendedor.",
        messages: [{ role: "user", content: `Mejorá este borrador sin cambiar montos ni fechas:\n\n${base}` }],
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(String(res.status));
    const j = (await res.json()) as { content?: { type: string; text?: string }[] };
    const txt = j.content?.find((c) => c.type === "text")?.text?.trim();
    return txt ? { mensaje: txt, fuente: "ia" } : { mensaje: base, fuente: "plantilla" };
  } catch {
    return { mensaje: base, fuente: "plantilla" };
  }
}

type ClienteRow = { id: string; vendedor_id: string; nombre_comercio: string; saldo_cc: number; facturas: number; vence_el: string | null; pagado: boolean; telefono_demo: string; lanzamiento_id: string | null };

export async function mensajeParaCliente(clienteId: string, tipo: DibuTipo) {
  const db = supabaseAdmin();
  const { data: c, error } = await db.from("cliente_demo").select("*").eq("id", clienteId).single<ClienteRow>();
  if (error || !c) throw new Error("Cliente no encontrado");
  const { data: v } = await db.from("vendedor").select("nombre").eq("id", c.vendedor_id).single<{ nombre: string }>();
  let producto: string | undefined;
  if (tipo === "lanzamiento" && c.lanzamiento_id) {
    const { data: l } = await db.from("lanzamiento").select("producto").eq("id", c.lanzamiento_id).single<{ producto: string }>();
    producto = l?.producto;
  }
  const r = await redactar({ tipo, comercio: c.nombre_comercio, vendedor: v?.nombre ?? "", monto: Number(c.saldo_cc), facturas: c.facturas, vence_el: c.vence_el, producto, hoy: DEMO_TODAY });
  return { ...r, cliente: c };
}

function addDays(d: string, n: number) {
  return new Date(new Date(d + "T12:00:00Z").getTime() + n * 864e5).toISOString().slice(0, 10);
}

/** Cobranza en piloto automático: deudores con vencimiento en los próximos 5 días → recordatorio (modo simulado). */
export async function runCobranza(vendedorId: string) {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("cliente_demo").select("*")
    .eq("vendedor_id", vendedorId).eq("pagado", false)
    .gte("vence_el", DEMO_TODAY).lte("vence_el", addDays(DEMO_TODAY, 5))
    .order("vence_el");
  if (error) throw error;
  const clientes = (data ?? []) as ClienteRow[];
  const { data: ya } = await db.from("automation_log").select("cliente_id").eq("vendedor_id", vendedorId).eq("tipo", "recordatorio_cobranza");
  const enviados = new Set((ya ?? []).map((x: { cliente_id: string }) => x.cliente_id));
  const nuevos = clientes.filter((c) => !enviados.has(c.id));
  const { data: v } = await db.from("vendedor").select("nombre").eq("id", vendedorId).single<{ nombre: string }>();
  const logs = [];
  for (const c of nuevos) {
    const { mensaje } = await redactar({ tipo: "cobranza", comercio: c.nombre_comercio, vendedor: v?.nombre ?? "", monto: Number(c.saldo_cc), facturas: c.facturas, vence_el: c.vence_el, hoy: DEMO_TODAY });
    logs.push({ tipo: "recordatorio_cobranza", vendedor_id: vendedorId, cliente_id: c.id, canal: "whatsapp", mensaje, estado: "simulado" });
  }
  if (logs.length) {
    const { error: e2 } = await db.from("automation_log").insert(logs);
    if (e2) throw e2;
  }
  return { enviados: logs.length, yaEnviados: clientes.length - nuevos.length, clientes: nuevos.map((c) => ({ id: c.id, nombre: c.nombre_comercio, telefono: c.telefono_demo, vence_el: c.vence_el, monto: Number(c.saldo_cc) })) };
}

const PAGO_RE = /(pagu[eé]|transfer[ií]|abon[eé]|deposit[eé])/i;

/** Webhook de pago: si el texto dice "pagué/transferí", marca pagado, ajusta Cobros_en_Plazo y loguea. */
export async function registrarPago({ cliente_id, telefono, texto }: { cliente_id?: string; telefono?: string; texto: string }) {
  const db = supabaseAdmin();
  let q = db.from("cliente_demo").select("*").eq("pagado", false).limit(1);
  q = cliente_id ? q.eq("id", cliente_id) : q.eq("telefono_demo", (telefono ?? "").replace(/\D/g, ""));
  const { data } = await q;
  const c = (data ?? [])[0] as ClienteRow | undefined;
  if (!c) return { ok: false, motivo: "cliente no encontrado o ya pagado" };
  if (!PAGO_RE.test(texto)) {
    await db.from("automation_log").insert({ tipo: "respuesta_cliente", vendedor_id: c.vendedor_id, cliente_id: c.id, canal: "whatsapp", mensaje: texto, estado: "respondido" });
    return { ok: true, pagado: false };
  }
  const facturas = Math.max(1, c.facturas);
  const { error: e1 } = await db.from("cliente_demo").update({ pagado: true }).eq("id", c.id);
  if (e1) throw e1;
  const { error: e2 } = await db.from("ajuste_kpi").insert({ vendedor_id: c.vendedor_id, mes: MES_ACTUAL, campo: "cobros_en_plazo", delta: facturas, origen: `pago:${c.id}` });
  if (e2) throw e2;
  await db.from("automation_log").insert([
    { tipo: "respuesta_cliente", vendedor_id: c.vendedor_id, cliente_id: c.id, canal: "whatsapp", mensaje: texto, estado: "respondido" },
    { tipo: "pago_recibido", vendedor_id: c.vendedor_id, cliente_id: c.id, canal: "whatsapp", mensaje: `💰 ${c.nombre_comercio} pagó $${Math.round(Number(c.saldo_cc)).toLocaleString("es-AR")} (${facturas} factura${facturas > 1 ? "s" : ""}) → Cobros en plazo +${facturas}`, estado: "pagado" },
  ]);
  return { ok: true, pagado: true, cliente: c.nombre_comercio, facturas };
}

/** Deja la demo como recién sembrada para un vendedor. */
export async function resetDemo(vendedorId: string) {
  const db = supabaseAdmin();
  const { data: pagos } = await db.from("ajuste_kpi").select("origen").eq("vendedor_id", vendedorId);
  const ids = (pagos ?? []).map((p: { origen: string }) => p.origen).filter((o) => o.startsWith("pago:")).map((o) => o.slice(5));
  if (ids.length) await db.from("cliente_demo").update({ pagado: false }).in("id", ids);
  await db.from("ajuste_kpi").delete().eq("vendedor_id", vendedorId);
  await db.from("automation_log").delete().eq("vendedor_id", vendedorId);
  return { ok: true };
}

export function checkSecret(req: Request) {
  const s = process.env.WEBHOOK_SECRET?.trim();
  return !!s && req.headers.get("x-webhook-secret") === s;
}
