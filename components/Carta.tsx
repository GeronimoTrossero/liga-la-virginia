"use client";
import { motion, AnimatePresence } from "framer-motion";
import { KPIS, fmtPts, type KpiKey, type Nivel, type Semaforo } from "@/lib/scoring";
import { SEM_COLOR } from "./ui";

export type CartaProps = {
  nombre: string;
  sucursal: string;
  tipo: string;
  puntaje: number;
  nivel: Nivel;
  cumpl: Record<KpiKey, number>;
  semaforos: Record<KpiKey, Semaforo>;
  flechas?: Partial<Record<KpiKey, number>>; // delta de cumplimiento vs mes anterior
  rank?: number;
  rankSucursal?: number;
  total?: number;
  bloqueado?: boolean;
  motivo?: string | null;
  size?: "sm" | "md" | "lg";
  href?: string;
};

const dims = { sm: "w-[150px] h-[235px]", md: "w-[220px] h-[345px]", lg: "w-[280px] h-[440px]" };

export function Carta(p: CartaProps) {
  const size = p.size ?? "md";
  const sm = size === "sm";
  const apellido = p.nombre.split(" ")[0];
  const inicial = p.nombre.split(" ").slice(1).join(" ");
  const oscuro = p.nivel === "Bronce";
  const sub = oscuro ? "text-[#ffe8d1]/80" : "text-black/60";
  const body = (
    <div className={`carta carta-${p.nivel} glow-${p.nivel} ${dims[size]} shrink-0 select-none`}>
      <div className={`relative z-[2] flex h-full flex-col ${sm ? "px-3 pt-4" : "px-5 pt-7"}`}>
        <div className="flex items-start justify-between">
          <div className="leading-none">
            <AnimatePresence mode="popLayout">
              <motion.div
                key={Math.round(p.puntaje * 10)}
                initial={{ y: -12, opacity: 0, scale: 1.3 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 12, opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className={`font-display font-black ${sm ? "text-4xl" : size === "md" ? "text-6xl" : "text-7xl"}`}
              >
                {fmtPts(p.puntaje).split(",")[0]}
                <span className={sm ? "text-lg" : "text-2xl"}>,{fmtPts(p.puntaje).split(",")[1]}</span>
              </motion.div>
            </AnimatePresence>
            <div className={`font-display font-bold uppercase ${sm ? "text-[10px]" : "text-sm"} ${sub}`}>{p.nivel}{p.bloqueado ? " 🔒" : ""}</div>
          </div>
          {p.rank !== undefined && (
            <div className="text-right leading-tight">
              <div className={`font-display font-black ${sm ? "text-lg" : "text-3xl"}`}>#{p.rank}</div>
              {!sm && p.rankSucursal !== undefined && <div className={`text-[11px] font-semibold ${sub}`}>#{p.rankSucursal} {p.sucursal.split("/")[0]}</div>}
            </div>
          )}
        </div>

        <div className={`text-center ${sm ? "mt-2" : "mt-4"}`}>
          <div className={`font-display font-black uppercase leading-none ${sm ? "text-lg" : size === "md" ? "text-3xl" : "text-4xl"}`}>{apellido}</div>
          <div className={`font-semibold ${sm ? "text-[10px]" : "text-sm"} ${sub}`}>{inicial}</div>
          {!sm && <div className={`mt-1 text-[11px] font-bold uppercase tracking-wider ${sub}`}>{p.sucursal} · {p.tipo}</div>}
        </div>

        <div className={`mx-auto mt-2 h-px w-4/5 ${oscuro ? "bg-white/30" : "bg-black/25"}`} />

        <div className={`grid grid-cols-2 gap-x-3 ${sm ? "mt-1 gap-y-0 text-[10px]" : "mt-3 gap-y-1 text-sm"}`}>
          {KPIS.map((k) => {
            const f = p.flechas?.[k.key];
            return (
              <div key={k.key} className={`flex items-center justify-between font-display font-bold ${k.key === "rel" ? "col-span-2 mx-auto w-1/2" : ""}`}>
                <span className="flex items-center gap-1">
                  <span className="inline-block rounded-full" style={{ width: sm ? 6 : 9, height: sm ? 6 : 9, background: SEM_COLOR[p.semaforos[k.key]], boxShadow: `0 0 0 1.5px rgba(0,0,0,.35)` }} />
                  {Math.round(p.cumpl[k.key] * 100)}
                </span>
                <span className="flex items-center gap-0.5">
                  {k.abbr}
                  {!sm && f !== undefined && Math.abs(f) >= 0.005 && <span className={f > 0 ? "text-green-800" : "text-red-700"} style={oscuro ? { color: f > 0 ? "#bbf7d0" : "#fecaca" } : undefined}>{f > 0 ? "▲" : "▼"}</span>}
                </span>
              </div>
            );
          })}
        </div>

        {p.bloqueado && !sm && (
          <div className="mx-auto mt-3 rounded-md bg-black/80 px-2 py-1 text-center text-[11px] font-bold text-amber-300">🔒 {p.motivo}</div>
        )}
      </div>
    </div>
  );
  return p.href ? <a href={p.href} className="transition hover:-translate-y-1 hover:scale-[1.02]">{body}</a> : body;
}
