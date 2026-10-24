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
import { Progreso, SectionTitle } from "@/components/ui";
import { Ilus, IconoMision } from "@/components/Icono";
import { CheckCircle2, Gift, HandHeart, Star } from "lucide-react";

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
    <div className="space-y-10">
      <div className="border-b border-linea pb-5">
        <div className="volanta">{nombreMes(MES_ACTUAL)} · hoy 24/10 · {diasHabilesRestantes(DEMO_TODAY)} días hábiles para el cierre</div>
        <h1 className="titulo mt-1 text-3xl sm:text-4xl">{me.nombre}</h1>
        <div className="mt-1 text-sm text-niebla">{me.sucursal} · {me.tipo} · Gerente: {me.supervisor}</div>
      </div>

      {(recos.length > 0 || mvp?.id === id) && (
        <div className="space-y-2">
          {recos.length > 0 && (
            <div className="rounded-xl border-l-4 border-sol bg-sol-suave px-4 py-3" role="status">
              <div className="flex items-center gap-2 font-bold text-azul"><HandHeart className="anim-latido-suave size-5" aria-hidden /> {recos[0].de} te reconoció</div>
              <div className="text-sm text-tinta">&ldquo;{recos[0].mensaje}&rdquo;</div>
            </div>
          )}
          {mvp?.id === id && <div className="rounded-xl border-l-4 border-verde bg-verde-s px-4 py-3 font-semibold text-verde-t"><Star className="anim-destello mr-1.5 inline size-5 fill-current" aria-hidden />Sos el MVP de {me.sucursal}: el que más mejoró este mes (+{mvp.mejora.toFixed(1).replace(".", ",")} pts).</div>}
        </div>
      )}
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
          <div key="extra" className="grid gap-4 lg:grid-cols-2">
            <Rachas g={g} />
            <TemporadaCard g={g} nombreTemp={game.temporada.nombre} />
          </div>
        }
        liga={<TuLiga key="liga" div={div} meId={id} nombres={nombres} />}
      />

      <Automatizacion vendedorId={id} logs={logs.map((l) => ({ ...l, comercio: l.cliente_id ? comercio.get(l.cliente_id) : undefined }))} impagos={clientes.filter((c) => !c.pagado && c.facturas > 0).map((c) => c.id)} />

      <section>
        <SectionTitle volanta="Objetivos del mes">Misiones de {nombreMes(MES_ACTUAL).split(" ")[0]}</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className={`panel overflow-hidden ${progEq >= 1 ? "!border-verde" : ""}`}>
            <div className="franja h-1.5" aria-hidden />
            <div className="p-4">
              <div className="flex items-start justify-between gap-2">
                <IconoMision icono={mEq.icono} />
                <span className="chip bg-azul text-white">Colectiva · equipo {me.supervisor.split(" ")[0]}</span>
              </div>
              <div className="mt-2 text-lg font-bold text-azul">{mEq.titulo}</div>
              <div className="text-sm text-niebla">{mEq.descripcion} La eligió tu gerente.</div>
              <Progreso p={progEq} />
              <div className="mt-1.5 flex justify-between text-xs"><span className={progEq >= 1 ? "font-bold text-verde-t" : "text-niebla"}>{progEq >= 1 ? <span className="inline-flex items-center gap-1"><CheckCircle2 className="anim-pop size-3.5" aria-hidden /> Cumplida</span> : `${Math.round(progEq * 100)}%`}</span><span className="inline-flex items-center gap-1 font-semibold text-dorado-texto"><Gift className="size-3.5" aria-hidden /> Tercer Tiempo</span></div>
            </div>
          </div>
          {misiones.map((m) => (
            <div key={m.id} className={`panel p-4 ${m.prog >= 1 ? "!border-verde" : ""}`}>
              <div className="flex items-start justify-between gap-2">
                <IconoMision icono={m.icono} />
                <span className="chip bg-fondo text-niebla">Individual · +20 PL</span>
              </div>
              <div className="mt-2 text-lg font-bold text-azul">{m.titulo}</div>
              <div className="text-sm text-niebla">{m.descripcion}</div>
              <Progreso p={m.prog} />
              <div className="mt-1.5 flex justify-between text-xs"><span className={m.prog >= 1 ? "font-bold text-verde-t" : "text-niebla"}>{m.prog >= 1 ? <span className="inline-flex items-center gap-1"><CheckCircle2 className="anim-pop size-3.5" aria-hidden /> Cumplida</span> : `${Math.round(m.prog * 100)}%`}</span><span className="font-semibold text-dorado-texto">🎁 {m.premio}</span></div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
