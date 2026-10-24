// Comodín Dibu: mensajes de WhatsApp listos para wa.me. Los números salen de los datos; el texto solo redacta.

export type DibuTipo = "cobranza" | "lanzamiento" | "aviso_entrega";

export type DibuInput = {
  tipo: DibuTipo;
  comercio: string;
  vendedor: string; // "Apellido Nombre" como viene en el dataset
  monto?: number;
  facturas?: number;
  vence_el?: string | null;
  producto?: string;
  hoy: string;
};

export function nombrePila(vendedor: string) {
  const [apellido, ...nombres] = vendedor.split(" ");
  return { nombre: nombres.join(" ") || apellido, completo: `${nombres.join(" ")} ${apellido}`.trim() };
}

export const pesos = (n: number) => "$" + Math.round(n).toLocaleString("es-AR");

function fecha(d: string) {
  const [, m, dd] = d.split("-");
  return `${dd}/${m}`;
}

function diasEntre(a: string, b: string) {
  return Math.round((new Date(b + "T12:00:00Z").getTime() - new Date(a + "T12:00:00Z").getTime()) / 864e5);
}

export function plantillaDibu(i: DibuInput): string {
  const v = nombrePila(i.vendedor);
  if (i.tipo === "cobranza") {
    const dias = i.vence_el ? diasEntre(i.hoy, i.vence_el) : 0;
    const cuando = !i.vence_el ? "" : dias < 0 ? `que venció el ${fecha(i.vence_el)}` : dias === 0 ? "que vence hoy" : `que vence el ${fecha(i.vence_el)}`;
    const fact = i.facturas && i.facturas > 1 ? ` (${i.facturas} facturas)` : "";
    const cierre = dias < 0
      ? "Necesitaría que lo regularicemos esta semana para seguir despachando sin problemas."
      : "Te lo recuerdo así no se te pasa y seguimos trabajando tranquilos.";
    return [
      `¡Hola, ${i.comercio}! ¿Cómo andan? Soy ${v.nombre}, de La Virginia.`,
      `Te escribo por el saldo de ${pesos(i.monto ?? 0)}${fact} ${cuando}.`.replace(/\s+\./, "."),
      cierre,
      "¿Me confirmás si lo transferís o si paso a retirarlo en mi próxima visita?",
      `¡Gracias! ${v.completo} · La Virginia`,
    ].join("\n");
  }
  if (i.tipo === "lanzamiento") {
    return [
      `¡Hola, ${i.comercio}! Soy ${v.nombre}, de La Virginia ☕`,
      `Llegó ${i.producto ?? "nuestro último lanzamiento"} y está saliendo muy bien en los locales de la zona.`,
      "¿Te reservo unas unidades para sumar en el próximo pedido? Te las llevo en la visita.",
      `¡Saludos! ${v.completo} · La Virginia`,
    ].join("\n");
  }
  return [
    `¡Hola, ${i.comercio}! Soy ${v.nombre}, de La Virginia.`,
    "Mañana pasa el reparto con tu pedido 🚚",
    "¿Me confirmás si va a haber alguien para recibirlo y qué horario te queda mejor? Si preferís otro día, avisame y lo reprogramamos.",
    `¡Gracias! ${v.completo} · La Virginia`,
  ].join("\n");
}

export function waLink(telefono: string, texto: string) {
  return `https://wa.me/${telefono.replace(/\D/g, "")}?text=${encodeURIComponent(texto)}`;
}
