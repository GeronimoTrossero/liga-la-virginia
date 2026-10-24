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
import { NivelBadge, SEM_BG, Delta } from "./ui";

export async function EquipoView({ tipo, nombre, editable = false }: { tipo: "supervisor" | "regional"; nombre: string; editable?: boolean }) {
  const board = await getBoard(MES_ACTUAL);
  const team = board.filter((x) => (tipo === "supervisor" ? x.supervisor : x.regional) === nombre);
  if (!team.length) notFound();
  const [logs, game, misionKey] = await Promise.all([getAutomationLog(team.map((x) => x.id)), getGame(), tipo === "supervisor" ? getMisionEquipoKey(nombre) : Promise.resolve(null)]);
  const mEq = misionEquipo(misionKey);
  const progEq = mEq.progreso(team);
  const enRiesgo = team.flatMap((x) => RACHA_KPIS.filter((k) => game.vendors.get(x.id)!.rachas[k].estado === "riesgo").map((k) => ({ x, k, r: game.vendors.get(x.id)!.rachas[k] }))).sort((a, b) => b.r.meses - a.r.meses);
  const mvps = [...new Set(team.map((x) => x.sucursal))].map((s) => game.mvpSucursal.get(s)).filter((m) => m && team.some((x) => x.id === m.id));
  const esDT = game.dtDelMes?.supervisor === nombre;
  const byId = new Map(team.map((x) => [x.id, x]));

  // Puesto del equipo entre todos los equipos del mismo nivel (por puntaje promedio)
  const equipos = [...groupBy(board, (x) => (tipo === "supervisor" ? x.supervisor : x.regional)).entries()]
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
    <div className="space-y-8">
      <div>
        <div className="text-xs font-bold uppercase tracking-[0.3em] text-acento">{tipo === "supervisor" ? "Supervisor" : "Regional"} · {nombreMes(MES_ACTUAL)}</div>
        <h1 className="font-display text-4xl font-black uppercase leading-none sm:text-5xl">{nombre}</h1>
        <div className="text-sm text-niebla">{team.length} vendedores · {[...new Set(team.map((x) => x.sucursal))].join(", ")}</div>
      </div>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Kilos vendidos" value={`${Math.round(kgV).toLocaleString("es-AR")} kg`} sub={`de ${Math.round(kgO).toLocaleString("es-AR")} kg · ${Math.round((kgV / kgO) * 100)}%`} color={kgV >= kgO ? "#22c55e" : "#facc15"} />
        <Stat label="Puntaje promedio" value={fmtPts(prom)} sub={`${team.filter((x) => x.s.nivel === "Oro" || x.s.nivel === "Diamante").length} en Oro o Diamante`} />
        <Stat label="Puesto del equipo" value={`#${puestoEquipo}`} sub={`de ${equipos.length} ${tipo === "supervisor" ? "equipos" : "regionales"}`} />
        <Stat label="Bloqueados" value={`${team.filter((x) => x.s.bloqueado).length}`} sub="por Venta o Cobranzas en rojo" color={bloqCob.length ? "#ef4444" : "#22c55e"} />
      </section>

      {esDT && <div className="rounded-xl border border-acento/60 bg-acento/10 px-4 py-3 font-display text-xl font-black uppercase text-acento">🧠 DT del Mes: tu equipo es el que más mejoró del país (+{game.dtDelMes!.mejora.toFixed(1).replace(".", ",")} pts promedio)</div>}

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="panel p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-2xl font-black uppercase">{mEq.icono} Misión colectiva</h2>
            <ElegirMision opciones={MISIONES_EQUIPO.map((m) => ({ key: m.key, titulo: m.titulo, icono: m.icono }))} actual={mEq.key} editable={editable} />
          </div>
          <div className="mt-1 font-semibold">{mEq.titulo}</div>
          <div className="text-sm text-niebla">{mEq.descripcion} Premio: 🔥 Tercer Tiempo.</div>
          <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full" style={{ width: `${Math.round(progEq * 100)}%`, background: progEq >= 1 ? "#22c55e" : "linear-gradient(90deg,#e4002b,#ffd100)" }} /></div>
          <div className="mt-1 text-sm">{progEq >= 1 ? "✅ ¡Cumplida! Se viene el Tercer Tiempo" : `${Math.round(progEq * 100)}% de avance`}</div>
          {mvps.map((m) => <div key={m!.id} className="mt-2 text-sm">⭐ MVP {team.find((x) => x.id === m!.id)!.sucursal}: <b>{team.find((x) => x.id === m!.id)!.nombre}</b> (+{m!.mejora.toFixed(1).replace(".", ",")} pts)</div>)}
        </div>
        <div className="panel p-4">
          <h2 className="font-display text-2xl font-black uppercase">🔥 Rachas en riesgo</h2>
          {enRiesgo.length === 0 && <div className="mt-2 text-sm text-niebla">Ninguna racha en riesgo este mes 👌</div>}
          <ul className="mt-2 space-y-1.5 text-sm">
            {enRiesgo.slice(0, 8).map(({ x, k, r }) => (
              <li key={x.id + k} className="flex items-center gap-2">
                <span className="llama">🔥</span>
                <Link href={`/vendedor/${x.id}`} className="font-semibold hover:text-acento">{x.nombre}</Link>
                <span className="text-niebla">{r.meses} meses en {RACHA_LABEL[k]} · {r.falta}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="panel min-w-0 p-4">
          <h2 className="mb-3 font-display text-2xl font-black uppercase">🌡️ Mapa de calor</h2>
          <div className="scrollbar-thin overflow-x-auto">
            <table className="w-full min-w-[640px] border-separate border-spacing-[3px] text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wider text-niebla">
                  <th className="text-left">Vendedor</th>
                  {KPIS.map((k) => <th key={k.key} className="font-display text-sm">{k.abbr}<div className="text-[9px] font-normal normal-case">{Math.round(k.peso * 100)}%</div></th>)}
                  <th>Pts</th>
                  <th>Nivel</th>
                  <th>Puesto</th>
                </tr>
              </thead>
              <tbody>
                {team.map((x) => (
                  <tr key={x.id}>
                    <td className="whitespace-nowrap pr-2"><Link href={`/vendedor/${x.id}`} className="font-semibold hover:text-acento">{x.nombre}</Link> {editable && <ReconocerBtn vendedorId={x.id} nombre={x.nombre} />}</td>
                    {KPIS.map((k) => (
                      <td key={k.key} className="rounded-md text-center font-display text-base font-bold text-noche" style={{ background: SEM_BG[x.s.semaforos[k.key]] }} title={`${k.nombre}: cumplimiento ${Math.round(x.s.cumpl[k.key] * 100)}%`}>
                        {Math.round(x.s.cumpl[k.key] * 100)}
                      </td>
                    ))}
                    <td className="text-center font-display text-lg font-black">{fmtPts(x.s.puntaje)}</td>
                    <td className="text-center"><NivelBadge nivel={x.s.nivel} bloqueado={x.s.bloqueado} /></td>
                    <td className="whitespace-nowrap text-center text-xs">#{x.rank} <Delta d={x.deltaRank} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-2 text-xs text-niebla">% de cumplimiento por KPI (tope 110). Verde ≥ 100 · Amarillo 85–99 · Rojo &lt; 85.</div>
        </div>

        <div className="space-y-4">
          <div className="panel p-4">
            <h2 className="mb-3 font-display text-2xl font-black uppercase">🏅 Podio del equipo</h2>
            <ol className="space-y-2">
              {team.slice(0, 3).map((x, i) => (
                <li key={x.id} className="flex items-center gap-3">
                  <span className="text-2xl">{["🥇", "🥈", "🥉"][i]}</span>
                  <Link href={`/vendedor/${x.id}`} className="flex-1 font-semibold hover:text-acento">{x.nombre}</Link>
                  <span className="font-display text-xl font-black">{fmtPts(x.s.puntaje)}</span>
                </li>
              ))}
            </ol>
          </div>
          <div className="panel p-4">
            <h2 className="mb-3 font-display text-2xl font-black uppercase">🚨 Alertas</h2>
            {alertas.length === 0 && <div className="text-sm text-niebla">Todo en orden 👌</div>}
            <ul className="space-y-2 text-sm">
              {alertas.map((a, i) => (
                <li key={i} className="flex gap-2"><span className="mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: a.c === "rojo" ? "#ef4444" : a.c === "verde" ? "#22c55e" : "#facc15" }} />{a.t}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-display text-2xl font-black uppercase">🃏 Cartas del equipo</h2>
        <div className="flex flex-wrap justify-center gap-4 sm:justify-start">
          {team.map((x: Ranked) => <CartaDe key={x.id} x={x} size="sm" link />)}
        </div>
      </section>

      <section className="panel p-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 className="font-display text-2xl font-black uppercase">🤖 Automatizaciones</h2>
          <div className="flex gap-4 text-sm">
            <span><b className="font-display text-xl">{recordatorios}</b> <span className="text-niebla">recordatorios</span></span>
            <span><b className="font-display text-xl text-verde">{pagos}</b> <span className="text-niebla">pagos recibidos</span></span>
            <span><b className="font-display text-xl">{logs.filter((l) => l.tipo === "aviso_entrega").length}</b> <span className="text-niebla">entregas reprogramadas</span></span>
          </div>
        </div>
        <ul className="scrollbar-thin mt-3 max-h-[300px] space-y-1.5 overflow-y-auto text-sm">
          {logs.length === 0 && <li className="text-niebla">Sin actividad todavía este mes.</li>}
          {logs.map((l) => (
            <li key={l.id} className="flex items-start gap-2 border-b border-linea/50 pb-1.5">
              <span className={`mt-0.5 shrink-0 rounded-full px-2 text-[10px] font-bold uppercase ${l.estado === "pagado" ? "bg-verde/20 text-verde" : "bg-sky-500/15 text-sky-300"}`}>{l.estado}</span>
              <span className="shrink-0 font-semibold">{byId.get(l.vendedor_id ?? "")?.nombre}</span>
              <span className="truncate text-niebla">{l.mensaje.split("\n")[0]}{l.tipo === "recordatorio_cobranza" ? " (recordatorio)" : ""}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Stat({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="panel p-4">
      <div className="text-xs font-bold uppercase tracking-widest text-niebla">{label}</div>
      <div className="font-display text-3xl font-black sm:text-4xl" style={color ? { color } : undefined}>{value}</div>
      {sub && <div className="text-xs text-niebla">{sub}</div>}
    </div>
  );
}
