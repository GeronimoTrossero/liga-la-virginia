"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { fmtPts, type Nivel } from "@/lib/scoring";
import { NIVEL_COLOR } from "./ui";

export type RankRow = { id: string; nombre: string; sucursal: string; rank: number; puntaje: number; nivel: Nivel; bloqueado: boolean };

/** Selector de período: cambia ?mes= y el servidor vuelve a calcular el panel. */
export function PeriodoSelect({ meses, actual, porDefecto, ayuda }: { meses: { value: string; label: string }[]; actual: string; porDefecto: string; ayuda?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, start] = useTransition();
  return (
    <div className="w-full text-left sm:w-auto sm:text-right">
      <label htmlFor="periodo" className="volanta">Período</label>
      <select
        id="periodo"
        value={actual}
        disabled={pending}
        onChange={(e) => start(() => router.push(e.target.value === porDefecto ? pathname : `${pathname}?mes=${e.target.value}`, { scroll: false }))}
        className="campo mt-1 block w-full font-semibold text-azul sm:w-56"
      >
        {meses.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
      </select>
      <div className="mt-1 h-4 text-[11px] text-tenue">{pending ? "Cargando…" : ayuda}</div>
    </div>
  );
}

/** Ranking comercial: posición, puntaje, vecinos inmediatos y acceso al ranking completo. */
export function RankingComercial({ rows, meId, rankSucursal, totalSucursal, sucursal, deltaRank }: { rows: RankRow[]; meId: string; rankSucursal: number; totalSucursal: number; sucursal: string; deltaRank: number | null }) {
  const [completo, setCompleto] = useState(false);
  const i = rows.findIndex((r) => r.id === meId);
  const me = rows[i];
  if (!me) return null;
  const arriba = rows[i - 1];
  const abajo = rows[i + 1];
  const vecinos = rows.slice(Math.max(0, i - 2), i + 3);
  const nombre = me.nombre.split(" ").slice(1).join(" ") + " " + me.nombre.split(" ")[0];
  return (
    <div className="panel flex h-full flex-col p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="volanta">Ranking comercial</div>
          <div className="cifra mt-1 text-5xl leading-none text-azul">#{me.rank}<span className="ml-1 text-lg font-semibold text-tenue">de {rows.length}</span></div>
          <div className="mt-2 truncate font-bold text-tinta">{nombre}</div>
          <div className="text-xs text-niebla">
            #{rankSucursal} de {totalSucursal} en {sucursal} ·{" "}
            {deltaRank === null || deltaRank === 0 ? "mismo puesto que el mes anterior" : deltaRank > 0 ? <span className="font-semibold text-verde-t">▲ subiste {deltaRank}</span> : <span className="font-semibold text-rojo-t">▼ bajaste {-deltaRank}</span>}
          </div>
        </div>
        <div className="rounded-xl bg-azul-suave px-4 py-2 text-center">
          <div className="cifra text-3xl leading-none text-azul">{fmtPts(me.puntaje)}</div>
          <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-azul/80">Puntaje total</div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg bg-fondo px-3 py-2">
          {arriba ? <>Al <b>#{arriba.rank}</b> le faltan <b className="cifra text-sm text-azul">{fmtPts(arriba.puntaje - me.puntaje)}</b> pts</> : <b className="text-verde-t">Sos el #1 🏆</b>}
        </div>
        <div className="rounded-lg bg-fondo px-3 py-2 text-right">
          {abajo ? <>Le sacás <b className="cifra text-sm text-azul">{fmtPts(me.puntaje - abajo.puntaje)}</b> pts al <b>#{abajo.rank}</b></> : "Último puesto"}
        </div>
      </div>

      <ol className="mt-3 space-y-1" aria-label="Puestos cercanos">
        {vecinos.map((r) => <Fila key={r.id} r={r} yo={r.id === meId} />)}
      </ol>

      <div className="mt-auto pt-4">
        <button onClick={() => setCompleto((c) => !c)} aria-expanded={completo} className="btn btn-linea btn-sm">
          {completo ? "Ocultar ranking completo" : "Ver ranking completo"} <span aria-hidden>{completo ? "▴" : "›"}</span>
        </button>
      </div>
      {completo && <RankingList rows={rows} meId={meId} />}
    </div>
  );
}

function Fila({ r, yo }: { r: RankRow; yo: boolean }) {
  return (
    <li className={`flex items-center gap-3 rounded-md px-2 py-1.5 text-sm ${yo ? "border-l-4 border-azul bg-azul-suave font-bold text-azul" : "border-l-4 border-transparent odd:bg-fondo/60"}`} aria-current={yo ? "true" : undefined}>
      <span className="cifra w-8 text-right opacity-70">{r.rank}</span>
      <span className="min-w-0 flex-1 truncate">{r.nombre} <span className="text-xs font-normal opacity-70">· {r.sucursal}</span></span>
      <span className="hidden text-xs font-semibold sm:inline" style={{ color: NIVEL_COLOR[r.nivel] }}>{r.bloqueado ? "🔒" : ""}{r.nivel}</span>
      <span className="cifra w-12 text-right">{fmtPts(r.puntaje)}</span>
    </li>
  );
}

function RankingList({ rows, meId }: { rows: RankRow[]; meId: string }) {
  const ref = useRef<HTMLOListElement>(null);
  useEffect(() => {
    const el = ref.current?.querySelector<HTMLElement>("[aria-current]");
    if (el && ref.current) ref.current.scrollTop = el.offsetTop - ref.current.clientHeight / 2 + el.clientHeight / 2;
  }, [rows]);
  return (
    <ol ref={ref} className="scrollbar-thin relative mt-3 max-h-[320px] space-y-0.5 overflow-y-auto rounded-lg border border-linea p-1" aria-label="Ranking completo">
      {rows.map((r) => <Fila key={r.id} r={r} yo={r.id === meId} />)}
    </ol>
  );
}
