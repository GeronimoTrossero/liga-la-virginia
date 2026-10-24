import { EquipoView } from "@/components/EquipoView";

export default async function Page({ params }: { params: Promise<{ nombre: string }> }) {
  const { nombre } = await params;
  return <EquipoView tipo="supervisor" nombre={decodeURIComponent(nombre)} />;
}
