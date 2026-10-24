import Link from "next/link";
import { getSession } from "@/lib/auth";
import { homeDe } from "@/lib/session";
import { logout } from "@/app/actions";

const VISTA: Record<string, string> = { VENDEDOR: "La calle", SUPERVISOR: "El vestuario", GERENCIA: "La transmisión" };

export async function Header() {
  const s = await getSession();
  return (
    <header className="sticky top-0 z-40 bg-noche/85 backdrop-blur">
      <div className="franja-lv" />
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 border-b border-linea/70 px-4 py-2.5">
        <Link href={s ? homeDe(s) : "/"} className="flex shrink-0 items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-full border-2 border-acento bg-lv font-display text-lg font-black text-white shadow-[0_0_14px_rgba(228,0,43,.6)]">LV</span>
          <span className="font-display text-lg font-black uppercase leading-none tracking-wide">
            Liga <span className="text-acento">La Virginia</span>
            {s && <span className="block text-[10px] font-bold tracking-[0.25em] text-niebla">{VISTA[s.rol]}</span>}
          </span>
        </Link>
        <nav className="flex items-center gap-1 text-sm font-semibold sm:gap-2">
          {s?.rol === "GERENCIA" && (
            <>
              <Link href="/liga" className="rounded-md px-2 py-1 text-niebla hover:text-tiza">Liga</Link>
              <Link href="/temporada" className="rounded-md px-2 py-1 text-niebla hover:text-tiza">Temporada</Link>
            </>
          )}
          {s?.rol === "SUPERVISOR" && (
            <>
              <Link href={homeDe(s)} className="rounded-md px-2 py-1 text-niebla hover:text-tiza">Mi equipo</Link>
              <Link href="/liga" className="rounded-md px-2 py-1 text-niebla hover:text-tiza">Liga</Link>
            </>
          )}
          {s ? (
            <form action={logout} className="flex items-center gap-2">
              <span className="hidden max-w-[160px] truncate text-xs text-niebla sm:inline">{s.nombre}</span>
              <button className="rounded-md border border-linea px-2 py-1 text-xs text-niebla hover:border-lv hover:text-tiza">Salir</button>
            </form>
          ) : (
            <Link href="/login" className="rounded-md bg-lv px-3 py-1.5 text-xs font-bold text-white">Ingresar</Link>
          )}
        </nav>
      </div>
    </header>
  );
}
