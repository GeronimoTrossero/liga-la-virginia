import type { Raw, Score } from "./scoring";

export type MisionDef = {
  id: string; mes: string; titulo: string; descripcion: string; kpi: string; meta: number;
  alcance: "INDIVIDUAL" | "SUCURSAL"; premio: string; icono: string;
};

export function misionesDelMes(mes: string): MisionDef[] {
  const base: MisionDef[] = [
    { id: `${mes}-lan`, mes, titulo: "Lanzamiento Total", descripcion: "Llevá los lanzamientos al 45% de tus compradores.", kpi: "lan", meta: 0.45, alcance: "INDIVIDUAL", premio: "Figurita especial + 2 pts de bonus en el álbum", icono: "🚀" },
    { id: `${mes}-cob`, mes, titulo: "Cobranza Limpia", descripcion: "Terminá el mes con Cobranzas en plazo ≥ 95%.", kpi: "cob", meta: 0.95, alcance: "INDIVIDUAL", premio: "Golden Ticket: día libre a elección", icono: "💰" },
    { id: `${mes}-ent`, mes, titulo: "Cero Rebotes", descripcion: "Pedidos no entregados ≤ 2%.", kpi: "ent", meta: 0.02, alcance: "INDIVIDUAL", premio: "Kit cafetero La Virginia", icono: "🚚" },
    { id: `${mes}-rel`, mes, titulo: "Relevamiento Perfecto", descripcion: "Completá el 100% de las encuestas asignadas.", kpi: "rel", meta: 1, alcance: "INDIVIDUAL", premio: "Medalla de Ojo de Halcón", icono: "📋" },
    { id: `${mes}-suc`, mes, titulo: "Nadie en rojo en Cobranzas", descripcion: "Misión colectiva: ningún vendedor de la sucursal con Cobranzas en rojo.", kpi: "cob", meta: 1, alcance: "SUCURSAL", premio: "Tercer Tiempo: asado para toda la sucursal", icono: "🔥" },
  ];
  if (mes === "2026-06") base.unshift({ id: `${mes}-cafe`, mes, titulo: "Copa del Café", descripcion: "Concurso estacional: superá tu objetivo de kilos en el mes del café.", kpi: "vta", meta: 1, alcance: "INDIVIDUAL", premio: "Copa del Café + cafetera para el local", icono: "☕" });
  return base;
}

/** Progreso 0–1 de una misión individual, siempre desde los datos crudos (y ajustes en vivo). */
export function progresoIndividual(m: MisionDef, r: Raw, s: Score): number {
  const real = s.reales[m.kpi as keyof Score["reales"]];
  if (real === null || real === undefined) return 1;
  if (m.kpi === "ent") return real <= m.meta ? 1 : Math.min(1, m.meta / real);
  return Math.min(1, real / m.meta);
}

/** Misión colectiva: % de la sucursal sin Cobranzas en rojo. */
export function progresoSucursal(scores: Score[]): number {
  if (!scores.length) return 0;
  return scores.filter((s) => s.semaforos.cob !== "rojo").length / scores.length;
}
