import Link from "next/link";
import { RACHA_KPIS, RACHA_LABEL, type Division, type VendorGame } from "@/lib/game";
import { KPI_BY_KEY, fmtPts, type Nivel } from "@/lib/scoring";
import { NIVEL_COLOR, NIVEL_ICON } from "./ui";

const ESTADO_UI = {
  viva: { txt: "viva", cls: "border-orange-500/60 bg-orange-500/10", llama: true },
  protegida: { txt: "🛡️ protegida", cls: "border-sky-400/60 bg-sky-400/10", llama: true },
  riesgo: { txt: "en riesgo", cls: "border-lv bg-lv/15 latido", llama: true },
  rota: { txt: "arrancala", cls: "border-linea bg-white/5", llama: false },
} as const;

export function RiesgoBanners({ g }: { g: VendorGame }) {
  const riesgos = RACHA_KPIS.filter((k) => g.rachas[k].estado === "riesgo");
  if (!riesgos.length) return null;
  return (
    <div className="space-y-2">
      {riesgos.map((k) => (
        <div key={k} className="latido flex items-center gap-3 rounded-xl border border-lv bg-lv/15 px-4 py-3">
          <span className="llama text-3xl">🔥</span>
          <div>
            <div className="font-display text-xl font-black uppercase leading-none">Tu racha de {g.rachas[k].meses} {g.rachas[k].meses === 1 ? "mes" : "meses"} en {KPI_BY_KEY[k].abbr} está en riesgo</div>
            <div className="text-sm text-red-100">{g.rachas[k].falta ?? "Volvé a verde antes del cierre"} para salvarla{g.protectores > 0 ? " (o llegá a amarillo y usá un 🛡️)" : ""}.</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function Rachas({ g }: { g: VendorGame }) {
  return (
    <section className="panel p-4">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <h2 className="font-display text-2xl font-black uppercase">🔥 Rachas</h2>
        <div className="flex items-center gap-3 text-sm">
          <span title="Protectores: se ganan con podio o misiones. Un KPI en amarillo consume uno y la racha sigue.">
            {Array.from({ length: Math.max(g.protectorMax, g.protectores) }).map((_, i) => <span key={i} className={i < g.protectores ? "" : "opacity-25 grayscale"}>🛡️</span>)}
            {g.protectorMax === 0 && <span className="text-xs text-niebla">🛡️ desde Plata</span>}
            <span className="ml-1 text-xs text-niebla">{g.protectores}/{g.protectorMax}</span>
          </span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {RACHA_KPIS.map((k) => {
          const r = g.rachas[k];
          const ui = ESTADO_UI[r.estado];
          return (
            <div key={k} className={`rounded-xl border p-3 text-center ${ui.cls}`}>
              <div className="text-xs font-bold uppercase tracking-wider text-niebla">{RACHA_LABEL[k]}</div>
              <div className="font-display text-4xl font-black leading-none">
                <span className={ui.llama && r.meses > 0 ? "llama" : "opacity-30 grayscale"}>🔥</span>
                {r.meses}
              </div>
              <div className="text-[11px] font-semibold">{ui.txt}{r.estado !== "viva" && r.falta ? ` · ${r.falta}` : ""}</div>
              <div className="text-[10px] text-niebla">récord {r.mejor} {r.mejor === 1 ? "mes" : "meses"}</div>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white/5 px-3 py-2 text-sm">
        <span>Racha general (VTA y COB sin rojo): <b className="font-display text-lg">{g.rachaGeneral} {g.rachaGeneral === 1 ? "mes" : "meses"}</b></span>
        <span className="rounded-full bg-acento/20 px-2.5 py-0.5 font-display font-black text-acento">×{g.multiplicador.toFixed(2).replace(".", ",")} Puntos de Liga</span>
      </div>
    </section>
  );
}

export function TemporadaCard({ g, nombreTemp }: { g: VendorGame; nombreTemp: string }) {
  const sube = g.nivelTemporadaPrev && orden(g.nivelTemporada) > orden(g.nivelTemporadaPrev);
  const baja = g.nivelTemporadaPrev && orden(g.nivelTemporada) < orden(g.nivelTemporadaPrev);
  return (
    <div className="panel p-4">
      <div className="text-xs font-bold uppercase tracking-widest text-niebla">Temporada {nombreTemp}</div>
      <div className="mt-1 flex items-center gap-3">
        <span className="text-3xl">{NIVEL_ICON[g.nivelTemporada]}</span>
        <div>
          <div className="font-display text-3xl font-black uppercase leading-none" style={{ color: NIVEL_COLOR[g.nivelTemporada] }}>{g.nivelTemporada}</div>
          <div className="text-xs text-niebla">
            #{g.temporadaPuesto} por promedio ({fmtPts(g.temporadaProm)}) {sube ? <span className="text-verde">· ⬆ subiste desde {g.nivelTemporadaPrev}</span> : baja ? <span className="text-rojo">· ⬇ venías de {g.nivelTemporadaPrev}</span> : null}
          </div>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-center">
        <div className="rounded-lg bg-acento/10 p-2">
          <div className="font-display text-3xl font-black text-acento">{g.xpTemporada}</div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-niebla">Puntos de Liga</div>
        </div>
        <div className="rounded-lg bg-white/5 p-2">
          <div className="font-display text-3xl font-black">×{g.multiplicador.toFixed(2).replace(".", ",")}</div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-niebla">Multiplicador</div>
        </div>
      </div>
      <div className="mt-2 text-[11px] text-niebla">Nivel de temporada por percentil: 💎 top 5% · 🥇 20% · 🥈 40% · 🥉 resto. Los Puntos de Liga no tocan el Puntaje Oficial: alimentan beneficios y desempates.</div>
    </div>
  );
}

const orden = (n: Nivel) => ["Bronce", "Plata", "Oro", "Diamante"].indexOf(n);

export function TuLiga({ div, meId, nombres, linkear }: { div: Division; meId?: string; nombres: Map<string, { nombre: string; sucursal: string }>; linkear?: boolean }) {
  return (
    <section className="panel p-4">
      <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
        <h2 className="font-display text-2xl font-black uppercase">⚔️ {meId ? "Tu Liga" : div.nombre.split(" · ")[0]}</h2>
        <span className="text-sm font-bold text-acento">{div.nombre}</span>
      </div>
      <div className="mb-2 text-xs text-niebla">Grupo de nivel parecido. Al cierre de temporada: top 3 ascienden, últimos 3 descienden. Desempate por Puntos de Liga.</div>
      <ol className="space-y-1">
        {div.miembros.map((m) => {
          const n = nombres.get(m.id);
          const yo = m.id === meId;
          return (
            <li key={m.id} className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm ${yo ? "bg-acento/15 font-bold ring-1 ring-acento/60" : ""} ${m.zona === "ascenso" ? "border-l-4 border-verde" : m.zona === "descenso" ? "border-l-4 border-lv" : "border-l-4 border-transparent"}`}>
              <span className="w-6 text-right font-display text-lg font-bold text-niebla">{m.pos}</span>
              <span className="min-w-0 flex-1 truncate">
                {linkear ? <Link href={`/vendedor/${m.id}`} className="hover:text-acento">{n?.nombre}</Link> : n?.nombre}
                <span className="text-xs font-normal text-niebla"> · {n?.sucursal.split("/")[0]}</span>
              </span>
              {m.zona === "ascenso" && <span className="text-[10px] font-bold text-verde">⬆ ASC</span>}
              {m.zona === "descenso" && <span className="text-[10px] font-bold text-lv">⬇ DESC</span>}
              <span className="w-12 text-right text-xs text-acento">{m.xp} PL</span>
              <span className="w-12 text-right font-display font-bold">{fmtPts(m.prom)}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
