// Extrae la hoja Dataset del PDF (impresión del xlsx partida en 5 tiras de columnas × 37 páginas) a data/dataset.json.
// Uso: node scripts/extract-pdf.mjs
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import fs from "fs";

const PDF = "data/Shippear3_Dataset_Ranking_Vendedores.pdf";
const NP = 37, expect = [6, 6, 6, 6, 2];
const cols = [
  ["Mes", "Sucursal", "Regional", "Supervisor", "Vendedor", "ID_Vendedor"],
  ["Tipo_Vendedor", "Clientes_Cartera", "Clientes_Compradores", "Clientes_con_Lanzamiento", "Kilos_Objetivo", "Kilos_Vendidos"],
  ["Visitas_Realizadas", "Pedidos_Levantados", "Pedidos_No_Entregados", "Cobros_Mes", "Cobros_en_Plazo", "Encuestas_Asignadas"],
  ["Encuestas_Realizadas", "KPI_Venta_vs_OV", "KPI_Productividad", "KPI_No_Compradores", "KPI_Ult_Lanzamientos", "KPI_No_Entregados"],
  ["KPI_Cobranzas", "KPI_Relevamientos"],
];
const doc = await pdfjs.getDocument({ data: new Uint8Array(fs.readFileSync(PDF)) }).promise;
const pages = [];
for (let p = 1; p <= NP * 5; p++) {
  const tc = await (await doc.getPage(p)).getTextContent();
  pages.push(tc.items.filter((i) => i.str.trim()).map((i) => ({ s: i.str, x: i.transform[4], y: Math.round(i.transform[5] * 10) / 10 })));
}
const strips = expect.map((n, s) => {
  const rows = [];
  for (let j = 0; j < NP; j++) {
    const byY = new Map();
    for (const i of pages[s * NP + j].filter((i) => j > 0 || i.y < 685)) { if (!byY.has(i.y)) byY.set(i.y, []); byY.get(i.y).push(i); }
    for (const y of [...byY.keys()].sort((a, b) => b - a)) {
      const r = byY.get(y).sort((a, b) => a.x - b.x);
      if (r.length !== n) throw new Error(`Fila inesperada tira ${s} pág ${j}: ${r.map((x) => x.s)}`);
      rows.push(r.map((x) => x.s));
    }
  }
  return rows;
});
const num = (v) => (v.endsWith("%") ? +(parseFloat(v) / 100).toFixed(6) : +v.replace(/,/g, ""));
const out = strips[0].map((_, r) => {
  const o = {};
  strips.forEach((rows, s) => cols[s].forEach((c, k) => (o[c] = s === 0 || c === "Tipo_Vendedor" ? rows[r][k] : num(rows[r][k]))));
  return o;
});
fs.writeFileSync("data/dataset.json", JSON.stringify(out));
console.log(`✅ ${out.length} filas → data/dataset.json`);
