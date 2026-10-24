// Única fuente de verdad del cálculo. Funciones puras: las usan el seed, el servidor y el simulador del cliente.

export type Raw = {
  clientes_cartera: number;
  clientes_compradores: number;
  clientes_con_lanzamiento: number;
  kilos_objetivo: number;
  kilos_vendidos: number;
  visitas_realizadas: number;
  pedidos_levantados: number;
  pedidos_no_entregados: number;
  cobros_mes: number;
  cobros_en_plazo: number;
  encuestas_asignadas: number;
  encuestas_realizadas: number;
};

export type RawField = keyof Raw;
export type KpiKey = "vta" | "prd" | "act" | "lan" | "ent" | "cob" | "rel";
export type Semaforo = "verde" | "amarillo" | "rojo";
export type Nivel = "Diamante" | "Oro" | "Plata" | "Bronce";

export type KpiDef = {
  key: KpiKey;
  abbr: string;
  nombre: string;
  objetivo: number;
  sentido: "up" | "down";
  peso: number;
  real: (r: Raw) => number | null; // null = denominador 0
};

const div = (a: number, b: number) => (b > 0 ? a / b : null);

export const KPIS: KpiDef[] = [
  { key: "vta", abbr: "VTA", nombre: "Venta vs OV", objetivo: 1.0, sentido: "up", peso: 0.3, real: (r) => div(r.kilos_vendidos, r.kilos_objetivo) },
  { key: "prd", abbr: "PRD", nombre: "Productividad", objetivo: 0.65, sentido: "up", peso: 0.1, real: (r) => div(r.pedidos_levantados, r.visitas_realizadas) },
  { key: "act", abbr: "ACT", nombre: "No compradores", objetivo: 0.15, sentido: "down", peso: 0.15, real: (r) => div(r.clientes_cartera - r.clientes_compradores, r.clientes_cartera) },
  { key: "lan", abbr: "LAN", nombre: "Últ. lanzamientos", objetivo: 0.4, sentido: "up", peso: 0.15, real: (r) => div(r.clientes_con_lanzamiento, r.clientes_compradores) },
  { key: "ent", abbr: "ENT", nombre: "No entregados", objetivo: 0.03, sentido: "down", peso: 0.1, real: (r) => div(r.pedidos_no_entregados, r.pedidos_levantados) },
  { key: "cob", abbr: "COB", nombre: "Cobranzas", objetivo: 0.9, sentido: "up", peso: 0.15, real: (r) => div(r.cobros_en_plazo, r.cobros_mes) },
  { key: "rel", abbr: "REL", nombre: "Relevamientos", objetivo: 1.0, sentido: "up", peso: 0.05, real: (r) => div(r.encuestas_realizadas, r.encuestas_asignadas) },
];

export const KPI_KEYS: KpiKey[] = KPIS.map((k) => k.key);
export const KPI_BY_KEY = Object.fromEntries(KPIS.map((k) => [k.key, k])) as Record<KpiKey, KpiDef>;

export const TOPE = 1.1;

export const RAW_FIELDS: RawField[] = [
  "clientes_cartera", "clientes_compradores", "clientes_con_lanzamiento", "kilos_objetivo", "kilos_vendidos",
  "visitas_realizadas", "pedidos_levantados", "pedidos_no_entregados", "cobros_mes", "cobros_en_plazo",
  "encuestas_asignadas", "encuestas_realizadas",
];

/** Cumplimiento con tope 110%. ↓: objetivo/real (real = 0 → 110%). Denominador 0 → 100% (neutral). */
export function cumplimiento(real: number | null, objetivo: number, sentido: "up" | "down"): number {
  if (real === null || !isFinite(real)) return 1;
  const c = sentido === "up" ? real / objetivo : real === 0 ? TOPE : objetivo / real;
  return Math.min(TOPE, Math.max(0, c));
}

export function semaforo(c: number): Semaforo {
  if (c >= 1 - 1e-9) return "verde";
  if (c >= 0.85) return "amarillo";
  return "rojo";
}

export function nivelBase(puntaje: number): Nivel {
  if (puntaje >= 95) return "Diamante";
  if (puntaje >= 90) return "Oro";
  if (puntaje >= 85) return "Plata";
  return "Bronce";
}

export type Score = {
  reales: Record<KpiKey, number | null>;
  cumpl: Record<KpiKey, number>;
  semaforos: Record<KpiKey, Semaforo>;
  puntaje: number;
  nivel: Nivel;
  nivelSinCandado: Nivel;
  bloqueado: boolean;
  motivoBloqueo: string | null;
};

export function puntajeDesdeCumpl(cumpl: Record<KpiKey, number>): number {
  let s = 0;
  for (const k of KPIS) s += k.peso * cumpl[k.key];
  return (s / TOPE) * 100;
}

/** Candado: no podés ser Oro ni Diamante si Venta o Cobranzas están en rojo. */
export function nivelConCandado(puntaje: number, sem: Record<KpiKey, Semaforo>) {
  const base = nivelBase(puntaje);
  const rojos: string[] = [];
  if (sem.vta === "rojo") rojos.push("Venta");
  if (sem.cob === "rojo") rojos.push("Cobranzas");
  const bloqueado = (base === "Oro" || base === "Diamante") && rojos.length > 0;
  return {
    nivel: (bloqueado ? "Plata" : base) as Nivel,
    nivelSinCandado: base,
    bloqueado,
    motivoBloqueo: bloqueado ? `Bloqueado en Plata: ${rojos.join(" y ")} en rojo` : null,
  };
}

export function score(r: Raw): Score {
  const reales = {} as Record<KpiKey, number | null>;
  const cumpl = {} as Record<KpiKey, number>;
  const semaforos = {} as Record<KpiKey, Semaforo>;
  for (const k of KPIS) {
    const real = k.real(r);
    reales[k.key] = real;
    cumpl[k.key] = cumplimiento(real, k.objetivo, k.sentido);
    semaforos[k.key] = semaforo(cumpl[k.key]);
  }
  const puntaje = puntajeDesdeCumpl(cumpl);
  return { reales, cumpl, semaforos, puntaje, ...nivelConCandado(puntaje, semaforos) };
}

/** Puntos que faltan para llevar un KPI al tope (110%). */
export function puntosPosibles(cumpl: Record<KpiKey, number>, k: KpiKey): number {
  return ((TOPE - cumpl[k]) * KPI_BY_KEY[k].peso * 100) / TOPE;
}

export type Delta = Partial<Record<RawField, number>>;

export function aplicar(r: Raw, delta: Delta): Raw {
  const out = { ...r };
  for (const [f, d] of Object.entries(delta) as [RawField, number][]) out[f] = Math.max(0, out[f] + d);
  return out;
}

export function sumarDeltas(deltas: Delta[]): Delta {
  const out: Delta = {};
  for (const d of deltas) for (const [f, v] of Object.entries(d) as [RawField, number][]) out[f] = (out[f] ?? 0) + v;
  return out;
}

/** Simulador: puntos de una acción = puntaje(con cambio) − puntaje(actual). */
export function simular(r: Raw, deltas: Delta[]) {
  const antes = score(r);
  const despues = score(aplicar(r, sumarDeltas(deltas)));
  return { antes, despues, puntos: despues.puntaje - antes.puntaje };
}

/** Puesto que tendría un puntaje dentro de una lista de puntajes de los demás. */
export function puestoPara(puntaje: number, otros: number[]): number {
  return otros.filter((p) => p > puntaje + 1e-9).length + 1;
}

export const NIVELES: Nivel[] = ["Bronce", "Plata", "Oro", "Diamante"];

export function fmtPts(n: number, dec = 1) {
  return n.toLocaleString("es-AR", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

export function fmtPct(n: number | null, dec = 1) {
  if (n === null) return "—";
  return (n * 100).toLocaleString("es-AR", { minimumFractionDigits: dec, maximumFractionDigits: dec }) + "%";
}
