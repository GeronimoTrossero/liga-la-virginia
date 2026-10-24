import Link from "next/link";
import { Suspense } from "react";
import { getAnual, getBoard, getBoards, getGame } from "@/lib/data";
import { groupBy, promedio, type Ranked } from "@/lib/board";
import { MES_ACTUAL, MESES, TEMPORADA, nombreMes, mesAnterior } from "@/lib/config";
import { KPIS, KPI_BY_KEY, fmtPts, nivelBase, type KpiKey } from "@/lib/scoring";
import { CartaDe } from "@/components/CartaDe";
import { LigaFiltros } from "@/components/LigaFiltros";
import { NivelBadge, Delta, SEM_COLOR, SEM_TEXTO } from "@/components/ui";
import { Ilus, type Ilustracion } from "@/components/Icono";
import { Brain, Flag, Shield, Swords } from "lucide-react";

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

  const [board, anual, game, boards] = await Promise.all([getBoard(mes), getAnual(), getGame(), getBoards()]);
  const actual = boards.get(MES_ACTUAL)!;
  const kgV = actual.reduce((a, x) => a + x.raw.kilos_vendidos, 0);
  const kgO = actual.reduce((a, x) => a + x.raw.kilos_objetivo, 0);
  const nombreDe = new Map(actual.map((x) => [x.id, x]));
  // Adopción: dato simulado para la demo (en producción sale del login y de las acciones registradas)
  const activos = Math.round(actual.length * 0.83);
  const muro = MESES.slice().reverse().map((m) => ({ m, x: boards.get(m)![0] }));
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
        <div className="volanta">Temporada {TEMPORADA} · {nombreMes(mes)}</div>
        <h1 className="titulo text-3xl sm:text-4xl">Liga nacional</h1>
      </div>

      {/* La transmisión: tablero nacional */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {[
          ["Kilos del país", `${Math.round((kgV / kgO) * 100)}%`, `${Math.round(kgV).toLocaleString("es-AR")} de ${Math.round(kgO).toLocaleString("es-AR")} kg`],
          ["Puntaje promedio", fmtPts(promedio(actual.map((x) => x.s.puntaje))), "135 vendedores · 15 sucursales"],
          ["Bloqueados", String(actual.filter((x) => x.s.bloqueado).length), `${actual.filter((x) => x.s.semaforos.vta === "rojo" || x.s.semaforos.cob === "rojo").length} con VTA o COB en rojo`],
          ["Adopción", `${Math.round((activos / actual.length) * 100)}%`, `${activos} activos esta semana (simulado)`],
          ["Agentes IA", "2", "Cobranza WhatsApp · Góndola"],
        ].map(([t, v, d]) => (
          <div key={t} className="panel p-4">
            <div className="volanta">{t}</div>
            <div className="cifra text-4xl text-azul">{v}</div>
            <div className="text-xs text-niebla">{d}</div>
          </div>
        ))}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {game.dtDelMes && (
          <Link href={`/supervisor/${encodeURIComponent(game.dtDelMes.supervisor)}`} className="panel block p-5 hover:border-azul/50 hover:shadow-md">
            <div className="volanta flex items-center gap-1.5"><Brain className="size-4" aria-hidden /> DT del Mes</div>
            <div className="mt-1 text-2xl font-bold leading-tight text-azul">{game.dtDelMes.supervisor}</div>
            <div className="mt-1 text-sm text-niebla">Su equipo mejoró +{game.dtDelMes.mejora.toFixed(1).replace(".", ",")} pts promedio vs. el mes pasado</div>
          </Link>
        )}
        {game.cintaCapitan && (
          <div className="panel p-5">
            <div className="volanta flex items-center gap-1.5"><Shield className="size-4" aria-hidden /> Cinta de Capitán</div>
            <div className="mt-1 text-2xl font-bold leading-tight text-azul">{game.cintaCapitan.sucursal}</div>
            <div className="mt-1 text-sm text-niebla">Cadena de {game.cintaCapitan.meses} meses seguidos por encima del promedio nacional</div>
          </div>
        )}
        <Link href="/temporada" className="panel block !border-azul/30 p-5 hover:border-azul/50 hover:shadow-md">
          <div className="volanta flex items-center gap-1.5"><Flag className="size-4" aria-hidden /> Cierre de temporada</div>
          <div className="mt-1 text-2xl font-bold leading-tight text-azul">{game.temporada.nombre}</div>
          <div className="mt-1 text-sm text-niebla">Ascensos, descensos y campeones de cada división →</div>
        </Link>
      </section>


      {/* Podio */}
      <section>
        <h2 className="titulo mb-4 text-2xl">Podio de {nombreMes(mes)}</h2>
        <div className="flex flex-wrap items-end justify-center gap-4 sm:gap-8">
          <div className="order-2 sm:order-1"><CartaDe x={p2} size="md" link /><div className="mt-2 text-center cifra text-2xl text-azul text-niebla">2°</div></div>
          <div className="order-1 sm:order-2"><CartaDe x={p1} size="lg" link /><div className="mt-2 text-center cifra text-3xl text-azul text-dorado-texto">1°</div></div>
          <div className="order-3"><CartaDe x={p3} size="md" link /><div className="mt-2 text-center cifra text-2xl text-azul text-niebla">3°</div></div>
        </div>
      </section>

      {/* Destacados */}
      <section className="grid gap-4 md:grid-cols-3">
        {remontada && (
          <Destacado icon="cohete" titulo="Remontada del mes" nombre={remontada.nombre} id={remontada.id} detalle={`Subió ${remontada.deltaRank} puestos: del #${remontada.prevRank} al #${remontada.rank}`} />
        )}
        {revelacion && (
          <Destacado icon="holo" titulo="Revelación" nombre={revelacion.x.nombre} id={revelacion.x.id} detalle={`${fmtPts(revelacion.x.prevPuntaje!)} → ${fmtPts(revelacion.x.s.puntaje)} · cerró el ${Math.round(revelacion.r * 100)}% de la brecha a 100`} />
        )}
        <div className="panel p-5">
          <div className="volanta flex items-center gap-1.5"><Swords className="size-4" aria-hidden /> Clásico nacional</div>
          <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-center">
            <div><div className="text-lg font-bold text-azul">Interior</div><div className="text-xs text-niebla">{fmtPts(ivg.pa)} pts prom.</div></div>
            <div className="rounded-lg bg-azul px-3 py-1 text-white cifra text-4xl text-azul">{ivg.ga}<span className="text-niebla">-</span>{ivg.gb}</div>
            <div><div className="text-lg font-bold text-azul">GBA</div><div className="text-xs text-niebla">{fmtPts(ivg.pb)} pts prom.</div></div>
          </div>
          <div className="mt-2 text-center text-xs text-niebla">Un gol por cada KPI con mejor cumplimiento promedio</div>
        </div>
      </section>

      {/* Ranking */}
      <section id="ranking" className="scroll-mt-20">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <h2 className="titulo text-2xl">Ranking {anualMode ? `anual ${TEMPORADA}` : "general"}{kpi ? ` · ${KPI_BY_KEY[kpi].nombre}` : ""}</h2>
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
              <thead className="sticky top-0 bg-white text-left text-[11px] font-semibold uppercase tracking-wider text-niebla shadow-[0_1px_0_var(--color-linea)]">
                <tr><th className="p-2 text-right">#</th><th>Vendedor</th><th>Sucursal</th><th>Tipo</th><th className="text-center">Meses en podio</th><th className="text-center">Mejor mes</th><th className="p-2 text-right">Promedio</th></tr>
              </thead>
              <tbody>
                {anualFilas.map((a) => (
                  <tr key={a.id} className="border-t border-linea hover:bg-azul-suave/60">
                    <td className="p-2 text-right cifra text-tenue">{a.rank_general}</td>
                    <td><Link href={`/vendedor/${a.id}`} className="font-semibold hover:text-azul-web hover:underline">{a.nombre}</Link></td>
                    <td className="text-niebla">{a.sucursal}</td>
                    <td className="text-niebla">{a.tipo}</td>
                    <td className="text-center">{a.meses_podio || "—"}</td>
                    <td className="text-center text-niebla">{nombreMes(a.mejor_mes, true)}</td>
                    <td className="p-2 text-right cifra text-base text-azul">{fmtPts(a.puntaje_prom)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full min-w-[720px] text-sm">
              <thead className="sticky top-0 bg-white text-left text-[11px] font-semibold uppercase tracking-wider text-niebla shadow-[0_1px_0_var(--color-linea)]">
                <tr>
                  <th className="p-2 text-right">#</th><th>Vendedor</th><th>Sucursal</th><th>Tipo</th>
                  {kpi && <th className="text-center">{KPI_BY_KEY[kpi].abbr}</th>}
                  <th className="text-center">Semáforo</th><th>Nivel</th><th className="text-center">vs mes ant.</th><th className="p-2 text-right">Pts</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((x) => (
                  <tr key={x.id} className="border-t border-linea hover:bg-azul-suave/60">
                    <td className="p-2 text-right cifra text-tenue">{kpi ? x.rankKpi[kpi] : x.rank}</td>
                    <td><Link href={`/vendedor/${x.id}`} className="font-semibold hover:text-azul-web hover:underline">{x.nombre}</Link></td>
                    <td className="text-niebla">{x.sucursal}</td>
                    <td className="text-niebla">{x.tipo}</td>
                    {kpi && <td className="text-center cifra" style={{ color: SEM_TEXTO[x.s.semaforos[kpi]] }}>{Math.round(x.s.cumpl[kpi] * 100)}%</td>}
                    <td><div className="flex justify-center gap-1">{KPIS.map((k) => <span key={k.key} title={k.nombre} className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: SEM_COLOR[x.s.semaforos[k.key]] }} />)}</div></td>
                    <td><NivelBadge nivel={x.s.nivel} bloqueado={x.s.bloqueado} /></td>
                    <td className="text-center text-xs"><Delta d={x.deltaRank} /></td>
                    <td className="p-2 text-right cifra text-base text-azul">{fmtPts(x.s.puntaje)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* Balón de Oro */}
      <section>
        <h2 className="titulo mb-1 text-2xl">Balón de Oro {TEMPORADA}</h2>
        <div className="mb-4 text-sm text-niebla">Promedio de los 12 meses. El ganador se lleva la Golden Card.</div>
        <div className="grid gap-2 sm:grid-cols-2">
          {anual.slice(0, 10).map((a, i) => (
            <Link key={a.id} href={`/vendedor/${a.id}`} className={`panel flex items-center gap-3 p-3 hover:border-sol ${i === 0 ? "!border-sol bg-sol-suave sm:col-span-2" : ""}`}>
              <span className={`w-10 text-center cifra ${i === 0 ? "text-4xl text-dorado-texto" : "text-2xl text-niebla"}`}>{i + 1}</span>
              <span className="flex-1">
                <span className={`flex items-center gap-2 font-semibold ${i === 0 ? "text-2xl font-bold text-azul" : ""}`}>{i === 0 && <Ilus n="balon" size={36} />}{a.nombre}</span>
                <span className="text-xs text-niebla">{a.sucursal} · {a.meses_podio} meses en podio · mejor: {nombreMes(a.mejor_mes, true)}</span>
              </span>
              <NivelBadge nivel={nivelBase(a.puntaje_prom)} />
              <span className="w-16 text-right cifra text-2xl text-azul">{fmtPts(a.puntaje_prom)}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Clásicos */}
      <section>
        <h2 className="titulo mb-1 text-2xl">Clásicos de {nombreMes(mes).split(" ")[0]}</h2>
        <div className="mb-4 text-sm text-niebla">Sucursal contra sucursal: un gol por cada KPI con mejor cumplimiento promedio.</div>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {DERBIS.map(([titulo, a, b]) => {
            const A = board.filter((x) => x.sucursal === a);
            const B = board.filter((x) => x.sucursal === b);
            if (!A.length || !B.length) return null;
            const r = partido(A, B);
            return (
              <div key={titulo} className="panel p-4">
                <div className="text-center volanta">{titulo}</div>
                <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-center">
                  <div className={`text-base font-bold leading-tight ${r.ga > r.gb ? "text-azul" : "text-niebla"}`}>{a.split("/")[0]}</div>
                  <div className="rounded-lg bg-azul px-3 py-1 text-white cifra text-3xl text-azul">{r.ga}-{r.gb}</div>
                  <div className={`text-base font-bold leading-tight ${r.gb > r.ga ? "text-azul" : "text-niebla"}`}>{b.split("/")[0]}</div>
                </div>
                <div className="mt-1 grid grid-cols-2 text-center text-xs text-niebla"><span>{fmtPts(r.pa)} pts</span><span>{fmtPts(r.pb)} pts</span></div>
              </div>
            );
          })}
          <div className="panel !border-sol p-4">
            <div className="flex justify-center"><Ilus n="copa" size={56} /></div>
            <div className="volanta text-center">Copa Derbi (rodante)</div>
            <div className="mt-2 text-center text-2xl font-bold text-azul">{copa[copa.length - 1].s.split("/")[0]}</div>
            <div className="text-center text-xs text-niebla">La tiene la sucursal #1 del mes</div>
            <div className="mt-3 flex justify-center gap-3 text-xs text-niebla">
              {copa.slice(0, -1).map((c) => <span key={c.m}>{nombreMes(c.m, true)}: <b className="text-azul">{c.s.split("/")[0]}</b></span>)}
            </div>
          </div>
        </div>
      </section>

      {/* Liga de sucursales */}
      <section>
        <h2 className="titulo mb-4 text-2xl">Liga de sucursales</h2>
        <div className="panel overflow-hidden">
          {ls.map((s, i) => (
            <div key={s.s} className="flex items-center gap-3 border-b border-linea px-3 py-2 last:border-0">
              <span className="w-8 text-right cifra text-lg text-azul text-niebla">{i + 1}</span>
              <span className="flex-1 font-semibold">{s.s} <span className="text-xs font-normal text-niebla">· {s.n} vendedores · kilos {Math.round(s.kg * 100)}%</span></span>
              <div className="hidden h-2 w-40 overflow-hidden rounded-full bg-azul-suave sm:block"><div className="h-full rounded-full bg-azul" style={{ width: `${Math.max(0, (s.prom - 80) * 5)}%` }} /></div>
              <span className="w-16 text-right cifra text-lg text-azul">{fmtPts(s.prom)}</span>
            </div>
          ))}
        </div>
      </section>

      {/* MVP por sucursal */}
      <section>
        <h2 className="titulo mb-1 text-2xl">MVP de cada sucursal</h2>
        <div className="mb-4 text-sm text-niebla">El que más mejoró dentro de su equipo este mes: premia el esfuerzo, no solo al que ya venía arriba.</div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {[...game.mvpSucursal.entries()].sort((a, b) => b[1].mejora - a[1].mejora).map(([suc, m]) => (
            <div key={suc} className="panel flex items-center justify-between gap-2 p-3 text-sm">
              <span><span className="text-niebla">{suc.split("/")[0]}</span> · <b>{nombreDe.get(m.id)?.nombre}</b></span>
              <span className="cifra text-base text-azul text-verde-t">+{m.mejora.toFixed(1).replace(".", ",")}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Muro de la Fama */}
      <section>
        <h2 className="titulo mb-4 text-2xl">Muro de la Fama</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
          {muro.map(({ m, x }) => (
            <div key={m} className="panel p-3 text-center">
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-dorado-texto">{nombreMes(m, true)}</div>
              <div className="mt-1 flex justify-center"><Ilus n="copa" size={44} quieto className="ilus-hover" /></div>
              <div className="text-sm font-bold leading-tight text-tinta">{x.nombre}</div>
              <div className="text-xs text-niebla">{x.sucursal.split("/")[0]} · {fmtPts(x.s.puntaje)}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Premios */}
      <section>
        <h2 className="titulo mb-4 text-2xl">Premios</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["balon", "Balón de Oro + Golden Card", "Mejor promedio anual. Carta dorada física y viaje para dos."],
            ["copa", "Podio del mes", "Top 3 general: orden de compra y mención en la convención."],
            ["cohete", "Remontada", "El que más puestos sube en el mes: día libre."],
            ["holo", "Figurita Holo", "1° en el mismo KPI 3+ meses: canjeable por beneficio a elección."],
            ["escudo", "Copa Derbi", "Trofeo rodante para la sucursal #1 del mes."],
            ["asado", "Tercer Tiempo", "Asado para la sucursal que cumple la misión colectiva."],
          ].map(([i, t, d], idx) => (
            <div key={t} className="panel anim-entrar group flex items-start gap-4 p-4 transition-shadow hover:shadow-md" style={{ animationDelay: `${idx * 70}ms` }}>
              <Ilus n={i as Ilustracion} size={64} className="ilus-hover" />
              <div>
              <div className="text-lg font-bold text-azul">{t}</div>
              <div className="text-sm text-niebla">{d}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-2 text-xs text-niebla">Catálogo configurable. Mes anterior de referencia: {mesAnterior(mes) ? nombreMes(mesAnterior(mes)!) : "—"}.</div>
      </section>
    </div>
  );
}

function Destacado({ icon, titulo, nombre, id, detalle }: { icon: Ilustracion; titulo: string; nombre: string; id: string; detalle: string }) {
  return (
    <Link href={`/vendedor/${id}`} className="panel flex items-start gap-4 p-5 hover:border-azul/50 hover:shadow-md">
      <Ilus n={icon} size={56} />
      <div>
        <div className="volanta">{titulo}</div>
        <div className="mt-1 text-2xl font-bold leading-tight text-azul">{nombre}</div>
        <div className="mt-1 text-sm text-niebla">{detalle}</div>
      </div>
    </Link>
  );
}
