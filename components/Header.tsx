import Link from "next/link";
import { getSession } from "@/lib/auth";
import { homeDe } from "@/lib/session";
import { logout } from "@/app/actions";

// El rol SUPERVISOR se presenta como "Gerente" en toda la interfaz.
const VISTA: Record<string, string> = { VENDEDOR: "Vendedor", SUPERVISOR: "Gerente de equipo" };

export async function Header() {
  const s = await getSession();
  const link = "rounded-full px-3 py-1.5 text-white/85 hover:bg-white/10 hover:text-white";
  return (
    <header className="sobre-azul sticky top-0 z-40 bg-azul-web text-white shadow-[0_2px_10px_rgba(11,47,110,.25)]">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2">
        <Link href={s ? homeDe(s) : "/"} className="flex min-w-0 items-center gap-3" aria-label="Liga La Virginia, inicio">
          {/* Logotipo oficial (positivo amarillo del sitio lavirginia.com.ar), sin modificar */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/la-virginia-logo-amarillo.svg" alt="La Virginia" className="h-11 w-auto shrink-0 sm:h-12" />
          <span className="hidden h-8 w-px bg-white/30 sm:block" />
          <span className="hidden leading-tight sm:block">
            <span className="block text-[13px] font-bold uppercase tracking-[0.2em]">Liga</span>
            {s && <span className="block text-[11px] text-white/75">{VISTA[s.rol]}</span>}
          </span>
        </Link>
        <nav className="flex items-center gap-1 text-sm font-semibold">
          {s?.rol === "SUPERVISOR" && (
            <>
              <Link href={homeDe(s)} className={link}>Mi equipo</Link>
              <Link href="/liga" className={link}>Liga</Link>
            </>
          )}
          {s ? (
            <form action={logout} className="ml-1 flex items-center gap-2">
              <span className="hidden max-w-[180px] truncate text-xs text-white/75 md:inline">{s.nombre}</span>
              <button className="btn btn-sm border border-white/60 text-white hover:bg-white hover:text-azul-web">Salir</button>
            </form>
          ) : (
            <Link href="/login" className="btn btn-sm btn-sol">Ingresar</Link>
          )}
        </nav>
      </div>
    </header>
  );
}
