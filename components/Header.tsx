import Link from "next/link";
import { getVendedores, getViewer } from "@/lib/data";
import { VerComo } from "./VerComo";

export async function Header() {
  const [vends, viewer] = await Promise.all([getVendedores(), getViewer()]);
  const current = viewer.rol === "gerencia" ? "gerencia" : `${viewer.rol}:${viewer.id}`;
  const sups = [...new Set(vends.map((v) => v.supervisor))].sort();
  const regs = [...new Set(vends.map((v) => v.regional))].sort();
  const yo =
    viewer.rol === "vendedor" ? `/vendedor/${viewer.id}`
    : viewer.rol === "supervisor" ? `/supervisor/${encodeURIComponent(viewer.id)}`
    : viewer.rol === "regional" ? `/regional/${encodeURIComponent(viewer.id)}`
    : null;
  return (
    <header className="sticky top-0 z-40 border-b border-linea/70 bg-noche/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-4 py-2.5">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-oro to-amber-700 font-display text-lg font-black text-noche">LV</span>
          <span className="hidden font-display text-lg font-black uppercase leading-none tracking-wide sm:inline">
            Liga <span className="text-oro">La Virginia</span>
          </span>
        </Link>
        <nav className="flex items-center gap-1 text-sm font-semibold sm:gap-3">
          <Link href="/liga" className="rounded-md px-2 py-1 text-niebla hover:text-tiza">Liga</Link>
          {yo && <Link href={yo} className="rounded-md px-2 py-1 text-niebla hover:text-tiza">{viewer.rol === "vendedor" ? "Mi carta" : "Mi equipo"}</Link>}
          <VerComo
            current={current}
            vendedores={vends.map((v) => ({ value: `vendedor:${v.id}`, label: `${v.nombre} · ${v.sucursal.split("/")[0]}` })).sort((a, b) => a.label.localeCompare(b.label))}
            supervisores={sups.map((s) => ({ value: `supervisor:${s}`, label: s }))}
            regionales={regs.map((s) => ({ value: `regional:${s}`, label: s }))}
          />
        </nav>
      </div>
    </header>
  );
}
