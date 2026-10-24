"use server";
import { revalidatePath } from "next/cache";
import { registrarPago, resetDemo, runCobranza } from "@/lib/automation";

// Botones de la demo (modo simulado). Corren en el servidor con la service role; el secreto nunca llega al browser.
export async function simularPasaron5Dias(vendedorId: string) {
  const r = await runCobranza(vendedorId);
  revalidatePath(`/vendedor/${vendedorId}`);
  return r;
}

export async function simularRespuestaPago(clienteId: string) {
  const r = await registrarPago({ cliente_id: clienteId, texto: "¡Hola! Ya pagué, te mandé la transferencia 👍" });
  return r;
}

export async function reiniciarDemo(vendedorId: string) {
  const r = await resetDemo(vendedorId);
  revalidatePath(`/vendedor/${vendedorId}`);
  return r;
}
