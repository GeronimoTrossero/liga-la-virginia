"use client";
import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { simularPasaron5Dias, simularRespuestaPago, reiniciarDemo } from "@/app/actions";

export type LogLite = { id: number; tipo: string; cliente_id: string | null; mensaje: string; estado: string; created_at: string; comercio?: string };

const ESTADO: Record<string, string> = { simulado: "bg-sky-500/15 text-sky-300", enviado: "bg-sky-500/15 text-sky-300", respondido: "bg-white/10 text-tiza", pagado: "bg-verde/15 text-verde" };

export function Automatizacion({ vendedorId, logs, impagos }: { vendedorId: string; logs: LogLite[]; impagos: string[] }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();
  const impagosSet = new Set(impagos);

  const run = () => start(async () => {
    const r = await simularPasaron5Dias(vendedorId);
    setMsg(r.enviados ? `🤖 Se enviaron ${r.enviados} recordatorios por WhatsApp (modo simulado)` : "No hay nuevos vencimientos en los próximos 5 días");
    router.refresh();
  });
  const pagar = (clienteId: string) => start(async () => {
    const r = await simularRespuestaPago(clienteId);
    setMsg(r.pagado ? `💰 ¡Pagó ${r.cliente}! Cobros en plazo +${r.facturas}` : "Respuesta registrada");
    router.refresh();
  });
  const reset = () => start(async () => {
    await reiniciarDemo(vendedorId);
    setMsg("Demo reiniciada");
    router.refresh();
  });

  return (
    <section className="panel p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-2xl font-black uppercase">🤖 Cobranza en piloto automático</h2>
          <div className="text-sm text-niebla">Recordatorios por WhatsApp a quienes vencen en los próximos 5 días. Cuando el cliente responde &quot;ya pagué&quot;, tu carta sube sola.</div>
        </div>
        <div className="flex gap-2">
          <button disabled={pending} onClick={run} className="rounded-lg bg-acento px-3 py-2 text-sm font-bold text-noche disabled:opacity-50">⏩ Simular: pasaron 5 días</button>
          <button disabled={pending} onClick={reset} className="rounded-lg border border-linea px-3 py-2 text-xs text-niebla disabled:opacity-50" title="Borra ajustes y bandeja de este vendedor">↺ Reiniciar demo</button>
        </div>
      </div>
      {msg && <div className="mt-3 rounded-lg bg-white/5 px-3 py-2 text-sm">{msg}</div>}
      <div className="mt-3 text-xs font-bold uppercase tracking-widest text-niebla">Bandeja · {logs.length}</div>
      <ul className="scrollbar-thin mt-2 max-h-[360px] space-y-2 overflow-y-auto">
        {logs.length === 0 && <li className="text-sm text-niebla">Sin mensajes todavía. Tocá &quot;pasaron 5 días&quot;.</li>}
        {logs.map((l) => (
          <li key={l.id} className="rounded-lg border border-linea/70 p-2.5 text-sm">
            <div className="mb-1 flex items-center justify-between gap-2 text-xs">
              <span className="font-semibold">{l.comercio ?? l.cliente_id} · {l.tipo.replace(/_/g, " ")}</span>
              <span className={`rounded-full px-2 py-0.5 font-bold ${ESTADO[l.estado] ?? ""}`}>{l.estado}</span>
            </div>
            <div className="whitespace-pre-wrap text-niebla">{l.mensaje}</div>
            {l.tipo === "recordatorio_cobranza" && l.cliente_id && impagosSet.has(l.cliente_id) && (
              <button disabled={pending} onClick={() => pagar(l.cliente_id!)} className="mt-2 rounded-md bg-verde/90 px-2.5 py-1 text-xs font-bold text-noche disabled:opacity-50">💬 El cliente respondió: &quot;Ya pagué&quot;</button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
