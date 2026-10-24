import { ClipboardList, Coffee, Coins, Truck, type LucideIcon } from "lucide-react";
import type { Nivel } from "@/lib/scoring";

const MISION_LUCIDE: Record<string, LucideIcon> = { "💰": Coins, "🚚": Truck, "📋": ClipboardList, "☕": Coffee };
const MISION_ILUS: Record<string, Ilustracion> = { "🚀": "cohete", "🔥": "llama" };

/** Ícono de misión: las claves históricas (emoji) se traducen a ilustración o ícono lineal. */
export function IconoMision({ icono, size = 48 }: { icono: string; size?: number }) {
  const ilus = MISION_ILUS[icono];
  if (ilus) return <Ilus n={ilus} size={size} />;
  const I = MISION_LUCIDE[icono] ?? ClipboardList;
  return (
    <span className="anim-flotar inline-grid shrink-0 place-items-center rounded-xl bg-azul-suave text-azul" style={{ width: size, height: size }} aria-hidden>
      <I style={{ width: size * 0.55, height: size * 0.55 }} strokeWidth={2.2} />
    </span>
  );
}

export type Ilustracion =
  | "diamante" | "oro" | "plata" | "bronce"
  | "copa" | "balon" | "cohete" | "holo" | "escudo" | "llama" | "asado";

const SRC: Record<Ilustracion, string> = {
  diamante: "/img/nivel-diamante.png",
  oro: "/img/nivel-oro.png",
  plata: "/img/nivel-plata.png",
  bronce: "/img/nivel-bronce.png",
  copa: "/img/copa.png",
  balon: "/img/balon-oro.png",
  cohete: "/img/cohete.png",
  holo: "/img/figurita-holo.png",
  escudo: "/img/escudo.png",
  llama: "/img/llama.png",
  asado: "/img/asado.png",
};

/** Movimiento por defecto de cada ilustración. */
const ANIM: Record<Ilustracion, string> = {
  diamante: "anim-destello",
  oro: "anim-balanceo",
  plata: "anim-balanceo",
  bronce: "anim-balanceo",
  copa: "anim-flotar",
  balon: "anim-giro",
  cohete: "anim-despegue",
  holo: "anim-holo",
  escudo: "anim-latido-suave",
  llama: "llama",
  asado: "anim-flotar",
};

export const NIVEL_ILUS: Record<Nivel, Ilustracion> = { Diamante: "diamante", Oro: "oro", Plata: "plata", Bronce: "bronce" };

/**
 * Ilustración 3D (PNG con fondo blanco, fundido con mix-blend-multiply).
 * `quieto` apaga la animación; `apagado` la muestra en gris.
 */
export function Ilus({
  n,
  size = 24,
  quieto,
  apagado,
  alt = "",
  className = "",
}: {
  n: Ilustracion;
  size?: number;
  quieto?: boolean;
  apagado?: boolean;
  alt?: string;
  className?: string;
}) {
  return (
    <span
      className={`ilus ${quieto || apagado ? "" : ANIM[n]} ${apagado ? "opacity-30 grayscale" : ""} ${className}`}
      style={{ width: size, height: size }}
      role={alt ? "img" : undefined}
      aria-label={alt || undefined}
      aria-hidden={alt ? undefined : true}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={SRC[n]} alt="" width={size} height={size} loading="lazy" decoding="async" draggable={false} />
    </span>
  );
}
