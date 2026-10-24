import fs from "fs";
import path from "path";
import type { Raw } from "../lib/scoring";

// Fuente: data/dataset.json, extraído de data/Shippear3_Dataset_Ranking_Vendedores.pdf (scripts/extract-pdf.mjs)
export type Row = {
  mes: string; sucursal: string; regional: string; supervisor: string; nombre: string; id: string; tipo: string;
  raw: Raw; kpi: Record<string, number>;
};

export function loadDataset(): Row[] {
  const json = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data", "dataset.json"), "utf8")) as Record<string, any>[];
  return json.map((o) => ({
    mes: o.Mes, sucursal: o.Sucursal, regional: o.Regional, supervisor: o.Supervisor, nombre: o.Vendedor, id: o.ID_Vendedor, tipo: o.Tipo_Vendedor,
    raw: {
      clientes_cartera: o.Clientes_Cartera, clientes_compradores: o.Clientes_Compradores, clientes_con_lanzamiento: o.Clientes_con_Lanzamiento,
      kilos_objetivo: o.Kilos_Objetivo, kilos_vendidos: o.Kilos_Vendidos, visitas_realizadas: o.Visitas_Realizadas,
      pedidos_levantados: o.Pedidos_Levantados, pedidos_no_entregados: o.Pedidos_No_Entregados, cobros_mes: o.Cobros_Mes,
      cobros_en_plazo: o.Cobros_en_Plazo, encuestas_asignadas: o.Encuestas_Asignadas, encuestas_realizadas: o.Encuestas_Realizadas,
    },
    kpi: Object.fromEntries(Object.entries(o).filter(([k]) => k.startsWith("KPI_"))) as Record<string, number>,
  }));
}
