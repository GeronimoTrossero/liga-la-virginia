import { KPIS, score, type KpiKey, type Raw, type Score } from "./scoring";

export type VendedorInfo = { id: string; nombre: string; sucursal: string; regional: string; supervisor: string; tipo: string; zona: string };
export type Entry = VendedorInfo & { raw: Raw; s: Score };
export type Ranked = Entry & {
  rank: number; rankSucursal: number; rankTipo: number; rankKpi: Record<KpiKey, number>;
  prevRank: number | null; deltaRank: number | null; prevPuntaje: number | null; prevCumpl: Record<KpiKey, number> | null;
};

function rankBy<T>(list: T[], cmp: (a: T, b: T) => number, set: (x: T, r: number) => void) {
  [...list].sort(cmp).forEach((x, i) => set(x, i + 1));
}

/** Calcula puntajes y rankings de un mes (general, sucursal, tipo y por KPI). */
export function rankear(entries: (VendedorInfo & { raw: Raw })[], prev?: (VendedorInfo & { raw: Raw })[]): Ranked[] {
  const out: Ranked[] = entries.map((e) => ({
    ...e, s: score(e.raw), rank: 0, rankSucursal: 0, rankTipo: 0, rankKpi: {} as Record<KpiKey, number>,
    prevRank: null, deltaRank: null, prevPuntaje: null, prevCumpl: null,
  }));
  const byPts = (a: Ranked, b: Ranked) => b.s.puntaje - a.s.puntaje || a.id.localeCompare(b.id);
  rankBy(out, byPts, (x, r) => (x.rank = r));
  for (const g of groupBy(out, (x) => x.sucursal).values()) rankBy(g, byPts, (x, r) => (x.rankSucursal = r));
  for (const g of groupBy(out, (x) => x.tipo).values()) rankBy(g, byPts, (x, r) => (x.rankTipo = r));
  for (const k of KPIS) rankBy(out, (a, b) => b.s.cumpl[k.key] - a.s.cumpl[k.key] || byPts(a, b), (x, r) => (x.rankKpi[k.key] = r));
  if (prev?.length) {
    const p = new Map(rankear(prev).map((x) => [x.id, x]));
    for (const x of out) {
      const px = p.get(x.id);
      if (px) { x.prevRank = px.rank; x.deltaRank = px.rank - x.rank; x.prevPuntaje = px.s.puntaje; x.prevCumpl = px.s.cumpl; }
    }
  }
  return out.sort((a, b) => a.rank - b.rank);
}

export function groupBy<T, K>(list: T[], key: (x: T) => K): Map<K, T[]> {
  const m = new Map<K, T[]>();
  for (const x of list) { const k = key(x); if (!m.has(k)) m.set(k, []); m.get(k)!.push(x); }
  return m;
}

export function promedio(xs: number[]) {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}
