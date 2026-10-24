"use client";
import { useEffect, useMemo, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { subirFotoGondola } from "@/app/actions";
import { motion, AnimatePresence } from "framer-motion";
import { Carta } from "./Carta";
import { KPI_BY_KEY, fmtPct, fmtPts, puestoPara, score, simular, aplicar, sumarDeltas, type KpiKey, type Raw } from "@/lib/scoring";
import { construirPlan, potencialKpi, type Accion, type ClienteLite, type FamiliaLite, type LanzLite } from "@/lib/acciones";
import { SEM_COLOR, SEM_TEXTO, NIVEL_COLOR, NIVEL_BG, SectionTitle } from "./ui";

type Props = {
  me: { id: string; nombre: string; sucursal: string; tipo: string; raw: Raw; rank: number; rankSucursal: number; deltaRank: number | null; prevCumpl: Record<KpiKey, number> | null };
  otros: number[];
  /** Período ya cerrado: se muestran sus indicadores, pero el plan de acción es del mes en curso. */
  cerrado?: boolean;
  clientes: ClienteLite[];
  familias: FamiliaLite[];
  lanzamientos: LanzLite[];
  hoy: string;
  extra?: ReactNode;
  liga?: ReactNode;
};

export function VendedorPanel(p: Props) {
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [abierto, setAbierto] = useState<KpiKey | null>(null);
  const router = useRouter();
  const [gondola, setGondola] = useState<{ fase: "leyendo" | "listo"; hallazgos?: string[]; completadas?: number } | null>(null);
  const [, startG] = useTransition();
  function fotoGondola() {
    setGondola({ fase: "leyendo" });
    startG(async () => {
      const [r] = await Promise.all([subirFotoGondola(p.me.id), new Promise((ok) => setTimeout(ok, 2200))]);
      setGondola({ fase: "listo", hallazgos: r.hallazgos, completadas: r.completadas });
      router.refresh();
    });
  }
  const [dibu, setDibu] = useState<{ loading: boolean; mensaje?: string; url?: string; error?: string; fuente?: string } | null>(null);

  const plan = useMemo(() => construirPlan(p.me.raw, p.clientes, p.familias, p.lanzamientos, p.hoy), [p.me.raw, p.clientes, p.familias, p.lanzamientos, p.hoy]);
  const acciones = useMemo(() => {
    const m = new Map<string, Accion>();
    for (const pk of Object.values(plan)) for (const g of pk.grupos) for (const a of g.acciones) m.set(a.id, a);
    return m;
  }, [plan]);

  // Si una acción desaparece (ej. el cliente pagó en vivo), la sacamos de las tildadas.
  useEffect(() => {
    setChecked((prev) => new Set([...prev].filter((id) => acciones.has(id))));
  }, [acciones]);

  const deltas = [...checked].map((id) => acciones.get(id)!.delta).filter(Boolean);
  const sim = simular(p.me.raw, deltas);
  const actual = sim.antes;
  const s = checked.size ? sim.despues : actual;
  const rankSim = puestoPara(s.puntaje, p.otros);

  const barras = useMemo(() => {
    return (Object.keys(plan) as KpiKey[])
      .map((k) => ({ k, ...potencialKpi(p.me.raw, plan[k]) }))
      .sort((a, b) => b.pts - a.pts);
  }, [plan, p.me.raw]);

  const flechas = p.me.prevCumpl ? (Object.fromEntries(Object.entries(actual.cumpl).map(([k, v]) => [k, v - p.me.prevCumpl![k as KpiKey]])) as Record<KpiKey, number>) : undefined;

  function toggle(id: string) {
    setChecked((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  async function abrirDibu(a: Accion) {
    if (!a.clienteId || !a.dibu) return;
    setDibu({ loading: true });
    try {
      const r = await fetch("/api/ai/dibu", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ cliente_id: a.clienteId, tipo: a.dibu }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setDibu({ loading: false, mensaje: j.mensaje, url: j.url, fuente: j.fuente });
    } catch (e) {
      setDibu({ loading: false, error: (e as Error).message });
    }
  }

  const puntos = s.puntaje - actual.puntaje;
  const desbloquea = actual.bloqueado && !s.bloqueado && (s.nivel === "Oro" || s.nivel === "Diamante");
  const subeNivel = !desbloquea && s.nivel !== actual.nivel;

  return (
    <div className="space-y-10">
      {/* ---------- Mejorá tu carta: la carta reacciona a las acciones tildadas ---------- */}
      <section>
        <SectionTitle volanta="Plan de acción" sub={p.cerrado ? "Período cerrado: así terminaron tus 7 indicadores. El plan de acción se arma sobre el mes en curso." : "Tildá acciones y mirá cómo sube tu carta. Ordenado por puntos posibles."}>Mejorá tu carta</SectionTitle>
        <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[auto_minmax(0,1fr)]">
        <div className="flex flex-col items-center gap-3 lg:sticky lg:top-24">
          <Carta size="lg" nombre={p.me.nombre} sucursal={p.me.sucursal} tipo={p.me.tipo} puntaje={s.puntaje} nivel={s.nivel} cumpl={s.cumpl} semaforos={s.semaforos} flechas={checked.size ? undefined : flechas} rank={rankSim} rankSucursal={p.me.rankSucursal} bloqueado={s.bloqueado} motivo={s.motivoBloqueo} />
          <AnimatePresence>
            {checked.size > 0 && (
              <motion.div key="sim" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="w-[300px] rounded-xl border border-azul/20 bg-azul-suave p-3 text-center" aria-live="polite">
                <div className="cifra text-2xl text-azul">{puntos >= 0 ? "+" : ""}{fmtPts(puntos)} pts</div>
                <div className="text-sm font-semibold text-tinta">
                  {rankSim < p.me.rank ? <>subís al <b>#{rankSim}</b></> : <>seguís en el #{rankSim}</>}
                  {desbloquea && <> · <span className="chip" style={{ color: NIVEL_COLOR[s.nivel], background: NIVEL_BG[s.nivel] }}>🔓 desbloqueás {s.nivel}</span></>}
                  {subeNivel && <> · pasás a <span className="chip" style={{ color: NIVEL_COLOR[s.nivel], background: NIVEL_BG[s.nivel] }}>{s.nivel}</span></>}
                </div>
                <div className="mt-1 text-xs text-niebla">Simulación con {checked.size} {checked.size > 1 ? "acciones" : "acción"} · <button className="font-semibold text-azul-web underline" onClick={() => setChecked(new Set())}>limpiar</button></div>
              </motion.div>
            )}
          </AnimatePresence>
          {actual.bloqueado && checked.size === 0 && (
            <div className="w-[280px] rounded-lg border-l-4 border-ambar bg-ambar-s px-3 py-2 text-sm text-ambar-t">
              🔒 {actual.motivoBloqueo}. Con {fmtPts(actual.puntaje)} pts serías <b>{actual.nivelSinCandado}</b>{p.cerrado ? "." : ": subí Cobranzas a amarillo y lo desbloqueás."}
            </div>
          )}
        </div>

        <div className="space-y-2">
          {barras.map(({ k, pts, cumplMax }) => {
            const def = KPI_BY_KEY[k];
            const c = actual.cumpl[k];
            const cs = s.cumpl[k];
            const open = abierto === k;
            const pk = plan[k];
            const nSel = pk.grupos.flatMap((g) => g.acciones).filter((a) => checked.has(a.id)).length;
            return (
              <div key={k} className={`panel overflow-hidden transition ${open ? "!border-azul/40 shadow-md" : ""}`}>
                <button className={`w-full p-3 text-left sm:p-4 ${p.cerrado ? "cursor-default" : "hover:bg-fondo/60"}`} onClick={() => !p.cerrado && setAbierto(open ? null : k)} aria-expanded={p.cerrado ? undefined : open}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="inline-block h-3 w-3 shrink-0 rounded-full" style={{ background: SEM_COLOR[actual.semaforos[k]] }} aria-hidden />
                      <span className="cifra text-lg" style={{ color: SEM_TEXTO[actual.semaforos[k]] }}>{def.abbr}</span>
                      <span className="font-semibold text-tinta">{def.nombre}</span>
                      {nSel > 0 && <span className="chip bg-azul text-white">{nSel} ✓</span>}
                    </div>
                    {!p.cerrado && <span className={`chip shrink-0 ${pts > 0.05 ? "bg-sol-suave text-azul" : "bg-fondo text-tenue"}`}>+{fmtPts(pts)} pts posibles</span>}
                  </div>
                  <Barra c={c} cs={cs} cMax={cumplMax} color={SEM_COLOR[actual.semaforos[k]]} />
                  <div className="mt-1 flex justify-between text-xs text-niebla">
                    <span>Real {fmtPct(actual.reales[k])} · objetivo {fmtPct(def.objetivo, 0)} {def.sentido === "down" ? "(menos es mejor)" : ""}</span>
                    <span>Cumpl. {Math.round(c * 100)}%{cs !== c && <b className="text-azul"> → {Math.round(cs * 100)}%</b>}</span>
                  </div>
                  {!p.cerrado && <div className="mt-1 text-xs font-semibold text-azul-web">{pk.resumen} <span aria-hidden>{open ? "▴" : "▾"}</span></div>}
                </button>
                <AnimatePresence initial={false}>
                  {open && (
                    <motion.div key="acc" initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden border-t border-linea bg-fondo/50">
                      <div className="space-y-4 p-3 sm:p-4">
                        {k === "rel" && (
                          <button onClick={fotoGondola} disabled={gondola?.fase === "leyendo"} className="w-full rounded-xl border border-azul/20 bg-white p-3 text-left hover:border-azul disabled:opacity-60">
                            <div className="flex items-center gap-2 font-bold text-azul"><span className="chip bg-azul text-white">Agente IA</span> 📸 Subir foto de góndola</div>
                            <div className="mt-0.5 text-xs text-niebla">Agente de Relevamiento Visual: la IA lee la foto y completa hasta 5 encuestas de una.</div>
                          </button>
                        )}
                        {pk.grupos.map((g) => (
                          <div key={g.titulo}>
                            <div className="mb-1 text-[11px] font-bold uppercase tracking-[0.16em] text-niebla">{g.titulo}</div>
                            {g.nota && <div className="mb-2 text-xs text-tenue">{g.nota}</div>}
                            {g.acciones.length === 0 && <div className="text-sm text-tenue">Nada pendiente acá.</div>}
                            <ul className="space-y-1">
                              {g.acciones.map((a) => {
                                const pa = score(aplicar(p.me.raw, sumarDeltas([a.delta]))).puntaje - actual.puntaje;
                                return (
                                  <li key={a.id} className={`flex items-center gap-3 rounded-lg border px-2 py-2 ${checked.has(a.id) ? "border-azul/30 bg-azul-suave" : "border-transparent bg-white hover:border-linea"}`}>
                                    <input type="checkbox" checked={checked.has(a.id)} onChange={() => toggle(a.id)} className="h-5 w-5 shrink-0 accent-[#164194]" aria-label={a.titulo} />
                                    <button className="min-w-0 flex-1 text-left" onClick={() => toggle(a.id)}>
                                      <div className={`truncate text-sm font-semibold ${a.bulk ? "italic text-niebla" : "text-tinta"}`}>{a.urgente && <span className="text-rojo" aria-label="vencido">● </span>}{a.titulo}</div>
                                      {a.detalle && <div className="truncate text-xs text-tenue">{a.detalle}</div>}
                                    </button>
                                    <span className="cifra shrink-0 text-xs text-azul">+{fmtPts(pa, 2)}</span>
                                    {a.dibu && (
                                      <button onClick={() => abrirDibu(a)} className="btn btn-sm btn-sol shrink-0" title="Comodín Dibu: arma el WhatsApp">
                                        🧤 {a.dibu === "aviso_entrega" ? "Avisar" : "Dibu"}
                                      </button>
                                    )}
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
        </div>
      </section>

      {p.extra}

      {p.liga}

      {/* ---------- Agente de góndola ---------- */}
      <AnimatePresence>
        {gondola && (
          <motion.div key="gondola" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 grid place-items-center bg-azul-hondo/60 p-4 backdrop-blur-sm" onClick={() => gondola.fase === "listo" && setGondola(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} role="dialog" aria-modal="true" aria-label="Agente de Relevamiento" className="panel w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="bg-azul px-5 py-3 text-white"><div className="volanta !text-sol">Agente IA</div><div className="text-lg font-bold">📸 Relevamiento visual</div></div>
              <div className="p-5">
              {gondola.fase === "leyendo" ? (
                <div className="py-6 text-center">
                  <div className="relative mx-auto h-32 w-48 overflow-hidden rounded-lg border border-linea bg-fondo">
                    <div className="absolute inset-x-0 grid grid-cols-4 gap-1 p-2">{Array.from({ length: 12 }).map((_, i) => <div key={i} className="h-6 rounded-sm" style={{ background: ["#ffd100", "#164194", "#895e36", "#2a402b"][i % 4], opacity: 0.55 }} />)}</div>
                    <motion.div className="absolute inset-x-0 h-1 bg-azul-web shadow-[0_0_10px_#034ea2]" animate={{ top: ["0%", "100%", "0%"] }} transition={{ duration: 1.6, repeat: Infinity }} />
                  </div>
                  <div className="mt-3 text-sm text-niebla">Leyendo frentes, precios y faltantes…</div>
                </div>
              ) : (
                <>
                  <div className="text-sm">{gondola.completadas ? <>✅ <b>{gondola.completadas} {gondola.completadas === 1 ? "encuesta completada" : "encuestas completadas"}</b> automáticamente.</> : "No quedaban encuestas pendientes."}</div>
                  <ul className="mt-2 space-y-1 text-xs text-niebla">{gondola.hallazgos?.map((h) => <li key={h}>• {h}</li>)}</ul>
                  <button onClick={() => setGondola(null)} className="btn btn-azul mt-4 w-full">Listo</button>
                </>
              )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---------- Modal Comodín Dibu ---------- */}
      <AnimatePresence>
        {dibu && (
          <motion.div key="dibu" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 grid place-items-center bg-azul-hondo/60 p-4 backdrop-blur-sm" onClick={() => setDibu(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} role="dialog" aria-modal="true" aria-label="Comodín Dibu" className="panel w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="bg-sol px-5 py-3 text-azul"><div className="text-[11px] font-bold uppercase tracking-[0.22em]">Asistente de mensajes</div><div className="text-lg font-bold">🧤 Comodín Dibu</div></div>
              <div className="p-5">
              <div className="mb-3 text-xs text-niebla">Revisalo y mandalo vos desde tu WhatsApp.</div>
              {dibu.loading && <div className="py-8 text-center text-niebla">Atajando el mensaje…</div>}
              {dibu.error && <div className="rounded-lg bg-rojo-s px-3 py-2 text-sm text-rojo-t">{dibu.error}</div>}
              {dibu.mensaje && (
                <>
                  <div className="whitespace-pre-wrap rounded-xl rounded-tl-none bg-[#005c4b] p-3 text-sm text-white shadow">{dibu.mensaje}</div>
                  <div className="mt-1 text-right text-[10px] text-tenue">{dibu.fuente === "ia" ? "redactado con IA" : "plantilla La Virginia"}</div>
                  <div className="mt-4 flex gap-2">
                    <a href={dibu.url} target="_blank" rel="noreferrer" className="btn btn-azul flex-1">Abrir WhatsApp ›</a>
                    <button onClick={() => navigator.clipboard?.writeText(dibu.mensaje!)} className="btn btn-linea">Copiar</button>
                    <button onClick={() => setDibu(null)} className="btn btn-linea">Cerrar</button>
                  </div>
                </>
              )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Barra({ c, cs, cMax, color }: { c: number; cs: number; cMax: number; color: string }) {
  const w = (x: number) => `${(Math.min(1.1, x) / 1.1) * 100}%`;
  return (
    <div className="relative mt-2 h-3.5 overflow-hidden rounded-full bg-fondo ring-1 ring-linea">
      <div className="fantasma absolute inset-y-0 left-0 rounded-full" style={{ width: w(cMax) }} />
      <motion.div className="absolute inset-y-0 left-0 rounded-full" style={{ background: color }} initial={false} animate={{ width: w(cs) }} transition={{ type: "spring", stiffness: 120, damping: 20 }} />
      {cs > c && <div className="absolute inset-y-0 left-0 rounded-full bg-black/20" style={{ width: w(c) }} />}
      <div className="absolute inset-y-0 w-0.5 bg-azul" style={{ left: w(1) }} title="Objetivo" />
    </div>
  );
}
