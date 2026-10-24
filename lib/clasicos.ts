import { promedio, type Ranked } from "./board";
import { KPIS } from "./scoring";

export const DERBIS: [string, string, string][] = [
  ["Clásico del Litoral", "Santa Fe", "Rosario"],
  ["Clásico del Norte", "Tucumán", "Salta"],
  ["Clásico de la Costa", "Mar del Plata", "Bahía Blanca"],
  ["Cuyo vs. Centro", "Mendoza", "Córdoba/Rio Cuarto"],
  ["Clásico del NEA", "Resistencia", "Posadas"],
];

/** Marcador tipo partido: un gol por cada KPI en que el promedio de cumplimiento es mayor. */
export function partido(a: Ranked[], b: Ranked[]) {
  let ga = 0, gb = 0;
  for (const k of KPIS) {
    const ca = promedio(a.map((x) => x.s.cumpl[k.key]));
    const cb = promedio(b.map((x) => x.s.cumpl[k.key]));
    if (ca > cb + 1e-4) ga++;
    else if (cb > ca + 1e-4) gb++;
  }
  return { ga, gb, pa: promedio(a.map((x) => x.s.puntaje)), pb: promedio(b.map((x) => x.s.puntaje)) };
}
