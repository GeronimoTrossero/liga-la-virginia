import type { Metadata, Viewport } from "next";
import { Barlow, Barlow_Condensed } from "next/font/google";
import { Header } from "@/components/Header";
import "./globals.css";

const display = Barlow_Condensed({ variable: "--font-display", subsets: ["latin"], weight: ["600", "700", "800", "900"] });
const body = Barlow({ variable: "--font-body", subsets: ["latin"], weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: "Liga La Virginia",
  description: "El ranking de vendedores de La Virginia convertido en juego: cartas, niveles, misiones y clásicos.",
};
export const viewport: Viewport = { themeColor: "#05070f", width: "device-width", initialScale: 1 };
export const dynamic = "force-dynamic";

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-AR">
      <body className={`${display.variable} ${body.variable} antialiased`}>
        <Header />
        <main className="mx-auto max-w-7xl px-4 pb-20 pt-4">{children}</main>
        <footer className="border-t border-linea/60 py-6 text-center text-xs text-niebla">
          Liga La Virginia · Shippear #3 · Datos ficticios del desafío · Demo: hoy = 24/10/2026
        </footer>
      </body>
    </html>
  );
}
