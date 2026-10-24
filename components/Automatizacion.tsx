"use client";
import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { simularPasaron5Dias, simularRespuestaPago, reiniciarDemo } from "@/app/actions";

export type LogLite = { id: number; tipo: string; cliente_id: string | null; mensaje: string; estado: string; created_at: string; comercio?: string };

const ESTADO: Record<string, string> = { simulado: "bg-azul-suave text-azul", enviado: "bg-azul-suave text-azul", respondido: "bg-fondo text-niebla", pagado: "bg-verde-s text-verde-t" };

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
    <section className="panel overflow-hidden">
      <div className="sobre-azul flex flex-wrap items-center justify-between gap-3 bg-azul px-4 py-4 text-white sm:px-5">
        <div className="max-w-2xl">
          <div className="volanta !text-sol">Agente IA autónomo</div>
          <h2 className="text-xl font-bold sm:text-2xl">🤖 Agente de Cobranzas</h2>
          <div className="mt-1 text-sm text-white/80">Manda recordatorios por WhatsApp a quienes vencen en los próximos 5 días y escucha las respuestas. Cuando el cliente dice &quot;ya pagué&quot;, el cobro se registra y tu carta sube sola. Listo para n8n + Twilio.</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button disabled={pending} onClick={run} className="btn btn-sol">⏩ Simular: pasaron 5 días</button>
          <button disabled={pending} onClick={reset} className="btn btn-sm border border-white/60 text-white hover:bg-white/10" title="Borra ajustes y bandeja de este vendedor">↺ Reiniciar demo</button>
        </div>
      </div>
      <div className="p-4 sm:p-5">
        {msg && <div className="mb-3 rounded-lg bg-azul-suave px-3 py-2 text-sm font-semibold text-azul" role="status">{msg}</div>}
        <div className="volanta">Bandeja · {logs.length}</div>
        <ul className="scrollbar-thin mt-2 max-h-[360px] space-y-2 overflow-y-auto">
          {logs.length === 0 && <li className="text-sm text-tenue">Sin mensajes todavía. Tocá &quot;pasaron 5 días&quot;.</li>}
          {logs.map((l) => (
            <li key={l.id} className="rounded-lg border border-linea p-3 text-sm">
              <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-tinta">{l.comercio ?? l.cliente_id} · {l.tipo.replace(/_/g, " ")}</span>
                <span className={`chip ${ESTADO[l.estado] ?? "bg-fondo text-niebla"}`}>{l.estado}</span>
              </div>
              <div className="whitespace-pre-wrap text-niebla">{l.mensaje}</div>
              {l.tipo === "recordatorio_cobranza" && l.cliente_id && impagosSet.has(l.cliente_id) && (
                <button disabled={pending} onClick={() => pagar(l.cliente_id!)} className="btn btn-sm btn-azul mt-2">💬 El cliente respondió: &quot;Ya pagué&quot;</button>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
