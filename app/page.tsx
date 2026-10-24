import Link from "next/link";
import { getSession } from "@/lib/auth";
import { homeDe } from "@/lib/session";

const PERFILES = [
  { rol: "vendedor", volanta: "En la calle", titulo: "Soy Vendedor", sub: "Tu carta, tu liga, tus rachas y qué hacer hoy para subir.", v: "#164194" },
  { rol: "supervisor", volanta: "Con tu equipo", titulo: "Soy Gerente", sub: "Tu equipo en un mapa de calor, rachas en riesgo y misión colectiva.", v: "#723181" },
];

export default async function Home() {
  const s = await getSession();
  return (
    <div className="space-y-12">
      {/* Campo amarillo con logotipo azul: la composición del identificador de La Virginia */}
      <section className="relative left-1/2 -mt-6 w-screen -translate-x-1/2 bg-sol">
        <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 py-12 sm:py-16 md:grid-cols-[minmax(0,1fr)_auto]">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-azul">Liga La Virginia · Temporada Ago – Oct 2026</div>
            <h1 className="mt-3 text-5xl font-extrabold uppercase leading-[0.95] tracking-tight text-azul sm:text-6xl lg:text-7xl">
              Medí tus KPIs.<br />
              <span className="italic">Mejorá tu puntaje.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base text-azul-hondo sm:text-lg">
              Tu Puntaje Oficial con los 7 KPIs comerciales, un plan de acción que te dice qué hacer hoy para subirlo y una liga para competir con tu equipo.
            </p>
            {s && <Link href={homeDe(s)} className="btn btn-azul mt-6">Seguir como {s.nombre} <span aria-hidden>›</span></Link>}
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/la-virginia-logo-azul.svg" alt="La Virginia · Sabores que reconfortan" className="hidden w-[300px] md:block lg:w-[360px]" />
        </div>
      </section>

      <section aria-labelledby="accesos">
        <div className="text-center">
          <div className="volanta">¿Cómo querés entrar?</div>
          <h2 id="accesos" className="titulo mt-1 text-3xl">Elegí tu perfil</h2>
        </div>
        <div className="mx-auto mt-6 grid max-w-4xl gap-4 md:grid-cols-2">
          {PERFILES.map((p) => (
            <Link key={p.rol} href={`/login?rol=${p.rol}`} className="panel group relative flex overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lg">
              <div className="flex-1 p-6 pr-4">
                <div className="volanta">{p.volanta}</div>
                <div className="titulo mt-1 text-3xl">{p.titulo}</div>
                <p className="mt-2 text-sm text-niebla">{p.sub}</p>
                <span className="btn btn-linea btn-sm mt-5 group-hover:bg-azul group-hover:text-white">Entrar <span aria-hidden>›</span></span>
              </div>
              <div className="franja w-5 shrink-0" style={{ ["--v" as string]: p.v }} aria-hidden />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
