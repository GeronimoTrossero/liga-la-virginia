import { redirect } from "next/navigation";
import { EquipoView } from "@/components/EquipoView";
import { requireSession } from "@/lib/auth";
import { homeDe } from "@/lib/session";

export default async function Page({ params }: { params: Promise<{ nombre: string }> }) {
  const { nombre: raw } = await params;
  const nombre = decodeURIComponent(raw);
  const s = await requireSession();
  if (s.rol !== "GERENCIA") redirect(homeDe(s));
  return <EquipoView tipo="regional" nombre={nombre} editable={false} />;
}
