import { notFound, redirect } from "next/navigation";
import { getBoard, getClientes, getFamilias, getGame, getLanzamientos, getMisionEquipoKey, getReconocimientos } from "@/lib/data";
import { DEMO_TODAY, MES_ACTUAL, MESES, nombreMes } from "@/lib/config";
import { misionesDelMes, progresoIndividual } from "@/lib/missions";
import { misionEquipo } from "@/lib/game";
import { requireSession, puedeVerVendedor } from "@/lib/auth";
import { homeDe } from "@/lib/session";
import { diasHabilesRestantes } from "@/lib/acciones";
import { nivelBase } from "@/lib/scoring";
import { VendedorPanel } from "@/components/VendedorPanel";
import { Rachas, RiesgoBanners, TemporadaCard, TuLiga } from "@/components/Juego";
import { Progreso, SectionTitle } from "@/components/ui";
import { EncabezadoVendedor, VentasKg } from "@/components/Resumen";
import { PeriodoSelect, RankingComercial } from "@/components/ResumenCliente";
import { IconoMision } from "@/components/Icono";
import { CheckCircle2, Gift, HandHeart, Star } from "lucide-react";

export default async function VendedorPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ mes?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const s = await requireSession();
  const board = await getBoard(MES_ACTUAL);
  const me = board.find((x) => x.id === id);
  if (!me) notFound();
  if (!puedeVerVendedor(s, me)) redirect(homeDe(s));

  // Período consultado (por defecto, el mes en curso). Arriba y en los 7 indicadores manda este mes;
  // rachas, temporada, liga, agentes y misiones siguen siendo del mes en curso.
  const pedido = sp.mes && MESES.includes(sp.mes) ? sp.mes : MES_ACTUAL;
  const boardMes = pedido === MES_ACTUAL ? board : await getBoard(pedido);
  const yo = boardMes.find((x) => x.id === id) ?? me;
  const mes = yo === me ? MES_ACTUAL : pedido;
  const tablaMes = yo === me ? board : boardMes;
  const cerrado = mes !== MES_ACTUAL;
  const [apellido, ...nombresPila] = me.nombre.split(" ");
  const nombreNatural = `${nombresPila.join(" ")} ${apellido}`.trim();

  const [game, clientes, familias, lanzamientos, recos, misionKey] = await Promise.all([
    getGame(), getClientes(id), getFamilias(id), getLanzamientos(), getReconocimientos([id]), getMisionEquipoKey(me.supervisor),
  ]);
  const g = game.vendors.get(id)!;
  const div = game.divisiones[g.division];
  const nombres = new Map(board.map((x) => [x.id, { nombre: x.nombre, sucursal: x.sucursal }]));
  const equipo = board.filter((x) => x.supervisor === me.supervisor);
  const mEq = misionEquipo(misionKey);
  const progEq = mEq.progreso(equipo);
  const mvp = game.mvpSucursal.get(me.sucursal);

  const misiones = misionesDelMes(MES_ACTUAL).filter((m) => m.alcance === "INDIVIDUAL").map((m) => ({ ...m, prog: progresoIndividual(m, me.raw, me.s) }));

  return (
    <div className="space-y-10">
      <div className="space-y-4">
        <EncabezadoVendedor
          titulo={s.rol === "VENDEDOR" ? `Hola, ${nombreNatural}` : nombreNatural}
          sucursal={`Sucursal ${me.sucursal}`}
          detalle={`${me.tipo} · Gerente: ${me.supervisor}${s.rol === "VENDEDOR" ? "" : " · vista del gerente"}`}
          periodo={
            <PeriodoSelect
              meses={[...MESES].reverse().map((m) => ({ value: m, label: m === MES_ACTUAL ? `${nombreMes(m)} (en curso)` : nombreMes(m) }))}
              actual={mes}
              porDefecto={MES_ACTUAL}
              ayuda={cerrado ? "Período cerrado" : `Hoy 24/10 · ${diasHabilesRestantes(DEMO_TODAY)} días hábiles para el cierre`}
            />
          }
        />
        <section className="grid grid-cols-[minmax(0,1fr)] items-stretch gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]" aria-label="Ventas y ranking">
          <VentasKg vendido={yo.raw.kilos_vendidos} objetivo={yo.raw.kilos_objetivo} mes={nombreMes(mes)} />
          <RankingComercial
            rows={tablaMes.map((x) => ({ id: x.id, nombre: x.nombre, sucursal: x.sucursal, rank: x.rank, puntaje: x.s.puntaje, nivel: x.s.nivel, bloqueado: x.s.bloqueado }))}
            meId={id}
            rankSucursal={yo.rankSucursal}
            totalSucursal={tablaMes.filter((x) => x.sucursal === yo.sucursal).length}
            sucursal={yo.sucursal}
            deltaRank={yo.deltaRank}
          />
        </section>
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
        key={mes}
        me={{ id: yo.id, nombre: yo.nombre, sucursal: yo.sucursal, tipo: yo.tipo, raw: yo.raw, rank: yo.rank, rankSucursal: yo.rankSucursal, deltaRank: yo.deltaRank, prevCumpl: yo.prevCumpl, prevNivel: yo.prevPuntaje === null ? null : nivelBase(yo.prevPuntaje) }}
        otros={tablaMes.filter((x) => x.id !== id).map((x) => x.s.puntaje)}
        cerrado={cerrado}
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
                <span className="chip bg-fondo text-niebla">Individual</span>
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
