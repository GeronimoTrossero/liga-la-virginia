import "server-only";
import { cache } from "react";
import { supabaseAdmin } from "./supabase";
import { rankear, type Ranked, type VendedorInfo } from "./board";
import { MES_ACTUAL, MESES, mesAnterior, TEMPORADA } from "./config";
import { computeGame, type Game } from "./game";
import { RAW_FIELDS, type Raw, type RawField } from "./scoring";

const db = () => supabaseAdmin(); // siempre servidor: anon no tiene lectura

export const getVendedores = cache(async (): Promise<VendedorInfo[]> => {
  const { data, error } = await db().from("vendedor").select("*").order("id");
  if (error) throw error;
  return data as VendedorInfo[];
});

type KpiRow = Raw & { vendedor_id: string; mes: string };

const getKpiRows = cache(async (): Promise<KpiRow[]> => {
  const out: KpiRow[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db().from("kpi_mes").select("*").order("mes").order("vendedor_id").range(from, from + 999);
    if (error) throw error;
    out.push(...(data as KpiRow[]));
    if (!data || data.length < 1000) break;
  }
  return out.map((r) => {
    const o = { ...r };
    for (const f of RAW_FIELDS) o[f] = Number(o[f]);
    return o;
  });
});

export type Ajuste = { id: number; vendedor_id: string; mes: string; campo: RawField; delta: number; origen: string; created_at: string };

export const getAjustes = cache(async (mes: string = MES_ACTUAL): Promise<Ajuste[]> => {
  const { data, error } = await db().from("ajuste_kpi").select("*").eq("mes", mes).order("id");
  if (error) throw error;
  return (data as Ajuste[]).map((a) => ({ ...a, delta: Number(a.delta) }));
});

/** Todos los tableros mensuales calculados con lib/scoring.ts (+ ajustes en vivo del mes en curso). */
export const getBoards = cache(async (): Promise<Map<string, Ranked[]>> => {
  const [vends, rows, ajustes] = await Promise.all([getVendedores(), getKpiRows(), getAjustes(MES_ACTUAL)]);
  const info = new Map(vends.map((v) => [v.id, v]));
  const build = (m: string) =>
    rows.filter((r) => r.mes === m && info.has(r.vendedor_id)).map((r) => {
      const raw = Object.fromEntries(RAW_FIELDS.map((f) => [f, r[f]])) as Raw;
      if (m === MES_ACTUAL) for (const a of ajustes) if (a.vendedor_id === r.vendedor_id && RAW_FIELDS.includes(a.campo)) raw[a.campo] = Math.max(0, raw[a.campo] + a.delta);
      return { ...info.get(r.vendedor_id)!, raw };
    });
  return new Map(MESES.map((m) => { const p = mesAnterior(m); return [m, rankear(build(m), p ? build(p) : undefined)] as const; }));
});

export async function getBoard(mes: string): Promise<Ranked[]> {
  return (await getBoards()).get(mes) ?? [];
}

/** Moneda 2 (Puntos de Liga, rachas, temporadas, divisiones). */
export const getGame = cache(async (): Promise<Game> => computeGame(MESES, await getBoards(), MES_ACTUAL));

export type Anual = VendedorInfo & { puntaje_prom: number; rank_general: number; rank_sucursal: number; meses_podio: number; mejor_mes: string };

export async function getAnual(): Promise<Anual[]> {
  const [vends, { data, error }] = await Promise.all([getVendedores(), db().from("score_anual").select("*").eq("anio", TEMPORADA).order("rank_general")]);
  if (error) throw error;
  const info = new Map(vends.map((v) => [v.id, v]));
  return (data as (Omit<Anual, keyof VendedorInfo> & { vendedor_id: string })[]).map((a) => ({ ...info.get(a.vendedor_id)!, ...a, puntaje_prom: Number(a.puntaje_prom) }));
}

/** Historial de puntajes de un vendedor (de score_mes, precalculado en el seed). */
export async function getHistorial(vendedorId: string) {
  const { data, error } = await db().from("score_mes").select("mes,puntaje,rank_general,nivel").eq("vendedor_id", vendedorId).order("mes");
  if (error) throw error;
  return (data as { mes: string; puntaje: number; rank_general: number; nivel: string }[]).map((d) => ({ ...d, puntaje: Number(d.puntaje) }));
}

export type Cliente = {
  id: string; vendedor_id: string; nombre_comercio: string; rubro: string; compro_mes: boolean; compro_lanzamiento: boolean;
  lanzamiento_id: string | null; relevado: boolean; estacional: boolean; saldo_cc: number; facturas: number; vence_el: string | null;
  pagado: boolean; pedido_no_entregado: boolean; motivo_no_entrega: string | null; telefono_demo: string;
};

export async function getClientes(vendedorId: string): Promise<Cliente[]> {
  const { data, error } = await db().from("cliente_demo").select("*").eq("vendedor_id", vendedorId).order("id").limit(2000);
  if (error) throw error;
  return (data as Cliente[]).map((c) => ({ ...c, saldo_cc: Number(c.saldo_cc) }));
}

export type Familia = { familia: string; objetivo_kg: number; vendido_kg: number };
export async function getFamilias(vendedorId: string): Promise<Familia[]> {
  const { data, error } = await db().from("venta_familia_demo").select("familia,objetivo_kg,vendido_kg").eq("vendedor_id", vendedorId);
  if (error) throw error;
  return (data as Familia[]).map((f) => ({ ...f, objetivo_kg: Number(f.objetivo_kg), vendido_kg: Number(f.vendido_kg) }));
}

export type Lanzamiento = { id: string; producto: string; desde: string };
export async function getLanzamientos(): Promise<Lanzamiento[]> {
  const { data, error } = await db().from("lanzamiento").select("*").order("id");
  if (error) throw error;
  return data as Lanzamiento[];
}

export type Figurita = { id: string; vendedor_id: string; mes: string; kpi: string; puesto: number; rareza: "oro" | "plata" | "bronce" | "holo" };
export async function getFiguritas(vendedorId?: string): Promise<Figurita[]> {
  let q = db().from("figurita").select("*");
  if (vendedorId) q = q.eq("vendedor_id", vendedorId);
  const { data, error } = await q;
  if (error) throw error;
  return data as Figurita[];
}

export type LogRow = { id: number; tipo: string; vendedor_id: string | null; cliente_id: string | null; canal: string; mensaje: string; estado: string; created_at: string };
export async function getAutomationLog(vendedorIds?: string[]): Promise<LogRow[]> {
  let q = db().from("automation_log").select("*").order("id", { ascending: false }).limit(200);
  if (vendedorIds) q = q.in("vendedor_id", vendedorIds);
  const { data, error } = await q;
  if (error) throw error;
  return data as LogRow[];
}

export type Reconocimiento = { id: number; de: string; para: string; mensaje: string; created_at: string };
export async function getReconocimientos(vendedorIds: string[]): Promise<Reconocimiento[]> {
  const { data, error } = await db().from("reconocimiento").select("*").in("para", vendedorIds).order("id", { ascending: false }).limit(50);
  if (error) throw error;
  return data as Reconocimiento[];
}

export async function getMisionEquipoKey(supervisor: string, mes = MES_ACTUAL): Promise<string | null> {
  const { data } = await db().from("mision_equipo").select("mision_key").eq("supervisor", supervisor).eq("mes", mes).maybeSingle<{ mision_key: string }>();
  return data?.mision_key ?? null;
}

/** Firma de cambios en vivo para el polling SWR (filtrada por los vendedores visibles en la sesión). */
export async function liveVersion(vendedorIds: string[] | null) {
  const q = (t: string, col = "vendedor_id") => {
    let x = db().from(t).select("id", { count: "exact" }).order("id", { ascending: false }).limit(1);
    if (vendedorIds) x = x.in(col, vendedorIds);
    return x;
  };
  const [a, l, r] = await Promise.all([q("ajuste_kpi"), q("automation_log"), q("reconocimiento", "para")]);
  const { data: me } = await db().from("mision_equipo").select("updated_at").order("updated_at", { ascending: false }).limit(1);
  return [a, l, r].map((x) => `${x.count ?? 0}.${(x.data?.[0] as { id?: number } | undefined)?.id ?? 0}`).join("-") + `-${me?.[0]?.updated_at ?? ""}`;
}
