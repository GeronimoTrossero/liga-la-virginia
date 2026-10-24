"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Carta } from "./Carta";
import { KPI_BY_KEY, fmtPct, fmtPts, puestoPara, score, simular, aplicar, sumarDeltas, type KpiKey, type Nivel, type Raw } from "@/lib/scoring";
import { construirPlan, potencialKpi, type Accion, type ClienteLite, type FamiliaLite, type LanzLite } from "@/lib/acciones";
import { SEM_COLOR, NIVEL_COLOR } from "./ui";

export type RankRow = { id: string; nombre: string; sucursal: string; rank: number; puntaje: number; nivel: Nivel; bloqueado: boolean };

type Props = {
  me: { id: string; nombre: string; sucursal: string; tipo: string; raw: Raw; rank: number; rankSucursal: number; deltaRank: number | null; prevCumpl: Record<KpiKey, number> | null };
  total: number;
  totalSucursal: number;
  otros: number[];
  ranking: RankRow[];
  clientes: ClienteLite[];
  familias: FamiliaLite[];
  lanzamientos: LanzLite[];
  hoy: string;
};

export function VendedorPanel(p: Props) {
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [abierto, setAbierto] = useState<KpiKey | null>(null);
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
    <div className="space-y-8">
      {/* ---------- Carta + posición ---------- */}
      <section className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 md:grid-cols-[auto_minmax(0,1fr)]">
        <div className="flex flex-col items-center gap-3">
          <Carta size="lg" nombre={p.me.nombre} sucursal={p.me.sucursal} tipo={p.me.tipo} puntaje={s.puntaje} nivel={s.nivel} cumpl={s.cumpl} semaforos={s.semaforos} flechas={checked.size ? undefined : flechas} rank={rankSim} rankSucursal={p.me.rankSucursal} bloqueado={s.bloqueado} motivo={s.motivoBloqueo} />
          <AnimatePresence>
            {checked.size > 0 && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="w-[300px] rounded-xl border border-acento/50 bg-acento/10 p-3 text-center">
                <div className="font-display text-2xl font-black text-acento">{puntos >= 0 ? "+" : ""}{fmtPts(puntos)} pts</div>
                <div className="text-sm font-semibold">
                  {rankSim < p.me.rank ? <>subís al <b>#{rankSim}</b></> : <>seguís en el #{rankSim}</>}
                  {desbloquea && <> · <span style={{ color: NIVEL_COLOR[s.nivel] }}>🔓 desbloqueás {s.nivel}</span></>}
                  {subeNivel && <> · pasás a <span style={{ color: NIVEL_COLOR[s.nivel] }}>{s.nivel}</span></>}
                </div>
                <div className="mt-1 text-xs text-niebla">Simulación con {checked.size} {checked.size > 1 ? "acciones" : "acción"} · <button className="underline" onClick={() => setChecked(new Set())}>limpiar</button></div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="space-y-4">
          <div className="panel p-4">
            <div className="text-xs font-bold uppercase tracking-widest text-niebla">Mi posición</div>
            <div className="mt-1 font-display text-4xl font-black leading-none">
              #{p.me.rank} <span className="text-xl text-niebla">de {p.total}</span>
            </div>
            <div className="mt-1 text-sm text-niebla">
              #{p.me.rankSucursal} en {p.me.sucursal} (de {p.totalSucursal}) ·{" "}
              {p.me.deltaRank === null || p.me.deltaRank === 0 ? "mismo puesto que el mes pasado" : p.me.deltaRank > 0 ? <span className="text-verde">subiste {p.me.deltaRank} puestos</span> : <span className="text-rojo">bajaste {-p.me.deltaRank} puestos</span>}
            </div>
            {actual.bloqueado && <div className="mt-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">🔒 {actual.motivoBloqueo}. Con {fmtPts(actual.puntaje)} pts serías <b>{actual.nivelSinCandado}</b>: subí Cobranzas a amarillo y lo desbloqueás.</div>}
          </div>
          <RankingList rows={p.ranking} meId={p.me.id} />
        </div>
      </section>

      {/* ---------- Mejorá tu carta ---------- */}
      <section>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <h2 className="font-display text-3xl font-black uppercase">⭐ Mejorá tu carta</h2>
          <div className="text-sm text-niebla">Tildá acciones y mirá cómo sube tu carta. Ordenado por puntos posibles.</div>
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
              <div key={k} className={`panel overflow-hidden transition ${open ? "border-acento/60" : ""}`}>
                <button className="w-full p-3 text-left sm:p-4" onClick={() => setAbierto(open ? null : k)}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-display text-xl font-black" style={{ color: SEM_COLOR[actual.semaforos[k]] }}>{def.abbr}</span>
                      <span className="font-semibold">{def.nombre}</span>
                      {nSel > 0 && <span className="rounded-full bg-acento/20 px-2 text-xs font-bold text-acento">{nSel} ✓</span>}
                    </div>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${pts > 0.05 ? "bg-oro/15 text-oro" : "bg-linea text-niebla"}`}>+{fmtPts(pts)} pts posibles</span>
                  </div>
                  <Barra c={c} cs={cs} cMax={cumplMax} color={SEM_COLOR[actual.semaforos[k]]} />
                  <div className="mt-1 flex justify-between text-xs text-niebla">
                    <span>Real {fmtPct(actual.reales[k])} · objetivo {fmtPct(def.objetivo, 0)} {def.sentido === "down" ? "(menos es mejor)" : ""}</span>
                    <span>Cumpl. {Math.round(c * 100)}%{cs !== c && <span className="text-acento"> → {Math.round(cs * 100)}%</span>}</span>
                  </div>
                  <div className="mt-0.5 text-xs text-niebla/80">{pk.resumen} {open ? "▴" : "▾"}</div>
                </button>
                <AnimatePresence initial={false}>
                  {open && (
                    <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden border-t border-linea">
                      <div className="space-y-4 p-3 sm:p-4">
                        {pk.grupos.map((g) => (
                          <div key={g.titulo}>
                            <div className="mb-1 text-sm font-bold uppercase tracking-wide text-niebla">{g.titulo}</div>
                            {g.nota && <div className="mb-2 text-xs text-niebla/80">{g.nota}</div>}
                            {g.acciones.length === 0 && <div className="text-sm text-niebla">Nada pendiente acá 👏</div>}
                            <ul className="space-y-1">
                              {g.acciones.map((a) => {
                                const pa = score(aplicar(p.me.raw, sumarDeltas([a.delta]))).puntaje - actual.puntaje;
                                return (
                                  <li key={a.id} className={`flex items-center gap-3 rounded-lg px-2 py-2 ${checked.has(a.id) ? "bg-acento/10" : "hover:bg-white/5"}`}>
                                    <input type="checkbox" checked={checked.has(a.id)} onChange={() => toggle(a.id)} className="h-5 w-5 shrink-0 accent-sky-400" />
                                    <button className="min-w-0 flex-1 text-left" onClick={() => toggle(a.id)}>
                                      <div className={`truncate text-sm font-semibold ${a.bulk ? "italic text-niebla" : ""}`}>{a.urgente && <span className="text-rojo">● </span>}{a.titulo}</div>
                                      {a.detalle && <div className="truncate text-xs text-niebla">{a.detalle}</div>}
                                    </button>
                                    <span className="shrink-0 text-xs font-bold text-oro">+{fmtPts(pa, 2)}</span>
                                    {a.dibu && (
                                      <button onClick={() => abrirDibu(a)} className="shrink-0 rounded-md border border-verde/50 bg-verde/10 px-2 py-1 text-xs font-bold text-verde hover:bg-verde/20" title="Comodín Dibu: arma el WhatsApp">
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
      </section>

      {/* ---------- Modal Comodín Dibu ---------- */}
      <AnimatePresence>
        {dibu && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" onClick={() => setDibu(null)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="panel w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
              <div className="font-display text-2xl font-black uppercase">🧤 Comodín Dibu</div>
              <div className="mb-3 text-xs text-niebla">Revisalo y mandalo vos desde tu WhatsApp.</div>
              {dibu.loading && <div className="py-8 text-center text-niebla">Atajando el mensaje…</div>}
              {dibu.error && <div className="text-rojo">{dibu.error}</div>}
              {dibu.mensaje && (
                <>
                  <div className="whitespace-pre-wrap rounded-xl rounded-tl-none bg-[#005c4b] p-3 text-sm text-white shadow">{dibu.mensaje}</div>
                  <div className="mt-1 text-right text-[10px] text-niebla">{dibu.fuente === "ia" ? "redactado con IA" : "plantilla La Virginia"}</div>
                  <div className="mt-4 flex gap-2">
                    <a href={dibu.url} target="_blank" rel="noreferrer" className="flex-1 rounded-lg bg-verde py-2 text-center font-bold text-noche">Abrir WhatsApp</a>
                    <button onClick={() => navigator.clipboard?.writeText(dibu.mensaje!)} className="rounded-lg border border-linea px-3 py-2 text-sm">Copiar</button>
                    <button onClick={() => setDibu(null)} className="rounded-lg border border-linea px-3 py-2 text-sm">Cerrar</button>
                  </div>
                </>
              )}
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
    <div className="relative mt-2 h-4 overflow-hidden rounded-full bg-white/5">
      <div className="fantasma absolute inset-y-0 left-0 rounded-full opacity-60" style={{ width: w(cMax) }} />
      <motion.div className="absolute inset-y-0 left-0 rounded-full" style={{ background: color, boxShadow: `0 0 12px ${color}` }} initial={false} animate={{ width: w(cs) }} transition={{ type: "spring", stiffness: 120, damping: 20 }} />
      {cs > c && <div className="absolute inset-y-0 left-0 rounded-full bg-black/25" style={{ width: w(c) }} />}
      <div className="absolute inset-y-[-2px] w-0.5 bg-white" style={{ left: w(1) }} title="Objetivo" />
    </div>
  );
}

function RankingList({ rows, meId }: { rows: RankRow[]; meId: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current?.querySelector<HTMLElement>("[data-me]");
    if (el && ref.current) ref.current.scrollTop = el.offsetTop - ref.current.clientHeight / 2 + el.clientHeight / 2;
  }, [rows]);
  return (
    <div className="panel p-2">
      <div className="flex justify-between px-2 pb-1 pt-1 text-xs font-bold uppercase tracking-widest text-niebla">
        <span>Ranking completo</span>
        <span>pts</span>
      </div>
      <div ref={ref} className="scrollbar-thin relative h-[300px] overflow-y-auto">
        {rows.map((r) => (
          <div key={r.id} data-me={r.id === meId ? "" : undefined} className={`flex items-center gap-3 rounded-md px-2 py-1.5 text-sm ${r.id === meId ? "bg-oro/15 font-bold text-oro ring-1 ring-oro/50" : ""}`}>
            <span className="w-8 text-right font-display text-base font-bold text-niebla">{r.rank}</span>
            <span className="min-w-0 flex-1 truncate">{r.nombre} <span className="text-xs font-normal text-niebla">· {r.sucursal}</span></span>
            <span className="text-xs" style={{ color: NIVEL_COLOR[r.nivel] }}>{r.bloqueado ? "🔒" : ""}{r.nivel}</span>
            <span className="w-12 text-right font-display font-bold">{fmtPts(r.puntaje)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
