import type { Nivel, Semaforo } from "@/lib/scoring";

// Semáforo: colores semánticos, distintos del azul y el amarillo institucionales.
export const SEM_COLOR: Record<Semaforo, string> = { verde: "#1f8a4c", amarillo: "#c77700", rojo: "#c8312b" };
export const SEM_TEXTO: Record<Semaforo, string> = { verde: "#17663a", amarillo: "#8a5300", rojo: "#a3231e" };
export const SEM_BG: Record<Semaforo, string> = { verde: "#ddf2e5", amarillo: "#fcebcb", rojo: "#f9dedc" };
export const SEM_LABEL: Record<Semaforo, string> = { verde: "en objetivo", amarillo: "cerca", rojo: "lejos" };

// Niveles: Oro = amarillo de marca, Diamante = azul institucional. Texto legible sobre blanco.
export const NIVEL_COLOR: Record<Nivel, string> = { Diamante: "#164194", Oro: "#8a6d00", Plata: "#5a6573", Bronce: "#7a4a22" };
export const NIVEL_BG: Record<Nivel, string> = { Diamante: "#e9eff9", Oro: "#fff5cc", Plata: "#eef0f3", Bronce: "#f5e6d8" };
export const NIVEL_ICON: Record<Nivel, string> = { Diamante: "💎", Oro: "🥇", Plata: "🥈", Bronce: "🥉" };

/** Color de acento por división (variedades de té y café de La Virginia). */
export const VARIEDADES = ["#164194", "#2a402b", "#723181", "#895e36", "#912c28", "#597840", "#1b133f", "#ed983c", "#704a19"];

export function NivelBadge({ nivel, bloqueado }: { nivel: Nivel; bloqueado?: boolean }) {
  return (
    <span className="chip uppercase tracking-wide" style={{ color: NIVEL_COLOR[nivel], background: NIVEL_BG[nivel] }}>
      {bloqueado ? "🔒" : NIVEL_ICON[nivel]} {nivel}
    </span>
  );
}

export function Dot({ s, size = 10 }: { s: Semaforo; size?: number }) {
  return <span className="inline-block rounded-full" style={{ width: size, height: size, background: SEM_COLOR[s] }} aria-label={SEM_LABEL[s]} />;
}

export function Delta({ d, unit = "" }: { d: number | null; unit?: string }) {
  if (d === null || d === 0) return <span className="text-tenue">=</span>;
  return d > 0 ? <span className="font-semibold text-verde-t">▲{d}{unit}</span> : <span className="font-semibold text-rojo-t">▼{Math.abs(d)}{unit}</span>;
}

/** Encabezado de sección al estilo del sitio: volanta dorada + título azul. */
export function SectionTitle({ children, volanta, sub, as: H = "h2" }: { children: React.ReactNode; volanta?: string; sub?: React.ReactNode; as?: "h1" | "h2" }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
      <div>
        {volanta && <div className="volanta">{volanta}</div>}
        <H className={`titulo ${H === "h1" ? "text-3xl sm:text-4xl" : "text-xl sm:text-2xl"}`}>{children}</H>
      </div>
      {sub && <div className="max-w-xl text-sm text-niebla">{sub}</div>}
    </div>
  );
}

export function Stat({ label, value, sub, tono }: { label: string; value: string; sub?: string; tono?: Semaforo }) {
  return (
    <div className="panel p-4">
      <div className="text-xs font-semibold text-niebla">{label}</div>
      <div className="cifra mt-1 text-3xl sm:text-4xl" style={{ color: tono ? SEM_TEXTO[tono] : "var(--color-azul)" }}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-tenue">{sub}</div>}
    </div>
  );
}

/** Barra de progreso: azul institucional; verde cuando se cumple. */
export function Progreso({ p, alto = "h-2.5" }: { p: number; alto?: string }) {
  return (
    <div className={`mt-3 ${alto} overflow-hidden rounded-full bg-azul-suave`} role="progressbar" aria-valuenow={Math.round(Math.min(1, p) * 100)} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full" style={{ width: `${Math.round(Math.min(1, p) * 100)}%`, background: p >= 1 ? "#1f8a4c" : "#164194" }} />
    </div>
  );
}
