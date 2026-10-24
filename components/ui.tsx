import type { Nivel, Semaforo } from "@/lib/scoring";

export const SEM_COLOR: Record<Semaforo, string> = { verde: "#22c55e", amarillo: "#facc15", rojo: "#ef4444" };
export const SEM_BG: Record<Semaforo, string> = { verde: "rgba(34,197,94,.85)", amarillo: "rgba(250,204,21,.85)", rojo: "rgba(239,68,68,.85)" };
export const NIVEL_COLOR: Record<Nivel, string> = { Diamante: "#7df9ff", Oro: "#f5c542", Plata: "#d1d5db", Bronce: "#c08457" };
export const NIVEL_ICON: Record<Nivel, string> = { Diamante: "💎", Oro: "🥇", Plata: "🥈", Bronce: "🥉" };

export function NivelBadge({ nivel, bloqueado }: { nivel: Nivel; bloqueado?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold uppercase tracking-wide" style={{ color: NIVEL_COLOR[nivel], border: `1px solid ${NIVEL_COLOR[nivel]}55`, background: `${NIVEL_COLOR[nivel]}14` }}>
      {bloqueado ? "🔒" : NIVEL_ICON[nivel]} {nivel}
    </span>
  );
}

export function Dot({ s, size = 10 }: { s: Semaforo; size?: number }) {
  return <span className="inline-block rounded-full" style={{ width: size, height: size, background: SEM_COLOR[s], boxShadow: `0 0 8px ${SEM_COLOR[s]}` }} />;
}

export function Delta({ d, unit = "" }: { d: number | null; unit?: string }) {
  if (d === null || d === 0) return <span className="text-niebla">=</span>;
  return d > 0 ? <span className="text-verde">▲{d}{unit}</span> : <span className="text-rojo">▼{Math.abs(d)}{unit}</span>;
}

export function SectionTitle({ children, sub }: { children: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-2">
      <h2 className="font-display text-2xl font-bold uppercase text-tiza">{children}</h2>
      {sub && <div className="text-sm text-niebla">{sub}</div>}
    </div>
  );
}
