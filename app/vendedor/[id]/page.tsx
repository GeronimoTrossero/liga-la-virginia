import { notFound } from "next/navigation";
import { getAutomationLog, getBoard, getClientes, getFamilias, getFiguritas, getLanzamientos } from "@/lib/data";
import { DEMO_TODAY, MES_ACTUAL, MESES, nombreMes } from "@/lib/config";
import { KPIS } from "@/lib/scoring";
import { misionesDelMes, progresoIndividual, progresoSucursal } from "@/lib/missions";
import { supabaseUrl } from "@/lib/supabase";
import { VendedorPanel } from "@/components/VendedorPanel";
import { Automatizacion } from "@/components/Automatizacion";
import { LiveRefresh } from "@/components/LiveRefresh";
import { diasHabilesRestantes } from "@/lib/acciones";

export default async function VendedorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const board = await getBoard(MES_ACTUAL);
  const me = board.find((x) => x.id === id);
  if (!me) notFound();
  const [clientes, familias, lanzamientos, figus, logs] = await Promise.all([getClientes(id), getFamilias(id), getLanzamientos(), getFiguritas(id), getAutomationLog([id])]);
  const comercio = new Map(clientes.map((c) => [c.id, c.nombre_comercio]));
  const suc = board.filter((x) => x.sucursal === me.sucursal);

  const misiones = misionesDelMes(MES_ACTUAL).map((m) => {
    const prog = m.alcance === "INDIVIDUAL" ? progresoIndividual(m, me.raw, me.s) : progresoSucursal(suc.map((x) => x.s));
    return { ...m, prog };
  });

  return (
    <div className="space-y-10">
      <LiveRefresh url={supabaseUrl()} anonKey={(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim()} ids={id} />
      <div>
        <div className="text-xs font-bold uppercase tracking-[0.3em] text-acento">{nombreMes(MES_ACTUAL)} · hoy 24/10 · {diasHabilesRestantes(DEMO_TODAY)} días hábiles para el cierre</div>
        <h1 className="font-display text-4xl font-black uppercase leading-none sm:text-5xl">{me.nombre}</h1>
        <div className="text-sm text-niebla">{me.sucursal} · {me.tipo} · Supervisor: {me.supervisor}</div>
      </div>

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
      />

      <Automatizacion
        vendedorId={id}
        logs={logs.map((l) => ({ ...l, comercio: l.cliente_id ? comercio.get(l.cliente_id) : undefined }))}
        impagos={clientes.filter((c) => !c.pagado && c.facturas > 0).map((c) => c.id)}
      />

      <section>
        <h2 className="mb-3 font-display text-3xl font-black uppercase">🎯 Misiones de {nombreMes(MES_ACTUAL).split(" ")[0]}</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {misiones.map((m) => (
            <div key={m.id} className={`panel p-4 ${m.prog >= 1 ? "border-verde/60" : ""}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="text-3xl">{m.icono}</div>
                <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-niebla">{m.alcance === "SUCURSAL" ? `Colectiva · ${me.sucursal}` : "Individual"}</span>
              </div>
              <div className="mt-1 font-display text-xl font-bold uppercase">{m.titulo}</div>
              <div className="text-sm text-niebla">{m.descripcion}</div>
              <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/5">
                <div className="h-full rounded-full" style={{ width: `${Math.round(m.prog * 100)}%`, background: m.prog >= 1 ? "#22c55e" : "linear-gradient(90deg,#38bdf8,#7df9ff)" }} />
              </div>
              <div className="mt-1 flex justify-between text-xs">
                <span className={m.prog >= 1 ? "font-bold text-verde" : "text-niebla"}>{m.prog >= 1 ? "✅ Cumplida" : `${Math.round(m.prog * 100)}%`}</span>
                <span className="text-oro">🎁 {m.premio}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between">
          <h2 className="font-display text-3xl font-black uppercase">📒 Mi álbum</h2>
          <span className="text-sm text-niebla">{figus.length} de {KPIS.length * MESES.length} figuritas · podio por KPI cada mes</span>
        </div>
        <div className="panel scrollbar-thin overflow-x-auto p-3">
          <table className="w-full min-w-[640px] border-separate border-spacing-1 text-center text-xs">
            <thead>
              <tr>
                <th />
                {MESES.map((m) => <th key={m} className="font-semibold text-niebla">{nombreMes(m, true)}</th>)}
              </tr>
            </thead>
            <tbody>
              {KPIS.map((k) => (
                <tr key={k.key}>
                  <td className="pr-2 text-left font-display font-bold">{k.abbr}</td>
                  {MESES.map((m) => {
                    const f = figus.find((x) => x.mes === m && x.kpi === k.key);
                    return (
                      <td key={m}>
                        <div className={`mx-auto grid h-12 w-9 place-items-center rounded-md text-sm font-black ${f ? `carta-${f.rareza === "holo" ? "Diamante" : f.rareza === "oro" ? "Oro" : f.rareza === "plata" ? "Plata" : "Bronce"}` : "border border-dashed border-linea text-linea"}`} title={f ? `${k.nombre} · ${f.puesto}° · ${f.rareza}` : "vacía"}>
                          {f ? `${f.puesto}°` : "?"}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-2 text-xs text-niebla">Oro = 1° · Plata = 2° · Bronce = 3° · Holo = 1° en el mismo KPI 3+ meses (canjeable por beneficio)</div>
        </div>
      </section>
    </div>
  );
}
