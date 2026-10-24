import type { Metadata, Viewport } from "next";
import { Barlow, Barlow_Condensed } from "next/font/google";
import { Header } from "@/components/Header";
import { Presentador } from "@/components/Presentador";
import { LivePoll } from "@/components/LivePoll";
import { getSession, MODO_PRESENTADOR } from "@/lib/auth";
import { getVendedores } from "@/lib/data";
import { supId } from "@/lib/session";
import { DEMO_VENDEDOR } from "@/lib/config";
import "./globals.css";

const display = Barlow_Condensed({ variable: "--font-display", subsets: ["latin"], weight: ["600", "700", "800", "900"] });
const body = Barlow({ variable: "--font-body", subsets: ["latin"], weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: "Liga La Virginia",
  description: "BI visual gamificado + agentes de IA para los vendedores de La Virginia.",
};
export const viewport: Viewport = { themeColor: "#e4002b", width: "device-width", initialScale: 1 };
export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const s = await getSession();
  let opciones: { value: string; label: string; grupo: string }[] = [];
  if (s && MODO_PRESENTADOR) {
    const vends = await getVendedores();
    const sups = [...new Set(vends.map((v) => v.supervisor))].sort();
    const demo = vends.find((v) => v.id === DEMO_VENDEDOR);
    opciones = [
      { value: "gerencia", label: "🏟️ Gerencia nacional", grupo: "Gerencia" },
      ...(demo ? [{ value: demo.id, label: `⭐ ${demo.nombre} (demo)`, grupo: "Demo" }, { value: supId(demo.supervisor, sups), label: `⭐ ${demo.supervisor} (supervisor demo)`, grupo: "Demo" }] : []),
      ...sups.map((x) => ({ value: supId(x, sups), label: x, grupo: "Supervisores" })),
      ...vends.map((v) => ({ value: v.id, label: `${v.nombre} · ${v.sucursal.split("/")[0]}`, grupo: "Vendedores" })).sort((a, b) => a.label.localeCompare(b.label)),
    ];
  }
  return (
    <html lang="es-AR">
      <body className={`${display.variable} ${body.variable} antialiased`}>
        <Header />
        {s && <LivePoll />}
        <main className="mx-auto max-w-7xl px-4 pb-16 pt-4">{children}</main>
        <footer className="border-t border-linea/60 py-6 text-center text-xs text-niebla">
          Liga La Virginia · Shippear #3 · Datos ficticios del desafío · Demo: hoy = 24/10/2026
          {s && MODO_PRESENTADOR && <Presentador opciones={opciones} actual={s.uid} />}
        </footer>
      </body>
    </html>
  );
}
