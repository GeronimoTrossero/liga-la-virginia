import { notFound, redirect } from "next/navigation";
import { getAutomationLog, getBoard, getClientes, getFamilias, getGame, getLanzamientos, getMisionEquipoKey, getReconocimientos } from "@/lib/data";
import { DEMO_TODAY, MES_ACTUAL, nombreMes } from "@/lib/config";
import { misionesDelMes, progresoIndividual } from "@/lib/missions";
import { misionEquipo } from "@/lib/game";
import { requireSession, puedeVerVendedor } from "@/lib/auth";
import { homeDe } from "@/lib/session";
import { diasHabilesRestantes } from "@/lib/acciones";
import { VendedorPanel } from "@/components/VendedorPanel";
import { Automatizacion } from "@/components/Automatizacion";
import { Rachas, RiesgoBanners, TemporadaCard, TuLiga } from "@/components/Juego";

export default async function VendedorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await requireSession();
  const board = await getBoard(MES_ACTUAL);
  const me = board.find((x) => x.id === id);
  if (!me) notFound();
  if (!puedeVerVendedor(s, me)) redirect(homeDe(s));

  const [game, clientes, familias, lanzamientos, logs, recos, misionKey] = await Promise.all([
    getGame(), getClientes(id), getFamilias(id), getLanzamientos(), getAutomationLog([id]), getReconocimientos([id]), getMisionEquipoKey(me.supervisor),
  ]);
  const g = game.vendors.get(id)!;
  const div = game.divisiones[g.division];
  const comercio = new Map(clientes.map((c) => [c.id, c.nombre_comercio]));
  const nombres = new Map(board.map((x) => [x.id, { nombre: x.nombre, sucursal: x.sucursal }]));
  const suc = board.filter((x) => x.sucursal === me.sucursal);
  const equipo = board.filter((x) => x.supervisor === me.supervisor);
  const mEq = misionEquipo(misionKey);
  const progEq = mEq.progreso(equipo);
  const mvp = game.mvpSucursal.get(me.sucursal);

  const misiones = misionesDelMes(MES_ACTUAL).filter((m) => m.alcance === "INDIVIDUAL").map((m) => ({ ...m, prog: progresoIndividual(m, me.raw, me.s) }));

  return (
    <div className="space-y-8">
      <div>
        <div className="text-xs font-bold uppercase tracking-[0.3em] text-acento">{nombreMes(MES_ACTUAL)} · hoy 24/10 · {diasHabilesRestantes(DEMO_TODAY)} días hábiles para el cierre</div>
        <h1 className="font-display text-4xl font-black uppercase leading-none sm:text-5xl">{me.nombre}</h1>
        <div className="text-sm text-niebla">{me.sucursal} · {me.tipo} · Supervisor: {me.supervisor}</div>
      </div>

      {recos.length > 0 && (
        <div className="rounded-xl border border-acento/50 bg-acento/10 px-4 py-3">
          <div className="font-display text-lg font-black uppercase text-acento">👏 {recos[0].de} te reconoció</div>
          <div className="text-sm">&ldquo;{recos[0].mensaje}&rdquo;</div>
        </div>
      )}
      {mvp?.id === id && <div className="rounded-xl border border-verde/50 bg-verde/10 px-4 py-3 font-semibold">⭐ Sos el MVP de {me.sucursal}: el que más mejoró este mes (+{mvp.mejora.toFixed(1).replace(".", ",")} pts).</div>}
      <RiesgoBanners g={g} />

      <VendedorPanel
        me={{ id: me.id, nombre: me.nombre, sucursal: me.sucursal, tipo: me.tipo, raw: me.raw, rank: me.rank, rankSucursal: me.rankSucursal, deltaRank: me.deltaRank, prevCumpl: me.prevCumpl }}
        total={board.length}
        totalSucursal={suc.length}
        otros={board.filter((x) => x.id !== id).map((x) => x.s.puntaje)}
        ranking={board.map((x) => ({ id: x.id, nombre: x.nombre, sucursal: x.sucursal, rank: x.rank, puntaje: x.s.puntaje, nivel: x.s.nivel, bloqueado: x.s.bloqueado }))}
        clientes={clientes}
        familias={familias}
        lanzamientos={lanzamientos}
        hoy={DEMO_TODAY}
        extra={
          <div className="grid gap-4 lg:grid-cols-2">
            <Rachas g={g} />
            <TemporadaCard g={g} nombreTemp={game.temporada.nombre} />
          </div>
        }
        liga={<TuLiga div={div} meId={id} nombres={nombres} />}
      />

      <Automatizacion vendedorId={id} logs={logs.map((l) => ({ ...l, comercio: l.cliente_id ? comercio.get(l.cliente_id) : undefined }))} impagos={clientes.filter((c) => !c.pagado && c.facturas > 0).map((c) => c.id)} />

      <section>
        <h2 className="mb-3 font-display text-3xl font-black uppercase">🎯 Misiones de {nombreMes(MES_ACTUAL).split(" ")[0]}</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className={`panel p-4 ring-1 ring-acento/40 ${progEq >= 1 ? "border-verde/60" : ""}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="text-3xl">{mEq.icono}</div>
              <span className="rounded-full bg-acento/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-acento">Colectiva · equipo {me.supervisor.split(" ")[0]}</span>
            </div>
            <div className="mt-1 font-display text-xl font-bold uppercase">{mEq.titulo}</div>
            <div className="text-sm text-niebla">{mEq.descripcion} La eligió tu supervisor.</div>
            <Barra p={progEq} />
            <div className="mt-1 flex justify-between text-xs"><span>{progEq >= 1 ? "✅ Cumplida" : `${Math.round(progEq * 100)}%`}</span><span className="text-acento">🎁 Tercer Tiempo</span></div>
          </div>
          {misiones.map((m) => (
            <div key={m.id} className={`panel p-4 ${m.prog >= 1 ? "border-verde/60" : ""}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="text-3xl">{m.icono}</div>
                <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-niebla">Individual · +20 PL</span>
              </div>
              <div className="mt-1 font-display text-xl font-bold uppercase">{m.titulo}</div>
              <div className="text-sm text-niebla">{m.descripcion}</div>
              <Barra p={m.prog} />
              <div className="mt-1 flex justify-between text-xs"><span className={m.prog >= 1 ? "font-bold text-verde" : "text-niebla"}>{m.prog >= 1 ? "✅ Cumplida" : `${Math.round(m.prog * 100)}%`}</span><span className="text-acento">🎁 {m.premio}</span></div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Barra({ p }: { p: number }) {
  return (
    <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/5">
      <div className="h-full rounded-full" style={{ width: `${Math.round(Math.min(1, p) * 100)}%`, background: p >= 1 ? "#22c55e" : "linear-gradient(90deg,#e4002b,#ffd100)" }} />
    </div>
  );
}
