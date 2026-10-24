import Link from "next/link";
import { getBoard } from "@/lib/data";
import { MES_ACTUAL, nombreMes, DEMO_VENDEDOR } from "@/lib/config";
import { CartaDe } from "@/components/CartaDe";

export default async function Home() {
  const board = await getBoard(MES_ACTUAL);
  const [p1, p2, p3] = board;
  const demo = board.find((x) => x.id === DEMO_VENDEDOR);
  return (
    <div className="space-y-10">
      <section className="pt-6 text-center">
        <div className="text-xs font-bold uppercase tracking-[0.3em] text-acento">{nombreMes(MES_ACTUAL)} · mes en curso</div>
        <h1 className="mt-2 font-display text-5xl font-black uppercase leading-[0.9] sm:text-7xl">
          Vendé. Cobrá. <span className="text-oro">Subí tu carta.</span>
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-niebla">135 vendedores, 15 sucursales, una liga. Tu puntaje sale de los 7 KPIs oficiales; el resto es juego.</p>
      </section>

      <section className="flex flex-wrap items-end justify-center gap-4 sm:gap-8">
        <div className="order-2 flex flex-col items-center sm:order-1"><CartaDe x={p2} size="md" link /><Podio n={2} /></div>
        <div className="order-1 flex flex-col items-center sm:order-2"><CartaDe x={p1} size="lg" link /><Podio n={1} /></div>
        <div className="order-3 flex flex-col items-center"><CartaDe x={p3} size="md" link /><Podio n={3} /></div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <Acceso href={demo ? `/vendedor/${demo.id}` : "/liga"} titulo="Soy vendedor" sub={demo ? `Demo: ${demo.nombre} · ${demo.s.motivoBloqueo ?? demo.s.nivel}` : ""} icon="🃏" />
        <Acceso href={demo ? `/supervisor/${encodeURIComponent(demo.supervisor)}` : "/liga"} titulo="Soy supervisor" sub={demo ? `Equipo de ${demo.supervisor}` : ""} icon="🧭" />
        <Acceso href="/liga" titulo="Gerencia / Liga" sub="Ranking, Balón de Oro y clásicos" icon="🏆" />
      </section>
    </div>
  );
}

function Podio({ n }: { n: number }) {
  const h = n === 1 ? "h-16" : n === 2 ? "h-10" : "h-6";
  return <div className={`mt-3 w-40 ${h} rounded-t-lg bg-gradient-to-b from-linea to-transparent text-center font-display text-2xl font-black text-niebla`}>{n}°</div>;
}

function Acceso({ href, titulo, sub, icon }: { href: string; titulo: string; sub: string; icon: string }) {
  return (
    <Link href={href} className="panel group flex items-center gap-4 p-5 transition hover:border-acento">
      <span className="text-4xl">{icon}</span>
      <span>
        <span className="block font-display text-2xl font-bold uppercase group-hover:text-acento">{titulo}</span>
        <span className="block text-sm text-niebla">{sub}</span>
      </span>
    </Link>
  );
}
