// Gamificación (moneda 2: Puntos de Liga). Funciones puras sobre los tableros mensuales calculados con lib/scoring.ts.
// El Puntaje Oficial nunca se toca acá: solo se lee.
import { KPIS, KPI_BY_KEY, type KpiKey, type Nivel, type Raw } from "./scoring";
import { groupBy, promedio, type Ranked } from "./board";
import { misionesDelMes, progresoIndividual } from "./missions";

export const RACHA_KPIS = ["vta", "cob", "rel", "ent"] as const;
export type RachaKpi = (typeof RACHA_KPIS)[number];

export type Temporada = { id: string; nombre: string; meses: string[] };
export const TEMPORADAS: Temporada[] = [
  { id: "T1", nombre: "Nov 25 – Ene 26", meses: ["2025-11", "2025-12", "2026-01"] },
  { id: "T2", nombre: "Feb – Abr 2026", meses: ["2026-02", "2026-03", "2026-04"] },
  { id: "T3", nombre: "May – Jul 2026", meses: ["2026-05", "2026-06", "2026-07"] },
  { id: "T4", nombre: "Ago – Oct 2026", meses: ["2026-08", "2026-09", "2026-10"] },
];
export const temporadaDe = (mes: string) => TEMPORADAS.find((t) => t.meses.includes(mes))!;

export const PROTECTOR_MAX: Record<Nivel, number> = { Bronce: 0, Plata: 1, Oro: 2, Diamante: 3 };

export function multiplicador(rachaGeneral: number) {
  if (rachaGeneral >= 12) return 1.5;
  if (rachaGeneral >= 6) return 1.25;
  if (rachaGeneral >= 3) return 1.1;
  return 1;
}

/** Nivel de temporada por percentil: Diamante top 5%, Oro siguiente 20%, Plata siguiente 40%, Bronce el resto. */
export function nivelPorPuesto(pos: number, n: number): Nivel {
  if (pos <= Math.ceil(n * 0.05)) return "Diamante";
  if (pos <= Math.ceil(n * 0.25)) return "Oro";
  if (pos <= Math.ceil(n * 0.65)) return "Plata";
  return "Bronce";
}

/** Cuánto falta para que un KPI quede en verde, en la unidad del vendedor. */
export function faltaParaVerde(k: KpiKey, r: Raw): string | null {
  switch (k) {
    case "vta": { const n = Math.ceil(r.kilos_objetivo - r.kilos_vendidos); return n > 0 ? `faltan ${n.toLocaleString("es-AR")} kg` : null; }
    case "cob": { const n = Math.ceil(0.9 * r.cobros_mes - r.cobros_en_plazo); return n > 0 ? `faltan ${n} cobros` : null; }
    case "rel": { const n = r.encuestas_asignadas - r.encuestas_realizadas; return n > 0 ? `${n === 1 ? "falta 1 encuesta" : `faltan ${n} encuestas`}` : null; }
    case "ent": { const n = r.pedidos_no_entregados - Math.floor(0.03 * r.pedidos_levantados); return n > 0 ? `hay que recuperar ${n} entregas` : null; }
    case "prd": { const n = Math.ceil(0.65 * r.visitas_realizadas - r.pedidos_levantados); return n > 0 ? `faltan ${n} pedidos` : null; }
    case "lan": { const n = Math.ceil(0.4 * r.clientes_compradores - r.clientes_con_lanzamiento); return n > 0 ? `faltan ${n} clientes con lanzamiento` : null; }
    case "act": { const n = r.clientes_cartera - r.clientes_compradores - Math.floor(0.15 * r.clientes_cartera); return n > 0 ? `faltan ${n} clientes activos` : null; }
  }
}

export type EstadoRacha = "viva" | "protegida" | "riesgo" | "rota";
export type RachaInfo = { meses: number; estado: EstadoRacha; falta: string | null; mejor: number };

export type VendorGame = {
  id: string;
  rachas: Record<RachaKpi, RachaInfo>;
  rachaGeneral: number; // meses seguidos con VTA y COB sin rojo (incluye el mes en curso si viene sin rojo)
  multiplicador: number;
  protectores: number;
  protectorMax: number;
  protectoresGanados: string[]; // motivos de los últimos
  xpMes: Record<string, number>;
  xpTemporada: number;
  misionesMes: Record<string, number>;
  temporadaProm: number;
  temporadaPuesto: number;
  nivelTemporada: Nivel;
  nivelTemporadaPrev: Nivel | null;
  prevTemporadaProm: number | null;
  division: number;
};

export type Division = { idx: number; nombre: string; miembros: { id: string; pos: number; prom: number; xp: number; zona: "ascenso" | "descenso" | null }[] };

export type Game = {
  vendors: Map<string, VendorGame>;
  divisiones: Division[];
  remontadas: Record<string, string>; // mes → vendedor
  temporada: Temporada;
  mvpSucursal: Map<string, { id: string; mejora: number }>;
  dtDelMes: { supervisor: string; mejora: number; prom: number } | null;
  cintaCapitan: { sucursal: string; meses: number } | null;
  cadenas: Map<string, number>;
};

const DIVISIONES = ["Ristretto", "Espresso", "Doppio", "Lungo", "Cortado", "Macchiato", "Capuccino", "Flat White", "Latte", "Mocca", "Americano", "Lágrima", "Affogato", "Irlandés"];

export function computeGame(meses: string[], boards: Map<string, Ranked[]>, mesActual: string): Game {
  const ids = boards.get(mesActual)!.map((x) => x.id);
  const byMes = new Map<string, Map<string, Ranked>>([...boards].map(([m, b]) => [m, new Map(b.map((x) => [x.id, x]))]));

  // Remontada de cada mes (más puestos subidos)
  const remontadas: Record<string, string> = {};
  for (const m of meses) {
    const best = [...boards.get(m)!].filter((x) => x.deltaRank !== null).sort((a, b) => (b.deltaRank ?? 0) - (a.deltaRank ?? 0))[0];
    if (best) remontadas[m] = best.id;
  }

  const temporada = temporadaDe(mesActual);
  const prevTemp = TEMPORADAS[TEMPORADAS.indexOf(temporada) - 1] ?? null;
  const vendors = new Map<string, VendorGame>();

  for (const id of ids) {
    const racha = { vta: 0, cob: 0, rel: 0, ent: 0 } as Record<RachaKpi, number>;
    const mejor = { vta: 0, cob: 0, rel: 0, ent: 0 } as Record<RachaKpi, number>;
    let general = 0;
    let prot = 0;
    const ganados: string[] = [];
    const xpMes: Record<string, number> = {};
    const misionesMes: Record<string, number> = {};
    const estados = {} as Record<RachaKpi, RachaInfo>;

    for (const m of meses) {
      const x = byMes.get(m)!.get(id);
      if (!x) continue;
      const sem = x.s.semaforos;
      const enCurso = m === mesActual;
      const misiones = misionesDelMes(m).filter((mi) => mi.alcance === "INDIVIDUAL" && progresoIndividual(mi, x.raw, x.s) >= 1).length;
      misionesMes[m] = misiones;

      // Racha general (VTA y COB sin rojo) → multiplicador
      const sinRojo = sem.vta !== "rojo" && sem.cob !== "rojo";
      general = sinRojo ? general + 1 : 0;

      if (!enCurso) {
        // Rachas por KPI con Protector: amarillo consume uno; rojo rompe.
        for (const k of RACHA_KPIS) {
          if (sem[k] === "verde") racha[k]++;
          else if (sem[k] === "amarillo" && prot > 0) { prot--; racha[k]++; }
          else racha[k] = 0;
          mejor[k] = Math.max(mejor[k], racha[k]);
        }
        // Protectores: se ganan con podio (general o por KPI) o con 3+ misiones; tope según nivel del mes.
        const podio = x.rank <= 3 || KPIS.some((k) => x.rankKpi[k.key] <= 3);
        if (podio || misiones >= 2) { prot++; ganados.push(`${m}: ${podio ? "podio" : "misiones"}`); }
        prot = Math.min(prot, PROTECTOR_MAX[x.s.nivel]);
      } else {
        // Mes en curso: no se consume nada todavía; mostramos el estado.
        let disponibles = prot;
        for (const k of RACHA_KPIS) {
          const falta = faltaParaVerde(k, x.raw);
          if (sem[k] === "verde") estados[k] = { meses: racha[k] + 1, estado: "viva", falta: null, mejor: Math.max(mejor[k], racha[k] + 1) };
          else if (sem[k] === "amarillo" && disponibles > 0) { disponibles--; estados[k] = { meses: racha[k], estado: "protegida", falta, mejor: mejor[k] }; }
          else estados[k] = { meses: racha[k], estado: racha[k] > 0 ? "riesgo" : "rota", falta, mejor: mejor[k] };
        }
      }

      const verdes = KPIS.filter((k) => sem[k.key] === "verde").length;
      const amarillos = KPIS.filter((k) => sem[k.key] === "amarillo").length;
      const base = 10 * verdes + 4 * amarillos + 20 * misiones + (remontadas[m] === id ? 30 : 0);
      xpMes[m] = Math.round(base * multiplicador(general));
    }

    const actual = byMes.get(mesActual)!.get(id)!;
    vendors.set(id, {
      id,
      rachas: estados,
      rachaGeneral: general,
      multiplicador: multiplicador(general),
      protectores: prot,
      protectorMax: PROTECTOR_MAX[actual.s.nivel],
      protectoresGanados: ganados.slice(-3),
      xpMes,
      xpTemporada: temporada.meses.reduce((a, m) => a + (xpMes[m] ?? 0), 0),
      misionesMes,
      temporadaProm: promedio(temporada.meses.map((m) => byMes.get(m)?.get(id)?.s.puntaje ?? 0)),
      temporadaPuesto: 0,
      nivelTemporada: "Bronce",
      nivelTemporadaPrev: null,
      prevTemporadaProm: prevTemp ? promedio(prevTemp.meses.map((m) => byMes.get(m)?.get(id)?.s.puntaje ?? 0)) : null,
      division: 0,
    });
  }

  // Niveles de temporada por percentil (actual y anterior)
  const all = [...vendors.values()];
  const ordenAct = [...all].sort((a, b) => b.temporadaProm - a.temporadaProm || b.xpTemporada - a.xpTemporada);
  ordenAct.forEach((v, i) => { v.temporadaPuesto = i + 1; v.nivelTemporada = nivelPorPuesto(i + 1, all.length); });
  if (prevTemp) {
    const ordenPrev = [...all].sort((a, b) => b.prevTemporadaProm! - a.prevTemporadaProm!);
    ordenPrev.forEach((v, i) => (v.nivelTemporadaPrev = nivelPorPuesto(i + 1, all.length)));
  }

  // Tu Liga: divisiones de ~10 armadas con la temporada anterior; se juegan con el promedio de la actual (desempate: XP)
  const nDiv = Math.round(all.length / 10);
  const base = prevTemp ? [...all].sort((a, b) => b.prevTemporadaProm! - a.prevTemporadaProm!) : ordenAct;
  const divisiones: Division[] = [];
  for (let d = 0; d < nDiv; d++) {
    const desde = Math.round((d * all.length) / nDiv);
    const hasta = Math.round(((d + 1) * all.length) / nDiv);
    const grupo = base.slice(desde, hasta).sort((a, b) => b.temporadaProm - a.temporadaProm || b.xpTemporada - a.xpTemporada);
    divisiones.push({
      idx: d,
      nombre: `División ${d + 1} · Liga ${DIVISIONES[d % DIVISIONES.length]}`,
      miembros: grupo.map((v, i) => {
        v.division = d;
        const zona = i < 3 && d > 0 ? "ascenso" : i >= grupo.length - 3 && d < nDiv - 1 ? "descenso" : null;
        return { id: v.id, pos: i + 1, prom: v.temporadaProm, xp: v.xpTemporada, zona };
      }),
    });
  }

  // MVP del equipo (más mejoró en su sucursal) y DT del mes (supervisor cuyo equipo más mejoró)
  const actualBoard = boards.get(mesActual)!;
  const mvpSucursal = new Map<string, { id: string; mejora: number }>();
  for (const [s, g] of groupBy(actualBoard, (x) => x.sucursal)) {
    const b = g.filter((x) => x.prevPuntaje !== null).sort((a, c) => (c.s.puntaje - c.prevPuntaje!) - (a.s.puntaje - a.prevPuntaje!))[0];
    if (b) mvpSucursal.set(s, { id: b.id, mejora: b.s.puntaje - b.prevPuntaje! });
  }
  let dtDelMes: Game["dtDelMes"] = null;
  for (const [sup, g] of groupBy(actualBoard, (x) => x.supervisor)) {
    const prev = g.filter((x) => x.prevPuntaje !== null);
    if (!prev.length) continue;
    const prom = promedio(g.map((x) => x.s.puntaje));
    const mejora = prom - promedio(prev.map((x) => x.prevPuntaje!));
    if (!dtDelMes || mejora > dtDelMes.mejora) dtDelMes = { supervisor: sup, mejora, prom };
  }

  // Cadena de sucursal: meses seguidos con promedio ≥ promedio nacional → Cinta de Capitán a la más larga
  const cadenas = new Map<string, number>();
  for (const m of meses) {
    const b = boards.get(m)!;
    const nac = promedio(b.map((x) => x.s.puntaje));
    for (const [s, g] of groupBy(b, (x) => x.sucursal)) cadenas.set(s, promedio(g.map((x) => x.s.puntaje)) >= nac ? (cadenas.get(s) ?? 0) + 1 : 0);
  }
  const top = [...cadenas.entries()].sort((a, b) => b[1] - a[1])[0];
  const cintaCapitan = top && top[1] > 0 ? { sucursal: top[0], meses: top[1] } : null;

  return { vendors, divisiones, remontadas, temporada, mvpSucursal, dtDelMes, cintaCapitan, cadenas };
}

export const RACHA_LABEL: Record<RachaKpi, string> = { vta: KPI_BY_KEY.vta.nombre, cob: KPI_BY_KEY.cob.nombre, rel: KPI_BY_KEY.rel.nombre, ent: "Entregas" };

// ---------- Misión colectiva del equipo (la elige el supervisor) ----------
export type MisionEquipo = { key: string; titulo: string; descripcion: string; icono: string; progreso: (team: Ranked[]) => number };
export const MISIONES_EQUIPO: MisionEquipo[] = [
  { key: "cob-sin-rojo", titulo: "Nadie en rojo en Cobranzas", descripcion: "Todo el equipo con Cobranzas en amarillo o verde.", icono: "💰", progreso: (t) => (t.length ? t.filter((x) => x.s.semaforos.cob !== "rojo").length / t.length : 0) },
  { key: "rel-80", titulo: "80% del equipo con Relevamientos en verde", descripcion: "Ocho de cada diez con todas las encuestas hechas.", icono: "📋", progreso: (t) => (t.length ? Math.min(1, t.filter((x) => x.s.semaforos.rel === "verde").length / t.length / 0.8) : 0) },
  { key: "lan-80", titulo: "80% del equipo con Lanzamientos en verde", descripcion: "Que los lanzamientos lleguen a toda la cartera.", icono: "🚀", progreso: (t) => (t.length ? Math.min(1, t.filter((x) => x.s.semaforos.lan === "verde").length / t.length / 0.8) : 0) },
];
export const misionEquipo = (key?: string | null) => MISIONES_EQUIPO.find((m) => m.key === key) ?? MISIONES_EQUIPO[0];
