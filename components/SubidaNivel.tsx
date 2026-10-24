"use client";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { Carta, type CartaProps } from "./Carta";
import { NIVEL_COLOR } from "./ui";
import type { Nivel } from "@/lib/scoring";

type Fase = "antes" | "giro" | "revelado";

const CONFETI_CLS = ["bg-sol", "bg-azul", "bg-verde", "bg-rojo", "bg-superficie"];

export function SubidaNivel({ carta, de, a, simulado, onClose }: { carta: Omit<CartaProps, "nivel" | "size" | "href">; de: Nivel; a: Nivel; simulado?: boolean; onClose: () => void }) {
  const [fase, setFase] = useState<Fase>("antes");
  const reducir = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    if (reducir) { setFase("revelado"); return; }
    const t1 = setTimeout(() => setFase("giro"), 1100);
    const t2 = setTimeout(() => setFase("revelado"), 1100 + 1500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [reducir]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const confeti = useMemo(
    () => Array.from({ length: 90 }, (_, i) => ({
      id: i,
      x: (Math.random() - 0.5) * 900,
      y: -Math.random() * 420 - 80,
      caida: 380 + Math.random() * 320,
      rot: (Math.random() - 0.5) * 1080,
      w: 6 + Math.random() * 8,
      h: 8 + Math.random() * 10,
      delay: Math.random() * 0.25,
      cls: CONFETI_CLS[i % CONFETI_CLS.length],
    })),
    [],
  );

  const nivelVisible = fase === "revelado" ? a : de;
  const color = NIVEL_COLOR[a];

  return (
    <motion.div
      className="fixed inset-0 z-[60] grid place-items-center overflow-hidden bg-azul-hondo/85 p-4 backdrop-blur-sm"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      role="dialog" aria-modal="true" aria-labelledby="subida-titulo"
      onClick={onClose}
    >
      {/* Rayos de luz detrás de la carta */}
      <AnimatePresence>
        {fase !== "antes" && (
          <motion.div
            key="rayos" aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 h-[1400px] w-[1400px] -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ background: `repeating-conic-gradient(from 0deg, ${color}55 0deg 8deg, transparent 8deg 22deg)`, maskImage: "radial-gradient(circle, black 15%, transparent 60%)", WebkitMaskImage: "radial-gradient(circle, black 15%, transparent 60%)" }}
            initial={{ opacity: 0, scale: 0.4, rotate: 0 }}
            animate={{ opacity: fase === "revelado" ? 1 : 0.5, scale: 1, rotate: 360 }}
            transition={{ opacity: { duration: 0.6 }, scale: { duration: 0.8 }, rotate: { duration: 30, repeat: Infinity, ease: "linear" } }}
          />
        )}
      </AnimatePresence>

      {/* Destello al revelar */}
      <AnimatePresence>
        {fase === "revelado" && !reducir && (
          <motion.div key="flash" aria-hidden className="pointer-events-none absolute inset-0 bg-superficie" initial={{ opacity: 0.9 }} animate={{ opacity: 0 }} transition={{ duration: 0.7 }} />
        )}
      </AnimatePresence>

      {/* Confeti */}
      {fase === "revelado" && !reducir && (
        <div className="pointer-events-none absolute left-1/2 top-1/2" aria-hidden>
          {confeti.map((c) => (
            <motion.span
              key={c.id}
              className={`absolute block rounded-[2px] ${c.cls}`}
              style={{ width: c.w, height: c.h }}
              initial={{ x: 0, y: 0, rotate: 0, opacity: 1, scale: 0.4 }}
              animate={{ x: c.x, y: [0, c.y, c.y + c.caida], rotate: c.rot, opacity: [1, 1, 0], scale: 1 }}
              transition={{ duration: 2.6, delay: c.delay, ease: [0.16, 0.8, 0.4, 1], times: [0, 0.35, 1] }}
            />
          ))}
        </div>
      )}

      <div className="relative flex flex-col items-center gap-6" onClick={(e) => e.stopPropagation()}>
        <motion.div
          className="text-center"
          initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}
        >
          <div className="text-[11px] font-bold uppercase tracking-[0.3em] text-sol">{simulado ? "Si cumplís estas acciones" : "Nueva carta desbloqueada"}</div>
          <h2 id="subida-titulo" className="mt-1 text-4xl font-extrabold uppercase leading-none tracking-tight text-superficie sm:text-5xl">
            {fase === "revelado" ? <>¡Subiste a <span style={{ color }}>{a}</span>!</> : <>Mejorando tu carta…</>}
          </h2>
        </motion.div>

        <div style={{ perspective: 1200 }}>
          <motion.div
            style={{ transformStyle: "preserve-3d" }}
            initial={{ scale: 0.6, opacity: 0, rotateY: 0 }}
            animate={
              fase === "antes"
                ? { scale: 1, opacity: 1, rotateY: 0, x: [0, -4, 4, -3, 3, 0] }
                : fase === "giro"
                  ? { scale: [1, 0.85, 1.05], rotateY: 1440, x: 0 }
                  : { scale: [1.15, 1], rotateY: 1440, x: 0 }
            }
            transition={
              fase === "antes"
                ? { scale: { type: "spring", stiffness: 200, damping: 18 }, opacity: { duration: 0.3 }, x: { delay: 0.5, duration: 0.5 } }
                : fase === "giro"
                  ? { duration: 1.5, ease: [0.5, 0, 0.2, 1] }
                  : { duration: 0.5, ease: "easeOut" }
            }
            className={fase === "revelado" ? "drop-shadow-[0_0_40px_rgba(255,209,0,0.55)]" : ""}
          >
            <Carta {...carta} nivel={nivelVisible} size="lg" />
          </motion.div>
        </div>

        <AnimatePresence>
          {fase === "revelado" && (
            <motion.div key="cta" className="flex flex-col items-center gap-3" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
              <div className="flex items-center gap-2 text-sm font-semibold text-superficie/80">
                <span className="rounded px-2 py-0.5 text-xs font-bold uppercase tracking-widest" style={{ background: NIVEL_COLOR[de], color: "var(--color-superficie)" }}>{de}</span>
                <span aria-hidden>→</span>
                <span className="rounded px-2 py-0.5 text-xs font-bold uppercase tracking-widest" style={{ background: color, color: "var(--color-superficie)" }}>{a}</span>
              </div>
              <button onClick={onClose} className="btn btn-sol">¡Vamos!</button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <button onClick={onClose} className="absolute right-4 top-4 rounded-full p-2 text-superficie/80 hover:bg-superficie/10 hover:text-superficie" aria-label="Cerrar">
        <X className="size-6" aria-hidden />
      </button>
    </motion.div>
  );
}
