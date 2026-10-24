"use client";
import { useRouter, useSearchParams } from "next/navigation";

type Opt = { value: string; label: string };

export function LigaFiltros({ meses, sucursales, regionales, tipos, kpis }: { meses: Opt[]; sucursales: string[]; regionales: string[]; tipos: string[]; kpis: Opt[] }) {
  const router = useRouter();
  const sp = useSearchParams();
  const set = (k: string, v: string) => {
    const p = new URLSearchParams(sp.toString());
    if (v) p.set(k, v);
    else p.delete(k);
    router.push(`/liga?${p.toString()}#ranking`, { scroll: false });
  };
  const sel = "rounded-lg border border-linea bg-panel px-2 py-1.5 text-sm text-tiza";
  return (
    <div className="flex flex-wrap gap-2">
      <select className={sel} value={sp.get("mes") ?? ""} onChange={(e) => set("mes", e.target.value)}>
        {meses.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
      </select>
      <select className={sel} value={sp.get("sucursal") ?? ""} onChange={(e) => set("sucursal", e.target.value)}>
        <option value="">Todas las sucursales</option>
        {sucursales.map((s) => <option key={s}>{s}</option>)}
      </select>
      <select className={sel} value={sp.get("regional") ?? ""} onChange={(e) => set("regional", e.target.value)}>
        <option value="">Todas las regionales</option>
        {regionales.map((s) => <option key={s}>{s}</option>)}
      </select>
      <select className={sel} value={sp.get("tipo") ?? ""} onChange={(e) => set("tipo", e.target.value)}>
        <option value="">Todos los tipos</option>
        {tipos.map((s) => <option key={s}>{s}</option>)}
      </select>
      <select className={sel} value={sp.get("kpi") ?? ""} onChange={(e) => set("kpi", e.target.value)} disabled={sp.get("mes") === "anual"}>
        <option value="">Por puntaje</option>
        {kpis.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
      </select>
    </div>
  );
}
