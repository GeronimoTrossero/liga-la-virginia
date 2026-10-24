import Link from "next/link";
import { redirect } from "next/navigation";
import { getBoard, getGame } from "@/lib/data";
import { requireSession } from "@/lib/auth";
import { homeDe } from "@/lib/session";
import { MES_ACTUAL } from "@/lib/config";
import { fmtPts, NIVELES, type Nivel } from "@/lib/scoring";
import { NIVEL_COLOR } from "@/components/ui";
import { Ilus, NIVEL_ILUS } from "@/components/Icono";
import { ArrowDown, ArrowUp, Flag } from "lucide-react";
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
  const xpTop = [...vs].sort((a, b) => b.temporadaProm - a.temporadaProm).slice(3, 8);

  return (
    <div className="space-y-10">
      <div className="pt-2">
        <div className="volanta flex items-center gap-1.5"><Flag className="size-4" aria-hidden /> Cierre de temporada · en curso hasta el 31/10</div>
        <h1 className="titulo text-3xl sm:text-4xl">Temporada {game.temporada.nombre}</h1>
        <p className="mt-1 text-sm text-niebla">Nivel de temporada = promedio del Puntaje Oficial de los 3 meses, por percentil. Las divisiones de ~10 se armaron con la temporada anterior: top 3 ascienden, últimos 3 descienden.</p>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        {top.map((v, i) => (
          <Link key={v.id} href={`/vendedor/${v.id}`} className={`panel anim-entrar block p-5 text-center hover:border-azul/50 hover:shadow-md ${i === 0 ? "!border-sol bg-sol-suave" : ""}`} style={{ animationDelay: `${i * 90}ms` }}>
            <div className="flex justify-center"><Ilus n={(["oro", "plata", "bronce"] as const)[i]} size={i === 0 ? 76 : 64} alt={`${i + 1}° puesto`} /></div>
            <div className="text-2xl font-bold leading-tight text-azul">{nombres.get(v.id)?.nombre}</div>
            <div className="text-sm text-niebla">{nombres.get(v.id)?.sucursal} · {fmtPts(v.temporadaProm)} prom</div>
          </Link>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="panel p-4">
          <h2 className="titulo mb-3 text-xl">Distribución de niveles</h2>
          {[...NIVELES].reverse().map((n) => {
            const c = vs.filter((v) => v.nivelTemporada === n).length;
            return (
              <div key={n} className="mb-2">
                <div className="flex justify-between text-sm"><span className="flex items-center gap-1.5" style={{ color: NIVEL_COLOR[n] }}><Ilus n={NIVEL_ILUS[n]} size={22} quieto /> {n}</span><b>{c}</b></div>
                <div className="h-2 overflow-hidden rounded-full bg-azul-suave"><div className="h-full rounded-full" style={{ width: `${(c / vs.length) * 100}%`, background: NIVEL_COLOR[n] }} /></div>
              </div>
            );
          })}
          <div className="mt-3 text-sm"><span className="inline-flex items-center gap-1 text-verde-t"><ArrowUp className="anim-subir size-4" aria-hidden /> {suben} suben de nivel</span> · <span className="inline-flex items-center gap-1 text-rojo-t"><ArrowDown className="anim-bajar size-4" aria-hidden /> {bajan} bajan</span></div>
        </div>
        <div className="panel p-4 lg:col-span-2">
          <h2 className="titulo mb-3 text-xl">Mejor promedio de temporada</h2>
          <ol className="space-y-1.5">
            {xpTop.map((v, i) => (
              <li key={v.id} className="flex items-center gap-3 text-sm">
                <span className="w-6 text-right cifra text-base text-niebla">{i + 1}</span>
                <Link href={`/vendedor/${v.id}`} className="flex-1 font-semibold hover:text-azul-web hover:underline">{nombres.get(v.id)?.nombre}</Link>
                <span className="flex items-center gap-1 text-xs text-niebla"><Ilus n="llama" size={18} /> racha {v.rachaGeneral} {v.rachaGeneral === 1 ? "mes" : "meses"}</span>
                <span className="w-16 text-right cifra text-lg text-azul">{fmtPts(v.temporadaProm)}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section>
        <h2 className="titulo mb-4 text-2xl">Divisiones</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          {game.divisiones.map((d) => <TuLiga key={d.idx} div={d} nombres={nombres} linkear />)}
        </div>
      </section>
    </div>
  );
}
