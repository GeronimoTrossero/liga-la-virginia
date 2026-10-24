import fs from "fs";
import path from "path";
import { score, KPIS, type Raw } from "../lib/scoring";
import { loadDataset } from "./dataset";

const rows = loadDataset();
const kpiCol: Record<string, string> = { vta: "KPI_Venta_vs_OV", prd: "KPI_Productividad", act: "KPI_No_Compradores", lan: "KPI_Ult_Lanzamientos", ent: "KPI_No_Entregados", cob: "KPI_Cobranzas", rel: "KPI_Relevamientos" };
let maxDiff = 0;
let fails = 0;
const scored = rows.map((r) => {
  const s = score(r.raw);
  for (const k of KPIS) {
    const real = s.reales[k.key] ?? 0;
    const d = Math.abs(real - r.kpi[kpiCol[k.key]]);
    maxDiff = Math.max(maxDiff, d);
    if (d > 0.0006) fails++; // el PDF trae KPIs redondeados a 0,1%
  }
  return { ...r, s };
});
console.log(`KPIs recalculados vs columnas KPI_*: max diff ${maxDiff.toFixed(5)}, fuera de tolerancia: ${fails}`);
const oct = scored.filter((r) => r.mes === "2026-10").sort((a, b) => b.s.puntaje - a.s.puntaje);
console.log("Top 3 2026-10:");
oct.slice(0, 3).forEach((r, i) => console.log(`  ${i + 1}. ${r.nombre} (${r.sucursal}) ${r.s.puntaje.toFixed(2)}`));
const ps = scored.map((r) => r.s.puntaje);
console.log(`Distribución global: min ${Math.min(...ps).toFixed(1)} · media ${(ps.reduce((a, b) => a + b, 0) / ps.length).toFixed(1)} · máx ${Math.max(...ps).toFixed(1)}`);
const bloq = scored.filter((r) => r.s.bloqueado).length;
const rojoVC = scored.filter((r) => r.s.semaforos.vta === "rojo" || r.s.semaforos.cob === "rojo").length;
console.log(`Bloqueados por candado: ${bloq} (${((bloq / scored.length) * 100).toFixed(1)}%) · con VTA o COB en rojo: ${rojoVC} (${((rojoVC / scored.length) * 100).toFixed(1)}%)`);
const niv: Record<string, number> = {};
scored.forEach((r) => (niv[r.s.nivel] = (niv[r.s.nivel] ?? 0) + 1));
console.log("Niveles:", niv);
const expected = [["Farías Valeria", 97.99], ["Rojas Martín", 97.46], ["Moyano Matías", 96.3]] as const;
let ok = true;
expected.forEach(([n, p], i) => { if (oct[i].nombre !== n || Math.abs(oct[i].s.puntaje - p) > 0.05) ok = false; });
console.log(ok ? "✅ Test de validación OK" : "❌ Test de validación FALLÓ");
if (!ok) process.exit(1);
