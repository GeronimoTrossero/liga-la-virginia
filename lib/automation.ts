import "server-only";
import { supabaseAdmin } from "./supabase";
import { MES_ACTUAL } from "./config";

const PRODUCTOS_GONDOLA = ["Café La Virginia 500 g", "Cápsulas Intenso N°9", "Té Frutos Rojos Frío", "Edulcorante Stevia Gotas 200ml", "Yerba con hierbas 1 kg", "Bizcochuelo vainilla"];

/** Agente de Relevamiento Visual (simulado): "lee" una foto de góndola y completa hasta 5 encuestas pendientes. */
export async function agenteGondola(vendedorId: string) {
  const db = supabaseAdmin();
  const { data } = await db.from("cliente_demo").select("id,nombre_comercio").eq("vendedor_id", vendedorId).eq("relevado", false).order("id").limit(5);
  const clientes = (data ?? []) as { id: string; nombre_comercio: string }[];
  if (!clientes.length) return { completadas: 0, clientes: [], hallazgos: [] as string[] };
  const ids = clientes.map((c) => c.id);
  await db.from("cliente_demo").update({ relevado: true }).in("id", ids);
  await db.from("ajuste_kpi").insert({ vendedor_id: vendedorId, mes: MES_ACTUAL, campo: "encuestas_realizadas", delta: ids.length, origen: `gondola:${ids.join(",")}` });
  const hallazgos = clientes.map((c, i) => `${c.nombre_comercio}: ${PRODUCTOS_GONDOLA[i % PRODUCTOS_GONDOLA.length]} ${i % 3 === 0 ? "sin stock" : `${3 + i} frentes`} · precio relevado`);
  await db.from("automation_log").insert({ tipo: "relevamiento_ia", vendedor_id: vendedorId, cliente_id: null, canal: "app", mensaje: `Agente de Relevamiento: ${ids.length} encuesta${ids.length > 1 ? "s" : ""} completada${ids.length > 1 ? "s" : ""} desde la foto de góndola\n${hallazgos.join("\n")}`, estado: "simulado" });
  return { completadas: ids.length, clientes: clientes.map((c) => c.nombre_comercio), hallazgos };
}
