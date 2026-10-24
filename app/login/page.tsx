import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { homeDe } from "@/lib/session";
import { DEMO_VENDEDOR } from "@/lib/config";
import { LoginForm } from "./LoginForm";

const DEMO: Record<string, { usuario: string; titulo: string }> = {
  vendedor: { usuario: DEMO_VENDEDOR, titulo: "Vendedor" },
  supervisor: { usuario: "sup-pintos", titulo: "Gerente" },
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ rol?: string; next?: string }> }) {
  const sp = await searchParams;
  const s = await getSession();
  if (s && !sp.rol) redirect(homeDe(s));
  const d = DEMO[sp.rol ?? ""];
  return (
    <div className="mx-auto max-w-sm pt-6 sm:pt-10">
      <div className="panel overflow-hidden">
        <div className="bg-sol px-6 py-6 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/la-virginia-logo-azul.svg" alt="La Virginia" className="mx-auto h-24 w-auto" />
        </div>
        <div className="p-6">
          <div className="text-center">
            <div className="volanta">Liga La Virginia</div>
            <h1 className="titulo mt-1 text-2xl">{d ? `Ingreso ${d.titulo}` : "Ingresar"}</h1>
            <p className="mt-1 text-sm text-niebla">Usuario y PIN. En la demo el PIN es <b className="text-azul">1234</b>.</p>
          </div>
          <div className="mt-6">
            <LoginForm usuario={d?.usuario ?? ""} next={sp.next ?? ""} />
          </div>
          <div className="mt-5 text-center text-xs text-tenue">Usuarios de demo</div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-center text-xs">
            <a href="/login?rol=vendedor" className="rounded-full border border-linea py-2 font-semibold text-niebla hover:border-azul hover:text-azul">Vendedor</a>
            <a href="/login?rol=supervisor" className="rounded-full border border-linea py-2 font-semibold text-niebla hover:border-azul hover:text-azul">Gerente</a>
          </div>
        </div>
      </div>
    </div>
  );
}
