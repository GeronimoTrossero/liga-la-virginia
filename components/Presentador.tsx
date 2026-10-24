"use client";
import { useTransition } from "react";
import { cambiarRol } from "@/app/actions";

/** Modo presentador (escondido en el footer): cambia de rol sin desloguear. */
export function Presentador({ opciones, actual }: { opciones: { value: string; label: string; grupo: string }[]; actual: string }) {
  const [pending, start] = useTransition();
  const grupos = [...new Set(opciones.map((o) => o.grupo))];
  return (
    <details className="mx-auto mt-3 w-fit text-left">
      <summary className="cursor-pointer select-none text-[10px] uppercase tracking-widest text-white/50 hover:text-white">Modo presentador</summary>
      <select disabled={pending} value={actual} onChange={(e) => start(() => cambiarRol(e.target.value))} aria-label="Ver como" className="campo mt-2 max-w-[80vw] text-xs">
        {grupos.map((g) => (
          <optgroup key={g} label={g}>
            {opciones.filter((o) => o.grupo === g).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </optgroup>
        ))}
      </select>
    </details>
  );
}
