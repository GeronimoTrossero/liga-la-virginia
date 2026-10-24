import Link from "next/link";
import { groupBy, promedio, type Ranked } from "@/lib/board";
import type { Anual } from "@/lib/data";
import { DERBIS, partido } from "@/lib/clasicos";
import { fmtPts } from "@/lib/scoring";
import { TEMPORADA, nombreMes } from "@/lib/config";
import { Ilus } from "./Icono";

type Premio = { titulo: string; x: Ranked; detalle: string };

function mejor<T>(xs: T[], valor: (t: T) => number | null) {
  let best: T | undefined;
  let bv = -Infinity;
  for (const t of xs) {
    const v = valor(t);
    if (v !== null && v > bv) { bv = v; best = t; }
  }
  return best && bv > 0 ? { t: best, v: bv } : undefined;
}

function Marcador({ titulo, a, b, ga, gb, propio }: { titulo: string; a: string; b: string; ga: number; gb: number; propio?: "a" | "b" }) {
  return (
    <li className="flex flex-col gap-1 border-t border-linea py-2.5 first:border-0 first:pt-0">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-niebla">{titulo}</div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-sm">
        <span className={`truncate font-bold ${propio === "a" ? "text-azul" : "text-niebla"}`}>{a}</span>
        <span className="cifra rounded-md bg-azul px-2 py-0.5 text-lg text-superficie">{ga}-{gb}</span>
        <span className={`truncate text-right font-bold ${propio === "b" ? "text-azul" : "text-niebla"}`}>{b}</span>
      </div>
    </li>
  );
}

export function IndicadoresEquipo({
  team,
  board,
  anual,
  rachaMax,
}: {
  team: Ranked[];
  board: Ranked[];
  anual: Anual[];
  rachaMax: (id: string) => number;
}) {
  // Revelación del mes: cuatro formas de premiar la mejora dentro del equipo
  const premios: Premio[] = [];
  const abs = mejor(team, (x) => (x.prevPuntaje === null ? null : x.s.puntaje - x.prevPuntaje));
  if (abs) premios.push({ titulo: "Mejora absoluta", x: abs.t, detalle: `+${abs.v.toFixed(1).replace(".", ",")} pts vs. mes anterior` });
  const rel = mejor(team, (x) => (x.prevPuntaje === null || x.prevPuntaje >= 100 ? null : (x.s.puntaje - x.prevPuntaje) / (100 - x.prevPuntaje)));
  if (rel) premios.push({ titulo: "Mejora relativa", x: rel.t, detalle: `cerró el ${Math.round(rel.v * 100)}% del margen a 100` });
  const racha = mejor(team, (x) => rachaMax(x.id));
  if (racha) premios.push({ titulo: "Racha", x: racha.t, detalle: `${racha.v} meses seguidos cumpliendo` });
  const rem = mejor(team, (x) => x.deltaRank);
  if (rem) premios.push({ titulo: "Remontada", x: rem.t, detalle: `subió ${rem.v} puestos (#${rem.t.prevRank} → #${rem.t.rank})` });

  // Clásicos y derbis: los que involucran al equipo
  const sucursales = new Set(team.map((x) => x.sucursal));
  const zonas = new Set(team.map((x) => x.zona));
  const tipos = new Set(team.map((x) => x.tipo.toLowerCase()));
  const interior = board.filter((x) => x.zona === "INTERIOR");
  const gba = board.filter((x) => x.zona === "GBA");
  const ivg = partido(interior, gba);
  const plaza = board.filter((x) => x.tipo.toLowerCase().includes("plaza"));
  const campana = board.filter((x) => x.tipo.toLowerCase().includes("campa"));
  const pvc = plaza.length && campana.length ? partido(plaza, campana) : null;
  const esPlaza = [...tipos].some((t) => t.includes("plaza"));
  const esCampana = [...tipos].some((t) => t.includes("campa"));
  const derbis = DERBIS.filter(([, a, b]) => sucursales.has(a) || sucursales.has(b))
    .map(([titulo, a, b]) => {
      const A = board.filter((x) => x.sucursal === a);
      const B = board.filter((x) => x.sucursal === b);
      return A.length && B.length ? { titulo, a, b, r: partido(A, B), propio: (sucursales.has(a) ? "a" : "b") as "a" | "b" } : null;
    })
    .filter((d) => d !== null);

  // Liga anual · Balón de Oro: promedio de los 12 meses
  const ids = new Set(team.map((x) => x.id));
  const anualEquipo = anual.filter((a) => ids.has(a.id)).sort((a, b) => b.puntaje_prom - a.puntaje_prom);
  const ligaSuc = [...groupBy(anual, (a) => a.sucursal).entries()]
    .map(([s, g]) => ({ s, prom: promedio(g.map((a) => a.puntaje_prom)) }))
    .sort((a, b) => b.prom - a.prom);

  return (
    <section className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-3">
      <div className="panel p-4 sm:p-5">
        <div className="volanta">Premios a la mejora</div>
        <h2 className="titulo flex items-center gap-2 text-xl"><Ilus n="holo" size={30} /> Revelación del mes</h2>
        <p className="mt-1 text-sm leading-relaxed text-niebla">Absoluta, relativa al margen disponible, racha y remontada, dentro de tu equipo.</p>
        {premios.length === 0 ? (
          <div className="mt-3 text-sm text-tenue">Sin mejoras respecto del mes anterior.</div>
        ) : (
          <ul className="mt-3 flex flex-col">
            {premios.map((p) => (
              <li key={p.titulo} className="flex flex-col border-t border-linea py-2 first:border-0 first:pt-0">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-niebla">{p.titulo}</span>
                <Link href={`/vendedor/${p.x.id}`} className="font-semibold text-tinta hover:text-azul-web hover:underline">{p.x.nombre}</Link>
                <span className="text-xs text-niebla">{p.detalle}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="panel p-4 sm:p-5">
        <div className="volanta">Enfrentamientos fijos</div>
        <h2 className="titulo flex items-center gap-2 text-xl"><Ilus n="escudo" size={30} /> Clásicos y derbis</h2>
        <p className="mt-1 text-sm leading-relaxed text-niebla">Un gol por cada KPI con mejor cumplimiento promedio.</p>
        <ul className="mt-3 flex flex-col">
          {pvc && <Marcador titulo="Plaza vs. Campaña" a="Plaza" b="Campaña" ga={pvc.ga} gb={pvc.gb} propio={esPlaza ? "a" : esCampana ? "b" : undefined} />}
          <Marcador titulo="Interior vs. AMBA" a="Interior" b="AMBA" ga={ivg.ga} gb={ivg.gb} propio={zonas.has("INTERIOR") ? "a" : zonas.has("GBA") ? "b" : undefined} />
          {derbis.map((d) => <Marcador key={d.titulo} titulo={d.titulo} a={d.a.split("/")[0]} b={d.b.split("/")[0]} ga={d.r.ga} gb={d.r.gb} propio={d.propio} />)}
        </ul>
      </div>

      <div className="panel p-4 sm:p-5">
        <div className="volanta">Temporada {TEMPORADA}</div>
        <h2 className="titulo flex items-center gap-2 text-xl"><Ilus n="balon" size={30} /> Liga anual · Balón de Oro</h2>
        <p className="mt-1 text-sm leading-relaxed text-niebla">Mejor puntaje promedio de los 12 meses, por vendedor y por sucursal.</p>
        <ol className="mt-3 flex flex-col gap-1.5">
          {anualEquipo.slice(0, 5).map((a) => (
            <li key={a.id} className="flex items-center gap-2 text-sm">
              <span className="cifra w-10 text-right text-niebla">#{a.rank_general}</span>
              <Link href={`/vendedor/${a.id}`} className="flex-1 truncate font-semibold text-tinta hover:text-azul-web hover:underline">{a.nombre}</Link>
              <span className="cifra text-base text-azul">{fmtPts(a.puntaje_prom)}</span>
            </li>
          ))}
        </ol>
        <div className="mt-3 flex flex-col gap-1 border-t border-linea pt-3 text-sm">
          {[...sucursales].map((s) => {
            const i = ligaSuc.findIndex((x) => x.s === s);
            return i < 0 ? null : (
              <div key={s} className="flex items-center justify-between gap-2">
                <span className="text-niebla">Sucursal {s.split("/")[0]}</span>
                <span className="font-semibold text-tinta">#{i + 1} de {ligaSuc.length} · <span className="cifra text-azul">{fmtPts(ligaSuc[i].prom)}</span></span>
              </div>
            );
          })}
          {anualEquipo[0] && <div className="text-xs text-tenue">Mejor mes de {anualEquipo[0].nombre}: {nombreMes(anualEquipo[0].mejor_mes, true)}</div>}
        </div>
      </div>
    </section>
  );
}
