import "./env";
import { createClient } from "@supabase/supabase-js";
import { loadDataset, type Row } from "./dataset";
import { KPIS } from "../lib/scoring";
import { rankear, groupBy, promedio, type Ranked } from "../lib/board";
import { MESES, MES_ACTUAL, DEMO_TODAY, DEMO_VENDEDOR, TEMPORADA, zonaDe } from "../lib/config";
import { misionesDelMes, progresoIndividual, progresoSucursal } from "../lib/missions";

import { supabaseUrl } from "../lib/supabase";
import { seedUsuarios } from "./seed-usuarios";
const url = supabaseUrl();
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!.trim();
const db = createClient(url, key, { auth: { persistSession: false } });

// RNG determinístico por semilla (los datos demo son reproducibles)
function rng(seed: string) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) { h = Math.imul(h ^ seed.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  let a = h >>> 0;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const pick = <T,>(r: () => number, xs: T[]) => xs[Math.floor(r() * xs.length)];
const int = (r: () => number, a: number, b: number) => a + Math.floor(r() * (b - a + 1));

async function insert(table: string, rows: object[], chunk = 1000) {
  for (let i = 0; i < rows.length; i += chunk) {
    const { error } = await db.from(table).insert(rows.slice(i, i + chunk));
    if (error) throw new Error(`${table}: ${error.message}`);
  }
  console.log(`  ${table}: ${rows.length}`);
}
async function wipe(table: string, col: string) {
  const { error } = await db.from(table).delete().not(col, "is", null);
  if (error) throw new Error(`wipe ${table}: ${error.message}`);
}

const r4 = (n: number) => Math.round(n * 1e4) / 1e4;

async function main() {
  const rows = loadDataset();
  console.log(`Dataset: ${rows.length} filas`);

  // ---------- vendedores ----------
  const vend = new Map<string, Row>();
  for (const r of rows) if (r.mes === MES_ACTUAL || !vend.has(r.id)) vend.set(r.id, r);
  const vendedores = [...vend.values()].map((r) => ({
    id: r.id, nombre: r.nombre, sucursal: r.sucursal, regional: r.regional, supervisor: r.supervisor, tipo: r.tipo, zona: zonaDe(r.sucursal),
  }));
  const info = new Map(vendedores.map((v) => [v.id, v]));

  // ---------- puntajes y rankings por mes ----------
  const porMes = new Map<string, Ranked[]>();
  for (const [i, mes] of MESES.entries()) {
    const cur = rows.filter((r) => r.mes === mes).map((r) => ({ ...info.get(r.id)!, raw: r.raw }));
    const prev = i > 0 ? rows.filter((r) => r.mes === MESES[i - 1]).map((r) => ({ ...info.get(r.id)!, raw: r.raw })) : undefined;
    porMes.set(mes, rankear(cur, prev));
  }

  // Validación obligatoria de la fórmula
  const oct = porMes.get("2026-10")!;
  console.log("Top 3 2026-10:", oct.slice(0, 3).map((x) => `${x.nombre} (${x.sucursal}) ${x.s.puntaje.toFixed(2)}`).join(" · "));
  const all = [...porMes.values()].flat();
  const ps = all.map((x) => x.s.puntaje);
  console.log(`Distribución: min ${Math.min(...ps).toFixed(1)} · media ${promedio(ps).toFixed(1)} · máx ${Math.max(...ps).toFixed(1)}`);
  const bloq = all.filter((x) => x.s.bloqueado).length;
  const riesgo = all.filter((x) => x.s.semaforos.vta === "rojo" || x.s.semaforos.cob === "rojo").length;
  console.log(`Candado: ${bloq} vendedor-mes bloqueados (${((bloq / all.length) * 100).toFixed(1)}%) · con Venta o Cobranzas en rojo: ${((riesgo / all.length) * 100).toFixed(1)}%`);
  const exp = [["Farías Valeria", 97.99], ["Rojas Martín", 97.46], ["Moyano Matías", 96.3]] as const;
  if (!exp.every(([n, p], i) => oct[i].nombre === n && Math.abs(oct[i].s.puntaje - p) < 0.05)) throw new Error("❌ Validación de fórmula falló");
  console.log("✅ Fórmula validada");

  const scoreMes = all.map((x) => {
    const mes = MESES.find((m) => porMes.get(m)!.includes(x))!;
    return {
      vendedor_id: x.id, mes,
      ...Object.fromEntries(KPIS.map((k) => [`cumpl_${k.key}`, r4(x.s.cumpl[k.key])])),
      puntaje: r4(x.s.puntaje), nivel: x.s.nivel, bloqueado: x.s.bloqueado, motivo_bloqueo: x.s.motivoBloqueo,
      rank_general: x.rank, rank_sucursal: x.rankSucursal, rank_tipo: x.rankTipo,
      ...Object.fromEntries(KPIS.map((k) => [`rank_${k.key}`, x.rankKpi[k.key]])),
      delta_rank: x.deltaRank,
    };
  });

  // ---------- anual (Balón de Oro) ----------
  const anual = vendedores.map((v) => {
    const hist = MESES.map((m) => ({ m, x: porMes.get(m)!.find((y) => y.id === v.id)! }));
    const best = hist.reduce((a, b) => (b.x.s.puntaje > a.x.s.puntaje ? b : a));
    return { vendedor_id: v.id, anio: TEMPORADA, puntaje_prom: r4(promedio(hist.map((h) => h.x.s.puntaje))), meses_podio: hist.filter((h) => h.x.rank <= 3).length, mejor_mes: best.m, sucursal: v.sucursal };
  });
  anual.sort((a, b) => b.puntaje_prom - a.puntaje_prom);
  const anualRows = anual.map((a, i) => ({ ...a, rank_general: i + 1, rank_sucursal: anual.filter((b) => b.sucursal === a.sucursal).indexOf(a) + 1 }))
    .map(({ sucursal, ...rest }) => rest);

  // ---------- figuritas: podio por KPI cada mes (holo = 1° en el mismo KPI 3+ meses) ----------
  const figus: object[] = [];
  const primeros = new Map<string, number>();
  for (const mes of MESES) {
    const list = porMes.get(mes)!;
    for (const k of KPIS) {
      const top = list.filter((x) => x.rankKpi[k.key] <= 3).sort((a, b) => a.rankKpi[k.key] - b.rankKpi[k.key]);
      for (const x of top) {
        const puesto = x.rankKpi[k.key];
        let rareza = puesto === 1 ? "oro" : puesto === 2 ? "plata" : "bronce";
        if (puesto === 1) {
          const c = (primeros.get(`${x.id}-${k.key}`) ?? 0) + 1;
          primeros.set(`${x.id}-${k.key}`, c);
          if (c >= 3) rareza = "holo";
        }
        figus.push({ id: `${mes}-${k.key}-${puesto}`, vendedor_id: x.id, mes, kpi: k.key, puesto, rareza });
      }
    }
  }

  // ---------- misiones ----------
  const misiones: object[] = [];
  const progreso: object[] = [];
  for (const mes of ["2026-06", "2026-08", "2026-09", MES_ACTUAL]) {
    const list = porMes.get(mes)!;
    for (const m of misionesDelMes(mes)) {
      misiones.push(m);
      if (m.alcance === "INDIVIDUAL") {
        for (const x of list) { const p = progresoIndividual(m, x.raw, x.s); progreso.push({ mision_id: m.id, vendedor_id: x.id, sucursal: null, progreso: r4(p), cumplida: p >= 1 }); }
      } else {
        for (const [suc, g] of groupBy(list, (x) => x.sucursal)) { const p = progresoSucursal(g.map((x) => x.s)); progreso.push({ mision_id: m.id, vendedor_id: null, sucursal: suc, progreso: r4(p), cumplida: p >= 1 }); }
      }
    }
  }

  // ---------- datos demo del mes en curso ----------
  const lanzamientos = [
    { id: "L1", producto: "Cápsulas Intenso N°9", desde: "2026-09-01" },
    { id: "L2", producto: "Té Frutos Rojos Frío", desde: "2026-09-15" },
    { id: "L3", producto: "Edulcorante Stevia Gotas 200ml", desde: "2026-10-01" },
  ];
  const TIPOS = ["Almacén", "Kiosco", "Despensa", "Autoservicio", "Dietética", "Maxikiosco", "Minimercado", "Panadería", "Confitería", "Café", "Rotisería", "Fiambrería"];
  const ESTACIONALES = ["Bar La Pileta", "Parador", "Heladería", "Kiosco del Balneario", "Buffet del Club", "Proveeduría del Camping"];
  const NOMBRES = ["Don Pepe", "El Sol", "La Esquina", "Mitre", "Natural", "Los Hermanos", "San Martín", "La Estrella", "Doña Rosa", "El Trébol", "Belgrano", "La Familia", "Don Carlos", "El Progreso", "Sarmiento", "La Placita", "Rivadavia", "El Faro", "Los Pinos", "Doña Marta", "La Nueva", "El Ceibo", "Del Barrio", "Tito", "Las Delicias", "La Unión", "El Cruce", "Alem", "Don Luis", "La Paz"];
  const MOTIVOS = ["Cliente sin fondos al momento de la entrega", "Local cerrado en el horario de reparto", "Cliente pidió reprogramar", "Dirección incompleta / sin acceso"];
  const FAMILIAS: [string, number][] = [["Café tostado", 0.3], ["Cápsulas", 0.15], ["Té y yerba", 0.18], ["Especias", 0.12], ["Edulcorantes", 0.1], ["Postres y bizcochuelos", 0.15]];

  const clientes: object[] = [];
  const DEF = { compro_mes: true, compro_lanzamiento: true, lanzamiento_id: null, relevado: true, estacional: false, saldo_cc: 0, facturas: 0, vence_el: null, pagado: true, pedido_no_entregado: false, motivo_no_entrega: null };
  const familias: object[] = [];
  const today = new Date(DEMO_TODAY + "T12:00:00Z");
  const addDays = (d: number) => new Date(today.getTime() + d * 864e5).toISOString().slice(0, 10);

  for (const x of porMes.get(MES_ACTUAL)!) {
    const r = rng(x.id);
    const raw = x.raw;
    let n = 0;
    const usado = new Set<string>();
    const nombre = (estacional = false) => {
      for (let t = 0; t < 50; t++) {
        const nm = estacional ? `${pick(r, ESTACIONALES)} ${pick(r, NOMBRES)}` : `${pick(r, TIPOS)} ${pick(r, NOMBRES)}`;
        const full = usado.has(nm) ? `${nm} ${int(r, 2, 99)}` : nm;
        if (!usado.has(full)) { usado.add(full); return full; }
      }
      return `Comercio ${x.id}-${n}`;
    };
    const tel = () => `54911${int(r, 5000, 5999)}${String(int(r, 0, 9999)).padStart(4, "0")}`;
    const base = (extra: object, est = false) => {
      n++;
      const nm = nombre(est);
      return { id: `${x.id}-C${String(n).padStart(3, "0")}`, vendedor_id: x.id, nombre_comercio: nm, rubro: nm.split(" ")[0], telefono_demo: tel(), ...DEF, ...extra };
    };
    // No compradores (~30% estacionales)
    const nc = raw.clientes_cartera - raw.clientes_compradores;
    for (let i = 0; i < nc; i++) { const est = r() < 0.3; clientes.push(base({ compro_mes: false, compro_lanzamiento: false, estacional: est }, est)); }
    // Compradores sin lanzamiento
    const sl = raw.clientes_compradores - raw.clientes_con_lanzamiento;
    for (let i = 0; i < sl; i++) clientes.push(base({ compro_lanzamiento: false, lanzamiento_id: lanzamientos[i % 3].id }));
    // Cobros pendientes (cada cliente agrupa 1–4 facturas)
    let pend = raw.cobros_mes - raw.cobros_en_plazo;
    const cobros: { facturas: number; vence: number; saldo: number }[] = [];
    while (pend > 0) {
      const esDemo = x.id === DEMO_VENDEDOR;
      const f = Math.min(pend, esDemo && cobros.length < 3 ? [3, 4, 3][cobros.length] : int(r, 1, 4));
      cobros.push({ facturas: f, vence: esDemo ? int(r, -7, 10) : int(r, -10, 10), saldo: int(r, 40, 400) * 1000 });
      pend -= f;
    }
    if (x.id === DEMO_VENDEDOR) { cobros[0].vence = -10; cobros[1].vence = -9; cobros[2].vence = -8; cobros[0].saldo = 285000; cobros[1].saldo = 162500; cobros[2].saldo = 318000; }
    for (const c of cobros) clientes.push(base({ saldo_cc: c.saldo, facturas: c.facturas, vence_el: addDays(c.vence), pagado: false }));
    // Sin relevar
    for (let i = 0; i < raw.encuestas_asignadas - raw.encuestas_realizadas; i++) clientes.push(base({ relevado: false }));
    // No entregados
    for (let i = 0; i < raw.pedidos_no_entregados; i++) clientes.push(base({ pedido_no_entregado: true, motivo_no_entrega: pick(r, MOTIVOS) }));

    // Venta por familia: suma exacta de objetivo y vendido, con 1–2 familias flojas
    const obj = FAMILIAS.map(([, w]) => Math.round(raw.kilos_objetivo * w));
    obj[0] += raw.kilos_objetivo - obj.reduce((a, b) => a + b, 0);
    const flojas = new Set<number>([int(r, 1, 5)]);
    if (r() < 0.5) flojas.add(int(r, 0, 5));
    const vend = obj.map(() => 0);
    let flojoTotal = 0;
    for (const i of flojas) { vend[i] = Math.round(obj[i] * (0.55 + r() * 0.3)); flojoTotal += vend[i]; }
    let resto = raw.kilos_vendidos - flojoTotal;
    if (resto < 0) { for (const i of flojas) vend[i] = Math.round(vend[i] * 0.5); resto = raw.kilos_vendidos - [...flojas].reduce((a, i) => a + vend[i], 0); }
    const otros = obj.map((_, i) => i).filter((i) => !flojas.has(i));
    const objOtros = otros.reduce((a, i) => a + obj[i], 0);
    otros.forEach((i) => (vend[i] = Math.round((resto * obj[i]) / objOtros)));
    vend[otros[0]] += raw.kilos_vendidos - vend.reduce((a, b) => a + b, 0);
    FAMILIAS.forEach(([f], i) => familias.push({ vendedor_id: x.id, familia: f, objetivo_kg: obj[i], vendido_kg: vend[i] }));
  }

  // ---------- escritura ----------
  console.log("Limpiando tablas…");
  for (const [t, c] of [["reconocimiento", "id"], ["mision_equipo", "supervisor"], ["automation_log", "id"], ["ajuste_kpi", "id"], ["mision_progreso", "mision_id"], ["mision", "id"], ["figurita", "id"], ["venta_familia_demo", "vendedor_id"], ["cliente_demo", "id"], ["lanzamiento", "id"], ["score_anual", "vendedor_id"], ["score_mes", "vendedor_id"], ["kpi_mes", "vendedor_id"], ["vendedor", "id"]]) await wipe(t, c);
  console.log("Insertando…");
  await insert("vendedor", vendedores);
  await insert("kpi_mes", rows.map((r) => ({ vendedor_id: r.id, mes: r.mes, ...r.raw })));
  await insert("score_mes", scoreMes);
  await insert("score_anual", anualRows);
  await insert("figurita", figus);
  await insert("mision", misiones);
  await insert("mision_progreso", progreso);
  await insert("lanzamiento", lanzamientos);
  await insert("cliente_demo", clientes, 2000);
  await insert("venta_familia_demo", familias);
  const demo = porMes.get(MES_ACTUAL)!.find((x) => x.id === DEMO_VENDEDOR)!;
  console.log(`Vendedor demo: ${demo.nombre} (${demo.sucursal}) · ${demo.s.puntaje.toFixed(2)} · ${demo.s.motivoBloqueo ?? demo.s.nivel}`);
  await seedUsuarios();
  console.log("✅ Seed completo");
}

main().catch((e) => { console.error(e); process.exit(1); });

