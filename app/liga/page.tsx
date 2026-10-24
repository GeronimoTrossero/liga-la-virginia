import Link from "next/link";
import { Suspense } from "react";
import { getAnual, getBoard } from "@/lib/data";
import { groupBy, promedio, type Ranked } from "@/lib/board";
import { MES_ACTUAL, MESES, TEMPORADA, nombreMes, mesAnterior } from "@/lib/config";
import { KPIS, KPI_BY_KEY, fmtPts, nivelBase, type KpiKey } from "@/lib/scoring";
import { CartaDe } from "@/components/CartaDe";
import { LigaFiltros } from "@/components/LigaFiltros";
import { NivelBadge, Delta, SEM_COLOR } from "@/components/ui";

const DERBIS: [string, string, string][] = [
  ["Clásico del Litoral", "Santa Fe", "Rosario"],
  ["Clásico del Norte", "Tucumán", "Salta"],
  ["Clásico de la Costa", "Mar del Plata", "Bahía Blanca"],
  ["Cuyo vs. Centro", "Mendoza", "Córdoba/Rio Cuarto"],
  ["Clásico del NEA", "Resistencia", "Posadas"],
];

type SP = { mes?: string; sucursal?: string; regional?: string; tipo?: string; kpi?: string };

/** Marcador tipo partido: un gol por cada KPI en que el promedio de cumplimiento es mayor. */
function partido(a: Ranked[], b: Ranked[]) {
  let ga = 0, gb = 0;
  for (const k of KPIS) {
    const ca = promedio(a.map((x) => x.s.cumpl[k.key]));
    const cb = promedio(b.map((x) => x.s.cumpl[k.key]));
    if (ca > cb + 1e-4) ga++;
    else if (cb > ca + 1e-4) gb++;
  }
  return { ga, gb, pa: promedio(a.map((x) => x.s.puntaje)), pb: promedio(b.map((x) => x.s.puntaje)) };
}

function ligaSucursales(board: Ranked[]) {
  return [...groupBy(board, (x) => x.sucursal).entries()].map(([s, g]) => ({ s, prom: promedio(g.map((x) => x.s.puntaje)), n: g.length, kg: g.reduce((a, x) => a + x.raw.kilos_vendidos, 0) / g.reduce((a, x) => a + x.raw.kilos_objetivo, 0) })).sort((a, b) => b.prom - a.prom);
}

export default async function LigaPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const anualMode = sp.mes === "anual";
  const mes = !anualMode && sp.mes && MESES.includes(sp.mes) ? sp.mes : MES_ACTUAL;
  const kpi = (KPIS.find((k) => k.key === sp.kpi)?.key ?? null) as KpiKey | null;

  const [board, anual] = await Promise.all([getBoard(mes), getAnual()]);
  const filtrar = <T extends { sucursal: string; regional: string; tipo: string }>(xs: T[]) =>
    xs.filter((x) => (!sp.sucursal || x.sucursal === sp.sucursal) && (!sp.regional || x.regional === sp.regional) && (!sp.tipo || x.tipo === sp.tipo));

  const filas = kpi ? [...filtrar(board)].sort((a, b) => a.rankKpi[kpi] - b.rankKpi[kpi]) : filtrar(board);
  const anualFilas = filtrar(anual);

  const [p1, p2, p3] = board;
  const remontada = [...board].filter((x) => x.deltaRank !== null).sort((a, b) => (b.deltaRank ?? 0) - (a.deltaRank ?? 0))[0];
  // Revelación: mayor mejora relativa (distinta del de la Remontada para repartir el protagonismo)
  const revelacion = [...board].filter((x) => x.prevPuntaje !== null && x.id !== remontada?.id).map((x) => ({ x, r: (x.s.puntaje - x.prevPuntaje!) / (100 - x.prevPuntaje!) })).sort((a, b) => b.r - a.r)[0];

  const gba = board.filter((x) => x.zona === "GBA");
  const interior = board.filter((x) => x.zona === "INTERIOR");
  const ivg = partido(interior, gba);
  const ls = ligaSucursales(board);
  // Copa Derbi: rodante, la gana la sucursal #1 de la liga de sucursales de cada mes
  const prevMeses = MESES.slice(0, MESES.indexOf(mes) + 1).slice(-4);
  const copa = await Promise.all(prevMeses.map(async (m) => ({ m, s: m === mes ? ls[0].s : ligaSucursales(await getBoard(m))[0].s })));

  const sucursales = [...new Set(board.map((x) => x.sucursal))].sort();
  const regionales = [...new Set(board.map((x) => x.regional))].sort();
  const tipos = [...new Set(board.map((x) => x.tipo))].sort();

  return (
    <div className="space-y-12">
      <div className="pt-2">
        <div className="text-xs font-bold uppercase tracking-[0.3em] text-acento">Temporada {TEMPORADA} · {nombreMes(mes)}</div>
        <h1 className="font-display text-5xl font-black uppercase leading-none">La Liga</h1>
      </div>

      {/* Podio */}
      <section>
        <h2 className="mb-4 font-display text-3xl font-black uppercase">🏆 Podio de {nombreMes(mes)}</h2>
        <div className="flex flex-wrap items-end justify-center gap-4 sm:gap-8">
          <div className="order-2 sm:order-1"><CartaDe x={p2} size="md" link /><div className="mt-2 text-center font-display text-2xl font-black text-niebla">2°</div></div>
          <div className="order-1 sm:order-2"><CartaDe x={p1} size="lg" link /><div className="mt-2 text-center font-display text-3xl font-black text-oro">1°</div></div>
          <div className="order-3"><CartaDe x={p3} size="md" link /><div className="mt-2 text-center font-display text-2xl font-black text-niebla">3°</div></div>
        </div>
      </section>

      {/* Destacados */}
      <section className="grid gap-4 md:grid-cols-3">
        {remontada && (
          <Destacado icon="🚀" titulo="Remontada del mes" nombre={remontada.nombre} id={remontada.id} detalle={`Subió ${remontada.deltaRank} puestos: del #${remontada.prevRank} al #${remontada.rank}`} />
        )}
        {revelacion && (
          <Destacado icon="✨" titulo="Revelación" nombre={revelacion.x.nombre} id={revelacion.x.id} detalle={`${fmtPts(revelacion.x.prevPuntaje!)} → ${fmtPts(revelacion.x.s.puntaje)} · cerró el ${Math.round(revelacion.r * 100)}% de la brecha a 100`} />
        )}
        <div className="panel p-5">
          <div className="text-xs font-bold uppercase tracking-widest text-niebla">🏟️ Clásico nacional</div>
          <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-center">
            <div><div className="font-display text-xl font-black uppercase">Interior</div><div className="text-xs text-niebla">{fmtPts(ivg.pa)} pts prom.</div></div>
            <div className="rounded-lg bg-black/40 px-3 py-1 font-display text-4xl font-black">{ivg.ga}<span className="text-niebla">-</span>{ivg.gb}</div>
            <div><div className="font-display text-xl font-black uppercase">GBA</div><div className="text-xs text-niebla">{fmtPts(ivg.pb)} pts prom.</div></div>
          </div>
          <div className="mt-2 text-center text-xs text-niebla">Un gol por cada KPI con mejor cumplimiento promedio</div>
        </div>
      </section>

      {/* Ranking */}
      <section id="ranking" className="scroll-mt-20">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-display text-3xl font-black uppercase">📊 Ranking {anualMode ? `anual ${TEMPORADA}` : "general"}{kpi ? ` · ${KPI_BY_KEY[kpi].nombre}` : ""}</h2>
          <Suspense>
            <LigaFiltros
              meses={[{ value: "", label: `${nombreMes(MES_ACTUAL)} (en curso)` }, ...MESES.slice(0, -1).reverse().map((m) => ({ value: m, label: nombreMes(m) })), { value: "anual", label: `Anual ${TEMPORADA}` }]}
              sucursales={sucursales}
              regionales={regionales}
              tipos={tipos}
              kpis={KPIS.map((k) => ({ value: k.key, label: `${k.abbr} · ${k.nombre}` }))}
            />
          </Suspense>
        </div>
        <div className="panel scrollbar-thin max-h-[640px] overflow-auto">
          {anualMode ? (
            <table className="w-full min-w-[620px] text-sm">
              <thead className="sticky top-0 bg-panel text-left text-xs uppercase tracking-wider text-niebla">
                <tr><th className="p-2 text-right">#</th><th>Vendedor</th><th>Sucursal</th><th>Tipo</th><th className="text-center">Meses en podio</th><th className="text-center">Mejor mes</th><th className="p-2 text-right">Promedio</th></tr>
              </thead>
              <tbody>
                {anualFilas.map((a) => (
                  <tr key={a.id} className="border-t border-linea/50 hover:bg-white/5">
                    <td className="p-2 text-right font-display text-lg font-bold text-niebla">{a.rank_general}</td>
                    <td><Link href={`/vendedor/${a.id}`} className="font-semibold hover:text-acento">{a.nombre}</Link></td>
                    <td className="text-niebla">{a.sucursal}</td>
                    <td className="text-niebla">{a.tipo}</td>
                    <td className="text-center">{a.meses_podio || "—"}</td>
                    <td className="text-center text-niebla">{nombreMes(a.mejor_mes, true)}</td>
                    <td className="p-2 text-right font-display text-lg font-black">{fmtPts(a.puntaje_prom)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full min-w-[720px] text-sm">
              <thead className="sticky top-0 bg-panel text-left text-xs uppercase tracking-wider text-niebla">
                <tr>
                  <th className="p-2 text-right">#</th><th>Vendedor</th><th>Sucursal</th><th>Tipo</th>
                  {kpi && <th className="text-center">{KPI_BY_KEY[kpi].abbr}</th>}
                  <th className="text-center">Semáforo</th><th>Nivel</th><th className="text-center">vs mes ant.</th><th className="p-2 text-right">Pts</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((x) => (
                  <tr key={x.id} className="border-t border-linea/50 hover:bg-white/5">
                    <td className="p-2 text-right font-display text-lg font-bold text-niebla">{kpi ? x.rankKpi[kpi] : x.rank}</td>
                    <td><Link href={`/vendedor/${x.id}`} className="font-semibold hover:text-acento">{x.nombre}</Link></td>
                    <td className="text-niebla">{x.sucursal}</td>
                    <td className="text-niebla">{x.tipo}</td>
                    {kpi && <td className="text-center font-display font-bold" style={{ color: SEM_COLOR[x.s.semaforos[kpi]] }}>{Math.round(x.s.cumpl[kpi] * 100)}%</td>}
                    <td><div className="flex justify-center gap-1">{KPIS.map((k) => <span key={k.key} title={k.nombre} className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: SEM_COLOR[x.s.semaforos[k.key]] }} />)}</div></td>
                    <td><NivelBadge nivel={x.s.nivel} bloqueado={x.s.bloqueado} /></td>
                    <td className="text-center text-xs"><Delta d={x.deltaRank} /></td>
                    <td className="p-2 text-right font-display text-lg font-black">{fmtPts(x.s.puntaje)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* Balón de Oro */}
      <section>
        <h2 className="mb-1 font-display text-3xl font-black uppercase">⚽ Balón de Oro {TEMPORADA}</h2>
        <div className="mb-4 text-sm text-niebla">Promedio de los 12 meses. El ganador se lleva la Golden Card.</div>
        <div className="grid gap-2 sm:grid-cols-2">
          {anual.slice(0, 10).map((a, i) => (
            <Link key={a.id} href={`/vendedor/${a.id}`} className={`panel flex items-center gap-3 p-3 hover:border-oro ${i === 0 ? "border-oro/70 bg-oro/10 sm:col-span-2" : ""}`}>
              <span className={`w-10 text-center font-display font-black ${i === 0 ? "text-4xl text-oro" : "text-2xl text-niebla"}`}>{i + 1}</span>
              <span className="flex-1">
                <span className={`block font-semibold ${i === 0 ? "font-display text-2xl uppercase" : ""}`}>{i === 0 ? "🏆 " : ""}{a.nombre}</span>
                <span className="text-xs text-niebla">{a.sucursal} · {a.meses_podio} meses en podio · mejor: {nombreMes(a.mejor_mes, true)}</span>
              </span>
              <NivelBadge nivel={nivelBase(a.puntaje_prom)} />
              <span className="w-16 text-right font-display text-2xl font-black">{fmtPts(a.puntaje_prom)}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Clásicos */}
      <section>
        <h2 className="mb-1 font-display text-3xl font-black uppercase">🔥 Clásicos de {nombreMes(mes).split(" ")[0]}</h2>
        <div className="mb-4 text-sm text-niebla">Sucursal contra sucursal: un gol por cada KPI con mejor cumplimiento promedio.</div>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {DERBIS.map(([titulo, a, b]) => {
            const A = board.filter((x) => x.sucursal === a);
            const B = board.filter((x) => x.sucursal === b);
            if (!A.length || !B.length) return null;
            const r = partido(A, B);
            return (
              <div key={titulo} className="panel p-4">
                <div className="text-center text-xs font-bold uppercase tracking-widest text-niebla">{titulo}</div>
                <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-center">
                  <div className={`font-display text-lg font-black uppercase leading-tight ${r.ga > r.gb ? "text-tiza" : "text-niebla"}`}>{a.split("/")[0]}</div>
                  <div className="rounded-lg bg-black/40 px-3 py-1 font-display text-3xl font-black">{r.ga}-{r.gb}</div>
                  <div className={`font-display text-lg font-black uppercase leading-tight ${r.gb > r.ga ? "text-tiza" : "text-niebla"}`}>{b.split("/")[0]}</div>
                </div>
                <div className="mt-1 grid grid-cols-2 text-center text-xs text-niebla"><span>{fmtPts(r.pa)} pts</span><span>{fmtPts(r.pb)} pts</span></div>
              </div>
            );
          })}
          <div className="panel border-oro/50 p-4">
            <div className="text-center text-xs font-bold uppercase tracking-widest text-oro">🏆 Copa Derbi (rodante)</div>
            <div className="mt-2 text-center font-display text-3xl font-black uppercase">{copa[copa.length - 1].s.split("/")[0]}</div>
            <div className="text-center text-xs text-niebla">La tiene la sucursal #1 del mes</div>
            <div className="mt-3 flex justify-center gap-3 text-xs text-niebla">
              {copa.slice(0, -1).map((c) => <span key={c.m}>{nombreMes(c.m, true)}: <b className="text-tiza">{c.s.split("/")[0]}</b></span>)}
            </div>
          </div>
        </div>
      </section>

      {/* Liga de sucursales */}
      <section>
        <h2 className="mb-4 font-display text-3xl font-black uppercase">🏟️ Liga de sucursales</h2>
        <div className="panel overflow-hidden">
          {ls.map((s, i) => (
            <div key={s.s} className="flex items-center gap-3 border-b border-linea/50 px-3 py-2 last:border-0">
              <span className="w-8 text-right font-display text-xl font-black text-niebla">{i + 1}</span>
              <span className="flex-1 font-semibold">{s.s} <span className="text-xs font-normal text-niebla">· {s.n} vendedores · kilos {Math.round(s.kg * 100)}%</span></span>
              <div className="hidden h-2 w-40 overflow-hidden rounded-full bg-white/5 sm:block"><div className="h-full rounded-full bg-gradient-to-r from-acento to-diamante" style={{ width: `${Math.max(0, (s.prom - 80) * 5)}%` }} /></div>
              <span className="w-16 text-right font-display text-xl font-black">{fmtPts(s.prom)}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Premios */}
      <section>
        <h2 className="mb-4 font-display text-3xl font-black uppercase">🎁 Premios</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["⚽", "Balón de Oro + Golden Card", "Mejor promedio anual. Carta dorada física y viaje para dos."],
            ["🏆", "Podio del mes", "Top 3 general: orden de compra y mención en la convención."],
            ["🚀", "Remontada", "El que más puestos sube en el mes: día libre."],
            ["✨", "Figurita Holo", "1° en el mismo KPI 3+ meses: canjeable por beneficio a elección."],
            ["🛡️", "Copa Derbi", "Trofeo rodante para la sucursal #1 del mes."],
            ["🔥", "Tercer Tiempo", "Asado para la sucursal que cumple la misión colectiva."],
          ].map(([i, t, d]) => (
            <div key={t} className="panel p-4">
              <div className="text-3xl">{i}</div>
              <div className="font-display text-xl font-bold uppercase">{t}</div>
              <div className="text-sm text-niebla">{d}</div>
            </div>
          ))}
        </div>
        <div className="mt-2 text-xs text-niebla">Catálogo configurable. Mes anterior de referencia: {mesAnterior(mes) ? nombreMes(mesAnterior(mes)!) : "—"}.</div>
      </section>
    </div>
  );
}

function Destacado({ icon, titulo, nombre, id, detalle }: { icon: string; titulo: string; nombre: string; id: string; detalle: string }) {
  return (
    <Link href={`/vendedor/${id}`} className="panel block p-5 hover:border-acento">
      <div className="text-xs font-bold uppercase tracking-widest text-niebla">{icon} {titulo}</div>
      <div className="mt-1 font-display text-3xl font-black uppercase leading-none">{nombre}</div>
      <div className="mt-1 text-sm text-niebla">{detalle}</div>
    </Link>
  );
}
