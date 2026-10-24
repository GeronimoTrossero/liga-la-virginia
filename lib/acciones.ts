// "Mejorá tu carta": acciones concretas por KPI, expresadas como cambios en las cantidades crudas.
import { aplicar, sumarDeltas, score, KPIS, type Delta, type KpiKey, type Raw } from "./scoring";
import type { DibuTipo } from "./dibu";

export type ClienteLite = {
  id: string; nombre_comercio: string; compro_mes: boolean; compro_lanzamiento: boolean; lanzamiento_id: string | null;
  relevado: boolean; estacional: boolean; saldo_cc: number; facturas: number; vence_el: string | null; pagado: boolean;
  pedido_no_entregado: boolean; motivo_no_entrega: string | null; telefono_demo: string;
};
export type FamiliaLite = { familia: string; objetivo_kg: number; vendido_kg: number };
export type LanzLite = { id: string; producto: string };

export type Accion = {
  id: string; kpi: KpiKey; titulo: string; detalle?: string; delta: Delta;
  clienteId?: string; dibu?: DibuTipo; urgente?: boolean; bulk?: boolean;
};
export type Grupo = { titulo: string; nota?: string; acciones: Accion[] };
export type PlanKpi = { kpi: KpiKey; resumen: string; grupos: Grupo[] };

const MAX_LISTA = 6;

export function diasHabilesRestantes(hoy: string) {
  const d = new Date(hoy + "T12:00:00Z");
  const fin = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0, 12));
  let n = 0;
  for (let x = new Date(d.getTime() + 864e5); x <= fin; x = new Date(x.getTime() + 864e5)) {
    const wd = x.getUTCDay();
    if (wd !== 0 && wd !== 6) n++;
  }
  return n;
}

export function diasHasta(hoy: string, f: string) {
  return Math.round((new Date(f + "T12:00:00Z").getTime() - new Date(hoy + "T12:00:00Z").getTime()) / 864e5);
}

const kg = (n: number) => Math.round(n).toLocaleString("es-AR") + " kg";
const $ = (n: number) => "$" + Math.round(n).toLocaleString("es-AR");

function listaConBulk(prefix: string, kpi: KpiKey, items: Accion[], bulkTitulo: (n: number) => string): Accion[] {
  if (items.length <= MAX_LISTA + 1) return items;
  const resto = items.slice(MAX_LISTA);
  return [
    ...items.slice(0, MAX_LISTA),
    { id: `${prefix}-bulk`, kpi, titulo: bulkTitulo(resto.length), delta: sumarDeltas(resto.map((a) => a.delta)), bulk: true },
  ];
}

export function construirPlan(raw: Raw, clientes: ClienteLite[], familias: FamiliaLite[], lanz: LanzLite[], hoy: string): Record<KpiKey, PlanKpi> {
  const plan = {} as Record<KpiKey, PlanKpi>;

  // VTA: familias por debajo del objetivo
  const flojas = familias.filter((f) => f.vendido_kg < f.objetivo_kg).sort((a, b) => a.vendido_kg / a.objetivo_kg - b.vendido_kg / b.objetivo_kg);
  plan.vta = {
    kpi: "vta",
    resumen: flojas.length ? `${flojas.length} familia${flojas.length > 1 ? "s" : ""} por debajo del objetivo` : "Todas las familias en objetivo: empujá el excedente",
    grupos: [{
      titulo: "Familias flojas",
      acciones: flojas.map((f) => {
        const falta = f.objetivo_kg - f.vendido_kg;
        return { id: `vta-${f.familia}`, kpi: "vta" as const, titulo: `${f.familia} ${Math.round((f.vendido_kg / f.objetivo_kg) * 100)}% → faltan ${kg(falta)}`, detalle: `${kg(f.vendido_kg)} de ${kg(f.objetivo_kg)}`, delta: { kilos_vendidos: falta } };
      }),
    }],
  };

  // LAN: por lanzamiento, compradores que todavía no lo llevaron
  const sinLanz = clientes.filter((c) => c.compro_mes && !c.compro_lanzamiento && c.lanzamiento_id);
  plan.lan = {
    kpi: "lan",
    resumen: `${raw.clientes_compradores - raw.clientes_con_lanzamiento} compradores sin lanzamientos`,
    grupos: lanz.map((l) => {
      const items = sinLanz.filter((c) => c.lanzamiento_id === l.id).map((c) => ({
        id: `lan-${c.id}`, kpi: "lan" as const, titulo: c.nombre_comercio, detalle: "compra, pero no llevó este lanzamiento", delta: { clientes_con_lanzamiento: 1 }, clienteId: c.id, dibu: "lanzamiento" as const,
      }));
      return { titulo: `${l.producto} · ${items.length} sin llevarlo`, acciones: listaConBulk(`lan-${l.id}`, "lan", items, (n) => `Ofrecerlo a los otros ${n} compradores`) };
    }),
  };

  // COB: vencidos y por vencer
  const deudores = clientes.filter((c) => !c.pagado && c.facturas > 0 && c.vence_el).sort((a, b) => a.vence_el!.localeCompare(b.vence_el!) || b.saldo_cc - a.saldo_cc);
  const cobAcc = deudores.map((c) => {
    const d = diasHasta(hoy, c.vence_el!);
    return {
      id: `cob-${c.id}`, kpi: "cob" as const, titulo: c.nombre_comercio,
      detalle: `${d < 0 ? `vencido hace ${-d} día${d === -1 ? "" : "s"}` : d === 0 ? "vence hoy" : `vence en ${d} día${d === 1 ? "" : "s"}`} · ${$(c.saldo_cc)} · ${c.facturas} factura${c.facturas > 1 ? "s" : ""}`,
      delta: { cobros_en_plazo: c.facturas }, clienteId: c.id, dibu: "cobranza" as const, urgente: d < 0,
    };
  });
  const totalDeuda = deudores.reduce((a, c) => a + c.saldo_cc, 0);
  plan.cob = {
    kpi: "cob",
    resumen: `${raw.cobros_mes - raw.cobros_en_plazo} cobros pendientes · ${$(totalDeuda)} en la calle`,
    grupos: [{ titulo: "Vencidos y por vencer", acciones: listaConBulk("cob", "cob", cobAcc.slice(0, 12).concat(cobAcc.slice(12)), (n) => `Cobrar los otros ${n} clientes`) }],
  };

  // ACT: no compradores (los estacionales → baja temporal)
  const nc = clientes.filter((c) => !c.compro_mes);
  const est = nc.filter((c) => c.estacional).map((c) => ({ id: `act-baja-${c.id}`, kpi: "act" as const, titulo: c.nombre_comercio, detalle: "¿proponer baja estacional? (sale de la cartera)", delta: { clientes_cartera: -1 } }));
  const act = nc.filter((c) => !c.estacional).map((c) => ({ id: `act-${c.id}`, kpi: "act" as const, titulo: c.nombre_comercio, detalle: "no compró este mes → activarlo (ojo: suma al denominador de LAN)", delta: { clientes_compradores: 1 } }));
  plan.act = {
    kpi: "act",
    resumen: `${nc.length} no compradores · ${est.length} estacionales`,
    grupos: [
      { titulo: `Estacionales · ${est.length}`, nota: "El vendedor organizado los da de baja temporal y no le pesan.", acciones: listaConBulk("act-baja", "act", est, (n) => `Proponer baja estacional de los otros ${n}`) },
      { titulo: `Para reactivar · ${act.length}`, acciones: listaConBulk("act-act", "act", act, (n) => `Reactivar a los otros ${n}`) },
    ],
  };

  // PRD: visitas restantes / visitados sin venta
  const dias = diasHabilesRestantes(hoy);
  const sinVenta = Math.max(0, raw.visitas_realizadas - raw.pedidos_levantados);
  const porDia = Math.round(raw.visitas_realizadas / 22);
  plan.prd = {
    kpi: "prd",
    resumen: `${sinVenta} visitas sin pedido · te quedan ${dias} días hábiles (~${porDia * dias} visitas)`,
    grupos: [{
      titulo: "Convertir visitas en pedidos",
      nota: "Priorizá los visitados sin venta que compraban el mes pasado.",
      acciones: [1, 2, 3, 4].map((i) => ({ id: `prd-${i}`, kpi: "prd" as const, titulo: `+5 pedidos en visitas sin venta (tanda ${i})`, detalle: `${i === 1 ? "esta semana" : `día ${Math.min(dias, i + 1)}`}`, delta: { pedidos_levantados: 5 } })),
    }],
  };

  // ENT: pedidos con riesgo de no entrega
  const ne = clientes.filter((c) => c.pedido_no_entregado);
  plan.ent = {
    kpi: "ent",
    resumen: `${raw.pedidos_no_entregados} pedidos no entregados`,
    grupos: [{
      titulo: "Reprogramar y avisar al cliente",
      nota: "Logística y comercial juntos: avisá antes y coordiná horario o pago.",
      acciones: ne.map((c) => ({ id: `ent-${c.id}`, kpi: "ent" as const, titulo: c.nombre_comercio, detalle: c.motivo_no_entrega ?? "", delta: { pedidos_no_entregados: -1 }, clienteId: c.id, dibu: "aviso_entrega" as const })),
    }],
  };

  // REL: relevamientos pendientes
  const sr = clientes.filter((c) => !c.relevado);
  plan.rel = {
    kpi: "rel",
    resumen: `${raw.encuestas_asignadas - raw.encuestas_realizadas} encuestas pendientes`,
    grupos: [{ titulo: "Relevar en la próxima visita", acciones: sr.map((c) => ({ id: `rel-${c.id}`, kpi: "rel" as const, titulo: c.nombre_comercio, detalle: "encuesta asignada sin hacer", delta: { encuestas_realizadas: 1 } })) }],
  };

  return plan;
}

/** Puntos posibles de un KPI = puntaje(con todas sus acciones) − puntaje(actual). */
export function potencialKpi(raw: Raw, p: PlanKpi) {
  const all = p.grupos.flatMap((g) => g.acciones.map((a) => a.delta));
  const base = score(raw);
  const max = score(aplicar(raw, sumarDeltas(all)));
  return { pts: max.puntaje - base.puntaje, cumplMax: max.cumpl[p.kpi] };
}

export const ORDEN_KPI = KPIS.map((k) => k.key);
