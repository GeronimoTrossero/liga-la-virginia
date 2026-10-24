"use client";
import { useRouter } from "next/navigation";

type Opt = { value: string; label: string };

export function VerComo({ current, vendedores, supervisores, regionales }: { current: string; vendedores: Opt[]; supervisores: Opt[]; regionales: Opt[] }) {
  const router = useRouter();
  function go(v: string) {
    document.cookie = `ver_como=${encodeURIComponent(v)}; path=/; max-age=${60 * 60 * 24 * 30}`;
    const [rol, ...rest] = v.split(":");
    const id = rest.join(":");
    if (rol === "vendedor") router.push(`/vendedor/${id}`);
    else if (rol === "supervisor") router.push(`/supervisor/${encodeURIComponent(id)}`);
    else if (rol === "regional") router.push(`/regional/${encodeURIComponent(id)}`);
    else router.push("/liga");
    router.refresh();
  }
  return (
    <label className="flex items-center gap-2 text-xs text-niebla">
      <span className="hidden sm:inline">Ver como</span>
      <select value={current} onChange={(e) => go(e.target.value)} className="max-w-[150px] rounded-lg border border-linea bg-panel px-2 py-1.5 text-sm text-tiza sm:max-w-[240px]">
        <option value="gerencia">🏟️ Gerencia nacional</option>
        <optgroup label="Regionales">{regionales.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</optgroup>
        <optgroup label="Supervisores">{supervisores.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</optgroup>
        <optgroup label="Vendedores">{vendedores.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</optgroup>
      </select>
    </label>
  );
}
