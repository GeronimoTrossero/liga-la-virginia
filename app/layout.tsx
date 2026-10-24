import type { Metadata, Viewport } from "next";
import { Open_Sans } from "next/font/google";
import { Header } from "@/components/Header";
import { Presentador } from "@/components/Presentador";
import { LivePoll } from "@/components/LivePoll";
import { getSession, MODO_PRESENTADOR } from "@/lib/auth";
import { getVendedores } from "@/lib/data";
import { supId } from "@/lib/session";
import { DEMO_VENDEDOR } from "@/lib/config";
import "./globals.css";

// Open Sans: la tipografía de texto del sitio oficial de La Virginia.
const openSans = Open_Sans({ variable: "--font-open-sans", subsets: ["latin"], style: ["normal", "italic"] });

export const metadata: Metadata = {
  title: "Liga La Virginia",
  description: "BI visual gamificado + agentes de IA para los vendedores de La Virginia.",
};
export const viewport: Viewport = { themeColor: "#034ea2", width: "device-width", initialScale: 1 };
export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const s = await getSession();
  let opciones: { value: string; label: string; grupo: string }[] = [];
  if (s && MODO_PRESENTADOR) {
    const vends = await getVendedores();
    const sups = [...new Set(vends.map((v) => v.supervisor))].sort();
    const demo = vends.find((v) => v.id === DEMO_VENDEDOR);
    opciones = [
      ...(demo ? [{ value: demo.id, label: `⭐ ${demo.nombre} (demo)`, grupo: "Demo" }, { value: supId(demo.supervisor, sups), label: `⭐ ${demo.supervisor} (gerente demo)`, grupo: "Demo" }] : []),
      ...sups.map((x) => ({ value: supId(x, sups), label: x, grupo: "Gerentes" })),
      ...vends.map((v) => ({ value: v.id, label: `${v.nombre} · ${v.sucursal.split("/")[0]}`, grupo: "Vendedores" })).sort((a, b) => a.label.localeCompare(b.label)),
    ];
  }
  return (
    <html lang="es-AR">
      <body className={`${openSans.variable} antialiased`}>
        <Header />
        {s && <LivePoll />}
        <main className="mx-auto max-w-7xl px-4 pb-16 pt-6">{children}</main>
        <footer className="sobre-azul bg-azul-pie py-8 text-center text-xs text-white/80">
          <div className="mx-auto max-w-7xl px-4">
            <div className="volanta !text-sol">Liga La Virginia</div>
            <p className="mt-2">Shippear #3 · Datos ficticios del desafío · Demo: hoy = 24/10/2026</p>
            <p className="mt-1 text-white/60">Logotipo propiedad de La Virginia S.A., usado sin modificaciones con fines de demostración.</p>
            {s && MODO_PRESENTADOR && <Presentador opciones={opciones} actual={s.uid} />}
          </div>
        </footer>
      </body>
    </html>
  );
}
