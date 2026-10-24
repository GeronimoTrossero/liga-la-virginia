"use client";
import { useTransition } from "react";
import { cambiarRol } from "@/app/actions";

/** Modo presentador (escondido en el footer): cambia de rol sin desloguear. */
export function Presentador({ opciones, actual }: { opciones: { value: string; label: string; grupo: string }[]; actual: string }) {
  const [pending, start] = useTransition();
  const grupos = [...new Set(opciones.map((o) => o.grupo))];
  return (
    <details className="mx-auto mt-2 w-fit text-left">
      <summary className="cursor-pointer select-none text-[10px] uppercase tracking-widest text-niebla/50 hover:text-niebla">🎬 modo presentador</summary>
      <select disabled={pending} value={actual} onChange={(e) => start(() => cambiarRol(e.target.value))} className="mt-2 rounded-lg border border-linea bg-panel px-2 py-1.5 text-xs text-tiza">
        {grupos.map((g) => (
          <optgroup key={g} label={g}>
            {opciones.filter((o) => o.grupo === g).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </optgroup>
        ))}
      </select>
    </details>
  );
}
