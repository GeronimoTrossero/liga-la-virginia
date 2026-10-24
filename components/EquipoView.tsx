import Link from "next/link";
import { notFound } from "next/navigation";
import { getAutomationLog, getBoard } from "@/lib/data";
import { groupBy, promedio, type Ranked } from "@/lib/board";
import { MES_ACTUAL, nombreMes } from "@/lib/config";
import { KPIS, fmtPts } from "@/lib/scoring";
import { getGame, getMisionEquipoKey } from "@/lib/data";
import { MISIONES_EQUIPO, RACHA_KPIS, RACHA_LABEL, misionEquipo } from "@/lib/game";
import { ReconocerBtn, ElegirMision } from "./SupervisorAcciones";
import { CartaDe } from "./CartaDe";
import { NivelBadge, SEM_BG, SEM_COLOR, SEM_TEXTO, Delta, Progreso, SectionTitle, Stat } from "./ui";

export async function EquipoView({ nombre, editable = false }: { nombre: string; editable?: boolean }) {
  const board = await getBoard(MES_ACTUAL);
  const team = board.filter((x) => x.supervisor === nombre);
  if (!team.length) notFound();
  const [logs, game, misionKey] = await Promise.all([getAutomationLog(team.map((x) => x.id)), getGame(), getMisionEquipoKey(nombre)]);
  const mEq = misionEquipo(misionKey);
  const progEq = mEq.progreso(team);
  const enRiesgo = team.flatMap((x) => RACHA_KPIS.filter((k) => game.vendors.get(x.id)!.rachas[k].estado === "riesgo").map((k) => ({ x, k, r: game.vendors.get(x.id)!.rachas[k] }))).sort((a, b) => b.r.meses - a.r.meses);
  const mvps = [...new Set(team.map((x) => x.sucursal))].map((s) => game.mvpSucursal.get(s)).filter((m) => m && team.some((x) => x.id === m.id));
  const esDT = game.dtDelMes?.supervisor === nombre;
  const byId = new Map(team.map((x) => [x.id, x]));

  // Puesto del equipo entre todos los equipos del mismo nivel (por puntaje promedio)
  const equipos = [...groupBy(board, (x) => x.supervisor).entries()]
    .map(([n, g]) => ({ n, prom: promedio(g.map((x) => x.s.puntaje)) }))
    .sort((a, b) => b.prom - a.prom);
  const puestoEquipo = equipos.findIndex((e) => e.n === nombre) + 1;

  const kgV = team.reduce((a, x) => a + x.raw.kilos_vendidos, 0);
  const kgO = team.reduce((a, x) => a + x.raw.kilos_objetivo, 0);
  const prom = promedio(team.map((x) => x.s.puntaje));

  const bloqCob = team.filter((x) => x.s.bloqueado && x.s.semaforos.cob === "rojo");
  const rojoCob = team.filter((x) => x.s.semaforos.cob === "rojo");
  const caidas = team.filter((x) => (x.deltaRank ?? 0) <= -10).sort((a, b) => (a.deltaRank ?? 0) - (b.deltaRank ?? 0));
  const subidas = team.filter((x) => (x.deltaRank ?? 0) >= 10).sort((a, b) => (b.deltaRank ?? 0) - (a.deltaRank ?? 0));

  const alertas: { t: string; c: string }[] = [];
  if (bloqCob.length) alertas.push({ c: "rojo", t: `${bloqCob.length} vendedor${bloqCob.length > 1 ? "es" : ""} bloqueado${bloqCob.length > 1 ? "s" : ""} en Plata por Cobranzas: ${bloqCob.map((x) => x.nombre).join(", ")}` });
  if (rojoCob.length) alertas.push({ c: "amarillo", t: `${rojoCob.length} con Cobranzas en rojo (riesgo de candado)` });
  for (const x of caidas) alertas.push({ c: "rojo", t: `${x.nombre} cayó ${-(x.deltaRank ?? 0)} puestos` });
  for (const x of subidas.slice(0, 3)) alertas.push({ c: "verde", t: `${x.nombre} subió ${x.deltaRank} puestos 🚀` });

  const pagos = logs.filter((l) => l.estado === "pagado").length;
  const recordatorios = logs.filter((l) => l.tipo === "recordatorio_cobranza").length;

  return (
    <div className="space-y-10">
      <div className="border-b border-linea pb-5">
        <div className="volanta">Gerente de equipo · {nombreMes(MES_ACTUAL)}</div>
        <h1 className="titulo mt-1 text-3xl sm:text-4xl">{nombre}</h1>
        <div className="mt-1 text-sm text-niebla">{team.length} vendedores · {[...new Set(team.map((x) => x.sucursal))].join(", ")}</div>
      </div>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Kilos vendidos" value={`${Math.round(kgV).toLocaleString("es-AR")} kg`} sub={`de ${Math.round(kgO).toLocaleString("es-AR")} kg · ${Math.round((kgV / kgO) * 100)}%`} tono={kgV >= kgO ? "verde" : "amarillo"} />
        <Stat label="Puntaje promedio" value={fmtPts(prom)} sub={`${team.filter((x) => x.s.nivel === "Oro" || x.s.nivel === "Diamante").length} en Oro o Diamante`} />
        <Stat label="Puesto del equipo" value={`#${puestoEquipo}`} sub={`de ${equipos.length} equipos`} />
        <Stat label="Bloqueados" value={`${team.filter((x) => x.s.bloqueado).length}`} sub="por Venta o Cobranzas en rojo" tono={bloqCob.length ? "rojo" : "verde"} />
      </section>

      {esDT && <div className="rounded-xl bg-sol px-4 py-3 text-lg font-bold text-azul">🧠 DT del Mes: tu equipo es el que más mejoró del país (+{game.dtDelMes!.mejora.toFixed(1).replace(".", ",")} pts promedio)</div>}

      <section className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-2">
        <div className="panel p-4 sm:p-5">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div><div className="volanta">Todo el equipo</div><h2 className="titulo text-xl">{mEq.icono} Misión colectiva</h2></div>
            <ElegirMision opciones={MISIONES_EQUIPO.map((m) => ({ key: m.key, titulo: m.titulo, icono: m.icono }))} actual={mEq.key} editable={editable} />
          </div>
          <div className="mt-3 font-bold text-tinta">{mEq.titulo}</div>
          <div className="text-sm text-niebla">{mEq.descripcion} Premio: 🔥 Tercer Tiempo.</div>
          <Progreso p={progEq} alto="h-3" />
          <div className="mt-1.5 text-sm font-semibold text-azul">{progEq >= 1 ? "✅ ¡Cumplida! Se viene el Tercer Tiempo" : `${Math.round(progEq * 100)}% de avance`}</div>
          {mvps.map((m) => <div key={m!.id} className="mt-2 text-sm">⭐ MVP {team.find((x) => x.id === m!.id)!.sucursal}: <b>{team.find((x) => x.id === m!.id)!.nombre}</b> (+{m!.mejora.toFixed(1).replace(".", ",")} pts)</div>)}
        </div>
        <div className="panel p-4 sm:p-5">
          <div className="volanta">Para atender</div>
          <h2 className="titulo text-xl">🔥 Rachas en riesgo</h2>
          {enRiesgo.length === 0 && <div className="mt-2 text-sm text-tenue">Ninguna racha en riesgo este mes.</div>}
          <ul className="mt-2 space-y-1.5 text-sm">
            {enRiesgo.slice(0, 8).map(({ x, k, r }) => (
              <li key={x.id + k} className="flex items-center gap-2">
                <span className="llama">🔥</span>
                <Link href={`/vendedor/${x.id}`} className="font-semibold text-tinta hover:text-azul-web hover:underline">{x.nombre}</Link>
                <span className="text-niebla">{r.meses} meses en {RACHA_LABEL[k]} · {r.falta}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="panel min-w-0 p-4 sm:p-5">
          <SectionTitle volanta="Scorecard del equipo">Mapa de calor</SectionTitle>
          <div className="scrollbar-thin overflow-x-auto">
            <table className="w-full min-w-[640px] border-separate border-spacing-[3px] text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-niebla">
                  <th className="text-left font-semibold">Vendedor</th>
                  {KPIS.map((k) => <th key={k.key} className="font-bold text-azul" title={k.nombre}>{k.abbr}<div className="text-[9px] font-normal normal-case text-tenue">peso {Math.round(k.peso * 100)}%</div></th>)}
                  <th>Pts</th>
                  <th>Nivel</th>
                  <th>Puesto</th>
                </tr>
              </thead>
              <tbody>
                {team.map((x) => (
                  <tr key={x.id}>
                    <td className="whitespace-nowrap pr-2"><Link href={`/vendedor/${x.id}`} className="font-semibold text-tinta hover:text-azul-web hover:underline">{x.nombre}</Link> {editable && <ReconocerBtn vendedorId={x.id} nombre={x.nombre} />}</td>
                    {KPIS.map((k) => (
                      <td key={k.key} className="cifra rounded-md py-1.5 text-center text-sm" style={{ background: SEM_BG[x.s.semaforos[k.key]], color: SEM_TEXTO[x.s.semaforos[k.key]], boxShadow: `inset 0 -3px 0 ${SEM_COLOR[x.s.semaforos[k.key]]}` }} title={`${k.nombre}: cumplimiento ${Math.round(x.s.cumpl[k.key] * 100)}%`}>
                        {Math.round(x.s.cumpl[k.key] * 100)}
                      </td>
                    ))}
                    <td className="cifra text-center text-base text-azul">{fmtPts(x.s.puntaje)}</td>
                    <td className="text-center"><NivelBadge nivel={x.s.nivel} bloqueado={x.s.bloqueado} /></td>
                    <td className="whitespace-nowrap text-center text-xs">#{x.rank} <Delta d={x.deltaRank} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex flex-wrap gap-3 text-xs text-niebla"><span>% de cumplimiento por KPI (tope 110).</span>{([["verde", "≥ 100"], ["amarillo", "85–99"], ["rojo", "< 85"]] as const).map(([s, t]) => <span key={s} className="chip" style={{ background: SEM_BG[s], color: SEM_TEXTO[s] }}>{s[0].toUpperCase() + s.slice(1)} {t}</span>)}</div>
        </div>

        <div className="space-y-4">
          <div className="panel p-4 sm:p-5">
            <div className="volanta">Este mes</div>
            <h2 className="titulo mb-3 text-xl">Podio del equipo</h2>
            <ol className="space-y-2">
              {team.slice(0, 3).map((x, i) => (
                <li key={x.id} className="flex items-center gap-3">
                  <span className="text-2xl">{["🥇", "🥈", "🥉"][i]}</span>
                  <Link href={`/vendedor/${x.id}`} className="flex-1 font-semibold text-tinta hover:text-azul-web hover:underline">{x.nombre}</Link>
                  <span className="cifra text-xl text-azul">{fmtPts(x.s.puntaje)}</span>
                </li>
              ))}
            </ol>
          </div>
          <div className="panel p-4 sm:p-5">
            <div className="volanta">Seguimiento</div>
            <h2 className="titulo mb-3 text-xl">Alertas</h2>
            {alertas.length === 0 && <div className="text-sm text-tenue">Todo en orden.</div>}
            <ul className="space-y-2 text-sm">
              {alertas.map((a, i) => (
                <li key={i} className="flex gap-2"><span className="mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: SEM_COLOR[a.c as keyof typeof SEM_COLOR] }} />{a.t}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section>
        <SectionTitle volanta="Plantel">Cartas del equipo</SectionTitle>
        <div className="flex flex-wrap justify-center gap-4 sm:justify-start">
          {team.map((x: Ranked) => <CartaDe key={x.id} x={x} size="sm" link />)}
        </div>
      </section>

      <section className="panel p-4 sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div><div className="volanta">Agentes IA</div><h2 className="titulo text-xl">🤖 Automatizaciones</h2></div>
          <div className="flex flex-wrap gap-4 text-sm">
            <span><b className="cifra text-xl text-azul">{recordatorios}</b> <span className="text-niebla">recordatorios</span></span>
            <span><b className="cifra text-xl text-verde-t">{pagos}</b> <span className="text-niebla">pagos recibidos</span></span>
            <span><b className="cifra text-xl text-azul">{logs.filter((l) => l.tipo === "aviso_entrega").length}</b> <span className="text-niebla">entregas reprogramadas</span></span>
          </div>
        </div>
        <ul className="scrollbar-thin mt-3 max-h-[300px] space-y-1.5 overflow-y-auto text-sm">
          {logs.length === 0 && <li className="text-tenue">Sin actividad todavía este mes.</li>}
          {logs.map((l) => (
            <li key={l.id} className="flex items-start gap-2 border-b border-linea pb-1.5">
              <span className={`chip mt-0.5 shrink-0 uppercase ${l.estado === "pagado" ? "bg-verde-s text-verde-t" : "bg-azul-suave text-azul"}`}>{l.estado}</span>
              <span className="shrink-0 font-semibold text-tinta">{byId.get(l.vendedor_id ?? "")?.nombre}</span>
              <span className="truncate text-niebla">{l.mensaje.split("\n")[0]}{l.tipo === "recordatorio_cobranza" ? " (recordatorio)" : ""}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
