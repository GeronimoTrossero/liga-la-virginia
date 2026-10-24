"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { elegirMisionEquipo, reconocer } from "@/app/actions";
import { Check, HandHeart } from "lucide-react";

const FRASES = ["¡Golazo este mes! Seguí así", "Gran laburo con la cobranza", "Sos ejemplo para el equipo", "Esa remontada fue de crack"];

export function ReconocerBtn({ vendedorId, nombre }: { vendedorId: string; nombre: string }) {
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState(FRASES[0]);
  const [ok, setOk] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  if (ok) return <span className="anim-pop inline-flex items-center gap-1 text-xs font-bold text-verde-t"><Check className="size-3.5" aria-hidden /> enviado</span>;
  return (
    <span className="relative">
      <button onClick={() => setOpen(!open)} className="group inline-flex items-center rounded-full border border-azul/30 px-2 py-0.5 text-xs hover:bg-azul-suave" title={`Reconocer a ${nombre}`} aria-label={`Reconocer a ${nombre}`}><HandHeart className="size-4 text-azul transition-transform group-hover:scale-125" aria-hidden /></button>
      {open && (
        <div className="absolute left-0 top-8 z-30 w-64 whitespace-normal rounded-xl border border-linea bg-white p-3 text-left shadow-xl">
          <div className="mb-2 text-xs font-bold text-azul">Reconocer a {nombre}</div>
          <select value={msg} onChange={(e) => setMsg(e.target.value)} className="campo w-full text-xs" aria-label="Mensaje">
            {FRASES.map((f) => <option key={f}>{f}</option>)}
          </select>
          <button disabled={pending} onClick={() => start(async () => { const r = await reconocer(vendedorId, msg); if (r.ok) { setOk(true); setOpen(false); } else setError(r.error); })} className="btn btn-sm btn-azul mt-2 w-full">Enviar reconocimiento</button>
          {error && <p role="alert" className="mt-2 text-xs text-rojo-t">{error}</p>}
        </div>
      )}
    </span>
  );
}

export function ElegirMision({ opciones, actual, editable }: { opciones: { key: string; titulo: string; icono: string }[]; actual: string; editable: boolean }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  if (!editable) return null;
  return (
    <div className="flex flex-col gap-1">
      <select disabled={pending} value={actual} onChange={(e) => { const key = e.target.value; start(async () => { const r = await elegirMisionEquipo(key); setError(r.ok ? null : r.error); router.refresh(); }); }} className="campo w-full max-w-full sm:w-auto" aria-label="Elegir misión colectiva">
        {opciones.map((o) => <option key={o.key} value={o.key}>{o.titulo}</option>)}
      </select>
      {error && <p role="alert" className="text-xs text-rojo-t">{error}</p>}
    </div>
  );
}
