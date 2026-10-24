import "server-only";
import { cookies } from "next/headers";
import { supabasePublic } from "./supabase";
import { rankear, type Ranked, type VendedorInfo } from "./board";
import { MES_ACTUAL, mesAnterior, TEMPORADA } from "./config";
import { RAW_FIELDS, type Raw, type RawField } from "./scoring";

const db = () => supabasePublic();

export type Viewer =
  | { rol: "vendedor"; id: string }
  | { rol: "supervisor"; id: string }
  | { rol: "regional"; id: string }
  | { rol: "gerencia" };

export async function getViewer(): Promise<Viewer> {
  const v = (await cookies()).get("ver_como")?.value;
  if (!v) return { rol: "gerencia" };
  const [rol, ...rest] = decodeURIComponent(v).split(":");
  const id = rest.join(":");
  if ((rol === "vendedor" || rol === "supervisor" || rol === "regional") && id) return { rol, id };
  return { rol: "gerencia" };
}

export async function getVendedores(): Promise<VendedorInfo[]> {
  const { data, error } = await db().from("vendedor").select("*").order("id");
  if (error) throw error;
  return data as VendedorInfo[];
}

type KpiRow = Raw & { vendedor_id: string; mes: string };

async function getKpiRows(meses: string[]): Promise<KpiRow[]> {
  const { data, error } = await db().from("kpi_mes").select("*").in("mes", meses).limit(2000);
  if (error) throw error;
  return (data as KpiRow[]).map((r) => {
    const o = { ...r };
    for (const f of RAW_FIELDS) o[f] = Number(o[f]);
    return o;
  });
}

export type Ajuste = { id: number; vendedor_id: string; mes: string; campo: RawField; delta: number; origen: string; created_at: string };

export async function getAjustes(mes = MES_ACTUAL): Promise<Ajuste[]> {
  const { data, error } = await db().from("ajuste_kpi").select("*").eq("mes", mes).order("created_at");
  if (error) throw error;
  return (data as Ajuste[]).map((a) => ({ ...a, delta: Number(a.delta) }));
}

/** Tablero de un mes: puntajes y rankings calculados con lib/scoring.ts (+ ajustes en vivo del mes en curso). */
export async function getBoard(mes: string): Promise<Ranked[]> {
  const prev = mesAnterior(mes);
  const [vends, rows, ajustes] = await Promise.all([
    getVendedores(),
    getKpiRows(prev ? [mes, prev] : [mes]),
    mes === MES_ACTUAL ? getAjustes(mes) : Promise.resolve([] as Ajuste[]),
  ]);
  const info = new Map(vends.map((v) => [v.id, v]));
  const build = (m: string) =>
    rows.filter((r) => r.mes === m && info.has(r.vendedor_id)).map((r) => {
      const raw = Object.fromEntries(RAW_FIELDS.map((f) => [f, r[f]])) as Raw;
      if (m === MES_ACTUAL) for (const a of ajustes) if (a.vendedor_id === r.vendedor_id && RAW_FIELDS.includes(a.campo)) raw[a.campo] = Math.max(0, raw[a.campo] + a.delta);
      return { ...info.get(r.vendedor_id)!, raw };
    });
  return rankear(build(mes), prev ? build(prev) : undefined);
}

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
