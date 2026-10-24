import Link from "next/link";
import { redirect } from "next/navigation";
import { getBoard, getGame } from "@/lib/data";
import { requireSession } from "@/lib/auth";
import { homeDe } from "@/lib/session";
import { MES_ACTUAL } from "@/lib/config";
import { fmtPts, NIVELES, type Nivel } from "@/lib/scoring";
import { NIVEL_COLOR, NIVEL_ICON } from "@/components/ui";
import { TuLiga } from "@/components/Juego";

export default async function TemporadaPage() {
  const s = await requireSession();
  if (s.rol === "VENDEDOR") redirect(homeDe(s));
  const [game, board] = await Promise.all([getGame(), getBoard(MES_ACTUAL)]);
  const nombres = new Map(board.map((x) => [x.id, { nombre: x.nombre, sucursal: x.sucursal }]));
  const vs = [...game.vendors.values()];
  const top = [...vs].sort((a, b) => a.temporadaPuesto - b.temporadaPuesto).slice(0, 3);
  const orden = (n: Nivel) => NIVELES.indexOf(n);
  const suben = vs.filter((v) => v.nivelTemporadaPrev && orden(v.nivelTemporada) > orden(v.nivelTemporadaPrev)).length;
  const bajan = vs.filter((v) => v.nivelTemporadaPrev && orden(v.nivelTemporada) < orden(v.nivelTemporadaPrev)).length;
  const xpTop = [...vs].sort((a, b) => b.xpTemporada - a.xpTemporada).slice(0, 5);

  return (
    <div className="space-y-10">
      <div className="pt-2">
        <div className="text-xs font-bold uppercase tracking-[0.3em] text-acento">🏁 Cierre de temporada · en curso hasta el 31/10</div>
        <h1 className="font-display text-5xl font-black uppercase leading-none">Temporada {game.temporada.nombre}</h1>
        <p className="mt-1 text-sm text-niebla">Nivel de temporada = promedio del Puntaje Oficial de los 3 meses, por percentil. Las divisiones de ~10 se armaron con la temporada anterior: top 3 ascienden, últimos 3 descienden.</p>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        {top.map((v, i) => (
          <Link key={v.id} href={`/vendedor/${v.id}`} className={`panel block p-5 text-center hover:border-acento ${i === 0 ? "border-acento/70 bg-acento/10" : ""}`}>
            <div className="text-4xl">{["🥇", "🥈", "🥉"][i]}</div>
            <div className="font-display text-3xl font-black uppercase leading-none">{nombres.get(v.id)?.nombre}</div>
            <div className="text-sm text-niebla">{nombres.get(v.id)?.sucursal} · {fmtPts(v.temporadaProm)} prom · {v.xpTemporada} PL</div>
          </Link>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="panel p-4">
          <h2 className="mb-3 font-display text-2xl font-black uppercase">Distribución de niveles</h2>
          {[...NIVELES].reverse().map((n) => {
            const c = vs.filter((v) => v.nivelTemporada === n).length;
            return (
              <div key={n} className="mb-2">
                <div className="flex justify-between text-sm"><span style={{ color: NIVEL_COLOR[n] }}>{NIVEL_ICON[n]} {n}</span><b>{c}</b></div>
                <div className="h-2 overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full" style={{ width: `${(c / vs.length) * 100}%`, background: NIVEL_COLOR[n] }} /></div>
              </div>
            );
          })}
          <div className="mt-3 text-sm"><span className="text-verde">⬆ {suben} suben de nivel</span> · <span className="text-lv">⬇ {bajan} bajan</span></div>
        </div>
        <div className="panel p-4 lg:col-span-2">
          <h2 className="mb-3 font-display text-2xl font-black uppercase">⚡ Más Puntos de Liga</h2>
          <ol className="space-y-1.5">
            {xpTop.map((v, i) => (
              <li key={v.id} className="flex items-center gap-3 text-sm">
                <span className="w-6 text-right font-display text-lg font-black text-niebla">{i + 1}</span>
                <Link href={`/vendedor/${v.id}`} className="flex-1 font-semibold hover:text-acento">{nombres.get(v.id)?.nombre}</Link>
                <span className="text-xs text-niebla">🔥 {v.rachaGeneral} meses · ×{v.multiplicador.toFixed(2).replace(".", ",")}</span>
                <span className="w-16 text-right font-display text-xl font-black text-acento">{v.xpTemporada}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section>
        <h2 className="mb-4 font-display text-3xl font-black uppercase">⚔️ Divisiones</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          {game.divisiones.map((d) => <TuLiga key={d.idx} div={d} nombres={nombres} linkear />)}
        </div>
      </section>
    </div>
  );
}
