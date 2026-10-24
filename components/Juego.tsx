import Link from "next/link";
import { RACHA_KPIS, RACHA_LABEL, type Division, type VendorGame } from "@/lib/game";
import { KPI_BY_KEY, fmtPts, type Nivel } from "@/lib/scoring";
import { ArrowDown, ArrowUp, ShieldCheck } from "lucide-react";
import { NIVEL_BG, NIVEL_COLOR, VARIEDADES } from "./ui";
import { Ilus, NIVEL_ILUS } from "./Icono";

const ESTADO_UI = {
  viva: { txt: "viva", cls: "border-sol bg-sol-suave text-azul", llama: true },
  protegida: { txt: "protegida", cls: "border-azul/30 bg-azul-suave text-azul", llama: true },
  riesgo: { txt: "en riesgo", cls: "border-rojo bg-rojo-s text-rojo-t latido", llama: true },
  rota: { txt: "arrancala", cls: "border-linea bg-fondo text-niebla", llama: false },
} as const;

export function RiesgoBanners({ g }: { g: VendorGame }) {
  const riesgos = RACHA_KPIS.filter((k) => g.rachas[k].estado === "riesgo");
  if (!riesgos.length) return null;
  return (
    <div className="space-y-2">
      {riesgos.map((k) => (
        <div key={k} role="alert" className="flex items-center gap-3 rounded-xl border-l-4 border-rojo bg-rojo-s px-4 py-3">
          <Ilus n="llama" size={40} />
          <div>
            <div className="font-bold text-rojo-t">Tu racha de {g.rachas[k].meses} {g.rachas[k].meses === 1 ? "mes" : "meses"} en {KPI_BY_KEY[k].abbr} está en riesgo</div>
            <div className="text-sm text-tinta">{g.rachas[k].falta ?? "Volvé a verde antes del cierre"} para salvarla{g.protectores > 0 ? " (o llegá a amarillo y usá un protector)" : ""}.</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function Rachas({ g }: { g: VendorGame }) {
  return (
    <section className="panel p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <div className="volanta">Constancia</div>
          <h2 className="titulo text-xl">Rachas</h2>
        </div>
        <span className="flex items-center gap-0.5 text-sm" title="Protectores: se ganan con podio o misiones. Un KPI en amarillo consume uno y la racha sigue.">
          {Array.from({ length: Math.max(g.protectorMax, g.protectores) }).map((_, i) => <Ilus key={i} n="escudo" size={26} apagado={i >= g.protectores} quieto />)}
          {g.protectorMax === 0 && <span className="flex items-center gap-1 text-xs text-tenue"><ShieldCheck className="size-3.5" aria-hidden /> desde Plata</span>}
          <span className="ml-1 text-xs font-semibold text-niebla">{g.protectores}/{g.protectorMax} protectores</span>
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {RACHA_KPIS.map((k) => {
          const r = g.rachas[k];
          const ui = ESTADO_UI[r.estado];
          return (
            <div key={k} className={`rounded-xl border p-3 text-center ${ui.cls}`}>
              <div className="text-[11px] font-bold uppercase tracking-[0.14em] opacity-80">{RACHA_LABEL[k]}</div>
              <div className="cifra mt-0.5 flex items-center justify-center gap-1 text-4xl leading-none">
                <Ilus n="llama" size={34} apagado={!(ui.llama && r.meses > 0)} />
                {r.meses}
              </div>
              <div className="mt-1 text-[11px] font-semibold">{ui.txt}{r.estado !== "viva" && r.falta ? ` · ${r.falta}` : ""}</div>
              <div className="text-[10px] opacity-70">récord {r.mejor} {r.mejor === 1 ? "mes" : "meses"}</div>
            </div>
          );
        })}
      </div>
      <div className="mt-3 rounded-lg bg-fondo px-3 py-2 text-sm">
        <span className="text-niebla">Racha general (VTA y COB sin rojo): <b className="cifra text-base text-tinta">{g.rachaGeneral} {g.rachaGeneral === 1 ? "mes" : "meses"}</b></span>
      </div>
    </section>
  );
}

export function TemporadaCard({ g, nombreTemp }: { g: VendorGame; nombreTemp: string }) {
  const sube = g.nivelTemporadaPrev && orden(g.nivelTemporada) > orden(g.nivelTemporadaPrev);
  const baja = g.nivelTemporadaPrev && orden(g.nivelTemporada) < orden(g.nivelTemporadaPrev);
  return (
    <div className="panel p-4 sm:p-5">
      <div className="volanta">Temporada {nombreTemp}</div>
      <div className="mt-2 flex items-center gap-3">
        <span className="anim-pop grid h-16 w-16 shrink-0 place-items-center rounded-full" style={{ background: NIVEL_BG[g.nivelTemporada] }}><Ilus n={NIVEL_ILUS[g.nivelTemporada]} size={52} alt={g.nivelTemporada} /></span>
        <div>
          <div className="text-3xl font-extrabold leading-none" style={{ color: NIVEL_COLOR[g.nivelTemporada] }}>{g.nivelTemporada}</div>
          <div className="mt-1 text-xs text-niebla">
            #{g.temporadaPuesto} por promedio ({fmtPts(g.temporadaProm)}) {sube ? <span className="font-semibold text-verde-t">· <ArrowUp className="anim-subir inline size-3.5" aria-hidden /> subiste desde {g.nivelTemporadaPrev}</span> : baja ? <span className="font-semibold text-rojo-t">· <ArrowDown className="anim-bajar inline size-3.5" aria-hidden /> venías de {g.nivelTemporadaPrev}</span> : null}
          </div>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-center">
        <div className="rounded-lg bg-sol p-2.5">
          <div className="cifra text-3xl text-azul">{fmtPts(g.temporadaProm)}</div>
          <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-azul/80">Puntaje promedio</div>
        </div>
        <div className="rounded-lg bg-azul-suave p-2.5">
          <div className="cifra text-3xl text-azul">#{g.temporadaPuesto}</div>
          <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-azul/80">Puesto temporada</div>
        </div>
      </div>
      <div className="mt-3 text-[11px] text-tenue">Nivel de temporada por percentil del Puntaje Oficial: Diamante top 5% · Oro 20% · Plata 40% · Bronce resto.</div>
    </div>
  );
}

const orden = (n: Nivel) => ["Bronce", "Plata", "Oro", "Diamante"].indexOf(n);

export function TuLiga({ div, meId, nombres, linkear }: { div: Division; meId?: string; nombres: Map<string, { nombre: string; sucursal: string }>; linkear?: boolean }) {
  const v = VARIEDADES[div.idx % VARIEDADES.length];
  return (
    <section className="panel flex overflow-hidden">
      <div className="franja w-3 shrink-0" style={{ ["--v" as string]: v }} aria-hidden />
      <div className="min-w-0 flex-1 p-4 sm:p-5">
        <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
          <div>
            <div className="volanta">{meId ? "Tu grupo" : "División"}</div>
            <h2 className="titulo text-xl">{meId ? "Tu Liga" : div.nombre.split(" · ")[0]}</h2>
          </div>
          <span className="chip text-white" style={{ background: v }}>{div.nombre}</span>
        </div>
        <div className="mb-3 text-xs text-tenue">Grupo de nivel parecido. Al cierre de temporada: top 3 ascienden, últimos 3 descienden. Se ordena por el promedio de tu Puntaje Oficial.</div>
        <ol className="space-y-1">
          {div.miembros.map((m) => {
            const n = nombres.get(m.id);
            const yo = m.id === meId;
            return (
              <li key={m.id} className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm ${yo ? "bg-sol font-bold text-azul" : "odd:bg-fondo/60"} ${m.zona === "ascenso" ? "border-l-4 border-verde" : m.zona === "descenso" ? "border-l-4 border-rojo" : "border-l-4 border-transparent"}`}>
                <span className="cifra w-6 text-right opacity-70">{m.pos}</span>
                <span className="min-w-0 flex-1 truncate">
                  {linkear ? <Link href={`/vendedor/${m.id}`} className="hover:text-azul-web hover:underline">{n?.nombre}</Link> : n?.nombre}
                  <span className="text-xs font-normal opacity-70"> · {n?.sucursal.split("/")[0]}</span>
                </span>
                {m.zona === "ascenso" && <span className="inline-flex items-center text-[10px] font-bold text-verde-t"><ArrowUp className="anim-subir size-3" aria-hidden />ASC</span>}
                {m.zona === "descenso" && <span className="inline-flex items-center text-[10px] font-bold text-rojo-t"><ArrowDown className="anim-bajar size-3" aria-hidden />DESC</span>}
                <span className="cifra w-12 text-right">{fmtPts(m.prom)}</span>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
