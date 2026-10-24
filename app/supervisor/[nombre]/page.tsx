import { redirect } from "next/navigation";
import { EquipoView } from "@/components/EquipoView";
import { requireSession } from "@/lib/auth";
import { homeDe } from "@/lib/session";

export default async function Page({ params }: { params: Promise<{ nombre: string }> }) {
  const { nombre: raw } = await params;
  const nombre = decodeURIComponent(raw);
  const s = await requireSession();
  const propio = s.rol === "SUPERVISOR" && s.ref === nombre;
  if (!propio) redirect(homeDe(s));
  return <EquipoView nombre={nombre} editable />;
}
