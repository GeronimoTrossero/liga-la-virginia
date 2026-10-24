"use client";
import { motion, AnimatePresence } from "framer-motion";
import { KPIS, fmtPts, type KpiKey, type Nivel, type Semaforo } from "@/lib/scoring";
import { Lock } from "lucide-react";
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
// Etiqueta de nivel, como la de variedad ("INTENSO") en los estuches
const ETIQUETA: Record<Nivel, string> = {
  Bronce: "bg-v-crema text-[#63401f]",
  Plata: "bg-tinta text-white",
  Oro: "bg-azul text-sol",
  Diamante: "bg-sol text-azul",
};

export function Carta(p: CartaProps) {
  const size = p.size ?? "md";
  const sm = size === "sm";
  const apellido = p.nombre.split(" ")[0];
  const inicial = p.nombre.split(" ").slice(1).join(" ");
  const [ent, dec] = fmtPts(p.puntaje).split(",");
  const body = (
    <div className={`carta carta-${p.nivel} ${dims[size]} shrink-0 select-none`} aria-label={`${p.nombre}: ${fmtPts(p.puntaje)} puntos, nivel ${p.nivel}${p.bloqueado ? ", bloqueado" : ""}`}>
      <div className={`franja absolute inset-y-0 right-0 ${sm ? "w-2.5" : "w-4"}`} aria-hidden />
      <div className={`relative z-[2] flex h-full flex-col ${sm ? "py-3 pl-3 pr-5" : "py-5 pl-5 pr-8"}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="leading-none">
            <AnimatePresence mode="popLayout">
              <motion.div
                key={Math.round(p.puntaje * 10)}
                initial={{ y: -10, opacity: 0, scale: 1.2 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 10, opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 22 }}
                className={`cifra ${sm ? "text-4xl" : size === "md" ? "text-6xl" : "text-7xl"}`}
              >
                {ent}
                <span className={`${sm ? "text-base" : "text-2xl"} opacity-80`}>,{dec}</span>
              </motion.div>
            </AnimatePresence>
            <div className={`mt-1.5 inline-block rounded-[4px] font-bold uppercase tracking-[0.16em] ${ETIQUETA[p.nivel]} ${sm ? "px-1.5 py-0.5 text-[8px]" : "px-2 py-1 text-[10px]"}`}>
              {p.nivel}{p.bloqueado && <Lock className="ml-1 inline size-[1.1em] align-[-0.15em]" aria-label="bloqueado" />}
            </div>
          </div>
          {p.rank !== undefined && (
            <div className="text-right leading-tight">
              <div className={`cifra ${sm ? "text-lg" : "text-3xl"}`}>#{p.rank}</div>
              {!sm && p.rankSucursal !== undefined && <div className="text-[11px] font-semibold opacity-75">#{p.rankSucursal} en {p.sucursal.split("/")[0]}</div>}
            </div>
          )}
        </div>

        <div className={sm ? "mt-2" : "mt-5"}>
          <div className={`font-extrabold leading-none tracking-tight ${sm ? "text-lg" : size === "md" ? "text-3xl" : "text-4xl"}`}>{apellido}</div>
          <div className={`font-semibold opacity-80 ${sm ? "text-[10px]" : "text-sm"}`}>{inicial}</div>
          {!sm && <div className="mt-1.5 text-[10px] font-bold uppercase tracking-[0.18em] opacity-75">{p.sucursal} · {p.tipo}</div>}
        </div>

        <div className={`h-px w-full bg-current opacity-25 ${sm ? "mt-2" : "mt-4"}`} />

        <div className={`grid grid-cols-2 gap-x-3 ${sm ? "mt-1.5 gap-y-0.5 text-[10px]" : "mt-3 gap-y-1.5 text-sm"}`}>
          {KPIS.map((k) => {
            const f = p.flechas?.[k.key];
            return (
              <div key={k.key} className={`flex items-center justify-between font-bold ${k.key === "rel" ? "col-span-2 mx-auto w-1/2" : ""}`} title={`${k.nombre}: ${Math.round(p.cumpl[k.key] * 100)}%`}>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block rounded-full" style={{ width: sm ? 7 : 10, height: sm ? 7 : 10, background: SEM_COLOR[p.semaforos[k.key]], boxShadow: "0 0 0 1.5px rgba(255,255,255,.9)" }} />
                  <span className="cifra">{Math.round(p.cumpl[k.key] * 100)}</span>
                </span>
                <span className="flex items-center gap-0.5 text-[0.85em] font-semibold tracking-wide opacity-80">
                  {k.abbr}
                  {!sm && f !== undefined && Math.abs(f) >= 0.005 && <span aria-label={f > 0 ? "mejoró" : "empeoró"}>{f > 0 ? "▲" : "▼"}</span>}
                </span>
              </div>
            );
          })}
        </div>

        {p.bloqueado && !sm && (
          <div className="mt-auto rounded-md bg-tinta/90 px-2 py-1.5 text-center text-[11px] font-semibold text-white"><Lock className="mr-1 inline size-3 align-[-0.1em]" aria-hidden />{p.motivo}</div>
        )}
      </div>
    </div>
  );
  return p.href ? <a href={p.href} className="rounded-[18px] transition hover:-translate-y-1">{body}</a> : body;
}
