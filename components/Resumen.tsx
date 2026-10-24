import type { ReactNode } from "react";
import { Progreso } from "./ui";

const kg = (n: number) => Math.round(n).toLocaleString("es-AR");

/** Encabezado del panel: saludo + sucursal a la izquierda, período a la derecha. */
export function EncabezadoVendedor({ titulo, sucursal, detalle, periodo }: { titulo: string; sucursal: string; detalle: string; periodo: ReactNode }) {
  return (
    <div className="panel flex flex-wrap items-end justify-between gap-4 p-4 sm:p-5">
      <div className="min-w-0">
        <h1 className="titulo text-2xl sm:text-3xl">{titulo}</h1>
        <div className="mt-1 text-base font-semibold text-azul-web">{sucursal}</div>
        <div className="mt-0.5 text-xs text-tenue">{detalle}</div>
      </div>
      {periodo}
    </div>
  );
}

/** Sector de ventas: kg vendidos y kg que faltan; debajo, objetivo y avance. */
export function VentasKg({ vendido, objetivo, mes }: { vendido: number; objetivo: number; mes: string }) {
  const falta = Math.max(0, objetivo - vendido);
  const sobre = Math.max(0, vendido - objetivo);
  const avance = objetivo > 0 ? vendido / objetivo : 0;
  return (
    <div className="flex h-full flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="panel p-4 sm:p-5">
          <div className="volanta">Kg vendidos</div>
          <div className="cifra mt-1 text-4xl leading-none text-azul sm:text-5xl">{kg(vendido)}<span className="ml-1 text-xl font-semibold text-tenue">kg</span></div>
          <div className="mt-2 text-xs text-niebla">Vendidos en {mes}</div>
        </div>
        {falta > 0 ? (
          <div className="panel p-4 sm:p-5">
            <div className="volanta">Kg que faltan</div>
            <div className="cifra mt-1 text-4xl leading-none text-azul sm:text-5xl">{kg(falta)}<span className="ml-1 text-xl font-semibold text-tenue">kg</span></div>
            <div className="mt-2 text-xs text-niebla">Para llegar a tu objetivo mensual</div>
          </div>
        ) : (
          <div className="panel border-l-4 !border-l-verde p-4 sm:p-5">
            <div className="volanta">Kg que faltan</div>
            <div className="mt-1 text-2xl font-bold leading-tight text-verde-t sm:text-3xl">✓ Objetivo alcanzado</div>
            <div className="mt-2 text-xs text-niebla">{sobre > 0 ? <>Sobrecumpliste por <b className="cifra text-sm text-verde-t">{kg(sobre)} kg</b></> : "Llegaste justo al objetivo"}</div>
          </div>
        )}
      </div>
      <div className="panel flex-1 p-4 sm:p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
          <span className="text-niebla">Objetivo mensual: <b className="cifra text-base text-tinta">{kg(objetivo)} kg</b></span>
          <span className="text-niebla">Cumplimiento <b className={`cifra text-xl ${avance >= 1 ? "text-verde-t" : "text-azul"}`}>{Math.round(avance * 100)}%</b></span>
        </div>
        <Progreso p={avance} alto="h-3" />
        <div className="mt-1.5 flex justify-between text-[11px] text-tenue">
          <span>0 kg</span>
          <span>{kg(objetivo)} kg</span>
        </div>
      </div>
    </div>
  );
}
