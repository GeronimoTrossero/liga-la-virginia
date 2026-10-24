"use client";
import { createContext, useContext, useState } from "react";

export type PuestoHist = { mes: string; label: string; rank: number | null; delta: number | null };

const EVOLUCION = "evolucion";
const PuestoCtx = createContext<{ mes: string; setMes: (m: string) => void } | null>(null);

function usePuestoMes() {
  const ctx = useContext(PuestoCtx);
  if (!ctx) throw new Error("PuestoMes fuera de PuestoMesProvider");
  return ctx;
}

export function PuestoMesProvider({ inicial, children }: { inicial: string; children: React.ReactNode }) {
  const [mes, setMes] = useState(inicial);
  return <PuestoCtx.Provider value={{ mes, setMes }}>{children}</PuestoCtx.Provider>;
}

export function PuestoMesSelect({ meses }: { meses: { value: string; label: string }[] }) {
  const { mes, setMes } = usePuestoMes();
  return (
    <label className="mt-0.5 block">
      <span className="sr-only">Ver puesto por mes</span>
      <select
        value={mes}
        onChange={(e) => setMes(e.target.value)}
        className="rounded-md border border-linea bg-transparent px-1 py-0.5 text-[10px] font-semibold normal-case tracking-normal text-azul focus:outline-none focus-visible:ring-2 focus-visible:ring-azul"
      >
        <option value={EVOLUCION}>Evolución</option>
        {[...meses].reverse().map((m) => (
          <option key={m.value} value={m.value}>{m.label}</option>
        ))}
      </select>
    </label>
  );
}

function DeltaRank({ d }: { d: number | null }) {
  if (d === null || d === 0) return <span className="text-tenue">=</span>;
  return d > 0 ? <span className="font-semibold text-verde-t">▲{d}</span> : <span className="font-semibold text-rojo-t">▼{Math.abs(d)}</span>;
}

function Sparkline({ hist }: { hist: PuestoHist[] }) {
  const pts = hist.filter((h) => h.rank !== null) as (PuestoHist & { rank: number })[];
  if (pts.length < 2) return <span className="text-tenue">—</span>;
  const ranks = pts.map((p) => p.rank);
  const min = Math.min(...ranks);
  const max = Math.max(...ranks);
  const w = 84, h = 22, pad = 2;
  const x = (i: number) => pad + (i * (w - pad * 2)) / (pts.length - 1);
  // Puesto 1 arriba: mejor puesto = menor número.
  const y = (r: number) => (max === min ? h / 2 : pad + ((r - min) * (h - pad * 2)) / (max - min));
  const first = pts[0], last = pts[pts.length - 1];
  const mejoro = last.rank < first.rank;
  const resumen = pts.map((p) => `${p.label}: #${p.rank}`).join(" · ");
  return (
    <span className="inline-flex items-center gap-1.5" title={resumen}>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className={mejoro ? "text-verde-t" : last.rank > first.rank ? "text-rojo-t" : "text-azul"} role="img" aria-label={`Evolución del puesto: ${resumen}`}>
        <polyline points={pts.map((p, i) => `${x(i)},${y(p.rank)}`).join(" ")} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={x(pts.length - 1)} cy={y(last.rank)} r={2.5} fill="currentColor" />
      </svg>
      <span className="text-[10px] text-niebla">#{min}–#{max}</span>
    </span>
  );
}

export function PuestoCelda({ hist }: { hist: PuestoHist[] }) {
  const { mes } = usePuestoMes();
  if (mes === EVOLUCION) return <Sparkline hist={hist} />;
  const h = hist.find((x) => x.mes === mes);
  if (!h || h.rank === null) return <span className="text-tenue">—</span>;
  return <>#{h.rank} <DeltaRank d={h.delta} /></>;
}
