import type { Ranked } from "@/lib/board";
import { Carta } from "./Carta";

/** Carta a partir de una fila del tablero. */
export function CartaDe({ x, size = "md", link, total }: { x: Ranked; size?: "sm" | "md" | "lg"; link?: boolean; total?: number }) {
  return (
    <Carta
      size={size}
      href={link ? `/vendedor/${x.id}` : undefined}
      nombre={x.nombre}
      sucursal={x.sucursal}
      tipo={x.tipo}
      puntaje={x.s.puntaje}
      nivel={x.s.nivel}
      cumpl={x.s.cumpl}
      semaforos={x.s.semaforos}
      rank={x.rank}
      rankSucursal={x.rankSucursal}
      total={total}
      bloqueado={x.s.bloqueado}
      motivo={x.s.motivoBloqueo}
    />
  );
}
