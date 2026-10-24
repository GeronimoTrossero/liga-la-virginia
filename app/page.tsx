import Link from "next/link";
import { getSession } from "@/lib/auth";
import { homeDe } from "@/lib/session";

const PERFILES = [
  { rol: "vendedor", icon: "🃏", titulo: "Soy Vendedor", lema: "La calle", sub: "Tu carta, tu liga, tus rachas y qué hacer hoy para subir.", color: "from-lv to-lvoscuro" },
  { rol: "supervisor", icon: "🧭", titulo: "Soy Supervisor", lema: "El vestuario", sub: "Tu equipo en un mapa de calor, rachas en riesgo y misión colectiva.", color: "from-amber-500 to-amber-800" },
  { rol: "gerencia", icon: "🏟️", titulo: "Gerencia / Liga", lema: "La transmisión", sub: "15 sucursales, derbis, Balón de Oro, temporada y premios.", color: "from-zinc-200 to-zinc-500" },
];

export default async function Home() {
  const s = await getSession();
  return (
    <div className="space-y-10 pt-6">
      <section className="text-center">
        <div className="text-xs font-bold uppercase tracking-[0.3em] text-acento">Temporada Ago – Oct 2026 · cierre en curso</div>
        <h1 className="mt-3 font-display text-5xl font-black uppercase leading-[0.9] sm:text-7xl">
          Vendé. Cobrá. <span className="text-lv">Subí</span> <span className="text-acento">tu carta.</span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-niebla">
          Los 7 KPIs oficiales de La Virginia convertidos en un BI visual, una liga con rachas y temporadas, y agentes de IA que cobran y relevan por vos.
        </p>
        {s && (
          <Link href={homeDe(s)} className="mt-5 inline-block rounded-full bg-lv px-5 py-2 font-bold text-white">Seguir como {s.nombre} →</Link>
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {PERFILES.map((p) => (
          <Link key={p.rol} href={`/login?rol=${p.rol}`} className="group relative overflow-hidden rounded-2xl border border-linea p-6 transition hover:-translate-y-1 hover:border-acento">
            <div className={`absolute inset-0 bg-gradient-to-br ${p.color} opacity-25 transition group-hover:opacity-40`} />
            <div className="relative">
              <div className="text-6xl">{p.icon}</div>
              <div className="mt-3 text-[11px] font-bold uppercase tracking-[0.3em] text-acento">{p.lema}</div>
              <div className="font-display text-4xl font-black uppercase leading-none">{p.titulo}</div>
              <p className="mt-2 text-sm text-niebla">{p.sub}</p>
              <div className="mt-4 font-bold text-tiza group-hover:text-acento">Entrar →</div>
            </div>
          </Link>
        ))}
      </section>

      <section className="grid gap-3 text-center sm:grid-cols-3">
        {[
          ["📊", "BI visual + Scorecard", "7 KPIs oficiales, semáforos, cartas y mapa de calor."],
          ["🔥", "Gamificación", "Ligas con ascensos, rachas con protector, misiones y derbis."],
          ["🤖", "Agentes de IA", "Cobranza autónoma por WhatsApp y relevamiento con foto de góndola."],
        ].map(([i, t, d]) => (
          <div key={t} className="panel p-4">
            <div className="text-3xl">{i}</div>
            <div className="font-display text-xl font-bold uppercase">{t}</div>
            <div className="text-sm text-niebla">{d}</div>
          </div>
        ))}
      </section>
    </div>
  );
}
