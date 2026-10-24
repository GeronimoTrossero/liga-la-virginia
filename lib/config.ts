// Fecha simulada de la demo: 2026-10 es el "mes en curso".
export const DEMO_TODAY = process.env.NEXT_PUBLIC_DEMO_TODAY ?? "2026-10-24";
export const MES_ACTUAL = DEMO_TODAY.slice(0, 7);
export const TEMPORADA = "2025/26";
// Vendedor elegido para el guion de demo: Oro bloqueado en Plata por Cobranzas.
export const DEMO_VENDEDOR = "V052";

export const MESES = [
  "2025-11", "2025-12", "2026-01", "2026-02", "2026-03", "2026-04",
  "2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10",
];

const NOMBRES_MES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
export function nombreMes(mes: string, corto = false) {
  const [y, m] = mes.split("-");
  const n = NOMBRES_MES[+m - 1];
  return corto ? `${n.slice(0, 3)} ${y.slice(2)}` : `${n} ${y}`;
}
export function mesAnterior(mes: string) {
  const i = MESES.indexOf(mes);
  return i > 0 ? MESES[i - 1] : null;
}
export function zonaDe(sucursal: string) {
  return sucursal === "Buenos Aires" ? "GBA" : "INTERIOR";
}
