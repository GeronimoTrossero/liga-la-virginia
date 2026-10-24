import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { homeDe } from "@/lib/session";
import { DEMO_VENDEDOR } from "@/lib/config";
import { LoginForm } from "./LoginForm";

const DEMO: Record<string, { usuario: string; titulo: string; icono: string }> = {
  vendedor: { usuario: DEMO_VENDEDOR, titulo: "Vendedor", icono: "🃏" },
  supervisor: { usuario: "sup-pintos", titulo: "Supervisor", icono: "🧭" },
  gerencia: { usuario: "gerencia", titulo: "Gerencia", icono: "🏟️" },
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ rol?: string; next?: string }> }) {
  const sp = await searchParams;
  const s = await getSession();
  if (s && !sp.rol) redirect(homeDe(s));
  const d = DEMO[sp.rol ?? ""];
  return (
    <div className="mx-auto max-w-sm pt-10">
      <div className="panel p-6">
        <div className="text-center">
          <div className="text-5xl">{d?.icono ?? "⚽"}</div>
          <h1 className="mt-2 font-display text-4xl font-black uppercase">{d ? `Ingreso ${d.titulo}` : "Ingresar"}</h1>
          <p className="text-sm text-niebla">Usuario y PIN. En la demo el PIN es <b className="text-acento">1234</b>.</p>
        </div>
        <div className="mt-6">
          <LoginForm usuario={d?.usuario ?? ""} next={sp.next ?? ""} />
        </div>
        <div className="mt-5 grid grid-cols-3 gap-2 text-center text-[11px] text-niebla">
          <a href="/login?rol=vendedor" className="rounded-md border border-linea py-1.5 hover:border-acento">V052</a>
          <a href="/login?rol=supervisor" className="rounded-md border border-linea py-1.5 hover:border-acento">sup-pintos</a>
          <a href="/login?rol=gerencia" className="rounded-md border border-linea py-1.5 hover:border-acento">gerencia</a>
        </div>
      </div>
    </div>
  );
}
